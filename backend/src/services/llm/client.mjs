import { getLlmProvider } from './providers.mjs';

/**
 * Chamada a um endpoint compatível com OpenAI (chat/completions).
 * Usado por: OpenAI, Groq, OpenRouter, Cerebras, Mistral, Gemini (endpoint compat).
 */
async function openaiChat({ baseUrl, apiKey, model, system, user, temperature = 0.7, maxTokens = 1200 }) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM retornou ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content?.trim() || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      totalTokens: data.usage?.total_tokens ?? null,
    },
  };
}

/**
 * Chamada à API de mensagens da Anthropic (Claude).
 */
async function anthropicChat({ baseUrl, apiKey, model, system, user, maxTokens = 1200 }) {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude retornou ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const promptTokens = data.usage?.input_tokens ?? null;
  const completionTokens = data.usage?.output_tokens ?? null;
  return {
    text: (data.content || []).map((c) => c.text).join('').trim(),
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens != null && completionTokens != null ? promptTokens + completionTokens : null,
    },
  };
}

/**
 * Executa uma conversa (system + user) usando o provedor da credencial.
 * `credential` deve conter { type, base_url, model }.
 */
export async function chatCompleteDetailed(credential, apiKey, { system, user, temperature, maxTokens }) {
  const provider = getLlmProvider(credential.type);
  if (!provider) {
    throw new Error(`Provedor de IA não suportado: ${credential.type}`);
  }

  const baseUrl = credential.base_url || provider.defaults.base_url;
  const model = credential.model || provider.defaults.model;

  const request = provider.api === 'anthropic'
    ? () => anthropicChat({ baseUrl, apiKey, model, system, user, maxTokens })
    : () => openaiChat({ baseUrl, apiKey, model, system, user, temperature, maxTokens });

  const result = await request();
  return {
    ...result,
    provider: credential.type,
    model,
    baseUrl,
  };
}

export async function chatComplete(credential, apiKey, options) {
  const result = await chatCompleteDetailed(credential, apiKey, options);
  return result.text;
}

export function estimateLlmCostUsd(providerConfig, usage = {}) {
  const pricing = providerConfig?.pricingUsdPer1M;
  if (!pricing || usage.promptTokens == null || usage.completionTokens == null) {
    return null;
  }

  const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(8));
}

export function getUsageWithFallback(usage = {}, { system = '', user = '', text = '' } = {}) {
  const promptTokens = usage.promptTokens ?? Math.ceil(`${system}\n${user}`.length / 4);
  const completionTokens = usage.completionTokens ?? Math.ceil(String(text).length / 4);
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage.totalTokens ?? promptTokens + completionTokens,
    estimated: usage.promptTokens == null || usage.completionTokens == null,
  };
}

/**
 * Testa a credencial de IA com um prompt mínimo.
 */
export async function testLlm(credential, apiKey) {
  try {
    const text = await chatComplete(credential, apiKey, {
      system: 'Você é um serviço de verificação. Responda apenas com: ok',
      user: 'Responda "ok".',
      maxTokens: 5,
      temperature: 0,
    });
    return { success: Boolean(text), statusCode: 200 };
  } catch (error) {
    // Extrai o código HTTP da mensagem, quando presente
    const match = /retornou (\d{3})/.exec(error.message);
    return { success: false, statusCode: match ? Number(match[1]) : 500, message: error.message };
  }
}
