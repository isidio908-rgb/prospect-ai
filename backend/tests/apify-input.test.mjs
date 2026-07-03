import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApifyGoogleMapsInput, collect } from '../src/services/scrapers/apifyGoogleMaps.mjs';

describe('Apify Google Maps input', () => {
  test('monta input no schema query/location/max_results/language', () => {
    const input = buildApifyGoogleMapsInput({
      query: 'ortopedista particular para empresas em Pombal, Leiria, Portugal',
      niche: 'ortopedista particular para empresas',
      city: 'Pombal',
      language: 'pt',
      limit: 25,
    });

    assert.deepEqual(input, {
      language: 'pt',
      location: 'Pombal, Leiria, Portugal',
      max_results: 25,
      query: 'ortopedista particular para empresas',
    });
  });

  test('usa query direta quando nao existe separador em', () => {
    const input = buildApifyGoogleMapsInput({
      query: 'restaurant',
      city: 'San Francisco, CA, USA',
      language: 'en',
      limit: 100,
    });

    assert.deepEqual(input, {
      language: 'en',
      location: 'San Francisco, CA, USA',
      max_results: 100,
      query: 'restaurant',
    });
  });

  test('retorna erro amigavel quando o Actor precisa de aprovacao', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({
        error: {
          type: 'full-permission-actor-not-approved',
          message: 'Actor requires approval',
        },
      }),
    });

    try {
      await assert.rejects(
        () => collect('apify-token-secret', { search_endpoint: 'vendor~actor' }, {
          query: 'ortopedista particular para empresas em Pombal, Leiria, Portugal',
          language: 'pt',
          limit: 25,
        }),
        (error) => {
          assert.match(error.message, /Este Actor da Apify precisa ser aprovado na sua conta antes de executar/);
          assert.doesNotMatch(error.message, /apify-token-secret/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
