/**
 * Catálogo de provedores de LLM suportados.
 *
 * `api` define o protocolo de chamada:
 *  - 'openai'    → endpoint compatível com OpenAI (POST /chat/completions, Bearer)
 *  - 'anthropic' → API da Anthropic (POST /v1/messages, x-api-key)
 *
 * `freeTier` indica que o provedor oferece uso gratuito/limitado (mostra badge).
 * `defaults.model` é o modelo padrão sugerido (o usuário pode trocar).
 */
export const LLM_PROVIDERS = {
  openai: {
    type: 'openai',
    label: 'OpenAI (GPT)',
    api: 'openai',
    freeTier: false,
    docs: 'https://platform.openai.com/api-keys',
    defaults: { base_url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    pricingUsdPer1M: { input: 0.15, output: 0.6 },
    keyHint: 'Chave sk-... criada em platform.openai.com. Uso é pago.',
  },
  anthropic: {
    type: 'anthropic',
    label: 'Anthropic (Claude)',
    api: 'anthropic',
    freeTier: false,
    docs: 'https://console.anthropic.com/settings/keys',
    defaults: { base_url: 'https://api.anthropic.com', model: 'claude-3-5-haiku-latest' },
    pricingUsdPer1M: { input: 0.8, output: 4 },
    keyHint: 'Chave sk-ant-... criada em console.anthropic.com. Uso é pago.',
  },
  gemini: {
    type: 'gemini',
    label: 'Google Gemini',
    api: 'openai', // endpoint compatível com OpenAI do Google AI Studio
    freeTier: true,
    docs: 'https://aistudio.google.com/app/apikey',
    defaults: { base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
    pricingUsdPer1M: { input: 0.3, output: 2.5 },
    keyHint: 'Crie a chave gratuita no Google AI Studio (aistudio.google.com).',
  },
  groq: {
    type: 'groq',
    label: 'Groq (Llama · rápido · grátis)',
    api: 'openai',
    freeTier: true,
    docs: 'https://console.groq.com/keys',
    defaults: { base_url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    pricingUsdPer1M: null,
    keyHint: 'Gratuito sem cartão em console.groq.com (~30 req/min). Modelos open-source.',
  },
  openrouter: {
    type: 'openrouter',
    label: 'OpenRouter (vários modelos)',
    api: 'openai',
    freeTier: true,
    docs: 'https://openrouter.ai/keys',
    defaults: { base_url: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    pricingUsdPer1M: null,
    keyHint: 'Uma chave, vários modelos. Os terminados em ":free" são gratuitos.',
  },
  cerebras: {
    type: 'cerebras',
    label: 'Cerebras (rápido · grátis)',
    api: 'openai',
    freeTier: true,
    docs: 'https://cloud.cerebras.ai',
    defaults: { base_url: 'https://api.cerebras.ai/v1', model: 'llama-3.3-70b' },
    pricingUsdPer1M: null,
    keyHint: 'Gratuito em cloud.cerebras.ai (~30 req/min).',
  },
  mistral: {
    type: 'mistral',
    label: 'Mistral AI',
    api: 'openai',
    freeTier: true,
    docs: 'https://console.mistral.ai/api-keys',
    defaults: { base_url: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
    pricingUsdPer1M: { input: 0.1, output: 0.3 },
    keyHint: 'Tier gratuito (pede telefone, não cartão) em console.mistral.ai.',
  },
};

export function listLlmProviders() {
  return Object.values(LLM_PROVIDERS).map((p) => ({
    type: p.type,
    label: p.label,
    category: 'llm',
    api: p.api,
    freeCredits: p.freeTier,
    docs: p.docs,
    defaults: {
      provider: p.label,
      base_url: p.defaults.base_url,
      model: p.defaults.model,
      daily_limit: 200,
      monthly_limit: 5000,
    },
    fields: ['model', 'base_url'],
    fieldHints: {
      model: 'Modelo a ser usado (ex: ' + p.defaults.model + ').',
      base_url: 'URL base da API (só altere se souber o que está fazendo).',
    },
    pricingUsdPer1M: p.pricingUsdPer1M,
    keyHint: p.keyHint,
  }));
}

export function getLlmProvider(type) {
  return LLM_PROVIDERS[type] || null;
}

export function isLlmType(type) {
  return Boolean(LLM_PROVIDERS[type]);
}
