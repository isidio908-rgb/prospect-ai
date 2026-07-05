import { query } from '../../database/init.mjs';

function clean(value) {
  return String(value || '').trim();
}

function asInt(value, fallback, min = 1, max = 500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDay(date, timezone) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
  }).format(date).replace('.', '');
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getTimesForPeriod(period) {
  if (period === 'morning') return ['09:00', '10:30'];
  if (period === 'afternoon') return ['14:00', '15:30', '16:30'];
  return ['09:00', '10:30', '14:00', '15:30', '16:30'];
}

export function buildSuggestedSchedulingSlots(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const timezone = clean(options.timezone) || 'America/Cuiaba';
  const count = asInt(options.count, 5, 1, 10);
  const preferredPeriod = clean(options.preferred_period) || clean(options.preferredPeriod) || 'all';
  const durationMinutes = asInt(options.duration_minutes ?? options.durationMinutes, 15, 10, 120);
  const times = getTimesForPeriod(preferredPeriod);
  const slots = [];

  for (let dayOffset = 1; dayOffset <= 12 && slots.length < count; dayOffset += 1) {
    const day = addDays(now, dayOffset);
    const weekday = day.getUTCDay();
    if (weekday === 0) continue;

    for (const time of times) {
      if (slots.length >= count) break;
      const label = `${formatDay(day, timezone)} as ${time}`;
      slots.push({
        label,
        value: `${dateKey(day)} ${time}`,
        timezone,
        duration_minutes: durationMinutes,
      });
    }
  }

  return slots;
}

export function buildSchedulingInvite({ lead = {}, user = {}, slots = [], durationMinutes = 15, note = '' } = {}) {
  const company = clean(lead.nome_empresa) || 'sua empresa';
  const userName = clean(user.name) || clean(user.email) || 'Aloisio';
  const profession = clean(user.profession) || 'gestor de trafego';
  const nicheContext = clean(user.primary_niche) ? ` com foco em ${clean(user.primary_niche)}` : '';
  const safeDuration = asInt(durationMinutes, 15, 10, 120);
  const slotLines = slots.length > 0
    ? slots.map((slot, index) => `${index + 1}. ${slot.label}`).join('\n')
    : '1. Hoje no fim da tarde\n2. Amanha pela manha';
  const noteLine = clean(note) ? `\n\nContexto: ${clean(note)}` : '';

  return `Perfeito, obrigado pelo retorno.\n\nSou ${userName}, ${profession}${nicheContext}. Para eu te mostrar com clareza os pontos que encontrei na ${company}, podemos fazer uma conversa rapida de ${safeDuration} minutos.\n\nTenho estes horarios:\n${slotLines}\n\nQual deles fica melhor para voce?${noteLine}`;
}

export function buildConfirmedSchedulingSummary({ lead = {}, scheduledFor = '', note = '' } = {}) {
  const company = clean(lead.nome_empresa) || 'lead';
  const noteText = clean(note);
  return `Reuniao com ${company} combinada para ${clean(scheduledFor)}.${noteText ? ` ${noteText}` : ''}`;
}

async function findLead(userId, leadId) {
  const result = await query(
    `SELECT id, user_id, nome_empresa, cidade, nicho, telefone, whatsapp, status, score, prioridade, proxima_acao
     FROM leads
     WHERE id = $1 AND user_id = $2`,
    [leadId, userId]
  );

  if (!result.rows[0]) {
    const error = new Error('Lead nao encontrado');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

export async function previewAssistedScheduling(userId, user, options = {}) {
  const leadId = Number(options.lead_id || options.leadId);
  if (!leadId) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  const lead = await findLead(userId, leadId);
  const durationMinutes = asInt(options.duration_minutes ?? options.durationMinutes, 15, 10, 120);
  const slots = buildSuggestedSchedulingSlots({
    timezone: options.timezone,
    duration_minutes: durationMinutes,
    preferred_period: options.preferred_period,
    count: options.count || 5,
  });
  const suggestedMessage = buildSchedulingInvite({
    lead,
    user,
    slots,
    durationMinutes,
    note: options.note,
  });

  return {
    lead,
    slots,
    suggested_message: suggestedMessage,
    calendar_payload: {
      title: `Reuniao comercial - ${lead.nome_empresa}`,
      duration_minutes: durationMinutes,
      timezone: clean(options.timezone) || 'America/Cuiaba',
      external_event_created: false,
    },
    safety: [
      'Nenhuma mensagem foi enviada automaticamente.',
      'Nenhum evento externo foi criado.',
      'Confirme o horario combinado antes de registrar a reuniao.',
    ],
  };
}

export async function confirmAssistedScheduling(userId, options = {}) {
  const leadId = Number(options.lead_id || options.leadId);
  const scheduledFor = clean(options.scheduled_for || options.scheduledFor);
  const note = clean(options.note);

  if (!leadId) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  if (!scheduledFor) {
    const error = new Error('scheduled_for e obrigatorio para confirmar a reuniao');
    error.status = 400;
    throw error;
  }

  const lead = await findLead(userId, leadId);
  const summary = buildConfirmedSchedulingSummary({ lead, scheduledFor, note });

  const updated = await query(
    `UPDATE leads SET
       status = 'reuniao_marcada',
       proxima_acao = $3,
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, nome_empresa, status, proxima_acao, cidade, nicho, score, prioridade`,
    [leadId, userId, summary]
  );

  const followup = await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, status_anterior, status_novo, mensagem)
     VALUES ($1, $2, 'reuniao', $3, 'reuniao_marcada', $4)
     RETURNING id, tipo, status_anterior, status_novo, mensagem, created_at`,
    [leadId, userId, lead.status || null, `[Agendamento assistido] ${summary}`]
  );

  return {
    lead: updated.rows[0],
    followup: followup.rows[0],
    scheduled_for: scheduledFor,
    external_event_created: false,
    message: 'Reuniao registrada no CRM. Nenhum WhatsApp ou calendario externo foi acionado.',
  };
}
