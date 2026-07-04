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

describe('approval command fallback route', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let otherToken;
  let batchId;
  let queueIds = [];
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'approval-command-route-test-secret';

    const client = await pool.connect();
    try {
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_whatsapp VARCHAR(50)');
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
      `INSERT INTO users (email, password_hash, name, approval_whatsapp)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [`approval-command-${uniqueTag}@prospect.ai`, 'hash', 'Aprovador Fallback', '5565999990000']
    );
    userId = userResult.rows[0].id;
    token = jwt.sign({ userId, email: `approval-command-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUserResult = await query(
      `INSERT INTO users (email, password_hash, name, approval_whatsapp)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [`approval-command-other-${uniqueTag}@prospect.ai`, 'hash', 'Outro Aprovador', '5565000000000']
    );
    otherUserId = otherUserResult.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `approval-command-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    for (let index = 0; index < 3; index += 1) {
      const lead = await query(
        `INSERT INTO leads (
          user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta, mensagem_whatsapp
        ) VALUES ($1, $2, $3, $4, 'Cuiaba', 'imobiliarias', 'serper', $5, 'mensagem_pronta', NOW(), $6)
        RETURNING id`,
        [
          userId,
          `Lead Fallback ${index + 1}`,
          `+55659999888${index}`,
          `+55659999888${index}`,
          95 - index,
          `Mensagem fallback ${index + 1}`,
        ]
      );

      const queued = await query(
        `INSERT INTO message_queue (
          user_id, lead_id, channel, message_type, status, scheduled_at, payload_json
        ) VALUES ($1, $2, 'whatsapp', 'initial', 'pending', NOW(), $3::jsonb)
        RETURNING id`,
        [userId, lead.rows[0].id, JSON.stringify({ message: `Mensagem fallback ${index + 1}` })]
      );
      queueIds.push(queued.rows[0].id);
    }
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('processa comando de aprovação autenticado usando approval_whatsapp do perfil', async () => {
    const created = await request(baseUrl, '/api/autopilot/approval-batches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ limit: 3, send_approval_request: false }),
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.sent, false);
    assert.equal(created.body.items.length, 3);
    assert.equal(hasSecretPattern(created.body), false);
    batchId = created.body.batch.id;

    const foreign = await request(baseUrl, '/api/autopilot/approval-batches/process-command', {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ text: `APROVAR LOTE ${batchId}` }),
    });

    assert.equal(foreign.response.status, 400);
    assert.equal(foreign.body.reason, 'unauthorized_number');

    const wrongNumber = await request(baseUrl, '/api/autopilot/approval-batches/process-command', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: `APROVAR LOTE ${batchId}`, from_phone: '5565000000000' }),
    });

    assert.equal(wrongNumber.response.status, 400);
    assert.equal(wrongNumber.body.reason, 'unauthorized_number');

    const approved = await request(baseUrl, '/api/autopilot/approval-batches/process-command', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: `APROVAR ${batchId}:1,3` }),
    });

    assert.equal(approved.response.status, 200);
    assert.equal(approved.body.handled, true);
    assert.equal(approved.body.affectedCount, 2);
    assert.equal(approved.body.batch.status, 'partially_approved');
    assert.equal(hasSecretPattern(approved.body), false);

    const cancelled = await request(baseUrl, '/api/autopilot/approval-batches/process-command', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: `CANCELAR LOTE ${batchId}` }),
    });

    assert.equal(cancelled.response.status, 200);
    assert.equal(cancelled.body.handled, true);
    assert.equal(cancelled.body.affectedCount, 1);

    const statuses = await query(
      `SELECT status, approved_by_channel
       FROM message_queue
       WHERE id = ANY($1::int[])
       ORDER BY id ASC`,
      [queueIds]
    );

    assert.equal(statuses.rows.filter((row) => row.status === 'approved').length, 2);
    assert.equal(statuses.rows.filter((row) => row.status === 'cancelled').length, 1);
    assert.equal(statuses.rows.every((row) => row.approved_by_channel === 'whatsapp_approval_batch'), true);
  });

  test('retorna erro controlado para comando desconhecido', async () => {
    const result = await request(baseUrl, '/api/autopilot/approval-batches/process-command', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: 'APROVAR' }),
    });

    assert.equal(result.response.status, 400);
    assert.equal(result.body.reason, 'unknown_command');
    assert.equal(hasSecretPattern(result.body), false);
  });
});
