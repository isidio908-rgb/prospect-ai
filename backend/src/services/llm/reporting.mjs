import { query } from '../../database/init.mjs';

const PURPOSE_LABELS = {
  assistant: 'Assistente',
  bdr_initial: 'BDR inicial',
  followup_1: 'Follow-up 1',
  followup_2: 'Follow-up 2',
  sdr_reply: 'SDR resposta',
};

function clampLimit(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), 200);
}

function clampOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(Math.trunc(parsed), 0);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeFilterText(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().slice(0, 120) || null;
}

function sanitizeErrorMessage(value) {
  if (!value) return null;
  const text = String(value).slice(0, 240);
  if (/api[_-]?key|secret|bearer|token|x-api-key|prompt|chave/i.test(text)) {
    return 'Erro do provider registrado; detalhes sensíveis foram omitidos.';
  }
  return text;
}

function mapGeneration(row) {
  return {
    id: row.id,
    lead_id: row.lead_id,
    lead_name: row.lead_name,
    purpose: row.purpose,
    purpose_label: PURPOSE_LABELS[row.purpose] || row.purpose,
    provider: row.provider,
    model: row.model,
    status: row.status,
    prompt_tokens: Number(row.prompt_tokens || 0),
    completion_tokens: Number(row.completion_tokens || 0),
    total_tokens: Number(row.total_tokens || 0),
    usage_estimated: Boolean(row.usage_estimated),
    estimated_cost_usd: Number(row.estimated_cost_usd || 0),
    prompt_chars: Number(row.prompt_chars || 0),
    response_chars: Number(row.response_chars || 0),
    duration_ms: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms),
    error_message: sanitizeErrorMessage(row.error_message),
    created_at: row.created_at,
  };
}

function buildFilters(userId, filters = {}) {
  const values = [userId];
  const where = ['lg.user_id = $1'];

  const from = normalizeDate(filters.from);
  if (from) {
    values.push(from);
    where.push(`lg.created_at >= $${values.length}`);
  }

  const to = normalizeDate(filters.to);
  if (to) {
    values.push(to);
    where.push(`lg.created_at <= $${values.length}`);
  }

  const provider = normalizeFilterText(filters.provider);
  if (provider) {
    values.push(provider);
    where.push(`lg.provider = $${values.length}`);
  }

  const model = normalizeFilterText(filters.model);
  if (model) {
    values.push(model);
    where.push(`lg.model = $${values.length}`);
  }

  const purpose = normalizeFilterText(filters.purpose);
  if (purpose) {
    values.push(purpose);
    where.push(`lg.purpose = $${values.length}`);
  }

  const status = normalizeFilterText(filters.status);
  if (status) {
    values.push(status);
    where.push(`lg.status = $${values.length}`);
  }

  const leadId = Number(filters.lead_id);
  if (Number.isInteger(leadId) && leadId > 0) {
    values.push(leadId);
    where.push(`lg.lead_id = $${values.length}`);
  }

  return { values, where: where.join(' AND ') };
}

export async function getLlmUsageReport(userId, filters = {}) {
  const limit = clampLimit(filters.limit);
  const offset = clampOffset(filters.offset);
  const { values, where } = buildFilters(userId, filters);

  const totalResult = await query(
    `SELECT
       COUNT(*)::int as total_count,
       COALESCE(SUM(total_tokens), 0)::int as total_tokens,
       COALESCE(SUM(prompt_tokens), 0)::int as prompt_tokens,
       COALESCE(SUM(completion_tokens), 0)::int as completion_tokens,
       COALESCE(SUM(estimated_cost_usd), 0)::numeric as estimated_cost_usd,
       COUNT(*) FILTER (WHERE status <> 'success')::int as error_count,
       COUNT(*) FILTER (WHERE usage_estimated = TRUE)::int as estimated_usage_count,
       AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)::numeric as avg_duration_ms
     FROM llm_generations lg
     WHERE ${where}`,
    values
  );

  const groupedResult = await query(
    `SELECT
       provider,
       model,
       purpose,
       COUNT(*)::int as total_count,
       COALESCE(SUM(total_tokens), 0)::int as total_tokens,
       COALESCE(SUM(estimated_cost_usd), 0)::numeric as estimated_cost_usd,
       COUNT(*) FILTER (WHERE status <> 'success')::int as error_count,
       COUNT(*) FILTER (WHERE usage_estimated = TRUE)::int as estimated_usage_count
     FROM llm_generations lg
     WHERE ${where}
     GROUP BY provider, model, purpose
     ORDER BY estimated_cost_usd DESC, total_count DESC
     LIMIT 20`,
    values
  );

  const dailyResult = await query(
    `SELECT
       DATE_TRUNC('day', created_at)::date as day,
       COUNT(*)::int as total_count,
       COALESCE(SUM(total_tokens), 0)::int as total_tokens,
       COALESCE(SUM(estimated_cost_usd), 0)::numeric as estimated_cost_usd,
       COUNT(*) FILTER (WHERE status <> 'success')::int as error_count
     FROM llm_generations lg
     WHERE ${where}
     GROUP BY DATE_TRUNC('day', created_at)::date
     ORDER BY day DESC
     LIMIT 31`,
    values
  );

  const listValues = [...values, limit, offset];
  const generationsResult = await query(
    `SELECT
       lg.id, lg.lead_id, l.nome_empresa as lead_name, lg.purpose, lg.provider, lg.model,
       lg.status, lg.prompt_tokens, lg.completion_tokens, lg.total_tokens,
       lg.usage_estimated, lg.estimated_cost_usd, lg.prompt_chars, lg.response_chars,
       lg.duration_ms, lg.error_message, lg.created_at
     FROM llm_generations lg
     LEFT JOIN leads l ON l.id = lg.lead_id AND l.user_id = lg.user_id
     WHERE ${where}
     ORDER BY lg.created_at DESC, lg.id DESC
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues
  );

  const summary = totalResult.rows[0] || {};
  const totalCount = Number(summary.total_count || 0);

  return {
    summary: {
      total_count: totalCount,
      total_tokens: Number(summary.total_tokens || 0),
      prompt_tokens: Number(summary.prompt_tokens || 0),
      completion_tokens: Number(summary.completion_tokens || 0),
      estimated_cost_usd: Number(summary.estimated_cost_usd || 0),
      error_count: Number(summary.error_count || 0),
      estimated_usage_count: Number(summary.estimated_usage_count || 0),
      avg_duration_ms: summary.avg_duration_ms === null || summary.avg_duration_ms === undefined ? null : Number(summary.avg_duration_ms),
      error_rate: totalCount ? Number(((Number(summary.error_count || 0) / totalCount) * 100).toFixed(2)) : 0,
    },
    groups: groupedResult.rows.map((row) => {
      const count = Number(row.total_count || 0);
      const errors = Number(row.error_count || 0);
      return {
        provider: row.provider,
        model: row.model,
        purpose: row.purpose,
        purpose_label: PURPOSE_LABELS[row.purpose] || row.purpose,
        total_count: count,
        total_tokens: Number(row.total_tokens || 0),
        estimated_cost_usd: Number(row.estimated_cost_usd || 0),
        error_count: errors,
        estimated_usage_count: Number(row.estimated_usage_count || 0),
        error_rate: count ? Number(((errors / count) * 100).toFixed(2)) : 0,
      };
    }),
    daily: dailyResult.rows.map((row) => ({
      day: row.day,
      total_count: Number(row.total_count || 0),
      total_tokens: Number(row.total_tokens || 0),
      estimated_cost_usd: Number(row.estimated_cost_usd || 0),
      error_count: Number(row.error_count || 0),
    })),
    generations: generationsResult.rows.map(mapGeneration),
    pagination: {
      limit,
      offset,
      total: totalCount,
      has_more: offset + generationsResult.rows.length < totalCount,
    },
    filters: {
      from: normalizeDate(filters.from),
      to: normalizeDate(filters.to),
      provider: normalizeFilterText(filters.provider),
      model: normalizeFilterText(filters.model),
      purpose: normalizeFilterText(filters.purpose),
      status: normalizeFilterText(filters.status),
      lead_id: Number.isInteger(Number(filters.lead_id)) ? Number(filters.lead_id) : null,
    },
  };
}

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportLlmUsageCsv(userId, filters = {}) {
  const report = await getLlmUsageReport(userId, { ...filters, limit: 200, offset: 0 });
  const headers = [
    'id',
    'created_at',
    'lead_id',
    'lead_name',
    'purpose',
    'provider',
    'model',
    'status',
    'total_tokens',
    'usage_estimated',
    'estimated_cost_usd',
    'duration_ms',
  ];
  const lines = [headers.join(',')];

  for (const generation of report.generations) {
    lines.push(headers.map((header) => csvValue(generation[header])).join(','));
  }

  return lines.join('\n');
}
