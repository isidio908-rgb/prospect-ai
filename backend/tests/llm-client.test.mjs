import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { chatComplete, chatCompleteDetailed, estimateLlmCostUsd, getUsageWithFallback } from '../src/services/llm/client.mjs';
import { getLlmProvider } from '../src/services/llm/providers.mjs';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('LLM client and usage accounting', () => {
  test('retorna texto e uso detalhado para endpoint compativel com OpenAI', async () => {
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);

      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer sk-test-secret');
      assert.equal(body.model, 'gpt-4o-mini');
      assert.equal(body.messages.length, 2);

      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Mensagem BDR pronta.' } }],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 30,
          total_tokens: 150,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const result = await chatCompleteDetailed(
      { type: 'openai', model: 'gpt-4o-mini' },
      'sk-test-secret',
      { system: 'sistema', user: 'usuario', temperature: 0.4, maxTokens: 200 }
    );

    assert.equal(result.text, 'Mensagem BDR pronta.');
    assert.deepEqual(result.usage, { promptTokens: 120, completionTokens: 30, totalTokens: 150 });
    assert.equal(result.provider, 'openai');
    assert.equal(result.model, 'gpt-4o-mini');

    const legacyText = await chatComplete(
      { type: 'openai', model: 'gpt-4o-mini' },
      'sk-test-secret',
      { system: 'sistema', user: 'usuario' }
    );
    assert.equal(legacyText, 'Mensagem BDR pronta.');
  });

  test('calcula custo aproximado e fallback de tokens sem armazenar segredo', async () => {
    const usage = getUsageWithFallback({}, { system: 'abc', user: 'defg', text: 'resultado' });
    assert.equal(usage.estimated, true);
    assert.equal(usage.totalTokens, usage.promptTokens + usage.completionTokens);

    const cost = estimateLlmCostUsd(getLlmProvider('openai'), {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    assert.equal(cost, 0.75);

    globalThis.fetch = async () => new Response('invalid key', { status: 401 });

    await assert.rejects(
      chatCompleteDetailed(
        { type: 'openai', model: 'gpt-4o-mini' },
        'sk-secret-that-must-not-leak',
        { system: 'sistema', user: 'usuario' }
      ),
      (error) => {
        assert.match(error.message, /LLM retornou 401/);
        assert.equal(error.message.includes('sk-secret-that-must-not-leak'), false);
        return true;
      }
    );
  });
});
