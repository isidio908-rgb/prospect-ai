import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import collectionRunsRoutes from '../src/api/routes/collectionRuns.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import {
  addCollectionRunLog,
  buildCollectionCacheKey,
  createCollectionRun,
  finishCollectionRun,
  saveCollectionCache,
} from '../src/services/collectionRunService.mjs';

function hasSecretPattern(payload) {
  return /api_key|apiKey|api_key_encrypted|secret|Bearer|x-api-key|x-rapidapi-key|token/i.test(
    JSON.stringify(payload)
  );
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

describe('collection routes HTTP', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let credentialId;
  let runId;
  let otherRunId;
  let token;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'collection-routes-test-secret';

    const app = express();
    app.use(express.json());
    app.use('/api/collections', collectionRunsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const userResult = await query(
      `INSERT INTO users (email, password_hash, name, profession, primary_niche, internal_context)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        `collection-http-${uniqueTag}@prospect.ai`,
        'hash',
        'Teste HTTP Collections',
        'Gestor de Tráfego',
        'Imobiliárias',
        'Validar rotas HTTP de histórico de coletas',
      ]
    );
    userId = userResult.rows[0].id;
    token = jwt.sign({ userId, email: `collection-http-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUserResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`collection-http-other-${uniqueTag}@prospect.ai`, 'hash', 'Outro Usuário']
    );
    otherUserId = otherUserResult.rows[0].id;

    const credentialResult = await query(
      `INSERT INTO credentials (
        user_id, name, type, category, provider, api_host, api_key_encrypted,
        base_url, search_endpoint, status, daily_limit, monthly_limit
      ) VALUES ($1, $2, $3, 'scraper', $4, $5, $6, $7, $8, 'active', 100, 3000)
      RETURNING id`,
      [
        userId,
        'Serper Teste HTTP',
        'serper',
        'Serper',
        'google.serper.dev',
        encrypt('http-route-validation-key'),
        'https://google.serper.dev',
        '/places',
      ]
    );
    credentialId = credentialResult.rows[0].id;

    const cacheKey = buildCollectionCacheKey({
      credentialId,
      query: 'imobiliarias em cuiaba',
      city: 'Cuiaba',
      niche: 'imobiliarias',
      region: 'br',
      language: 'pt',
      limit: 10,
      verifyWhatsAppExists: false,
    });

    const run = await createCollectionRun(userId, {
      credentialId,
      sourceType: 'serper',
      query: 'imobiliarias em cuiaba',
      city: 'Cuiaba',
      niche: 'imobiliarias',
      region: 'br',
      limit: 10,
      cacheKey,
    });
    runId = run.id;

    await finishCollectionRun(runId, userId, {
      sourceType: 'serper',
      totalFound: 5,
      savedCount: 3,
      duplicateCount: 1,
      errorCount: 0,
      cacheHit: false,
      status: 'completed',
    });

    await addCollectionRunLog(runId, userId, 'info', 'collection_started', 'Coleta iniciada', {
      query: 'imobiliarias em cuiaba',
      provider: 'serper',
    });

    await saveCollectionCache(userId, {
      cacheKey,
      sourceType: 'serper',
      query: 'imobiliarias em cuiaba',
      city: 'Cuiaba',
      niche: 'imobiliarias',
      region: 'br',
      limit: 10,
    }, {
      total: 5,
      leads: [{ nome_empresa: 'Imobiliária Teste HTTP' }],
      sourceType: 'serper',
    });

    const otherRun = await createCollectionRun(otherUserId, {
      sourceType: 'serper',
      query: 'clinicas em cuiaba',
      city: 'Cuiaba',
      niche: 'clinicas',
      limit: 10,
      cacheKey: 'foreign-cache-key',
    });
    otherRunId = otherRun.id;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('exige autenticação para listar histórico de coletas', async () => {
    const { response, body } = await request(baseUrl, '/api/collections');

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Token não fornecido');
  });

  test('lista runs do usuário autenticado sem expor segredos', async () => {
    const { response, body } = await request(baseUrl, '/api/collections?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.runs));

    const ownRun = body.runs.find((run) => run.id === runId);
    assert.ok(ownRun);
    assert.equal(ownRun.credential_name, 'Serper Teste HTTP');
    assert.equal(ownRun.total_found, 5);
    assert.ok(ownRun.cache_expires_at);
    assert.ok(Number(ownRun.cache_ttl_seconds) > 0);
    assert.equal(body.runs.some((run) => run.id === otherRunId), false);
    assert.equal(hasSecretPattern(body), false);
  });

  test('retorna logs apenas do run do usuário autenticado', async () => {
    const own = await request(baseUrl, `/api/collections/${runId}/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(own.response.status, 200);
    assert.equal(own.body.logs.length, 1);
    assert.equal(own.body.logs[0].event, 'collection_started');
    assert.equal(hasSecretPattern(own.body), false);

    const foreign = await request(baseUrl, `/api/collections/${otherRunId}/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(foreign.response.status, 200);
    assert.deepEqual(foreign.body.logs, []);
  });

  test('limpa cache do run autenticado e rejeita run de outro usuário', async () => {
    const foreign = await request(baseUrl, `/api/collections/${otherRunId}/cache`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(foreign.response.status, 404);
    assert.equal(foreign.body.error, 'Execução de coleta não encontrada');

    const own = await request(baseUrl, `/api/collections/${runId}/cache`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(own.response.status, 200);
    assert.equal(own.body.success, true);
    assert.equal(own.body.hadCacheKey, true);
    assert.equal(own.body.deletedCount, 1);
    assert.equal(hasSecretPattern(own.body), false);

    const listed = await request(baseUrl, '/api/collections?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const clearedRun = listed.body.runs.find((run) => run.id === runId);

    assert.ok(clearedRun);
    assert.equal(clearedRun.cache_expires_at, null);
    assert.equal(clearedRun.cache_ttl_seconds, null);
  });
});
