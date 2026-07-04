export const AUTOPILOT_MODES = ['assistido', 'automatico'];
export const MESSAGE_TYPES = ['initial', 'followup_1', 'followup_2'];
export const MESSAGE_STATUSES = ['pending', 'approved', 'queued', 'sent', 'skipped', 'failed', 'cancelled'];

const INITIAL_ELIGIBLE_STATUSES = ['novo', 'analisado', 'mensagem_pronta'];
const ACTIVE_MESSAGE_STATUSES = ['pending', 'approved', 'queued', 'sent'];

export const DEFAULT_AUTOPILOT_RULE = {
  enabled: false,
  mode: 'assistido',
  min_score: 60,
  max_daily_sends: 20,
  max_hourly_sends: 5,
  send_window_start: '09:00',
  send_window_end: '17:00',
  timezone: 'America/Cuiaba',
  require_manual_approval: true,
  stop_on_reply: true,
  followup_1_delay_hours: 24,
  followup_2_delay_hours: 48,
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parseTime(value, fallback) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return parseTime(fallback, '09:00');
  const hours = Math.min(Number(match[1]), 23);
  const minutes = Math.min(Number(match[2]), 59);
  return { hours, minutes, total: hours * 60 + minutes };
}

function setTime(date, parsedTime) {
  const next = new Date(date);
  next.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  return next;
}

export function normalizeAutopilotRule(rule = {}) {
  const merged = { ...DEFAULT_AUTOPILOT_RULE, ...rule };
  return {
    ...merged,
    enabled: Boolean(merged.enabled),
    mode: AUTOPILOT_MODES.includes(merged.mode) ? merged.mode : 'assistido',
    min_score: Math.max(Number(merged.min_score || 0), 0),
    max_daily_sends: Math.max(Number(merged.max_daily_sends || 0), 1),
    max_hourly_sends: Math.max(Number(merged.max_hourly_sends || 0), 1),
    require_manual_approval: merged.mode === 'automatico' ? Boolean(merged.require_manual_approval) : true,
    stop_on_reply: merged.stop_on_reply !== false,
    followup_1_delay_hours: Math.max(Number(merged.followup_1_delay_hours || 24), 1),
    followup_2_delay_hours: Math.max(Number(merged.followup_2_delay_hours || 48), 1),
  };
}

export function isWithinSendWindow(date = new Date(), rule = {}) {
  const normalized = normalizeAutopilotRule(rule);
  const start = parseTime(normalized.send_window_start, DEFAULT_AUTOPILOT_RULE.send_window_start);
  const end = parseTime(normalized.send_window_end, DEFAULT_AUTOPILOT_RULE.send_window_end);
  const current = date.getHours() * 60 + date.getMinutes();

  if (start.total <= end.total) {
    return current >= start.total && current <= end.total;
  }

  return current >= start.total || current <= end.total;
}

export function getNextSendAt(date = new Date(), rule = {}) {
  const normalized = normalizeAutopilotRule(rule);
  const start = parseTime(normalized.send_window_start, DEFAULT_AUTOPILOT_RULE.send_window_start);
  const end = parseTime(normalized.send_window_end, DEFAULT_AUTOPILOT_RULE.send_window_end);
  const current = date.getHours() * 60 + date.getMinutes();

  if (isWithinSendWindow(date, normalized)) {
    return new Date(date);
  }

  if (start.total <= end.total && current < start.total) {
    return setTime(date, start);
  }

  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return setTime(tomorrow, start);
}

export function hasUsableContact(lead = {}) {
  return Boolean(String(lead.whatsapp || lead.telefone || '').trim());
}

export function leadMatchesAutopilotRule(lead = {}, rule = {}) {
  const normalized = normalizeAutopilotRule(rule);

  if (Number(lead.score || 0) < normalized.min_score) {
    return { matches: false, reason: 'score_below_minimum' };
  }

  if (normalized.source_type && normalizeText(lead.fonte) !== normalizeText(normalized.source_type)) {
    return { matches: false, reason: 'source_mismatch' };
  }

  if (normalized.city && normalizeText(lead.cidade) !== normalizeText(normalized.city)) {
    return { matches: false, reason: 'city_mismatch' };
  }

  if (normalized.niche && normalizeText(lead.nicho) !== normalizeText(normalized.niche)) {
    return { matches: false, reason: 'niche_mismatch' };
  }

  return { matches: true, reason: 'matched' };
}

export function shouldQueueInitialMessage(lead = {}, rule = {}, existingMessages = []) {
  const normalized = normalizeAutopilotRule(rule);

  if (!normalized.enabled) {
    return { eligible: false, reason: 'rule_disabled' };
  }

  if (!INITIAL_ELIGIBLE_STATUSES.includes(lead.status || 'novo')) {
    return { eligible: false, reason: 'lead_status_not_eligible' };
  }

  if (!hasUsableContact(lead)) {
    return { eligible: false, reason: 'missing_contact' };
  }

  const match = leadMatchesAutopilotRule(lead, normalized);
  if (!match.matches) {
    return { eligible: false, reason: match.reason };
  }

  const alreadyQueued = existingMessages.some((message) => (
    message.message_type === 'initial' && ACTIVE_MESSAGE_STATUSES.includes(message.status)
  ));

  if (alreadyQueued) {
    return { eligible: false, reason: 'initial_message_already_exists' };
  }

  return { eligible: true, reason: 'eligible' };
}

export function buildInitialMessageQueueItem(lead = {}, rule = {}, options = {}) {
  const normalized = normalizeAutopilotRule(rule);
  const now = options.now || new Date();
  const scheduledAt = getNextSendAt(now, normalized);

  return {
    user_id: lead.user_id,
    lead_id: lead.id,
    automation_rule_id: normalized.id || null,
    automation_run_id: options.automationRunId || null,
    channel: 'whatsapp',
    message_type: 'initial',
    status: normalized.require_manual_approval ? 'pending' : 'approved',
    scheduled_at: scheduledAt,
    payload_json: {
      leadName: lead.nome_empresa,
      phone: lead.whatsapp || lead.telefone || null,
      city: lead.cidade || null,
      niche: lead.nicho || null,
      score: lead.score || null,
      source: lead.fonte || null,
      manualApproval: normalized.require_manual_approval,
    },
  };
}

export function buildAutopilotDecision(lead = {}, rule = {}, existingMessages = [], options = {}) {
  const decision = shouldQueueInitialMessage(lead, rule, existingMessages);

  if (!decision.eligible) {
    return {
      ...decision,
      queueItem: null,
    };
  }

  return {
    ...decision,
    queueItem: buildInitialMessageQueueItem(lead, rule, options),
  };
}
