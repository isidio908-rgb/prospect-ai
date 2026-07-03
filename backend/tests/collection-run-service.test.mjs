import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import {
  addCollectionRunLog,
  buildCollectionCacheKey,
  clearCollectionCacheForRun,
  createCollectionRun,
  finishCollectionRun,
  getCollectionCache,
  listCollectionRunLogs,
  listCollectionRuns,
  saveCollectionCache,
} from '../src/services/collectionRunService.mjs';

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

describe('collection run storage', () => {
  let userId;
  let credentialId;
  let runId;
  const uniqueTag = Date.now();

  before(async () => {
    const userResult = await query(
      `INSERT INTO users (email, password_hash, name, profession, primary_niche, internal_context)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        `collection-${uniqueTag}@prospect.ai`,
        'hash',
        'Teste Coleta',
        'Gestor de Tráfego',
        'Clínicas',
        'Contexto de validação',
      ]
    );
    userId = userResult.rows[0].id;

    const credentialResult = await query(
      `INSERT INTO credentials (
        user_id, name, type, category, provider, api_host, api_key_encrypted,
        base_url, search_endpoint, status, daily_limit, monthly_limit
      ) VALUES ($1, $2, $3, 'scraper', $4, $5, $6, $7, $8, 'active', 100, 3000)
      RETURNING id`,
      [
        userId,
        'Credencial Coleta Teste',
        'rapidapi',
        'Local Business Data',
        'local-business-data.p.rapidapi.com',
        encrypt('validation-key-1234567890'),
        'https://local-business-data.p.rapidapi.com',
        '/search',
      ]
    );
    credentialId = credentialResult.rows[0].id;
  });

  after(async () => {
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  test('persiste execução, logs e cache sem expor credenciais', async () => {
    const cacheKey = buildCollectionCacheKey({
      credentialId,
      query: 'clinicas odontologicas em cuiaba',
      city: 'Cuiaba',
      niche: 'clinicas odontologicas',
      region: 'br',
      language: 'pt',
      limit: 25,
      extractEmailsAndContacts: false,
      verifyWhatsAppExists: true,
    });

    const run = await createCollectionRun(userId, {
      credentialId,
      sourceType: 'rapidapi',
      query: 'clinicas odontologicas em cuiaba',
      niche: 'clinicas odontologicas',
      city: 'Cuiaba',
      region: 'br',
      limit: 25,
      verifyWhatsAppExists: true,
      cacheKey,
    });

    runId = run.id;
    assert.ok(runId);

    const startedLog = await addCollectionRunLog(
      runId,
      userId,
      'info',
      'collection_started',
      'Coleta iniciada',
      { query: 'clinicas odontologicas em cuiaba' }
    );
    assert.ok(startedLog.id);

    const finished = await finishCollectionRun(runId, userId, {
      sourceType: 'rapidapi',
      totalFound: 12,
      savedCount: 8,
      duplicateCount: 2,
      errorCount: 1,
      whatsappVerifiedCount: 6,
      whatsappRejectedCount: 2,
      withoutPhoneCount: 1,
      cacheHit: true,
      status: 'completed_with_errors',
    });

    assert.equal(finished.status, 'completed_with_errors');
    assert.equal(finished.cache_hit, true);

    const cache = await saveCollectionCache(
      userId,
      {
        cacheKey,
        sourceType: 'rapidapi',
        query: 'clinicas odontologicas em cuiaba',
        niche: 'clinicas odontologicas',
        city: 'Cuiaba',
        region: 'br',
        limit: 25,
        params: { verifyWhatsAppExists: true },
      },
      {
        total: 12,
        leads: [{ nome_empresa: 'Clinica Teste' }],
        sourceType: 'rapidapi',
      }
    );
    assert.ok(cache.id);

    const cached = await getCollectionCache(userId, cacheKey);
    assert.ok(cached);
    assert.equal(cached.response_json.total, 12);

    const runs = await listCollectionRuns(userId, { limit: 10, offset: 0 });
    const savedRun = runs.find((entry) => entry.id === runId);
    assert.ok(savedRun);
    assert.equal(savedRun.credential_name, 'Credencial Coleta Teste');
    assert.equal(savedRun.cache_hit, true);
    assert.ok(savedRun.cache_expires_at);
    assert.ok(Number(savedRun.cache_ttl_seconds) > 0);

    const logs = await listCollectionRunLogs(userId, runId);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'collection_started');
    assert.ok(!JSON.stringify(logs).match(/api_key|apiKey|secret|Bearer/i));
    assert.ok(!JSON.stringify(cached).match(/api_key|apiKey|secret|Bearer/i));
  });

  test('limpa cache apenas da execução do usuário', async () => {
    const missing = await clearCollectionCacheForRun(userId, 999999999);
    assert.equal(missing, null);

    const cleared = await clearCollectionCacheForRun(userId, runId);
    assert.equal(cleared.hadCacheKey, true);
    assert.equal(cleared.deletedCount, 1);

    const runs = await listCollectionRuns(userId, { limit: 10, offset: 0 });
    const savedRun = runs.find((entry) => entry.id === runId);
    assert.ok(savedRun);
    assert.equal(savedRun.cache_expires_at, null);
    assert.equal(savedRun.cache_ttl_seconds, null);
  });
});
