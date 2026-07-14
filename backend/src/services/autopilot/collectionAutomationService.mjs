import { query } from '../../database/init.mjs';
import {
  addCollectionRunLog,
  buildCollectionCacheKey,
  createCollectionRun,
  finishCollectionRun,
  getCollectionCache,
  saveCollectionCache,
} from '../collectionRunService.mjs';
import { saveLeadsWithDeduplication } from '../localBusinessDataCollector.mjs';
import { collectLeads } from '../scraperCollector.mjs';

function clean(value) {
  return String(value || '').trim();
}

function asInt(value, fallback, min = 1, max = 1000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function mapRule(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    credential_id: row.credential_id,
    name: row.name,
    enabled: row.enabled,
    query: row.query,
    niche: row.niche,
    city: row.city,
    region: row.region,
    language: row.language,
    limit_requested: row.limit_requested,
    verify_whatsapp_exists: row.verify_whatsapp_exists,
    extract_emails_and_contacts: row.extract_emails_and_contacts,
    force_refresh: row.force_refresh,
    min_interval_minutes: row.min_interval_minutes,
    next_run_at: row.next_run_at,
    paused_until: row.paused_until,
    pause_reason: row.pause_reason,
    consecutive_failures: row.consecutive_failures,
    max_consecutive_failures: row.max_consecutive_failures,
    optimization_weight: row.optimization_weight,
    optimization_locked: row.optimization_locked,
    last_run_id: row.last_run_id,
    last_run_at: row.last_run_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildSearchQuery(rule) {
  return clean(rule.query) || [clean(rule.niche), clean(rule.city)].filter(Boolean).join(' ');
}

async function selectCredential(userId, preferredCredentialId = null) {
  const params = [userId];
  const where = ["user_id = $1", "category = 'scraper'", "status = 'active'", 'used_today < daily_limit'];

  if (preferredCredentialId) {
    params.push(preferredCredentialId);
    where.push(`id = $${params.length}`);
  }

  const result = await query(
    `SELECT id, type, used_today, daily_limit
     FROM credentials
     WHERE ${where.join(' AND ')}
     ORDER BY used_today ASC, last_used_at ASC NULLS FIRST, id ASC
     LIMIT 1`,
    params
  );

  return result.rows[0] || null;
}

export async function listCollectionAutomationRules(userId) {
  const result = await query(
    `SELECT *
     FROM collection_automation_rules
     WHERE user_id = $1
     ORDER BY enabled DESC, next_run_at ASC, created_at DESC`,
    [userId]
  );
  return result.rows.map(mapRule);
}

export async function saveCollectionAutomationRule(userId, data = {}, ruleId = null) {
  const name = clean(data.name);
  const city = clean(data.city);
  const niche = clean(data.niche);
  const searchQuery = clean(data.query);

  if (!ruleId && !name) {
    const error = new Error('name e obrigatorio');
    error.status = 400;
    throw error;
  }

  if (!ruleId && !searchQuery && (!city || !niche)) {
    const error = new Error('Informe query ou niche + city para a coleta automatica');
    error.status = 400;
    throw error;
  }

  if (data.credential_id) {
    const credential = await selectCredential(userId, Number(data.credential_id));
    if (!credential) {
      const error = new Error('Credencial de coleta ativa nao encontrada ou sem limite disponivel');
      error.status = 400;
      throw error;
    }
  }

  if (ruleId) {
    const current = await query(
      `SELECT * FROM collection_automation_rules WHERE id = $1 AND user_id = $2`,
      [ruleId, userId]
    );
    if (!current.rows[0]) {
      const error = new Error('Regra de coleta automatica nao encontrada');
      error.status = 404;
      throw error;
    }

    const merged = { ...current.rows[0], ...data };
    const updated = await query(
      `UPDATE collection_automation_rules SET
        credential_id = $1,
        name = $2,
        enabled = $3,
        query = $4,
        niche = $5,
        city = $6,
        region = $7,
        language = $8,
        limit_requested = $9,
        verify_whatsapp_exists = $10,
        extract_emails_and_contacts = $11,
        force_refresh = $12,
        min_interval_minutes = $13,
        next_run_at = $14,
        paused_until = $15,
        pause_reason = $16,
        max_consecutive_failures = $17,
        optimization_weight = $18,
        optimization_locked = $19,
        updated_at = NOW()
       WHERE id = $20 AND user_id = $21
       RETURNING *`,
      [
        merged.credential_id || null,
        clean(merged.name),
        merged.enabled === true,
        clean(merged.query) || null,
        clean(merged.niche) || null,
        clean(merged.city) || null,
        clean(merged.region) || 'br',
        clean(merged.language) || 'pt',
        asInt(merged.limit_requested ?? merged.limit, 20, 1, 100),
        merged.verify_whatsapp_exists === true,
        merged.extract_emails_and_contacts === true,
        merged.force_refresh === true,
        asInt(merged.min_interval_minutes, 1440, 15, 43200),
        merged.next_run_at || merged.nextRunAt || new Date(),
        merged.paused_until ?? merged.pausedUntil ?? null,
        clean(merged.pause_reason ?? merged.pauseReason) || null,
        asInt(merged.max_consecutive_failures, 3, 1, 10),
        asInt(merged.optimization_weight, 100, 1, 300),
        merged.optimization_locked === true,
        ruleId,
        userId,
      ]
    );
    return mapRule(updated.rows[0]);
  }

  const created = await query(
    `INSERT INTO collection_automation_rules (
      user_id, credential_id, name, enabled, query, niche, city, region, language,
      limit_requested, verify_whatsapp_exists, extract_emails_and_contacts, force_refresh,
      min_interval_minutes, next_run_at, max_consecutive_failures,
      optimization_weight, optimization_locked
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16,
      $17, $18
    )
    RETURNING *`,
    [
      userId,
      data.credential_id || null,
      name,
      data.enabled === true,
      searchQuery || null,
      niche || null,
      city || null,
      clean(data.region) || 'br',
      clean(data.language) || 'pt',
      asInt(data.limit_requested ?? data.limit, 20, 1, 100),
      data.verify_whatsapp_exists === true,
      data.extract_emails_and_contacts === true,
      data.force_refresh === true,
      asInt(data.min_interval_minutes, 1440, 15, 43200),
      data.next_run_at || data.nextRunAt || new Date(),
      asInt(data.max_consecutive_failures, 3, 1, 10),
      asInt(data.optimization_weight, 100, 1, 300),
      data.optimization_locked === true,
    ]
  );

  return mapRule(created.rows[0]);
}

async function markRuleSuccess(userId, ruleId, runId, intervalMinutes) {
  const result = await query(
    `UPDATE collection_automation_rules SET
       consecutive_failures = 0,
       pause_reason = NULL,
       paused_until = NULL,
       last_run_id = $1,
       last_run_at = NOW(),
       next_run_at = NOW() + ($2::int * INTERVAL '1 minute'),
       updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [runId, intervalMinutes, ruleId, userId]
  );
  return mapRule(result.rows[0]);
}

async function markRuleFailure(userId, rule, runId, error) {
  const nextFailures = Number(rule.consecutive_failures || 0) + 1;
  const shouldPause = nextFailures >= Number(rule.max_consecutive_failures || 3);
  const result = await query(
    `UPDATE collection_automation_rules SET
       consecutive_failures = $1,
       pause_reason = $2,
       paused_until = CASE WHEN $3 THEN NOW() + INTERVAL '24 hours' ELSE paused_until END,
       last_run_id = $4,
       last_run_at = NOW(),
       next_run_at = CASE WHEN $3 THEN next_run_at ELSE NOW() + (LEAST(min_interval_minutes, 60)::int * INTERVAL '1 minute') END,
       updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [nextFailures, error.message, shouldPause, runId || null, rule.id, userId]
  );

  return {
    rule: mapRule(result.rows[0]),
    paused: shouldPause,
    consecutiveFailures: nextFailures,
  };
}

export async function executeCollectionAutomationRule(userId, rule, options = {}) {
  const credential = await selectCredential(userId, rule.credential_id);
  if (!credential) {
    const error = new Error('Nenhuma credencial de coleta ativa com limite disponivel');
    const failure = await markRuleFailure(userId, rule, null, error);
    return {
      rule_id: rule.id,
      status: 'failed',
      paused: failure.paused,
      error: error.message,
      rule: failure.rule,
    };
  }

  const searchQuery = buildSearchQuery(rule);
  const input = {
    credentialId: credential.id,
    sourceType: credential.type,
    query: searchQuery,
    city: rule.city,
    niche: rule.niche,
    limit: rule.limit_requested || 20,
    region: rule.region || 'br',
    language: rule.language || 'pt',
    verifyWhatsAppExists: rule.verify_whatsapp_exists,
    extractEmailsAndContacts: rule.extract_emails_and_contacts,
    params: {},
  };
  const cacheKey = buildCollectionCacheKey(input);
  const run = await createCollectionRun(userId, { ...input, cacheKey });

  try {
    await addCollectionRunLog(run.id, userId, 'info', 'automation_collection_started', 'Coleta automatica iniciada', {
      ruleId: rule.id,
      query: searchQuery,
      city: rule.city,
      niche: rule.niche,
      credentialId: credential.id,
      limit: input.limit,
    });

    let collection = null;
    let cacheHit = false;

    if (!rule.force_refresh) {
      const cached = await getCollectionCache(userId, cacheKey);
      if (cached?.response_json) {
        collection = cached.response_json;
        cacheHit = true;
        await addCollectionRunLog(run.id, userId, 'info', 'cache_hit', 'Resultado reaproveitado do cache de coleta automatica', {
          cacheId: cached.id,
        });
      }
    }

    if (!collection) {
      const collector = options.collector || collectLeads;
      collection = await collector(userId, {
        credentialId: credential.id,
        query: searchQuery,
        city: rule.city,
        niche: rule.niche,
        limit: input.limit,
        region: rule.region,
        language: rule.language,
        verifyWhatsAppExists: rule.verify_whatsapp_exists,
        extractEmailsAndContacts: rule.extract_emails_and_contacts,
      });

      await saveCollectionCache(userId, {
        ...input,
        cacheKey,
        sourceType: collection.sourceType || credential.type,
      }, collection);

      await addCollectionRunLog(run.id, userId, 'info', 'provider_collected', 'Provider retornou leads para coleta automatica', {
        total: collection.total,
        sourceType: collection.sourceType,
        credentialId: collection.credentialUsed || credential.id,
      });
    }

    const saver = options.saver || saveLeadsWithDeduplication;
    const leadsToSave = collection.leads || [];
    const { saved, duplicates, errors } = await saver(userId, leadsToSave);

    for (const saveError of errors) {
      await addCollectionRunLog(run.id, userId, 'error', 'lead_save_failed', 'Falha ao salvar lead coletado automaticamente', saveError);
    }

    await addCollectionRunLog(run.id, userId, 'info', 'database_saved', 'Coleta automatica persistida com deduplicacao', {
      saved: saved.length,
      duplicates: duplicates.length,
      errors: errors.length,
    });

    const finishedRun = await finishCollectionRun(run.id, userId, {
      sourceType: collection.sourceType || credential.type,
      totalFound: collection.total || leadsToSave.length,
      savedCount: saved.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      cacheHit,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
    });
    const updatedRule = await markRuleSuccess(userId, rule.id, run.id, rule.min_interval_minutes || 1440);

    return {
      rule_id: rule.id,
      status: finishedRun.status,
      collection_run_id: run.id,
      cache_hit: cacheHit,
      total: collection.total || leadsToSave.length,
      saved: saved.length,
      duplicates: duplicates.length,
      errors: errors.length,
      rule: updatedRule,
    };
  } catch (error) {
    await addCollectionRunLog(run.id, userId, 'error', 'automation_collection_failed', error.message, {
      ruleId: rule.id,
      name: error.name,
    });
    await finishCollectionRun(run.id, userId, {
      status: 'failed',
      errorMessage: error.message,
    });

    const failure = await markRuleFailure(userId, rule, run.id, error);
    return {
      rule_id: rule.id,
      status: 'failed',
      collection_run_id: run.id,
      paused: failure.paused,
      consecutive_failures: failure.consecutiveFailures,
      error: error.message,
      rule: failure.rule,
    };
  }
}

export async function runDueCollectionAutomations(userId, options = {}) {
  const limit = asInt(options.limit, 5, 1, 50);
  const result = await query(
    `SELECT *
     FROM collection_automation_rules
     WHERE user_id = $1
       AND enabled = TRUE
       AND next_run_at <= NOW()
       AND (paused_until IS NULL OR paused_until <= NOW())
     ORDER BY next_run_at ASC, COALESCE(optimization_weight, 100) DESC, id ASC
     LIMIT $2`,
    [userId, limit]
  );

  const results = [];
  for (const row of result.rows) {
    const rule = mapRule(row);
    results.push(await executeCollectionAutomationRule(userId, rule, options));
  }

  return {
    userId,
    evaluated: result.rows.length,
    results,
  };
}
