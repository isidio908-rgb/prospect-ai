import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import autopilotOpsRoutes from '../src/api/routes/autopilotOps.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import {
  runDueCollectionAutomations,
  saveCollectionAutomationRule,
} from '../src/services/autopilot/collectionAutomationService.mjs';

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

describe('collection automation', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let credentialId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'collection-automation-test-secret';
    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/autopilot', autopilotOpsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Collection Automation')
       RETURNING id`,
      [`collection-auto-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `collection-auto-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUser = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Other Collection User')
       RETURNING id`,
      [`collection-auto-other-${uniqueTag}@prospect.ai`]
    );
    otherUserId = otherUser.rows[0].id;

    const credential = await query(
      `INSERT INTO credentials (
        user_id, name, type, category, api_key_encrypted, api_host, base_url, daily_limit, monthly_limit, status
      ) VALUES (
        $1, 'Serper Auto', 'serper', 'scraper', $2, 'google.serper.dev', 'https://google.serper.dev', 20, 200, 'active'
      )
      RETURNING id`,
      [userId, encrypt('serper-test-key')]
    );
    credentialId = credential.rows[0].id;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('executa regra vencida, salva leads novos e deduplica antes de recriar', async () => {
    const rule = await saveCollectionAutomationRule(userId, {
      credential_id: credentialId,
      name: 'Clinicas Cuiaba',
      enabled: true,
      niche: 'clinicas',
      city: 'Cuiaba',
      limit_requested: 5,
      min_interval_minutes: 60,
      next_run_at: new Date(Date.now() - 60_000).toISOString(),
      force_refresh: true,
    });

    const result = await runDueCollectionAutomations(userId, {
      collector: async () => ({
        leads: [
          {
            nome_empresa: 'Clinica Auto Lead',
            site: 'https://clinica-auto.example.com',
            telefone: '+5565999912345',
            whatsapp: '+5565999912345',
            cidade: 'Cuiaba',
            nicho: 'clinicas',
            categoria: 'Clinica',
            fonte: 'serper',
            google_id: `auto-${uniqueTag}`,
            rating: 4.8,
            total_avaliacoes: 120,
            google_maps_url: 'https://maps.google.com/?cid=auto',
          },
          {
            nome_empresa: 'Clinica Auto Lead Duplicada',
            site: 'https://clinica-auto.example.com',
            telefone: '+55 65 99991-2345',
            whatsapp: '+55 65 99991-2345',
            cidade: 'Cuiaba',
            nicho: 'clinicas',
            categoria: 'Clinica',
            fonte: 'serper',
          },
        ],
        total: 2,
        sourceType: 'serper',
        credentialUsed: credentialId,
        usedToday: 1,
        dailyLimit: 20,
      }),
    });

    assert.equal(result.evaluated, 1);
    assert.equal(result.results[0].status, 'completed');
    assert.equal(result.results[0].saved, 1);
    assert.equal(result.results[0].duplicates, 1);
    assert.equal(result.results[0].rule.consecutive_failures, 0);
    assert.ok(result.results[0].rule.next_run_at);

    const run = await query(
      `SELECT status, saved_count, duplicate_count, source_type
       FROM collection_runs
       WHERE id = $1 AND user_id = $2`,
      [result.results[0].collection_run_id, userId]
    );
    assert.equal(run.rows[0].status, 'completed');
    assert.equal(run.rows[0].saved_count, 1);
    assert.equal(run.rows[0].duplicate_count, 1);
    assert.equal(run.rows[0].source_type, 'serper');

    const logs = await query(
      `SELECT event FROM collection_run_logs
       WHERE run_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [result.results[0].collection_run_id, userId]
    );
    assert.ok(logs.rows.some((row) => row.event === 'automation_collection_started'));
    assert.ok(logs.rows.some((row) => row.event === 'database_saved'));
  });

  test('pausa regra após erro recorrente para evitar loop infinito', async () => {
    const rule = await saveCollectionAutomationRule(userId, {
      credential_id: credentialId,
      name: 'Erro recorrente',
      enabled: true,
      query: `clinicas erro ${uniqueTag}`,
      city: 'Cuiaba',
      niche: 'clinicas',
      limit_requested: 5,
      next_run_at: new Date(Date.now() - 60_000).toISOString(),
      max_consecutive_failures: 1,
      force_refresh: true,
    });

    const result = await runDueCollectionAutomations(userId, {
      collector: async () => {
        throw new Error('provider unavailable');
      },
    });

    const failed = result.results.find((item) => item.rule_id === rule.id);
    assert.equal(failed.status, 'failed');
    assert.equal(failed.paused, true);
    assert.equal(failed.consecutive_failures, 1);
    assert.match(failed.rule.pause_reason, /provider unavailable/);
    assert.ok(failed.rule.paused_until);
  });

  test('API cria, lista e edita regra sem expor segredo da credencial', async () => {
    const created = await request(baseUrl, '/api/autopilot/collections/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        credential_id: credentialId,
        name: 'Imobiliarias Auto',
        enabled: false,
        city: 'Cuiaba',
        niche: 'imobiliarias',
        limit_requested: 10,
      }),
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.rule.name, 'Imobiliarias Auto');
    assert.equal(hasSecretPattern(created.body), false);

    const listed = await request(baseUrl, '/api/autopilot/collections/rules', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(listed.response.status, 200);
    assert.ok(listed.body.rules.some((rule) => rule.id === created.body.rule.id));
    assert.equal(hasSecretPattern(listed.body), false);

    const updated = await request(baseUrl, `/api/autopilot/collections/rules/${created.body.rule.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        enabled: true,
        min_interval_minutes: 120,
      }),
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.rule.enabled, true);
    assert.equal(updated.body.rule.min_interval_minutes, 120);
    assert.equal(hasSecretPattern(updated.body), false);
  });
});
