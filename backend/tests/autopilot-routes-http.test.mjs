import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import autopilotRoutes from '../src/api/routes/autopilot.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { pool, query } from '../src/database/init.mjs';
import { ensureAutopilotTables } from '../src/database/autopilotSchema.mjs';

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

describe('autopilot routes HTTP', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let otherToken;
  let ruleId;
  let leadId;
  let queueId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'autopilot-routes-test-secret';

    const client = await pool.connect();
    try {
      await ensureAutopilotTables(client);
    } finally {
      client.release();
    }

    const app = express();
    app.use(express.json());
    app.use('/api/autopilot', autopilotRoutes);
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
        `autopilot-http-${uniqueTag}@prospect.ai`,
        'hash',
        'Teste HTTP Autopilot',
        'Gestor de Tráfego',
        'Imobiliárias',
        'Validar rotas HTTP do Autopilot SDR',
      ]
    );
    userId = userResult.rows[0].id;
    token = jwt.sign({ userId, email: `autopilot-http-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUserResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`autopilot-http-other-${uniqueTag}@prospect.ai`, 'hash', 'Outro Usuário']
    );
    otherUserId = otherUserResult.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `autopilot-http-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const leadResult = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        userId,
        'Imobiliária Autopilot HTTP',
        '+5565999999999',
        '+5565999999999',
        'Cuiaba',
        'imobiliarias',
        'serper',
        88,
        'mensagem_pronta',
      ]
    );
    leadId = leadResult.rows[0].id;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('exige autenticação para regras do Autopilot', async () => {
    const { response, body } = await request(baseUrl, '/api/autopilot/rules');

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Token não fornecido');
  });

  test('cria, lista e atualiza regra sem expor segredos', async () => {
    const created = await request(baseUrl, '/api/autopilot/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Autopilot Imobiliárias Cuiabá',
        enabled: true,
        mode: 'assistido',
        source_type: 'serper',
        city: 'Cuiaba',
        niche: 'imobiliarias',
        min_score: 70,
        require_manual_approval: false,
      }),
    });

    assert.equal(created.response.status, 201);
    assert.ok(created.body.rule.id);
    assert.equal(created.body.rule.mode, 'assistido');
    assert.equal(created.body.rule.require_manual_approval, true);
    assert.equal(hasSecretPattern(created.body), false);
    ruleId = created.body.rule.id;

    const listed = await request(baseUrl, '/api/autopilot/rules', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.rules.some((rule) => rule.id === ruleId), true);
    assert.equal(hasSecretPattern(listed.body), false);

    const updated = await request(baseUrl, `/api/autopilot/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mode: 'automatico',
        require_manual_approval: false,
        max_daily_sends: 30,
      }),
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.rule.mode, 'automatico');
    assert.equal(updated.body.rule.require_manual_approval, false);
    assert.equal(updated.body.rule.max_daily_sends, 30);
  });

  test('impede outro usuário de alterar regra', async () => {
    const response = await request(baseUrl, `/api/autopilot/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ enabled: false }),
    });

    assert.equal(response.response.status, 404);
    assert.equal(response.body.error, 'Regra de automação não encontrada');
  });

  test('lista fila e permite aprovar/cancelar mensagem do usuário', async () => {
    const queueResult = await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, channel, message_type, status, scheduled_at, payload_json
      ) VALUES ($1, $2, $3, 'whatsapp', 'initial', 'pending', NOW(), $4::jsonb)
      RETURNING id`,
      [
        userId,
        leadId,
        ruleId,
        JSON.stringify({ leadName: 'Imobiliária Autopilot HTTP', phone: '+5565999999999' }),
      ]
    );
    queueId = queueResult.rows[0].id;

    const listed = await request(baseUrl, '/api/autopilot/queue?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.messages.some((message) => message.id === queueId), true);
    assert.equal(hasSecretPattern(listed.body), false);

    const foreignApprove = await request(baseUrl, `/api/autopilot/queue/${queueId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    assert.equal(foreignApprove.response.status, 404);
    assert.equal(foreignApprove.body.error, 'Mensagem pendente não encontrada');

    const approved = await request(baseUrl, `/api/autopilot/queue/${queueId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(approved.response.status, 200);
    assert.equal(approved.body.message.status, 'approved');
    assert.ok(approved.body.message.approved_at);
    assert.equal(hasSecretPattern(approved.body), false);

    const cancelled = await request(baseUrl, `/api/autopilot/queue/${queueId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(cancelled.response.status, 200);
    assert.equal(cancelled.body.message.status, 'cancelled');
    assert.ok(cancelled.body.message.cancelled_at);
    assert.equal(hasSecretPattern(cancelled.body), false);
  });
});
