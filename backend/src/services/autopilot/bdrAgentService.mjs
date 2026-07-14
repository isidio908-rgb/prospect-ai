import { query } from '../../database/init.mjs';
import { decrypt } from '../encryption.mjs';
import { buildGenerationAudit, recordLlmGeneration } from '../llm/audit.mjs';
import { chatCompleteDetailed } from '../llm/client.mjs';
import { buildSystemPrompt, getTask } from '../llm/tasks.mjs';

function clean(value) {
  return String(value || '').trim();
}

function fallbackInitialMessage(lead) {
  return `Olá, tudo bem? Analisei alguns pontos da presença digital da ${lead.nome_empresa || 'sua empresa'} e encontrei oportunidades simples de melhoria. Posso te enviar um diagnóstico rápido?`;
}

function fallbackFollowupMessage(lead) {
  return `Olá, tudo bem? Passando para retomar minha mensagem sobre a ${lead.nome_empresa || 'sua empresa'}. Faz sentido eu te enviar um diagnóstico rápido?`;
}

async function loadUser(userId) {
  const result = await query(
    `SELECT id, email, name, profession, primary_niche, internal_context, approval_whatsapp
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || { id: userId };
}

async function selectActiveLlmCredential(userId) {
  const result = await query(
    `SELECT *
     FROM credentials
     WHERE user_id = $1
       AND category = 'llm'
       AND status = 'active'
       AND used_today < daily_limit
       AND used_month < monthly_limit
     ORDER BY used_today ASC, last_used_at ASC NULLS FIRST, id ASC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function registerCredentialUsage(credentialId) {
  await query(
    `UPDATE credentials
     SET used_today = used_today + 1,
         used_month = used_month + 1,
         last_used_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [credentialId]
  );
  await query(
    `INSERT INTO credential_usage (credential_id, date, requests_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (credential_id, date)
     DO UPDATE SET requests_count = credential_usage.requests_count + 1`,
    [credentialId]
  );
}

async function saveDraftOnLead(userId, leadId, message, source) {
  await query(
    `UPDATE leads
     SET mensagem_whatsapp = $1,
         status = CASE WHEN status IN ('novo', 'analisado') THEN 'mensagem_pronta' ELSE status END,
         updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [message, leadId, userId]
  );
  await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
     VALUES ($1, $2, 'nota', $3)`,
    [leadId, userId, `[BDR/${source}] Rascunho de primeira abordagem preparado. Nenhuma mensagem foi enviada automaticamente nesta etapa.`]
  );
}

async function saveFollowupDraftOnLead(userId, leadId, message, source) {
  await query(
    `UPDATE leads
     SET mensagem_whatsapp_followup = $1,
         updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [message, leadId, userId]
  );
  await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
     VALUES ($1, $2, 'nota', $3)`,
    [leadId, userId, `[Follow-up/${source}] Rascunho de retomada preparado. Nenhuma mensagem foi enviada automaticamente nesta etapa.`]
  );
}

export async function buildBdrInitialMessage(userId, lead, options = {}) {
  const existing = clean(lead.mensagem_whatsapp);
  if (existing) {
    return { message: existing, source: 'lead_existing', generated: false };
  }

  const task = getTask('mensagem_whatsapp');
  const credential = await selectActiveLlmCredential(userId);
  if (!credential || !task) {
    const message = fallbackInitialMessage(lead);
    if (options.persist !== false) {
      await saveDraftOnLead(userId, lead.id, message, 'template_fallback');
    }
    return { message, source: 'template_fallback', generated: false, reason: credential ? 'task_unavailable' : 'no_active_llm_credential' };
  }

  const user = await loadUser(userId);
  const system = `${buildSystemPrompt(task, user)} Atue como BDR profissional com foco em gerar uma resposta e avançar para reunião de venda. Não invente métricas, clientes, preços, resultados ou observações que não estejam no contexto.`;
  const prompt = task.buildUser(lead);
  const apiKey = decrypt(credential.api_key_encrypted);
  if (!apiKey) {
    const message = fallbackInitialMessage(lead);
    if (options.persist !== false) {
      await saveDraftOnLead(userId, lead.id, message, 'template_fallback');
    }
    return { message, source: 'template_fallback', generated: false, reason: 'llm_key_decrypt_failed' };
  }

  const startedAt = Date.now();
  try {
    const result = await chatCompleteDetailed(credential, apiKey, {
      system,
      user: prompt,
      temperature: 0.55,
      maxTokens: 450,
    });
    const message = clean(result.text);
    if (!message) {
      throw new Error('A LLM retornou uma mensagem vazia para o BDR.');
    }

    const audit = buildGenerationAudit({
      credential,
      taskId: task.id,
      purpose: 'bdr_initial',
      system,
      user: prompt,
      text: message,
      usage: result.usage,
      durationMs: Date.now() - startedAt,
    });
    const generation = await recordLlmGeneration({ userId, leadId: lead.id, audit });
    await registerCredentialUsage(credential.id);
    if (options.persist !== false) {
      await saveDraftOnLead(userId, lead.id, message, 'llm');
    }

    return {
      message,
      source: 'llm',
      generated: true,
      provider: result.provider,
      model: result.model,
      generationId: generation.id,
    };
  } catch (error) {
    const audit = buildGenerationAudit({
      credential,
      taskId: task.id,
      purpose: 'bdr_initial',
      system,
      user: prompt,
      text: '',
      usage: {},
      durationMs: Date.now() - startedAt,
      status: 'error_provider',
      errorMessage: error.message,
    });
    await recordLlmGeneration({ userId, leadId: lead.id, audit });

    const message = fallbackInitialMessage(lead);
    if (options.persist !== false) {
      await saveDraftOnLead(userId, lead.id, message, 'template_fallback');
    }
    return { message, source: 'template_fallback', generated: false, reason: 'llm_failed' };
  }
}

export async function buildBdrFollowupMessage(userId, lead, options = {}) {
  const leadId = lead.id || lead.lead_id;
  const existing = clean(lead.mensagem_whatsapp_followup);
  if (existing) {
    return { message: existing, source: 'lead_existing', generated: false };
  }

  const task = getTask('mensagem_followup');
  const credential = await selectActiveLlmCredential(userId);
  if (!credential || !task) {
    const message = fallbackFollowupMessage(lead);
    if (options.persist !== false) {
      await saveFollowupDraftOnLead(userId, leadId, message, 'template_fallback');
    }
    return { message, source: 'template_fallback', generated: false, reason: credential ? 'task_unavailable' : 'no_active_llm_credential' };
  }

  const user = await loadUser(userId);
  const system = `${buildSystemPrompt(task, user)} Atue como BDR/SDR profissional. O objetivo é retomar a conversa sem pressão, recuperar atenção e conduzir para uma reunião curta de venda quando fizer sentido. Não invente respostas do lead nem fatos não fornecidos.`;
  const prompt = task.buildUser(lead);
  const apiKey = decrypt(credential.api_key_encrypted);
  if (!apiKey) {
    const message = fallbackFollowupMessage(lead);
    if (options.persist !== false) {
      await saveFollowupDraftOnLead(userId, leadId, message, 'template_fallback');
    }
    return { message, source: 'template_fallback', generated: false, reason: 'llm_key_decrypt_failed' };
  }

  const startedAt = Date.now();
  try {
    const result = await chatCompleteDetailed(credential, apiKey, {
      system,
      user: prompt,
      temperature: 0.5,
      maxTokens: 350,
    });
    const message = clean(result.text);
    if (!message) {
      throw new Error('A LLM retornou uma mensagem vazia para o follow-up.');
    }

    const audit = buildGenerationAudit({
      credential,
      taskId: task.id,
      purpose: options.purpose || 'followup_silence',
      system,
      user: prompt,
      text: message,
      usage: result.usage,
      durationMs: Date.now() - startedAt,
    });
    const generation = await recordLlmGeneration({ userId, leadId, audit });
    await registerCredentialUsage(credential.id);
    if (options.persist !== false) {
      await saveFollowupDraftOnLead(userId, leadId, message, 'llm');
    }

    return {
      message,
      source: 'llm',
      generated: true,
      provider: result.provider,
      model: result.model,
      generationId: generation.id,
    };
  } catch (error) {
    const audit = buildGenerationAudit({
      credential,
      taskId: task.id,
      purpose: options.purpose || 'followup_silence',
      system,
      user: prompt,
      text: '',
      usage: {},
      durationMs: Date.now() - startedAt,
      status: 'error_provider',
      errorMessage: error.message,
    });
    await recordLlmGeneration({ userId, leadId, audit });

    const message = fallbackFollowupMessage(lead);
    if (options.persist !== false) {
      await saveFollowupDraftOnLead(userId, leadId, message, 'template_fallback');
    }
    return { message, source: 'template_fallback', generated: false, reason: 'llm_failed' };
  }
}
