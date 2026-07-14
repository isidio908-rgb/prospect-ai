import { query } from '../../database/init.mjs';
import { isWithinSendWindow, normalizeAutopilotRule } from './autopilotService.mjs';

const OPT_OUT_STATUSES = ['sem_interesse'];
const AUTOMATIC_MODES = ['automatico_limitado', 'automatico_total', 'automatico'];

export function requiresSafetyAcceptance(rule = {}) {
  const normalized = normalizeAutopilotRule(rule);
  return AUTOMATIC_MODES.includes(normalized.mode) && normalized.require_manual_approval === false;
}

export function hasSafetyAcceptance(rule = {}) {
  return !requiresSafetyAcceptance(rule) || Boolean(rule.safety_accepted_at);
}

export async function recordSafetyEvent(userId, ruleId, event, metadata = {}) {
  const result = await query(
    `INSERT INTO automation_safety_events (user_id, automation_rule_id, event, mode, actor_user_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, created_at`,
    [userId, ruleId || null, event, metadata.mode || null, userId, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

export async function acceptAutomationSafety(userId, ruleId, mode, metadata = {}) {
  const updated = await query(
    `UPDATE automation_rules
     SET safety_accepted_at = NOW(),
         safety_accepted_by = $1,
         updated_at = NOW()
     WHERE id = $2 AND user_id = $1
     RETURNING id, mode, safety_accepted_at, safety_accepted_by`,
    [userId, ruleId]
  );

  if (updated.rows[0]) {
    await recordSafetyEvent(userId, ruleId, 'safety_acceptance_recorded', {
      ...metadata,
      mode,
    });
  }

  return updated.rows[0] || null;
}

export function assertRuleSafetyCanBeEnabled(rule, { safetyAcceptance = false } = {}) {
  const normalized = normalizeAutopilotRule(rule);
  const needsAcceptance = requiresSafetyAcceptance(normalized);

  if (needsAcceptance && !rule.safety_accepted_at && safetyAcceptance !== true) {
    const error = new Error('Aceite explícito de segurança é obrigatório para envio automático sem aprovação humana.');
    error.status = 400;
    throw error;
  }

  if (normalized.mode === 'automatico_total' && normalized.stop_on_reply === false) {
    const error = new Error('Modo automático total exige stop_on_reply ativo.');
    error.status = 400;
    throw error;
  }
}

async function countSentMessages(userId, row) {
  const params = [userId, row.automation_rule_id || null, row.selected_whatsapp_instance_id || null];
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours')::int as sent_24h,
       COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '1 hour')::int as sent_1h,
       COUNT(*) FILTER (
         WHERE sent_at >= NOW() - INTERVAL '24 hours'
           AND ($2::int IS NULL OR automation_rule_id = $2)
       )::int as rule_sent_24h,
       COUNT(*) FILTER (
         WHERE sent_at >= NOW() - INTERVAL '24 hours'
           AND ($3::int IS NULL OR whatsapp_instance_id = $3)
       )::int as instance_sent_24h
     FROM message_queue
     WHERE user_id = $1 AND status = 'sent'`,
    params
  );
  return result.rows[0] || { sent_24h: 0, sent_1h: 0, rule_sent_24h: 0, instance_sent_24h: 0 };
}

export async function evaluateQueueSendSafety(userId, row, options = {}) {
  const rule = normalizeAutopilotRule(row);

  if (OPT_OUT_STATUSES.includes(row.lead_status)) {
    return { allowed: false, reason: 'lead_opted_out', message: 'Lead marcado como sem interesse. Novo contato bloqueado.' };
  }

  if (!hasSafetyAcceptance(row)) {
    return { allowed: false, reason: 'missing_safety_acceptance', message: 'Regra automática sem aceite explícito de segurança.' };
  }

  if (!isWithinSendWindow(new Date(), rule)) {
    return { allowed: false, reason: 'outside_send_window', message: 'Envio bloqueado fora da janela permitida.' };
  }

  if (options.ignoreSchedule && row.message_type !== 'initial') {
    return { allowed: false, reason: 'ignore_schedule_blocked_for_followup', message: 'Follow-up não pode ignorar agenda de segurança.' };
  }

  const counts = await countSentMessages(userId, row);
  const maxDaily = Number(row.max_daily_sends || rule.max_daily_sends || 20);
  const maxHourly = Number(row.max_hourly_sends || rule.max_hourly_sends || 5);
  const workspaceDaily = Number(process.env.AUTOPILOT_WORKSPACE_DAILY_SEND_LIMIT || 100);

  if (counts.sent_24h >= workspaceDaily) {
    return { allowed: false, reason: 'workspace_daily_limit_reached', message: 'Limite diário do workspace atingido.', counts };
  }

  if (counts.rule_sent_24h >= maxDaily) {
    return { allowed: false, reason: 'rule_daily_limit_reached', message: 'Limite diário da campanha atingido.', counts };
  }

  if (counts.sent_1h >= maxHourly) {
    return { allowed: false, reason: 'hourly_limit_reached', message: 'Limite horário atingido.', counts };
  }

  if (counts.instance_sent_24h >= Number(process.env.AUTOPILOT_INSTANCE_DAILY_SEND_LIMIT || 80)) {
    return { allowed: false, reason: 'instance_daily_limit_reached', message: 'Limite diário do número WhatsApp atingido.', counts };
  }

  return { allowed: true, reason: 'allowed', counts };
}
