import { query } from '../../database/init.mjs';
import {
  addCollectionRunLog,
  buildCollectionCacheKey,
  createCollectionRun,
  finishCollectionRun,
  getCollectionCache,
  saveCollectionCache,
} from '../collectionRunService.mjs';
import { collectLeads } from '../scraperCollector.mjs';
import { saveLeadsWithDeduplication } from '../localBusinessDataCollector.mjs';
import { analyzeLead } from '../analyzer.mjs';
import {
  applyStopOnReply,
  processApprovedMessages,
  runAssistedScheduler,
} from './autopilotExecutionService.mjs';
import {
  createApprovalBatch,
  markApprovalBatchRequested,
  sendTextToApprovalNumber,
} from './approvalBatchService.mjs';

const DEFAULT_REGION = 'br';
const DEFAULT_LANGUAGE = 'pt';
const DEFAULT_LIMIT = 20;
const DEFAULT_SCORE = 60;

function clean(value) {
  return String(value || '').trim();
}

function nullable(value) {
  const next = clean(value);
  return next || null;
}

function asInt(value, fallback, min = 1, max = 500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function bool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 'true';
}

export function buildCollectionQuery(niche, city, region = '') {
  const parts = [clean(niche), clean(city)].filter(Boolean);
  const base = parts.length === 2 ? `${parts[0]} em ${parts[1]}` : parts.join(' ');
  if (!base) return '';
  return clean(region) ? `${base}, ${clean(region)}` : base;
}

function summarizeQueueStats(rows = []) {
  const stats = {
    pending: 0,
    approved: 0,
    sent: 0,
    cancelled: 0,
    queued: 0,
    failed: 0,
  };

  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(stats, row.status)) {
      stats[row.status] = Number(row.total || 0);
    }
  }

  return stats;
}

function chooseHistoryScope(history = []) {
  const productive = history
    .filter((row) => row.status === 'completed' || row.status === 'completed_with_errors')
    .filter((row) => clean(row.city) || clean(row.niche) || clean(row.query));

  if (!productive.length) return null;

  return [...productive].sort((a, b) => {
    const savedDiff = Number(b.saved_count || 0) - Number(a.saved_count || 0);
    if (savedDiff !== 0) return savedDiff;
    return new Date(b.started_at || b.created_at || 0) - new Date(a.started_at || a.created_at || 0);
  })[0];
}

function chooseCredential(credentials = [], preferredSourceType = '') {
  const active = credentials.filter((credential) => credential.status === 'active');
  if (!active.length) return null;

  const preferred = clean(preferredSourceType).toLowerCase();
  if (preferred) {
    const match = active.find((credential) => clean(credential.type).toLowerCase() === preferred);
    if (match) return match;
  }

  const preferredOrder = ['serper', 'apify', 'rapidapi'];
  return [...active].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(clean(a.type).toLowerCase());
    const bIndex = preferredOrder.indexOf(clean(b.type).toLowerCase());
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  })[0];
}

export function buildSemiAutoPlanFromHistory({ history = [], credentials = [], queueStats = {}, leadStats = {} } = {}) {
  const scope = chooseHistoryScope(history);
  const credential = chooseCredential(credentials, scope?.source_type);
  const city = clean(scope?.city) || '';
  const niche = clean(scope?.niche) || '';
  const region = scope ? (clean(scope.region) || DEFAULT_REGION) : '';
  const queryText = clean(scope?.query) || buildCollectionQuery(niche, city, region);

  const ready = Boolean(credential && queryText);
  const reasons = [];

  if (!credential) reasons.push('Nenhuma credencial ativa de coleta encontrada.');
  if (!queryText) reasons.push('Historico insuficiente para sugerir query; informe nicho e cidade manualmente.');
  if ((queueStats.approved || 0) > 0) reasons.push('Existem mensagens aprovadas prontas para o worker controlado.');
  if ((queueStats.pending || 0) > 0) reasons.push('Existem mensagens pendentes que podem virar lote de aprovacao.');
  if ((leadStats.need_analysis || 0) > 0) reasons.push('Existem leads recentes sem analise tecnica completa.');

  return {
    ready,
    mode: 'semi_automatic_controlled',
    recommendation: {
      credential_id: credential?.id || null,
      credential_name: credential?.name || null,
      source_type: credential?.type || scope?.source_type || null,
      query: queryText,
      city,
      niche,
      region,
      limit: DEFAULT_LIMIT,
      verify_whatsapp_exists: true,
      force_refresh: false,
      min_score: DEFAULT_SCORE,
    },
    queue: queueStats,
    leads: leadStats,
    source_history: scope ? {
      collection_run_id: scope.id,
      saved_count: Number(scope.saved_count || 0),
      duplicate_count: Number(scope.duplicate_count || 0),
      status: scope.status,
      started_at: scope.started_at,
    } : null,
    reasons,
    safety: [
      'Coleta real exige approve_collection=true.',
      'Lote aprovado muda status para approved, mas nao envia sozinho para lead.',
      'Envio real so processa mensagens approved e roda stop-on-reply antes.',
      'Use limites diarios, horario de envio e lotes pequenos para operar com seguranca.',
    ],
  };
}

async function getHistory(userId) {
  const result = await query(
    `SELECT id, credential_id, source_type, query, niche, city, region, limit_requested,
            total_found, saved_count, duplicate_count, error_count, cache_hit, status, started_at, created_at
     FROM collection_runs
     WHERE user_id = $1
     ORDER BY started_at DESC
     LIMIT 30`,
    [userId]
  );
  return result.rows;
}

async function getCredentials(userId) {
  const result = await query(
    `SELECT id, name, type, provider, status, daily_limit, used_today, last_used_at
     FROM credentials
     WHERE user_id = $1 AND category = 'scraper'
     ORDER BY status ASC, last_used_at DESC NULLS LAST, created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getQueueStats(userId) {
  const result = await query(
    `SELECT status, COUNT(*)::int as total
     FROM message_queue
     WHERE user_id = $1
     GROUP BY status`,
    [userId]
  );
  return summarizeQueueStats(result.rows);
}

async function getLeadStats(userId) {
  const result = await query(
    `SELECT
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE status IN ('novo', 'analisado', 'mensagem_pronta'))::int as usable,
       COUNT(*) FILTER (WHERE data_analise IS NULL AND site IS NOT NULL AND site <> '')::int as need_analysis,
       COUNT(*) FILTER (WHERE whatsapp IS NOT NULL AND whatsapp <> '')::int as with_whatsapp,
       COUNT(*) FILTER (WHERE COALESCE(score, 0) >= 60)::int as high_score
     FROM leads
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || {};
}

export async function getSemiAutoCommercialPlan(userId) {
  const [history, credentials, queueStats, leadStats] = await Promise.all([
    getHistory(userId),
    getCredentials(userId),
    getQueueStats(userId),
    getLeadStats(userId),
  ]);

  return buildSemiAutoPlanFromHistory({ history, credentials, queueStats, leadStats });
}

async function ensureApprovalRequestCanBeSent(userId) {
  const userResult = await query('SELECT approval_whatsapp FROM users WHERE id = $1', [userId]);
  const approvalWhatsapp = clean(userResult.rows[0]?.approval_whatsapp);
  if (!approvalWhatsapp) {
    const error = new Error('Configure o WhatsApp pessoal de aprovacao no perfil antes de enviar lote.');
    error.status = 400;
    throw error;
  }

  const instanceResult = await query(
    `SELECT status
     FROM whatsapp_instances
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );

  const instance = instanceResult.rows[0];
  if (!instance) {
    const error = new Error('Conecte um numero de WhatsApp antes de enviar solicitacoes de aprovacao.');
    error.status = 400;
    throw error;
  }

  if (instance.status !== 'open') {
    const error = new Error('WhatsApp desconectado. Reconecte antes de enviar solicitacoes de aprovacao.');
    error.status = 409;
    throw error;
  }

  return approvalWhatsapp;
}

async function performApprovedCollection(userId, input = {}) {
  const credentialId = Number(input.credential_id || input.credentialId);
  if (!credentialId) {
    const error = new Error('credential_id e obrigatorio para coleta semi-automatica aprovada.');
    error.status = 400;
    throw error;
  }

  const searchQuery = clean(input.query);
  if (!searchQuery) {
    const error = new Error('query e obrigatoria para coleta semi-automatica aprovada.');
    error.status = 400;
    throw error;
  }

  const credentialCheck = await query(
    `SELECT id, type
     FROM credentials
     WHERE id = $1 AND user_id = $2 AND category = 'scraper' AND status = 'active'`,
    [credentialId, userId]
  );

  if (credentialCheck.rows.length === 0) {
    const error = new Error('Credencial ativa de coleta nao encontrada.');
    error.status = 404;
    throw error;
  }

  const normalizedLimit = asInt(input.limit, DEFAULT_LIMIT, 1, 100);
  const verifyWhatsAppExists = bool(input.verify_whatsapp_exists ?? input.verifyWhatsAppExists, true);
  const cacheInput = {
    credentialId,
    query: searchQuery,
    city: clean(input.city),
    niche: clean(input.niche),
    limit: normalizedLimit,
    lat: input.lat,
    lng: input.lng,
    zoom: input.zoom,
    language: clean(input.language) || DEFAULT_LANGUAGE,
    region: clean(input.region) || DEFAULT_REGION,
    extractEmailsAndContacts: bool(input.extract_emails_and_contacts ?? input.extractEmailsAndContacts, false),
    verifyWhatsAppExists,
    sourceType: credentialCheck.rows[0].type,
    params: {
      lat: input.lat,
      lng: input.lng,
      zoom: input.zoom,
      language: clean(input.language) || DEFAULT_LANGUAGE,
      region: clean(input.region) || DEFAULT_REGION,
      extractEmailsAndContacts: bool(input.extract_emails_and_contacts ?? input.extractEmailsAndContacts, false),
      verifyWhatsAppExists,
    },
  };
  const cacheKey = buildCollectionCacheKey(cacheInput);
  let run = null;

  try {
    run = await createCollectionRun(userId, { ...cacheInput, cacheKey });
    await addCollectionRunLog(run.id, userId, 'info', 'semi_auto_collection_started', 'Coleta semi-automatica aprovada iniciada', {
      query: searchQuery,
      city: cacheInput.city,
      niche: cacheInput.niche,
      limit: normalizedLimit,
      forceRefresh: bool(input.force_refresh ?? input.forceRefresh, false),
    });

    let collection = null;
    let cacheHit = false;
    const forceRefresh = bool(input.force_refresh ?? input.forceRefresh, false);

    if (!forceRefresh) {
      const cached = await getCollectionCache(userId, cacheKey);
      if (cached?.response_json) {
        collection = cached.response_json;
        cacheHit = true;
        await addCollectionRunLog(run.id, userId, 'info', 'cache_hit', 'Resultado reaproveitado do cache de coleta', {
          cacheId: cached.id,
          expiresAt: cached.expires_at,
        });
      }
    }

    if (!collection) {
      await addCollectionRunLog(run.id, userId, 'info', 'cache_miss', 'Nenhum cache valido encontrado; chamando provider', {
        forceRefresh,
      });

      if (verifyWhatsAppExists) {
        const { verifyLeadPhonesOnWhatsApp } = await import('../whatsapp/whatsappService.mjs');
        await verifyLeadPhonesOnWhatsApp(userId, []);
        await addCollectionRunLog(run.id, userId, 'info', 'whatsapp_connection_ok', 'Instancia WhatsApp validada antes da coleta');
      }

      collection = await collectLeads(userId, {
        credentialId,
        query: searchQuery,
        city: cacheInput.city,
        niche: cacheInput.niche,
        limit: normalizedLimit,
        lat: input.lat,
        lng: input.lng,
        zoom: input.zoom,
        language: cacheInput.params.language,
        region: cacheInput.params.region,
        extractEmailsAndContacts: cacheInput.params.extractEmailsAndContacts,
        verifyWhatsAppExists,
      });

      await saveCollectionCache(userId, { ...cacheInput, cacheKey, sourceType: collection.sourceType }, collection);
      await addCollectionRunLog(run.id, userId, 'info', 'provider_collected', 'Provider retornou leads para normalizacao', {
        total: collection.total,
        sourceType: collection.sourceType,
        credentialId: collection.credentialUsed,
      });
    }

    let leadsToSave = collection.leads || [];
    let whatsappVerification = { enabled: false };

    if (verifyWhatsAppExists) {
      const { verifyLeadPhonesOnWhatsApp } = await import('../whatsapp/whatsappService.mjs');
      const verification = await verifyLeadPhonesOnWhatsApp(userId, leadsToSave.map((lead) => lead.telefone).filter(Boolean));
      let rejected = 0;
      let withoutPhone = 0;
      leadsToSave = leadsToSave.reduce((acc, lead) => {
        if (!lead.telefone) {
          withoutPhone += 1;
          return acc;
        }
        if (verification.get(lead.telefone)) {
          acc.push({ ...lead, whatsapp: lead.telefone });
        } else {
          rejected += 1;
        }
        return acc;
      }, []);
      whatsappVerification = { enabled: true, verified: leadsToSave.length, rejected, withoutPhone };
      await addCollectionRunLog(run.id, userId, 'info', 'whatsapp_verified', 'Verificacao WhatsApp concluida', whatsappVerification);
    }

    const { saved, duplicates, errors } = await saveLeadsWithDeduplication(userId, leadsToSave);
    for (const error of errors) {
      await addCollectionRunLog(run.id, userId, 'error', 'lead_save_failed', 'Falha ao salvar lead coletado', error);
    }

    await addCollectionRunLog(run.id, userId, 'info', 'database_saved', 'Coleta semi-automatica persistida no banco', {
      saved: saved.length,
      duplicates: duplicates.length,
      errors: errors.length,
    });

    const finishedRun = await finishCollectionRun(run.id, userId, {
      sourceType: collection.sourceType,
      totalFound: collection.total || leadsToSave.length,
      savedCount: saved.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      whatsappVerifiedCount: whatsappVerification.enabled ? whatsappVerification.verified : 0,
      whatsappRejectedCount: whatsappVerification.enabled ? whatsappVerification.rejected : 0,
      withoutPhoneCount: whatsappVerification.enabled ? whatsappVerification.withoutPhone : 0,
      cacheHit,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
    });

    return {
      run: finishedRun,
      total: collection.total,
      saved,
      duplicates,
      errors,
      cache: { hit: cacheHit, key: cacheKey },
      whatsappVerification,
    };
  } catch (error) {
    if (run?.id) {
      await addCollectionRunLog(run.id, userId, 'error', 'semi_auto_collection_failed', error.message, { name: error.name });
      await finishCollectionRun(run.id, userId, { status: 'failed', errorMessage: error.message });
    }
    throw error;
  }
}

async function analyzeSavedLeads(userId, saved = [], limit = 50) {
  const selected = saved.slice(0, asInt(limit, 50, 1, 100));
  const results = [];

  for (const lead of selected) {
    const leadResult = await query(
      `SELECT id, nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes, rating, total_avaliacoes
       FROM leads
       WHERE id = $1 AND user_id = $2`,
      [lead.id, userId]
    );
    const row = leadResult.rows[0];
    if (!row) continue;

    try {
      const analyzed = await analyzeLead({
        companyName: row.nome_empresa,
        site: row.site,
        url: row.site,
        telefone: row.telefone,
        cidade: row.cidade,
        nicho: row.nicho,
        categoria: row.categoria,
        fonte: row.fonte,
        observacoes: row.observacoes,
        rating: row.rating,
        total_avaliacoes: row.total_avaliacoes,
      });

      await query(
        `UPDATE leads SET
          tem_site = $1, site_final = $2, site_online = $3, status_site = $4, erro_site = $5,
          tempo_carregamento_ms = $6, tamanho_kb = $7, tem_pixel_meta = $8, tem_gtm = $9,
          tem_ga4 = $10, tem_google_ads_tag = $11, tem_whatsapp_site = $12, tem_formulario = $13,
          tem_https = $14, tem_pagina_contato = $15, tem_cta_visivel = $16, instagram = $17,
          facebook = $18, linkedin = $19, emails_encontrados = $20, telefones_encontrados = $21,
          score = $22, prioridade = $23, oportunidades = $24, pontos_positivos = $25,
          diagnostico = $26, mensagem_whatsapp = $27, mensagem_whatsapp_followup = $28,
          data_analise = $29, updated_at = NOW()
        WHERE id = $30 AND user_id = $31`,
        [
          analyzed.tem_site,
          analyzed.site_final,
          analyzed.site_online,
          analyzed.status_site,
          analyzed.erro_site,
          analyzed.tempo_carregamento_ms,
          analyzed.tamanho_kb,
          analyzed.tem_pixel_meta,
          analyzed.tem_gtm,
          analyzed.tem_ga4,
          analyzed.tem_google_ads_tag,
          analyzed.tem_whatsapp_site,
          analyzed.tem_formulario,
          analyzed.tem_https,
          analyzed.tem_pagina_contato,
          analyzed.tem_cta_visivel,
          analyzed.instagram,
          analyzed.facebook,
          analyzed.linkedin,
          analyzed.emails_encontrados,
          analyzed.telefones_encontrados,
          analyzed.score,
          analyzed.prioridade,
          analyzed.oportunidades,
          analyzed.pontos_positivos,
          analyzed.diagnostico,
          analyzed.mensagem_whatsapp,
          analyzed.mensagem_whatsapp_followup,
          analyzed.data_analise,
          row.id,
          userId,
        ]
      );

      results.push({ id: row.id, nome_empresa: row.nome_empresa, score: analyzed.score, prioridade: analyzed.prioridade, success: true });
    } catch (error) {
      results.push({ id: row.id, nome_empresa: row.nome_empresa, success: false, error: error.message });
    }
  }

  return {
    total: results.length,
    successful: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}

async function ensureSemiAutoRule(userId, plan, options = {}) {
  const recommendation = plan.recommendation || {};
  const city = nullable(options.city ?? recommendation.city);
  const niche = nullable(options.niche ?? recommendation.niche);
  const sourceType = nullable(options.source_type ?? recommendation.source_type);
  const minScore = asInt(options.min_score ?? recommendation.min_score, DEFAULT_SCORE, 0, 100);
  const name = clean(options.rule_name) || `SemiAuto ${niche || 'geral'} ${city || 'geral'}`;

  const existing = await query(
    `SELECT * FROM automation_rules
     WHERE user_id = $1 AND name = $2
     ORDER BY id DESC
     LIMIT 1`,
    [userId, name]
  );

  if (existing.rows[0]) {
    const updated = await query(
      `UPDATE automation_rules SET
        enabled = TRUE,
        mode = 'assistido',
        source_type = $1,
        niche = $2,
        city = $3,
        min_score = $4,
        require_manual_approval = TRUE,
        stop_on_reply = TRUE,
        updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [sourceType, niche, city, minScore, existing.rows[0].id, userId]
    );
    return updated.rows[0];
  }

  const created = await query(
    `INSERT INTO automation_rules (
      user_id, name, enabled, mode, source_type, niche, city, min_score,
      max_daily_sends, max_hourly_sends, send_window_start, send_window_end,
      timezone, require_manual_approval, stop_on_reply, followup_1_delay_hours, followup_2_delay_hours, notes
    ) VALUES ($1, $2, TRUE, 'assistido', $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, TRUE, $12, $13, $14)
    RETURNING *`,
    [
      userId,
      name,
      sourceType,
      niche,
      city,
      minScore,
      asInt(options.max_daily_sends, 20, 1, 500),
      asInt(options.max_hourly_sends, 5, 1, 100),
      clean(options.send_window_start) || '09:00',
      clean(options.send_window_end) || '17:00',
      clean(options.timezone) || 'America/Cuiaba',
      asInt(options.followup_1_delay_hours, 24, 1, 720),
      asInt(options.followup_2_delay_hours, 48, 1, 720),
      'Criada pelo Autopilot Comercial Semi-Automatico. Modo assistido e aprovacao manual obrigatoria.',
    ]
  );

  return created.rows[0];
}

export async function runSemiAutoCommercialCycle(userId, userContext = {}, options = {}) {
  const dryRun = options.dry_run !== false;
  const plan = await getSemiAutoCommercialPlan(userId);
  const recommendation = plan.recommendation || {};
  const collectionInput = {
    credential_id: options.credential_id ?? recommendation.credential_id,
    query: clean(options.query) || recommendation.query,
    city: clean(options.city) || recommendation.city,
    niche: clean(options.niche) || recommendation.niche,
    region: clean(options.region) || recommendation.region || DEFAULT_REGION,
    language: clean(options.language) || DEFAULT_LANGUAGE,
    limit: asInt(options.limit, recommendation.limit || DEFAULT_LIMIT, 1, 100),
    verify_whatsapp_exists: options.verify_whatsapp_exists ?? recommendation.verify_whatsapp_exists,
    force_refresh: options.force_refresh ?? recommendation.force_refresh,
    lat: options.lat,
    lng: options.lng,
    zoom: options.zoom,
    extract_emails_and_contacts: options.extract_emails_and_contacts,
  };

  const summary = {
    dryRun,
    plan,
    actions: [],
    collection: null,
    analysis: null,
    rule: null,
    scheduler: null,
    approvalBatch: null,
    approvedWorker: null,
    stopOnReply: null,
    safety: [
      'Coleta real exige approve_collection=true.',
      'Mensagens entram como pending e precisam de aprovacao em lote.',
      'Envio real processa apenas mensagens approved.',
      'Stop-on-reply roda antes de processar mensagens aprovadas.',
    ],
  };

  const approveCollection = bool(options.approve_collection, false);
  const ignoreSchedule = bool(options.ignore_schedule ?? options.ignoreSchedule, false);
  if (dryRun) {
    summary.actions.push({ step: 'collection_planner', would_collect: approveCollection, input: collectionInput });
    summary.actions.push({ step: 'lead_processor', would_analyze_saved_leads: approveCollection && options.analyze_saved_leads !== false });
    summary.actions.push({ step: 'queue_orchestrator', would_create_rule: true, would_queue_pending: true });
    summary.actions.push({ step: 'approval_batch', would_create_batch: options.create_approval_batch !== false, would_send_to_personal_whatsapp: options.send_approval_request !== false });
    summary.actions.push({ step: 'approved_worker', would_process_approved: options.process_approved !== false, would_send_only_approved: true, ignore_schedule: ignoreSchedule });
    return summary;
  }

  if (approveCollection) {
    summary.collection = await performApprovedCollection(userId, collectionInput);
    summary.actions.push({ step: 'collection_executor', status: 'completed', saved: summary.collection.saved.length });

    if (options.analyze_saved_leads !== false && summary.collection.saved.length > 0) {
      summary.analysis = await analyzeSavedLeads(userId, summary.collection.saved, options.analysis_limit || 50);
      summary.actions.push({ step: 'lead_processor', status: 'completed', analyzed: summary.analysis.successful, failed: summary.analysis.failed });
    }
  } else {
    summary.actions.push({ step: 'collection_executor', status: 'skipped', reason: 'approve_collection_required' });
  }

  summary.rule = await ensureSemiAutoRule(userId, plan, {
    ...options,
    city: collectionInput.city,
    niche: collectionInput.niche,
    source_type: recommendation.source_type,
    min_score: options.min_score ?? recommendation.min_score,
  });

  summary.scheduler = await runAssistedScheduler(userId, {
    rule_id: summary.rule.id,
    limit: asInt(options.scheduler_limit, 50, 1, 500),
    dry_run: false,
  });
  summary.actions.push({ step: 'queue_orchestrator', status: 'completed', queued: summary.scheduler.queued, skipped: summary.scheduler.skipped });

  if (options.create_approval_batch !== false) {
    const sendApprovalRequest = options.send_approval_request !== false;
    if (sendApprovalRequest) await ensureApprovalRequestCanBeSent(userId);

    const batchResult = await createApprovalBatch(userId, {
      limit: asInt(options.batch_limit, 5, 1, 10),
      min_score: asInt(options.min_score ?? recommendation.min_score, DEFAULT_SCORE, 0, 100),
      city: nullable(collectionInput.city),
      niche: nullable(collectionInput.niche),
      source_type: nullable(recommendation.source_type),
      expires_in_minutes: asInt(options.batch_expires_in_minutes, 120, 10, 1440),
    });

    let sent = false;
    if (sendApprovalRequest && batchResult.batch?.total_items > 0) {
      await sendTextToApprovalNumber(userId, batchResult.batch.approval_whatsapp, batchResult.approvalText);
      await markApprovalBatchRequested(userId, batchResult.batch.id);
      sent = true;
    }

    summary.approvalBatch = { ...batchResult, sent };
    summary.actions.push({ step: 'approval_batch', status: 'completed', batch_id: batchResult.batch?.id, sent_to_personal_whatsapp: sent });
  }

  summary.stopOnReply = await applyStopOnReply(userId);
  summary.actions.push({ step: 'stop_on_reply', status: 'completed', cancelled: summary.stopOnReply.cancelledCount });

  if (options.process_approved !== false) {
    summary.approvedWorker = await processApprovedMessages(userId, {
      limit: asInt(options.worker_limit, 10, 1, 100),
      dry_run: false,
      confirm_send: true,
      ignore_schedule: ignoreSchedule,
    });
    summary.actions.push({
      step: 'approved_worker',
      status: 'completed',
      sent: summary.approvedWorker.sentCount,
      total: summary.approvedWorker.total,
      ignore_schedule: ignoreSchedule,
    });
  }

  return summary;
}
