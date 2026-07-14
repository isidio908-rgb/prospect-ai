import { query } from '../../database/init.mjs';
import {
  buildSchedulingInvite,
  buildSuggestedSchedulingSlots,
} from './commercialSchedulingService.mjs';

function clean(value) {
  return String(value || '').trim();
}

function asInt(value, fallback, min = 1, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function hasSpecificTime(text) {
  return /\b(\d{1,2}h|\d{1,2}:\d{2}|manha|manhã|tarde|noite|hoje|amanha|amanhã|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado)\b/i.test(text);
}

export function classifySdrReplyText(text = '') {
  const normalized = clean(text).toLowerCase();
  if (!normalized) {
    return {
      intent: 'unknown',
      stage: 'manual_review',
      confidence: 0.2,
      qualification: 'unknown',
      reason: 'Resposta vazia ou indisponivel.',
    };
  }

  if (/\b(nao|não|sem interesse|pare|remover|tirar|obrigado,? mas|agora nao|agora não)\b/i.test(normalized)) {
    return {
      intent: 'not_interested',
      stage: 'closed_lost',
      confidence: 0.82,
      qualification: 'disqualified',
      reason: 'Lead recusou ou pediu para encerrar contato.',
    };
  }

  const specificTime = hasSpecificTime(normalized);
  if (
    /\b(reuniao|reunião|agenda|agendar|marcar|call|chamada|horario|horário|horarios|horários|conversar)\b/i.test(normalized)
    || (specificTime && /\b(pode ser|fechado|confirmado|ok|beleza|combinado)\b/i.test(normalized))
  ) {
    return {
      intent: specificTime ? 'meeting_time_proposed' : 'meeting_request',
      stage: 'scheduling',
      confidence: specificTime ? 0.86 : 0.8,
      qualification: 'high_intent',
      reason: specificTime
        ? 'Lead demonstrou intenção de reunião e sugeriu janela/horario.'
        : 'Lead demonstrou intenção de reunião, mas ainda sem horário confirmado.',
    };
  }

  if (/\b(preco|preço|valor|quanto|custa|investimento|plano|mensalidade|pacote)\b/i.test(normalized)) {
    return {
      intent: 'pricing',
      stage: 'qualification',
      confidence: 0.76,
      qualification: 'commercial_interest',
      reason: 'Lead perguntou sobre preço ou investimento.',
    };
  }

  if (/\b(como funciona|explica|detalhe|detalhes|duvida|dúvida|o que voces fazem|o que vocês fazem)\b/i.test(normalized)) {
    return {
      intent: 'question',
      stage: 'qualification',
      confidence: 0.7,
      qualification: 'needs_education',
      reason: 'Lead pediu explicação antes de avançar.',
    };
  }

  if (/\b(sim|pode|manda|envia|quero|interesse|interessante|vamos|ok|beleza)\b/i.test(normalized)) {
    return {
      intent: 'interested',
      stage: 'qualification',
      confidence: 0.72,
      qualification: 'qualified_to_offer_meeting',
      reason: 'Lead aceitou continuar a conversa.',
    };
  }

  if (/\b(sem tempo|depois|outro dia|agora estou ocupado|ocupado|retorna)\b/i.test(normalized)) {
    return {
      intent: 'timing_objection',
      stage: 'nurture',
      confidence: 0.62,
      qualification: 'timing_pending',
      reason: 'Lead sinalizou objeção de timing, não desinteresse definitivo.',
    };
  }

  return {
    intent: 'ambiguous',
    stage: 'manual_review',
    confidence: 0.45,
    qualification: 'unknown',
    reason: 'Resposta insuficiente para automação segura.',
  };
}

function buildDecision({ lead, user, replyText, classification, slots, durationMinutes, note }) {
  const company = clean(lead.nome_empresa) || 'lead';
  const statusAnterior = lead.status || 'respondeu';
  const base = {
    action: 'manual_review',
    status: statusAnterior === 'sem_interesse' ? 'sem_interesse' : 'respondeu',
    next_action: 'Revisar resposta manualmente antes de avançar.',
    recommended_message: 'Obrigado pelo retorno. Vou revisar aqui e te respondo com mais contexto.',
    escalation_required: classification.confidence < 0.6,
    reasoning: classification.reason,
    result: 'analysis_only',
  };

  if (classification.intent === 'not_interested') {
    return {
      ...base,
      action: 'close_lost',
      status: 'sem_interesse',
      next_action: 'Lead recusou contato. Nao enviar novos follow-ups.',
      recommended_message: 'Sem problemas, obrigado pelo retorno. Vou encerrar por aqui.',
      escalation_required: false,
      result: 'lead_disqualified',
    };
  }

  if (classification.intent === 'meeting_time_proposed') {
    return {
      ...base,
      action: 'confirm_scheduling_safely',
      status: 'respondeu',
      next_action: `Lead sugeriu horario para reuniao. Confirmar disponibilidade antes de marcar: "${clean(replyText)}".`,
      recommended_message: `Perfeito. Vou confirmar a disponibilidade desse horario e ja te retorno para fecharmos a conversa com a ${company}.`,
      escalation_required: true,
      result: 'appointment_intent_created',
    };
  }

  if (classification.intent === 'meeting_request' || classification.intent === 'interested') {
    return {
      ...base,
      action: 'offer_scheduling_slots',
      status: 'respondeu',
      next_action: 'Enviar opcoes de horarios e aguardar escolha do lead antes de registrar reuniao.',
      recommended_message: buildSchedulingInvite({
        lead,
        user,
        slots,
        durationMinutes,
        note,
      }),
      escalation_required: false,
      result: 'scheduling_options_prepared',
    };
  }

  if (classification.intent === 'pricing') {
    return {
      ...base,
      action: 'answer_pricing_with_context',
      status: 'respondeu',
      next_action: 'Responder valor com contexto e conduzir para chamada curta.',
      recommended_message: 'Boa pergunta. O investimento depende do cenário e do objetivo. Para eu não te passar algo genérico, posso te mostrar em 15 minutos os pontos que encontrei e indicar o plano que faria sentido?',
      escalation_required: false,
      result: 'pricing_qualified',
    };
  }

  if (classification.intent === 'question') {
    return {
      ...base,
      action: 'answer_question_then_schedule',
      status: 'respondeu',
      next_action: 'Responder duvida e propor conversa curta se houver abertura.',
      recommended_message: `Claro. A ideia é te mostrar rapidamente pontos que podem estar limitando contatos pelo digital na ${company}. Posso te mandar um diagnostico curto e, se fizer sentido, marcamos 15 minutos?`,
      escalation_required: false,
      result: 'question_qualified',
    };
  }

  if (classification.intent === 'timing_objection') {
    return {
      ...base,
      action: 'schedule_followup',
      status: 'respondeu',
      next_action: 'Retomar em outro momento sem pressionar o lead.',
      recommended_message: 'Sem problemas. Qual melhor periodo para eu retomar com voce: amanha pela manha ou no fim da tarde?',
      escalation_required: false,
      result: 'timing_followup_needed',
    };
  }

  return base;
}

async function getLead(userId, leadId) {
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

async function getReplyText(userId, leadId, options = {}) {
  const explicitText = clean(options.text || options.reply_text || options.replyText);
  if (explicitText) {
    return {
      text: explicitText,
      messageId: options.message_id || options.messageId || null,
      source: 'request',
    };
  }

  const messageId = Number(options.message_id || options.messageId);
  const params = [userId, leadId];
  const where = [
    'user_id = $1',
    'lead_id = $2',
    "direction = 'received'",
    "COALESCE(text_content, '') <> ''",
  ];

  if (messageId) {
    params.push(messageId);
    where.push(`id = $${params.length}`);
  }

  const result = await query(
    `SELECT id, text_content
     FROM whatsapp_messages
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 1`,
    params
  );

  if (!result.rows[0]) {
    const error = new Error('Resposta recebida nao encontrada para este lead');
    error.status = 404;
    throw error;
  }

  return {
    text: result.rows[0].text_content,
    messageId: result.rows[0].id,
    source: 'whatsapp_messages',
  };
}

export async function analyzeSdrReply(userId, user, options = {}) {
  const leadId = Number(options.lead_id || options.leadId);
  if (!leadId) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  const dryRun = options.dry_run !== false;
  const durationMinutes = asInt(options.duration_minutes ?? options.durationMinutes, 15, 10, 120);
  const lead = await getLead(userId, leadId);
  const reply = await getReplyText(userId, leadId, options);
  const classification = classifySdrReplyText(reply.text);
  const slots = buildSuggestedSchedulingSlots({
    timezone: options.timezone,
    duration_minutes: durationMinutes,
    preferred_period: options.preferred_period,
    count: options.count || 5,
  });
  const decision = buildDecision({
    lead,
    user,
    replyText: reply.text,
    classification,
    slots,
    durationMinutes,
    note: options.note,
  });
  const schedulingIntent = {
    state: ['meeting_time_proposed', 'meeting_request', 'interested'].includes(classification.intent)
      ? decision.action
      : 'none',
    proposed_text: classification.intent === 'meeting_time_proposed' ? reply.text : null,
    slots: ['meeting_request', 'interested'].includes(classification.intent) ? slots : [],
    calendar_payload: {
      title: `Reuniao comercial - ${lead.nome_empresa}`,
      duration_minutes: durationMinutes,
      timezone: clean(options.timezone) || 'America/Cuiaba',
      external_event_created: false,
    },
  };

  let updatedLead = lead;
  let event = null;
  let followup = null;

  if (!dryRun) {
    const updated = await query(
      `UPDATE leads SET status = $1, proxima_acao = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, nome_empresa, status, proxima_acao, cidade, nicho, score, prioridade`,
      [decision.status, decision.next_action, leadId, userId]
    );
    updatedLead = updated.rows[0];

    const eventResult = await query(
      `INSERT INTO sdr_events (
        user_id, lead_id, whatsapp_message_id, classification, decision, scheduling_intent,
        escalation_required, status_anterior, status_novo
      ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9)
      RETURNING id, user_id, lead_id, whatsapp_message_id, classification, decision,
        scheduling_intent, escalation_required, status_anterior, status_novo, created_at`,
      [
        userId,
        leadId,
        reply.messageId,
        JSON.stringify(classification),
        JSON.stringify(decision),
        JSON.stringify(schedulingIntent),
        decision.escalation_required,
        lead.status || null,
        decision.status,
      ]
    );
    event = eventResult.rows[0];

    const followupResult = await query(
      `INSERT INTO lead_followups (lead_id, user_id, tipo, status_anterior, status_novo, mensagem)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tipo, status_anterior, status_novo, mensagem, created_at`,
      [
        leadId,
        userId,
        decision.action === 'close_lost' ? 'nota' : 'sdr',
        lead.status || null,
        decision.status,
        `[SDR] Intencao: ${classification.intent}. Acao: ${decision.action}. Resultado: ${decision.result}. Raciocinio: ${classification.reason}`,
      ]
    );
    followup = followupResult.rows[0];
  }

  return {
    dryRun,
    lead: updatedLead,
    reply,
    classification,
    decision,
    scheduling_intent: schedulingIntent,
    event,
    followup,
    safety: [
      'Nenhum evento externo de calendario foi criado.',
      'Horario sugerido pelo lead deve ser confirmado antes de marcar reuniao.',
      'Casos ambiguos ou com baixa confianca ficam marcados para humano.',
    ],
  };
}
