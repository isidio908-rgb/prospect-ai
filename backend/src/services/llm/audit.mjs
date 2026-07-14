import { query } from '../../database/init.mjs';
import { estimateLlmCostUsd, getUsageWithFallback } from './client.mjs';
import { getLlmProvider } from './providers.mjs';

export function buildGenerationAudit({ credential, taskId, purpose, system, user, text, usage, durationMs, status = 'success', errorMessage = null }) {
  const providerConfig = getLlmProvider(credential.type);
  const normalizedUsage = getUsageWithFallback(usage, { system, user, text });

  return {
    credentialId: credential.id,
    taskId: taskId || null,
    purpose: purpose || 'assistant',
    provider: credential.type,
    model: credential.model || providerConfig?.defaults?.model || 'unknown',
    status,
    promptTokens: normalizedUsage.promptTokens,
    completionTokens: normalizedUsage.completionTokens,
    totalTokens: normalizedUsage.totalTokens,
    usageEstimated: normalizedUsage.estimated,
    estimatedCostUsd: estimateLlmCostUsd(providerConfig, normalizedUsage),
    promptChars: `${system || ''}\n${user || ''}`.length,
    responseChars: String(text || '').length,
    durationMs: durationMs ?? null,
    errorMessage,
  };
}

export async function recordLlmGeneration({ userId, leadId = null, audit }) {
  const result = await query(
    `INSERT INTO llm_generations (
      user_id, lead_id, credential_id, task_id, purpose, provider, model, status,
      prompt_tokens, completion_tokens, total_tokens, usage_estimated,
      estimated_cost_usd, prompt_chars, response_chars, duration_ms, error_message
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16, $17
    )
    RETURNING id, provider, model, prompt_tokens, completion_tokens, total_tokens,
      usage_estimated, estimated_cost_usd, status, created_at`,
    [
      userId,
      leadId,
      audit.credentialId,
      audit.taskId,
      audit.purpose,
      audit.provider,
      audit.model,
      audit.status,
      audit.promptTokens,
      audit.completionTokens,
      audit.totalTokens,
      audit.usageEstimated,
      audit.estimatedCostUsd,
      audit.promptChars,
      audit.responseChars,
      audit.durationMs,
      audit.errorMessage ? String(audit.errorMessage).slice(0, 1000) : null,
    ]
  );

  return result.rows[0];
}
