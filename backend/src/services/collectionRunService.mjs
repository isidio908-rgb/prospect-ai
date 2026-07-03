import crypto from 'crypto';
import { query } from '../database/init.mjs';

const DEFAULT_CACHE_TTL_MINUTES = Number(process.env.COLLECTION_CACHE_TTL_MINUTES || 1440);

function normalizeString(value) {
  return String(value || '').trim().toLowerCase();
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
  );
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

export function buildCollectionCacheKey(input = {}) {
  const signature = compactObject({
    credentialId: input.credentialId,
    query: normalizeString(input.query),
    city: normalizeString(input.city),
    niche: normalizeString(input.niche),
    region: normalizeString(input.region || 'br'),
    language: normalizeString(input.language || 'pt'),
    limit: Number(input.limit || 20),
    lat: input.lat,
    lng: input.lng,
    zoom: input.zoom,
    extractEmailsAndContacts: Boolean(input.extractEmailsAndContacts),
    verifyWhatsAppExists: Boolean(input.verifyWhatsAppExists),
  });

  return crypto.createHash('sha256').update(stableStringify(signature)).digest('hex');
}

export async function createCollectionRun(userId, input = {}) {
  const result = await query(
    `INSERT INTO collection_runs (
      user_id, credential_id, source_type, query, niche, city, region,
      limit_requested, whatsapp_check_enabled, cache_key, status, started_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'running', NOW())
    RETURNING id, started_at`,
    [
      userId,
      input.credentialId || null,
      input.sourceType || null,
      input.query || null,
      input.niche || null,
      input.city || null,
      input.region || null,
      input.limit || null,
      Boolean(input.verifyWhatsAppExists),
      input.cacheKey || null,
    ]
  );

  return result.rows[0];
}

export async function addCollectionRunLog(runId, userId, level, event, message, metadata = {}) {
  if (!runId) return null;

  const result = await query(
    `INSERT INTO collection_run_logs (run_id, user_id, level, event, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [runId, userId, level, event, message, JSON.stringify(metadata || {})]
  );

  return result.rows[0];
}

export async function finishCollectionRun(runId, userId, patch = {}) {
  if (!runId) return null;

  const result = await query(
    `UPDATE collection_runs SET
      source_type = COALESCE($3, source_type),
      total_found = COALESCE($4, total_found),
      saved_count = COALESCE($5, saved_count),
      duplicate_count = COALESCE($6, duplicate_count),
      error_count = COALESCE($7, error_count),
      whatsapp_verified_count = COALESCE($8, whatsapp_verified_count),
      whatsapp_rejected_count = COALESCE($9, whatsapp_rejected_count),
      without_phone_count = COALESCE($10, without_phone_count),
      cache_hit = COALESCE($11, cache_hit),
      status = COALESCE($12, status),
      error_message = $13,
      finished_at = NOW(),
      updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [
      runId,
      userId,
      patch.sourceType ?? null,
      patch.totalFound ?? null,
      patch.savedCount ?? null,
      patch.duplicateCount ?? null,
      patch.errorCount ?? null,
      patch.whatsappVerifiedCount ?? null,
      patch.whatsappRejectedCount ?? null,
      patch.withoutPhoneCount ?? null,
      patch.cacheHit ?? null,
      patch.status ?? null,
      patch.errorMessage ?? null,
    ]
  );

  return result.rows[0] || null;
}

export async function getCollectionCache(userId, cacheKey) {
  if (!cacheKey) return null;

  const result = await query(
    `SELECT id, response_json, created_at, expires_at
     FROM collection_cache
     WHERE user_id = $1 AND cache_key = $2 AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, cacheKey]
  );

  return result.rows[0] || null;
}

export async function saveCollectionCache(userId, input = {}, responseJson = {}) {
  const cacheKey = input.cacheKey || buildCollectionCacheKey(input);
  const ttlMinutes = Number(input.ttlMinutes || DEFAULT_CACHE_TTL_MINUTES);

  const result = await query(
    `INSERT INTO collection_cache (
      user_id, cache_key, source_type, query, niche, city, region,
      limit_requested, params_json, response_json, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + ($11 || ' minutes')::INTERVAL)
    ON CONFLICT (user_id, cache_key)
    DO UPDATE SET
      source_type = EXCLUDED.source_type,
      query = EXCLUDED.query,
      niche = EXCLUDED.niche,
      city = EXCLUDED.city,
      region = EXCLUDED.region,
      limit_requested = EXCLUDED.limit_requested,
      params_json = EXCLUDED.params_json,
      response_json = EXCLUDED.response_json,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
    RETURNING id, expires_at`,
    [
      userId,
      cacheKey,
      input.sourceType || null,
      input.query || null,
      input.niche || null,
      input.city || null,
      input.region || null,
      input.limit || null,
      JSON.stringify(input.params || {}),
      JSON.stringify(responseJson || {}),
      ttlMinutes,
    ]
  );

  return result.rows[0];
}

export async function listCollectionRuns(userId, options = {}) {
  const limit = Math.min(Number(options.limit || 30), 100);
  const offset = Math.max(Number(options.offset || 0), 0);

  const result = await query(
    `SELECT
      cr.id, cr.credential_id, c.name as credential_name, cr.source_type,
      cr.query, cr.niche, cr.city, cr.region, cr.limit_requested,
      cr.total_found, cr.saved_count, cr.duplicate_count, cr.error_count,
      cr.whatsapp_check_enabled, cr.whatsapp_verified_count,
      cr.whatsapp_rejected_count, cr.without_phone_count,
      cr.cache_hit, cr.status, cr.error_message,
      cr.started_at, cr.finished_at, cr.created_at
     FROM collection_runs cr
     LEFT JOIN credentials c ON c.id = cr.credential_id AND c.user_id = cr.user_id
     WHERE cr.user_id = $1
     ORDER BY cr.started_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

export async function listCollectionRunLogs(userId, runId) {
  const result = await query(
    `SELECT id, level, event, message, metadata, created_at
     FROM collection_run_logs
     WHERE user_id = $1 AND run_id = $2
     ORDER BY created_at ASC`,
    [userId, runId]
  );

  return result.rows;
}
