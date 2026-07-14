import { query } from '../../database/init.mjs';

const DEFAULT_SETTINGS = {
  enabled: false,
  min_sample_size: 10,
  max_weight_delta_percent: 20,
  metadata: {},
};

function clean(value) {
  return String(value || '').trim();
}

function asInt(value, fallback, min = 1, max = 300) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function scopeKey(row = {}) {
  return [
    clean(row.niche || row.nicho).toLowerCase() || 'sem-nicho',
    clean(row.city || row.cidade).toLowerCase() || 'sem-cidade',
    clean(row.source_type || row.fonte).toLowerCase() || 'sem-fonte',
  ].join('|');
}

function buildReason(metrics, recommendation) {
  if (!recommendation.eligible) {
    return `Amostra insuficiente: ${metrics.leads_count}/${recommendation.min_sample_size} leads.`;
  }

  const parts = [
    `Resposta ${(metrics.response_rate * 100).toFixed(1)}%`,
    `agendamento ${(metrics.meeting_rate * 100).toFixed(1)}%`,
    `perda ${(metrics.lost_rate * 100).toFixed(1)}%`,
  ];

  if (recommendation.direction === 'increase') {
    parts.push(`aumentar peso em ${recommendation.delta_percent}%`);
  } else if (recommendation.direction === 'decrease') {
    parts.push(`reduzir peso em ${Math.abs(recommendation.delta_percent)}%`);
  } else {
    parts.push('manter peso atual');
  }

  return parts.join('; ');
}

function rankRows(rows, settings) {
  const maxDelta = asInt(settings.max_weight_delta_percent, 20, 1, 80);
  const minSample = asInt(settings.min_sample_size, 10, 1, 1000);

  return rows.map((row) => {
    const leads = Number(row.leads_count || 0);
    const responseRate = leads ? Number(row.replied_count || 0) / leads : 0;
    const interestRate = leads ? Number(row.interested_count || 0) / leads : 0;
    const meetingRate = leads ? Number(row.meeting_count || 0) / leads : 0;
    const lostRate = leads ? Number(row.lost_count || 0) / leads : 0;
    const avgScore = Number(row.avg_score || 0);
    const cost = Number(row.estimated_cost_usd || 0);
    const costPenalty = cost > 0 ? Math.min(cost / Math.max(leads, 1), 1) * 4 : 0;
    const performanceScore = clamp(
      (responseRate * 30) + (interestRate * 20) + (meetingRate * 45) + (avgScore / 5) - (lostRate * 25) - costPenalty,
      0,
      100
    );
    const eligible = leads >= minSample;
    let direction = 'hold';
    let deltaPercent = 0;

    if (eligible && performanceScore >= 55) {
      direction = 'increase';
      deltaPercent = Math.round(Math.min(maxDelta, 8 + (performanceScore - 55) / 2));
    } else if (eligible && performanceScore < 35) {
      direction = 'decrease';
      deltaPercent = -Math.round(Math.min(maxDelta, 8 + (35 - performanceScore) / 2));
    }

    const currentWeight = asInt(row.current_weight, 100, 1, 300);
    const proposedWeight = clamp(Math.round(currentWeight * (1 + (deltaPercent / 100))), 1, 300);
    const metrics = {
      scope_key: scopeKey(row),
      niche: row.niche || 'Sem nicho',
      city: row.city || 'Sem cidade',
      source_type: row.source_type || 'Sem fonte',
      leads_count: leads,
      sent_count: Number(row.sent_count || 0),
      replied_count: Number(row.replied_count || 0),
      interested_count: Number(row.interested_count || 0),
      meeting_count: Number(row.meeting_count || 0),
      lost_count: Number(row.lost_count || 0),
      avg_score: Number(avgScore.toFixed(2)),
      estimated_cost_usd: Number(cost.toFixed(6)),
      response_rate: Number(responseRate.toFixed(4)),
      interest_rate: Number(interestRate.toFixed(4)),
      meeting_rate: Number(meetingRate.toFixed(4)),
      lost_rate: Number(lostRate.toFixed(4)),
      performance_score: Number(performanceScore.toFixed(2)),
      current_weight: currentWeight,
      proposed_weight: proposedWeight,
      collection_rule_ids: row.collection_rule_ids || [],
    };

    const recommendation = {
      eligible,
      min_sample_size: minSample,
      direction,
      delta_percent: deltaPercent,
      current_weight: currentWeight,
      proposed_weight: proposedWeight,
      reason: '',
    };
    recommendation.reason = buildReason(metrics, recommendation);

    return { ...metrics, recommendation };
  }).sort((left, right) => right.performance_score - left.performance_score);
}

export async function getNicheOptimizationSettings(userId) {
  const result = await query(
    `INSERT INTO niche_optimization_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING user_id, enabled, min_sample_size, max_weight_delta_percent, last_applied_at, metadata, created_at, updated_at`,
    [userId]
  );

  if (result.rows[0]) return { ...DEFAULT_SETTINGS, ...result.rows[0] };

  const current = await query(
    `SELECT user_id, enabled, min_sample_size, max_weight_delta_percent, last_applied_at, metadata, created_at, updated_at
     FROM niche_optimization_settings
     WHERE user_id = $1`,
    [userId]
  );
  return { ...DEFAULT_SETTINGS, ...current.rows[0] };
}

export async function updateNicheOptimizationSettings(userId, data = {}) {
  const result = await query(
    `INSERT INTO niche_optimization_settings (
      user_id, enabled, min_sample_size, max_weight_delta_percent, metadata, updated_at
    ) VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      min_sample_size = EXCLUDED.min_sample_size,
      max_weight_delta_percent = EXCLUDED.max_weight_delta_percent,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING user_id, enabled, min_sample_size, max_weight_delta_percent, last_applied_at, metadata, created_at, updated_at`,
    [
      userId,
      data.enabled === true,
      asInt(data.min_sample_size, DEFAULT_SETTINGS.min_sample_size, 1, 1000),
      asInt(data.max_weight_delta_percent, DEFAULT_SETTINGS.max_weight_delta_percent, 1, 80),
      JSON.stringify(data.metadata || {}),
    ]
  );
  return result.rows[0];
}

export async function getNicheOptimization(userId) {
  const settings = await getNicheOptimizationSettings(userId);
  const result = await query(
    `WITH lead_metrics AS (
       SELECT
         LOWER(COALESCE(NULLIF(l.nicho, ''), 'sem nicho')) as niche_key,
         LOWER(COALESCE(NULLIF(l.cidade, ''), 'sem cidade')) as city_key,
         LOWER(COALESCE(NULLIF(l.fonte, ''), 'sem fonte')) as source_key,
         COALESCE(NULLIF(l.nicho, ''), 'Sem nicho') as niche,
         COALESCE(NULLIF(l.cidade, ''), 'Sem cidade') as city,
         COALESCE(NULLIF(l.fonte, ''), 'Sem fonte') as source_type,
         COUNT(*)::int as leads_count,
         COUNT(*) FILTER (WHERE l.status IN ('respondeu', 'reuniao_marcada', 'cliente_fechado'))::int as interested_count,
         COUNT(*) FILTER (WHERE l.status IN ('reuniao_marcada', 'cliente_fechado'))::int as meeting_count,
         COUNT(*) FILTER (WHERE l.status = 'sem_interesse')::int as lost_count,
         AVG(COALESCE(l.score, 0)) as avg_score
       FROM leads l
       WHERE l.user_id = $1
       GROUP BY 1, 2, 3, 4, 5, 6
     ),
     message_metrics AS (
       SELECT
         LOWER(COALESCE(NULLIF(l.nicho, ''), 'sem nicho')) as niche_key,
         LOWER(COALESCE(NULLIF(l.cidade, ''), 'sem cidade')) as city_key,
         LOWER(COALESCE(NULLIF(l.fonte, ''), 'sem fonte')) as source_key,
         COUNT(DISTINCT mq.id) FILTER (WHERE mq.status = 'sent')::int as sent_count,
         COUNT(DISTINCT wm.id) FILTER (WHERE wm.direction = 'received')::int as replied_count
       FROM leads l
       LEFT JOIN message_queue mq ON mq.user_id = l.user_id AND mq.lead_id = l.id
       LEFT JOIN whatsapp_messages wm ON wm.user_id = l.user_id AND wm.lead_id = l.id
       WHERE l.user_id = $1
       GROUP BY 1, 2, 3
     ),
     cost_metrics AS (
       SELECT
         LOWER(COALESCE(NULLIF(l.nicho, ''), 'sem nicho')) as niche_key,
         LOWER(COALESCE(NULLIF(l.cidade, ''), 'sem cidade')) as city_key,
         LOWER(COALESCE(NULLIF(l.fonte, ''), 'sem fonte')) as source_key,
         COALESCE(SUM(lg.estimated_cost_usd), 0) as estimated_cost_usd
       FROM leads l
       LEFT JOIN llm_generations lg ON lg.user_id = l.user_id AND lg.lead_id = l.id
       WHERE l.user_id = $1
       GROUP BY 1, 2, 3
     ),
     rule_metrics AS (
       SELECT
         LOWER(COALESCE(NULLIF(niche, ''), 'sem nicho')) as niche_key,
         LOWER(COALESCE(NULLIF(city, ''), 'sem cidade')) as city_key,
         LOWER(COALESCE(NULLIF('serper', ''), 'sem fonte')) as source_key,
         ROUND(AVG(COALESCE(optimization_weight, 100)))::int as current_weight,
         ARRAY_AGG(id ORDER BY id ASC) as collection_rule_ids
       FROM collection_automation_rules
       WHERE user_id = $1
       GROUP BY 1, 2, 3
     )
     SELECT
       lm.niche,
       lm.city,
       lm.source_type,
       lm.leads_count,
       lm.interested_count,
       lm.meeting_count,
       lm.lost_count,
       lm.avg_score,
       COALESCE(mm.sent_count, 0)::int as sent_count,
       COALESCE(mm.replied_count, 0)::int as replied_count,
       COALESCE(cm.estimated_cost_usd, 0) as estimated_cost_usd,
       COALESCE(rm.current_weight, 100)::int as current_weight,
       COALESCE(rm.collection_rule_ids, ARRAY[]::int[]) as collection_rule_ids
     FROM lead_metrics lm
     LEFT JOIN message_metrics mm ON mm.niche_key = lm.niche_key AND mm.city_key = lm.city_key AND mm.source_key = lm.source_key
     LEFT JOIN cost_metrics cm ON cm.niche_key = lm.niche_key AND cm.city_key = lm.city_key AND cm.source_key = lm.source_key
     LEFT JOIN rule_metrics rm ON rm.niche_key = lm.niche_key AND rm.city_key = lm.city_key
     ORDER BY lm.leads_count DESC, lm.avg_score DESC
     LIMIT 50`,
    [userId]
  );

  const rankings = rankRows(result.rows, settings);
  return {
    settings,
    rankings,
    recommendations: rankings.filter((row) => row.recommendation.eligible && row.recommendation.direction !== 'hold'),
    summary: {
      scopes: rankings.length,
      eligible_scopes: rankings.filter((row) => row.recommendation.eligible).length,
      recommendations: rankings.filter((row) => row.recommendation.eligible && row.recommendation.direction !== 'hold').length,
    },
  };
}

export async function applyNicheOptimization(userId, options = {}) {
  const optimization = await getNicheOptimization(userId);
  const settings = optimization.settings;
  const requestedScopes = Array.isArray(options.scope_keys) ? new Set(options.scope_keys.map(String)) : null;
  const automatic = options.mode === 'automatic';

  if (automatic && settings.enabled !== true) {
    const error = new Error('Otimização automática de nichos não está habilitada');
    error.status = 400;
    throw error;
  }

  const selected = optimization.recommendations.filter((item) => (
    !requestedScopes || requestedScopes.has(item.scope_key)
  ));

  if (selected.length === 0) {
    return { appliedCount: 0, applied: [], reason: 'Nenhuma recomendação elegível para aplicar' };
  }

  const applied = [];
  for (const item of selected) {
    const rules = await query(
      `SELECT id, optimization_weight
       FROM collection_automation_rules
       WHERE user_id = $1
         AND optimization_locked = FALSE
         AND LOWER(COALESCE(NULLIF(niche, ''), 'sem nicho')) = LOWER($2)
         AND LOWER(COALESCE(NULLIF(city, ''), 'sem cidade')) = LOWER($3)
       ORDER BY id ASC`,
      [userId, item.niche, item.city]
    );

    for (const rule of rules.rows) {
      const previousWeight = asInt(rule.optimization_weight, 100, 1, 300);
      const newWeight = item.recommendation.proposed_weight;
      if (previousWeight === newWeight) continue;

      await query(
        `UPDATE collection_automation_rules
         SET optimization_weight = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [newWeight, rule.id, userId]
      );
      applied.push({
        rule_id: rule.id,
        scope_key: item.scope_key,
        previous_weight: previousWeight,
        new_weight: newWeight,
        recommendation: item.recommendation,
      });
    }
  }

  const event = await query(
    `INSERT INTO niche_optimization_events (
      user_id, event, scope_key, previous_weight, new_weight, recommendation, metadata
    ) VALUES ($1, $2, $3, NULL, NULL, $4::jsonb, $5::jsonb)
    RETURNING *`,
    [
      userId,
      automatic ? 'optimization_auto_applied' : 'optimization_applied',
      applied.map((item) => item.scope_key).join(',').slice(0, 500) || null,
      JSON.stringify(selected.map((item) => item.recommendation)),
      JSON.stringify({ applied, mode: options.mode || 'approved' }),
    ]
  );

  await query(
    `UPDATE niche_optimization_settings SET last_applied_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
    [userId]
  );

  return { appliedCount: applied.length, applied, event: event.rows[0] };
}

export async function rollbackNicheOptimization(userId, options = {}) {
  const eventResult = await query(
    `SELECT *
     FROM niche_optimization_events
     WHERE user_id = $1
       AND event IN ('optimization_applied', 'optimization_auto_applied')
       AND ($2::int IS NULL OR id = $2)
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, options.event_id ? Number(options.event_id) : null]
  );
  const event = eventResult.rows[0];
  if (!event) {
    const error = new Error('Evento de otimização para rollback não encontrado');
    error.status = 404;
    throw error;
  }

  const applied = Array.isArray(event.metadata?.applied) ? event.metadata.applied : [];
  const rolledBack = [];
  for (const item of applied) {
    await query(
      `UPDATE collection_automation_rules
       SET optimization_weight = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [item.previous_weight, item.rule_id, userId]
    );
    rolledBack.push(item);
  }

  const rollbackEvent = await query(
    `INSERT INTO niche_optimization_events (user_id, event, scope_key, metadata)
     VALUES ($1, 'optimization_rollback', $2, $3::jsonb)
     RETURNING *`,
    [userId, event.scope_key, JSON.stringify({ source_event_id: event.id, rolledBack })]
  );

  return { rolledBackCount: rolledBack.length, rolledBack, event: rollbackEvent.rows[0] };
}
