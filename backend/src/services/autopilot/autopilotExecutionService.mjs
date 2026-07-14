import { query } from '../../database/init.mjs';
import { sendTextToLead } from '../whatsapp/whatsappService.mjs';
import { buildAutopilotDecision, getNextSendAt, normalizeAutopilotRule } from './autopilotService.mjs';
import { buildBdrFollowupMessage, buildBdrInitialMessage } from './bdrAgentService.mjs';
import { evaluateQueueSendSafety } from './autopilotSafetyService.mjs';

const INITIAL_ELIGIBLE_STATUSES = ['novo', 'analisado', 'mensagem_pronta'];
const ACTIVE_MESSAGE_STATUSES = ['pending', 'approved', 'queued', 'sent'];
const REPLY_ACTIONS = ['mark_responded', 'mark_meeting', 'mark_not_interested', 'create_followup', 'mark_pricing'];

function asInt(value, fallback, min = 1, max = 500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function clean(value) {
  return String(value || '').trim();
}

function buildMessageText(row, type = 'initial') {
  const payload = row.payload_json || {};
  if (payload.message || payload.text || payload.body) {
    return payload.message || payload.text || payload.body;
  }

  if (type === 'followup_1' || type === 'followup_2') {
    return row.mensagem_whatsapp_followup || `Olá, tudo bem? Passando para retomar minha mensagem sobre a ${row.nome_empresa}. Faz sentido eu te enviar um diagnóstico rápido?`;
  }

  return row.mensagem_whatsapp || `Olá, tudo bem? Analisei alguns pontos da presença digital da ${row.nome_empresa || 'sua empresa'} e encontrei oportunidades simples de melhoria. Posso te enviar um diagnóstico rápido?`;
}

export function classifyReplyText(text = '') {
  const normalized = clean(text).toLowerCase();
  if (!normalized) return { intent: 'unknown', confidence: 0.2, nextAction: 'Revisar resposta manualmente' };

  if (/\b(nao|não|sem interesse|pare|remover|obrigado,? mas|agora nao|agora não)\b/i.test(normalized)) {
    return { intent: 'not_interested', confidence: 0.75, nextAction: 'Marcar como sem interesse e não enviar follow-up' };
  }

  if (/\b(preco|preço|valor|quanto|custa|investimento|plano)\b/i.test(normalized)) {
    return { intent: 'pricing', confidence: 0.72, nextAction: 'Responder com contexto e propor conversa curta' };
  }

  if (/\b(reuniao|reunião|agenda|horario|horário|amanha|amanhã|hoje|pode ser|marcar)\b/i.test(normalized)) {
    return { intent: 'meeting', confidence: 0.78, nextAction: 'Sugerir horários e mover para reunião marcada quando confirmado' };
  }

  if (/\b(sim|pode|manda|envia|quero|interesse|interessante|me chama|vamos)\b/i.test(normalized)) {
    return { intent: 'interested', confidence: 0.7, nextAction: 'Enviar diagnóstico ou sugerir chamada de 15 minutos' };
  }

  if (/\b(duvida|dúvida|como funciona|explica|detalhe|detalhes)\b/i.test(normalized)) {
    return { intent: 'question', confidence: 0.65, nextAction: 'Responder a dúvida e conduzir para diagnóstico' };
  }

  return { intent: 'neutral', confidence: 0.45, nextAction: 'Revisar manualmente e responder com contexto' };
}

function buildSuggestedReply(lead, classification) {
  const company = lead.nome_empresa || 'sua empresa';

  const replies = {
    interested: `Perfeito, obrigado pelo retorno. Posso te mandar um diagnóstico rápido com os principais pontos que encontrei na ${company} e, se fizer sentido, marcamos 15 minutos para eu te mostrar?`,
    pricing: 'Boa pergunta. O valor depende do cenário e do objetivo, para eu não te passar algo genérico. Posso primeiro te mostrar em 10 a 15 minutos os pontos que encontrei e te dizer qual plano faria sentido?',
    meeting: 'Combinado. Tenho alguns horários disponíveis. Qual fica melhor para você: hoje no fim da tarde ou amanhã pela manhã?',
    question: 'Claro. A ideia é te mostrar rapidamente pontos que podem estar limitando contatos pelo digital, como mensuração, site e WhatsApp. Posso te mandar um diagnóstico curto?',
    not_interested: 'Sem problemas, obrigado pelo retorno. Vou encerrar por aqui.',
    neutral: 'Obrigado pelo retorno. Para eu te responder melhor, posso te mandar um diagnóstico rápido com o que encontrei e você me diz se faz sentido?',
    unknown: 'Obrigado pelo retorno. Vou revisar aqui e te respondo com mais contexto.',
  };

  return replies[classification.intent] || replies.neutral;
}

function mapIntentToStatus(intent, currentStatus) {
  if (intent === 'not_interested') return 'sem_interesse';
  if (intent === 'meeting') return 'reuniao_marcada';
  if (['interested', 'pricing', 'question'].includes(intent)) return 'respondeu';
  return currentStatus || 'respondeu';
}

function buildReplyActionPatch(lead, options = {}) {
  const action = clean(options.action);
  if (!REPLY_ACTIONS.includes(action)) {
    const error = new Error('Acao de resposta invalida');
    error.status = 400;
    throw error;
  }

  const note = clean(options.note);
  const scheduledFor = clean(options.scheduled_for);

  if (action === 'mark_not_interested') {
    return {
      status: 'sem_interesse',
      proxima_acao: note || 'Lead respondeu sem interesse. Nao enviar novos follow-ups.',
      followupType: 'nota',
    };
  }

  if (action === 'mark_meeting') {
    return {
      status: 'reuniao_marcada',
      proxima_acao: scheduledFor
        ? `Reuniao combinada para ${scheduledFor}. ${note || 'Confirmar detalhes antes da chamada.'}`
        : note || 'Confirmar horario da reuniao com o lead.',
      followupType: 'reuniao',
    };
  }

  if (action === 'mark_pricing') {
    return {
      status: 'respondeu',
      proxima_acao: note || 'Responder sobre valor com contexto e conduzir para conversa curta.',
      followupType: 'nota',
    };
  }

  if (action === 'create_followup') {
    return {
      status: lead.status === 'sem_interesse' ? lead.status : 'respondeu',
      proxima_acao: note || 'Criar proxima resposta manual para o lead.',
      followupType: 'nota',
    };
  }

  return {
    status: 'respondeu',
    proxima_acao: note || 'Lead respondeu. Preparar resposta comercial manual.',
    followupType: 'nota',
  };
}

async function insertAutomationRun(userId, ruleId, type, metadata = {}) {
  const result = await query(
    `INSERT INTO automation_runs (user_id, automation_rule_id, type, status, metadata)
     VALUES ($1, $2, $3, 'running', $4::jsonb)
     RETURNING *`,
    [userId, ruleId || null, type, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

async function finishAutomationRun(runId, userId, patch) {
  const result = await query(
    `UPDATE automation_runs SET
      status = $1,
      finished_at = NOW(),
      leads_evaluated = $2,
      messages_queued = $3,
      messages_skipped = $4,
      error_message = $5,
      metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
      updated_at = NOW()
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [
      patch.status || 'completed',
      patch.leads_evaluated || 0,
      patch.messages_queued || 0,
      patch.messages_skipped || 0,
      patch.error_message || null,
      JSON.stringify(patch.metadata || {}),
      runId,
      userId,
    ]
  );
  return result.rows[0];
}

export async function getAutopilotStats(userId) {
  const result = await query(
    `SELECT
      (SELECT COUNT(*)::int FROM automation_rules WHERE user_id = $1) as rules_total,
      (SELECT COUNT(*)::int FROM automation_rules WHERE user_id = $1 AND enabled = TRUE) as rules_active,
      (SELECT COUNT(*)::int FROM message_queue WHERE user_id = $1 AND status = 'pending') as queue_pending,
      (SELECT COUNT(*)::int FROM message_queue WHERE user_id = $1 AND status = 'approved') as queue_approved,
      (SELECT COUNT(*)::int FROM message_queue WHERE user_id = $1 AND status = 'sent') as queue_sent,
      (SELECT COUNT(*)::int FROM message_queue WHERE user_id = $1 AND status = 'cancelled') as queue_cancelled,
      (SELECT COUNT(*)::int FROM approval_batches WHERE user_id = $1 AND status IN ('pending', 'partially_approved')) as batches_open,
      (SELECT COUNT(*)::int FROM automation_runs WHERE user_id = $1) as runs_total`,
    [userId]
  );

  return result.rows[0];
}

export async function listAutomationRuns(userId, { limit = 30, offset = 0 } = {}) {
  const result = await query(
    `SELECT arun.*, ar.name as automation_rule_name
     FROM automation_runs arun
     LEFT JOIN automation_rules ar ON ar.id = arun.automation_rule_id AND ar.user_id = arun.user_id
     WHERE arun.user_id = $1
     ORDER BY arun.started_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, Math.min(Number(limit || 30), 100), Math.max(Number(offset || 0), 0)]
  );
  return result.rows;
}

export async function runAssistedScheduler(userId, options = {}) {
  const limit = asInt(options.limit, 50, 1, 500);
  const dryRun = options.dry_run !== false;
  const ruleId = options.rule_id ? Number(options.rule_id) : null;

  const rulesResult = await query(
    `SELECT * FROM automation_rules
     WHERE user_id = $1 AND enabled = TRUE
       AND ($2::int IS NULL OR id = $2)
     ORDER BY created_at ASC`,
    [userId, ruleId]
  );

  const run = await insertAutomationRun(userId, ruleId, 'scheduler_assisted', { dry_run: dryRun, limit });
  const candidates = [];
  let evaluated = 0;
  let queued = 0;
  let skipped = 0;

  try {
    for (const ruleRow of rulesResult.rows) {
      const rule = normalizeAutopilotRule(ruleRow);
      const leadsResult = await query(
        `SELECT * FROM leads
         WHERE user_id = $1
           AND status = ANY($2::text[])
           AND ($3::text IS NULL OR LOWER(COALESCE(fonte, '')) = LOWER($3))
           AND ($4::text IS NULL OR LOWER(COALESCE(cidade, '')) = LOWER($4))
           AND ($5::text IS NULL OR LOWER(COALESCE(nicho, '')) = LOWER($5))
           AND COALESCE(score, 0) >= $6
         ORDER BY COALESCE(score, 0) DESC, data_coleta DESC NULLS LAST, created_at DESC
         LIMIT $7`,
        [userId, INITIAL_ELIGIBLE_STATUSES, rule.source_type || null, rule.city || null, rule.niche || null, rule.min_score, limit]
      );

      for (const lead of leadsResult.rows) {
        evaluated += 1;
        const existingMessages = await query(
          `SELECT message_type, status FROM message_queue
           WHERE user_id = $1 AND lead_id = $2 AND status = ANY($3::text[])`,
          [userId, lead.id, ACTIVE_MESSAGE_STATUSES]
        );

        const decision = buildAutopilotDecision(lead, rule, existingMessages.rows, {
          now: new Date(),
          automationRunId: run.id,
        });

        if (!decision.eligible) {
          skipped += 1;
          candidates.push({ lead_id: lead.id, nome_empresa: lead.nome_empresa, rule_id: rule.id, eligible: false, reason: decision.reason });
          continue;
        }

        candidates.push({
          lead_id: lead.id,
          nome_empresa: lead.nome_empresa,
          rule_id: rule.id,
          whatsapp_instance_id: ruleRow.default_whatsapp_instance_id || lead.whatsapp_instance_id || null,
          eligible: true,
          status: decision.queueItem.status,
          scheduled_at: decision.queueItem.scheduled_at,
        });

        if (!dryRun) {
          const bdrMessage = await buildBdrInitialMessage(userId, lead);
          const inserted = await query(
            `INSERT INTO message_queue (
              user_id, lead_id, automation_rule_id, whatsapp_instance_id, automation_run_id, channel, message_type,
              status, scheduled_at, payload_json
            ) VALUES ($1, $2, $3, $4, $5, 'whatsapp', 'initial', $6, $7, $8::jsonb)
            ON CONFLICT DO NOTHING
            RETURNING id`,
            [
              userId,
              lead.id,
              rule.id,
              ruleRow.default_whatsapp_instance_id || lead.whatsapp_instance_id || null,
              run.id,
              decision.queueItem.status,
              decision.queueItem.scheduled_at,
              JSON.stringify({
                ...decision.queueItem.payload_json,
                message: bdrMessage.message,
                bdr: {
                  source: bdrMessage.source,
                  generated: bdrMessage.generated,
                  provider: bdrMessage.provider || null,
                  model: bdrMessage.model || null,
                  generationId: bdrMessage.generationId || null,
                  reason: bdrMessage.reason || null,
                },
              }),
            ]
          );
          if (inserted.rows.length > 0) queued += 1;
          else skipped += 1;
        } else {
          queued += 1;
        }
      }
    }

    const finished = await finishAutomationRun(run.id, userId, {
      status: 'completed',
      leads_evaluated: evaluated,
      messages_queued: queued,
      messages_skipped: skipped,
      metadata: { dry_run: dryRun, candidates: candidates.slice(0, 50) },
    });

    return { run: finished, dryRun, candidates, evaluated, queued, skipped };
  } catch (error) {
    const failed = await finishAutomationRun(run.id, userId, {
      status: 'failed',
      leads_evaluated: evaluated,
      messages_queued: queued,
      messages_skipped: skipped,
      error_message: error.message,
      metadata: { dry_run: dryRun },
    });
    return { run: failed, dryRun, candidates, evaluated, queued, skipped, error: error.message };
  }
}

export async function processApprovedMessages(userId, options = {}) {
  const limit = asInt(options.limit, 10, 1, 100);
  const dryRun = options.dry_run !== false;
  const confirmSend = options.confirm_send === true;
  const ignoreSchedule = options.ignore_schedule === true || options.ignoreSchedule === true;
  const canSend = !dryRun && confirmSend;

  const result = await query(
      `SELECT mq.*, COALESCE(mq.whatsapp_instance_id, l.whatsapp_instance_id, ar.default_whatsapp_instance_id) as selected_whatsapp_instance_id,
            l.nome_empresa, l.telefone, l.whatsapp, l.mensagem_whatsapp, l.mensagem_whatsapp_followup,
            l.cidade, l.nicho, l.status as lead_status, l.motivo_perda,
            ar.name as automation_rule_name, ar.mode, ar.max_daily_sends, ar.max_hourly_sends,
            ar.send_window_start, ar.send_window_end, ar.timezone, ar.require_manual_approval,
            ar.stop_on_reply, ar.safety_accepted_at
     FROM message_queue mq
     JOIN leads l ON l.id = mq.lead_id AND l.user_id = mq.user_id
     LEFT JOIN automation_rules ar ON ar.id = mq.automation_rule_id AND ar.user_id = mq.user_id
     WHERE mq.user_id = $1
       AND mq.status = 'approved'
       AND ($3::boolean = TRUE OR mq.scheduled_at <= NOW())
     ORDER BY mq.scheduled_at ASC, mq.created_at ASC
     LIMIT $2`,
    [userId, limit, ignoreSchedule]
  );

  const items = [];
  for (const row of result.rows) {
    const text = buildMessageText(row, row.message_type);
    const item = {
      id: row.id,
      lead_id: row.lead_id,
      nome_empresa: row.nome_empresa,
      status: row.status,
      scheduled_at: row.scheduled_at,
      ignore_schedule: ignoreSchedule,
      would_send: true,
      sent: false,
    };

    if (!canSend) {
      items.push({ ...item, dry_run: true, reason: dryRun ? 'dry_run' : 'confirm_send_required' });
      continue;
    }

    const safety = await evaluateQueueSendSafety(userId, row, { ignoreSchedule });
    if (!safety.allowed) {
      await query(
        `UPDATE message_queue SET status = 'failed', last_error = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [`[safety:${safety.reason}] ${safety.message}`, row.id, userId]
      );
      await query(
        `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
         VALUES ($1, $2, 'nota', $3)`,
        [row.lead_id, userId, `[Autopilot/Seguranca] ${safety.message}`]
      );
      items.push({ ...item, status: 'failed', sent: false, safety });
      continue;
    }

    await query(
      `UPDATE message_queue SET status = 'queued', locked_at = NOW(), attempts = attempts + 1, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'approved'`,
      [row.id, userId]
    );

    try {
      await sendTextToLead(userId, row.lead_id, text, { instanceId: row.selected_whatsapp_instance_id || null });
      await query(
        `UPDATE message_queue SET status = 'sent', sent_at = NOW(), last_error = NULL, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [row.id, userId]
      );
      await query(
        `UPDATE leads SET status = CASE WHEN status IN ('novo', 'analisado', 'mensagem_pronta') THEN 'contato_enviado' ELSE status END,
          ultimo_contato = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [row.lead_id, userId]
      );
      await query(
        `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
         VALUES ($1, $2, 'nota', $3)`,
        [row.lead_id, userId, `[Autopilot/${row.message_type}] Mensagem enviada pelo worker controlado.`]
      );
      items.push({ ...item, status: 'sent', sent: true });
    } catch (error) {
      await query(
        `UPDATE message_queue SET status = 'failed', last_error = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [error.message, row.id, userId]
      );
      items.push({ ...item, status: 'failed', sent: false, error: error.message });
    }
  }

  return {
    dryRun,
    confirmSend,
    ignoreSchedule,
    sentCount: items.filter((item) => item.sent).length,
    total: items.length,
    items,
  };
}

export async function applyStopOnReply(userId) {
  const result = await query(
    `WITH replied AS (
       SELECT DISTINCT mq.lead_id
       FROM message_queue mq
       JOIN whatsapp_messages wm ON wm.lead_id = mq.lead_id AND wm.user_id = mq.user_id
       WHERE mq.user_id = $1
         AND wm.direction = 'received'
         AND wm.created_at >= COALESCE(mq.sent_at, mq.created_at)
     ), cancelled AS (
       UPDATE message_queue mq
       SET status = 'cancelled', cancelled_at = NOW(), last_error = NULL,
           approval_response_text = COALESCE(approval_response_text, 'Cancelado por stop-on-reply'), updated_at = NOW()
       FROM replied
       WHERE mq.user_id = $1
         AND mq.lead_id = replied.lead_id
         AND mq.status IN ('pending', 'approved', 'queued')
         AND mq.message_type IN ('followup_1', 'followup_2')
       RETURNING mq.id, mq.lead_id
     )
     SELECT * FROM cancelled`,
    [userId]
  );

  if (result.rows.length > 0) {
    const leadIds = Array.from(new Set(result.rows.map((row) => row.lead_id)));
    await query(
      `UPDATE leads SET status = CASE WHEN status NOT IN ('cliente_fechado', 'sem_interesse') THEN 'respondeu' ELSE status END,
        updated_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::int[])`,
      [userId, leadIds]
    );
  }

  return { cancelledCount: result.rows.length, cancelled: result.rows };
}

export async function queueFollowups(userId, options = {}) {
  const limit = asInt(options.limit, 50, 1, 200);
  const dryRun = options.dry_run !== false;

  await applyStopOnReply(userId);

  const result = await query(
    `SELECT mq.*, COALESCE(mq.whatsapp_instance_id, l.whatsapp_instance_id, ar.default_whatsapp_instance_id) as selected_whatsapp_instance_id,
            l.nome_empresa, l.mensagem_whatsapp_followup, l.cidade, l.nicho,
            ar.followup_1_delay_hours, ar.followup_2_delay_hours, ar.require_manual_approval, ar.mode
     FROM message_queue mq
     JOIN leads l ON l.id = mq.lead_id AND l.user_id = mq.user_id
     LEFT JOIN automation_rules ar ON ar.id = mq.automation_rule_id AND ar.user_id = mq.user_id
     WHERE mq.user_id = $1
       AND mq.status = 'sent'
       AND mq.message_type IN ('initial', 'followup_1')
       AND NOT EXISTS (
         SELECT 1 FROM whatsapp_messages wm
         WHERE wm.user_id = mq.user_id AND wm.lead_id = mq.lead_id
           AND wm.direction = 'received' AND wm.created_at >= mq.sent_at
       )
       AND NOT EXISTS (
         SELECT 1 FROM message_queue next_mq
         WHERE next_mq.user_id = mq.user_id AND next_mq.lead_id = mq.lead_id
           AND next_mq.message_type = CASE WHEN mq.message_type = 'initial' THEN 'followup_1' ELSE 'followup_2' END
           AND next_mq.status IN ('pending', 'approved', 'queued', 'sent')
       )
       AND NOW() >= mq.sent_at + (
         CASE WHEN mq.message_type = 'initial'
           THEN COALESCE(ar.followup_1_delay_hours, 24)
           ELSE COALESCE(ar.followup_2_delay_hours, 48)
         END || ' hours')::interval
     ORDER BY mq.sent_at ASC
     LIMIT $2`,
    [userId, limit]
  );

  const queued = [];
  for (const row of result.rows) {
    const nextType = row.message_type === 'initial' ? 'followup_1' : 'followup_2';
    const rule = normalizeAutopilotRule(row);
    const status = rule.require_manual_approval || rule.mode === 'automatico_limitado' ? 'pending' : 'approved';
    const followupMessage = await buildBdrFollowupMessage(userId, { ...row, id: row.lead_id }, { purpose: nextType });
    const payload = {
      leadName: row.nome_empresa,
      message: followupMessage.message,
      sourceMessageId: row.id,
      manualApproval: rule.require_manual_approval,
      followup: {
        source: followupMessage.source,
        generated: followupMessage.generated,
        provider: followupMessage.provider || null,
        model: followupMessage.model || null,
        generationId: followupMessage.generationId || null,
        reason: followupMessage.reason || null,
      },
    };

    if (!dryRun) {
      const inserted = await query(
        `INSERT INTO message_queue (
          user_id, lead_id, automation_rule_id, whatsapp_instance_id, automation_run_id, channel, message_type, status, scheduled_at, payload_json
        ) VALUES ($1, $2, $3, $4, NULL, 'whatsapp', $5, $6, $7, $8::jsonb)
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [userId, row.lead_id, row.automation_rule_id, row.selected_whatsapp_instance_id || null, nextType, status, getNextSendAt(new Date(), rule), JSON.stringify(payload)]
      );
      if (inserted.rows[0]) queued.push({ id: inserted.rows[0].id, lead_id: row.lead_id, message_type: nextType, status });
    } else {
      queued.push({ lead_id: row.lead_id, message_type: nextType, status, dry_run: true });
    }
  }

  return { dryRun, queuedCount: queued.length, queued };
}

export async function classifyRecentReplies(userId, options = {}) {
  const limit = asInt(options.limit, 20, 1, 100);
  const dryRun = options.dry_run !== false;

  const result = await query(
    `SELECT DISTINCT ON (wm.lead_id)
      wm.lead_id, wm.text_content, wm.created_at, l.nome_empresa, l.status
     FROM whatsapp_messages wm
     JOIN leads l ON l.id = wm.lead_id AND l.user_id = wm.user_id
     WHERE wm.user_id = $1
       AND wm.direction = 'received'
       AND wm.lead_id IS NOT NULL
       AND wm.text_content IS NOT NULL
     ORDER BY wm.lead_id, wm.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  const classifications = [];
  for (const row of result.rows) {
    const classification = classifyReplyText(row.text_content);
    classifications.push({ ...row, classification });

    if (!dryRun) {
      const nextStatus = mapIntentToStatus(classification.intent, row.status);

      await query(
        `UPDATE leads SET status = $1, proxima_acao = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4`,
        [nextStatus, classification.nextAction, row.lead_id, userId]
      );
      await query(
        `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
         VALUES ($1, $2, 'nota', $3)`,
        [row.lead_id, userId, `[Autopilot/IA simples] Intencao: ${classification.intent}. Proxima acao: ${classification.nextAction}`]
      );
    }
  }

  return { dryRun, total: classifications.length, classifications };
}

export async function listCommercialReplies(userId, options = {}) {
  const limit = asInt(options.limit, 30, 1, 100);
  const status = clean(options.status) || null;
  const intent = clean(options.intent) || null;
  const search = clean(options.search);
  const searchPattern = search ? `%${search}%` : null;

  const result = await query(
    `SELECT DISTINCT ON (wm.lead_id)
      wm.id as message_id,
      wm.lead_id,
      wm.text_content,
      wm.created_at as received_at,
      l.nome_empresa,
      l.cidade,
      l.nicho,
      l.telefone,
      l.whatsapp,
      l.score,
      l.prioridade,
      l.status,
      l.proxima_acao,
      l.responsavel,
      (
        SELECT MAX(sent.created_at)
        FROM whatsapp_messages sent
        WHERE sent.user_id = wm.user_id
          AND sent.lead_id = wm.lead_id
          AND sent.direction = 'sent'
      ) as last_sent_at,
      (
        SELECT COUNT(*)::int
        FROM whatsapp_messages cnt
        WHERE cnt.user_id = wm.user_id
          AND cnt.lead_id = wm.lead_id
          AND cnt.direction = 'received'
      ) as reply_count
     FROM whatsapp_messages wm
     JOIN leads l ON l.id = wm.lead_id AND l.user_id = wm.user_id
     WHERE wm.user_id = $1
       AND wm.direction = 'received'
       AND wm.lead_id IS NOT NULL
       AND COALESCE(wm.text_content, '') <> ''
       AND ($2::text IS NULL OR l.status = $2)
       AND (
         $3::text IS NULL
         OR LOWER(l.nome_empresa) LIKE LOWER($3)
         OR LOWER(COALESCE(l.cidade, '')) LIKE LOWER($3)
         OR LOWER(COALESCE(l.nicho, '')) LIKE LOWER($3)
       )
     ORDER BY wm.lead_id, wm.created_at DESC
     LIMIT $4`,
    [userId, status, searchPattern, limit]
  );

  const replies = result.rows.map((row) => {
    const classification = classifyReplyText(row.text_content);
    return {
      ...row,
      classification,
      suggested_status: mapIntentToStatus(classification.intent, row.status),
      suggested_reply: buildSuggestedReply(row, classification),
      next_action: classification.nextAction,
    };
  }).filter((reply) => !intent || reply.classification.intent === intent);

  return { replies, total: replies.length };
}

export async function applyReplyNextAction(userId, leadId, options = {}) {
  const id = Number(leadId);
  if (!id) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  const leadResult = await query(
    'SELECT id, nome_empresa, status FROM leads WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  const lead = leadResult.rows[0];
  if (!lead) {
    const error = new Error('Lead nao encontrado');
    error.status = 404;
    throw error;
  }

  const patch = buildReplyActionPatch(lead, options);
  const message = clean(options.note) || patch.proxima_acao;

  const updated = await query(
    `UPDATE leads SET status = $1, proxima_acao = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING id, nome_empresa, status, proxima_acao`,
    [patch.status, patch.proxima_acao, id, userId]
  );

  await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, status_anterior, status_novo, mensagem)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, patch.followupType, lead.status, patch.status, `[Autopilot/Resposta] ${message}`]
  );

  return { lead: updated.rows[0], action: options.action };
}

export async function createAssistedAppointment(userId, options = {}) {
  const leadId = Number(options.lead_id);
  if (!leadId) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  const scheduledFor = clean(options.scheduled_for);
  const note = clean(options.note) || 'Reuniao marcada via Autopilot assistido.';

  const leadResult = await query('SELECT id, nome_empresa FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  if (leadResult.rows.length === 0) {
    const error = new Error('Lead nao encontrado');
    error.status = 404;
    throw error;
  }

  const action = scheduledFor ? `Reuniao agendada para ${scheduledFor}. ${note}` : note;
  await query(
    `UPDATE leads SET status = 'reuniao_marcada', proxima_acao = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [action, leadId, userId]
  );
  await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
     VALUES ($1, $2, 'reuniao', $3)`,
    [leadId, userId, action]
  );

  return { lead_id: leadId, status: 'reuniao_marcada', proxima_acao: action };
}

export async function buildLeadDiagnosticDocument(userId, leadId) {
  const result = await query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  const lead = result.rows[0];
  if (!lead) {
    const error = new Error('Lead nao encontrado');
    error.status = 404;
    throw error;
  }

  const problems = [
    !lead.site ? 'Nao foi identificado site.' : '',
    lead.site && !lead.tem_pixel_meta ? 'Nao foi encontrado Pixel Meta.' : '',
    lead.site && !lead.tem_gtm ? 'Nao foi encontrado Google Tag Manager.' : '',
    lead.site && !lead.tem_ga4 ? 'Nao foi encontrado GA4.' : '',
    lead.site && !lead.tem_whatsapp_site ? 'WhatsApp nao parece estar visivel no site.' : '',
    lead.site && !lead.tem_formulario ? 'Formulario de contato nao foi identificado.' : '',
  ].filter(Boolean);

  const markdown = [
    `# Diagnostico Comercial - ${lead.nome_empresa}`,
    '',
    `Cidade: ${lead.cidade || '-'}`,
    `Nicho: ${lead.nicho || lead.categoria || '-'}`,
    `Score: ${lead.score ?? '-'} (${lead.prioridade || '-'})`,
    '',
    '## Pontos Encontrados',
    ...(problems.length ? problems.map((item) => `- ${item}`) : ['- Nenhum problema critico foi identificado pelos dados atuais.']),
    '',
    '## Diagnostico',
    lead.diagnostico || 'O lead tem potencial para uma abordagem consultiva baseada em presenca digital, mensuracao e geracao de oportunidades.',
    '',
    '## Abordagem Recomendada',
    lead.mensagem_whatsapp || 'Enviar uma mensagem curta oferecendo um diagnostico rapido e sem compromisso.',
    '',
    '## CTA',
    'Sugerir uma conversa de 15 minutos para mostrar os pontos encontrados e propor um plano de melhoria.',
  ].join('\n');

  return { lead_id: lead.id, nome_empresa: lead.nome_empresa, markdown };
}
