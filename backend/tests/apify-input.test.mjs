import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApifyGoogleMapsInput } from '../src/services/scrapers/apifyGoogleMaps.mjs';

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
});
