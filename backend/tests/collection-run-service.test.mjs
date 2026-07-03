import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCollectionCacheKey } from '../src/services/collectionRunService.mjs';

describe('collection run cache key', () => {
  test('normaliza diferenças de caixa e espaços na mesma busca', () => {
    const first = buildCollectionCacheKey({
      credentialId: 1,
      query: ' Imobiliarias em Cuiaba, MT ',
      city: ' Cuiaba ',
      niche: ' Imobiliarias ',
      region: 'BR',
      language: 'PT',
      limit: 20,
      extractEmailsAndContacts: false,
      verifyWhatsAppExists: false,
    });

    const second = buildCollectionCacheKey({
      credentialId: 1,
      query: 'imobiliarias em cuiaba, mt',
      city: 'cuiaba',
      niche: 'imobiliarias',
      region: 'br',
      language: 'pt',
      limit: 20,
      extractEmailsAndContacts: false,
      verifyWhatsAppExists: false,
    });

    assert.equal(first, second);
  });

  test('muda a assinatura quando parâmetros comerciais mudam', () => {
    const base = buildCollectionCacheKey({ credentialId: 1, query: 'imobiliarias em cuiaba', limit: 20 });
    const otherCredential = buildCollectionCacheKey({ credentialId: 2, query: 'imobiliarias em cuiaba', limit: 20 });
    const otherLimit = buildCollectionCacheKey({ credentialId: 1, query: 'imobiliarias em cuiaba', limit: 50 });

    assert.notEqual(base, otherCredential);
    assert.notEqual(base, otherLimit);
  });
});
