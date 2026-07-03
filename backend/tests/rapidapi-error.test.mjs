import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRapidApiError,
  collect,
  RAPIDAPI_NOT_SUBSCRIBED_MESSAGE,
} from '../src/services/scrapers/rapidApiLocalBusiness.mjs';

describe('RapidAPI Local Business Data errors', () => {
  test('traduz 403 not subscribed para mensagem amigavel', () => {
    const message = buildRapidApiError(403, JSON.stringify({
      message: 'You are not subscribed to this API.',
    }));

    assert.equal(message, RAPIDAPI_NOT_SUBSCRIBED_MESSAGE);
  });

  test('erro de coleta nao expoe API key em 403 not subscribed', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({
        message: 'You are not subscribed to this API.',
      }),
    });

    try {
      await assert.rejects(
        () => collect('rapidapi-secret-key', {
          api_host: 'local-business-data.p.rapidapi.com',
          base_url: 'https://local-business-data.p.rapidapi.com',
          search_endpoint: '/search',
        }, {
          query: 'clinica odontologica em Cuiaba, MT',
          limit: 5,
          language: 'pt',
          region: 'br',
          extractEmailsAndContacts: false,
        }),
        (error) => {
          assert.equal(error.message, RAPIDAPI_NOT_SUBSCRIBED_MESSAGE);
          assert.doesNotMatch(error.message, /rapidapi-secret-key/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
