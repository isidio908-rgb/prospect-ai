import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import autopilotRoutes from '../src/api/routes/autopilot.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';
import { normalizeAutopilotRule } from '../src/services/autopilot/autopilotService.mjs';
import { processApprovedMessages } from '../src/services/autopilot/autopilotExecutionService.mjs';

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

describe('autopilot safety matrix', () => {
  let server;
  let baseUrl;
  let userId;
  let token;
  let acceptedRuleId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'autopilot-safety-test-secret';
    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/autopilot', autopilotRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Safety User')
       RETURNING id`,
      [`safety-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `safety-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('normaliza modo automatico legado para automatico limitado', () => {
    const rule = normalizeAutopilotRule({ mode: 'automatico', require_manual_approval: false });
    assert.equal(rule.mode, 'automatico_limitado');
    assert.equal(rule.require_manual_approval, false);
  });

  test('bloqueia regra automática sem aceite explícito e registra aceite quando informado', async () => {
    const blocked = await request(baseUrl, '/api/autopilot/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Auto sem aceite',
        enabled: true,
        mode: 'automatico_total',
        require_manual_approval: false,
        stop_on_reply: true,
      }),
    });

    assert.equal(blocked.response.status, 400);
    assert.match(blocked.body.error, /Aceite explícito/);

    const accepted = await request(baseUrl, '/api/autopilot/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Auto com aceite',
        enabled: true,
        mode: 'automatico_total',
        require_manual_approval: false,
        stop_on_reply: true,
        safety_acceptance: true,
      }),
    });

    assert.equal(accepted.response.status, 201);
    assert.equal(accepted.body.rule.mode, 'automatico_total');
    assert.ok(accepted.body.rule.safety_accepted_at);
    acceptedRuleId = accepted.body.rule.id;

    const events = await query(
      `SELECT event, mode
       FROM automation_safety_events
       WHERE user_id = $1 AND automation_rule_id = $2
       ORDER BY created_at DESC`,
      [userId, acceptedRuleId]
    );
    assert.equal(events.rows[0].event, 'safety_acceptance_recorded');
    assert.equal(events.rows[0].mode, 'automatico_total');
  });

  test('worker bloqueia envio para lead com opt-out mesmo com mensagem aprovada', async () => {
    const lead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES (
        $1, 'Lead Opt Out', '+5565999912121', '+5565999912121', 'Cuiaba', 'clinicas', 'serper', 90, 'sem_interesse', NOW()
      )
      RETURNING id`,
      [userId]
    );

    const message = await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, channel, message_type, status, scheduled_at, payload_json
      ) VALUES ($1, $2, $3, 'whatsapp', 'initial', 'approved', NOW(), $4::jsonb)
      RETURNING id`,
      [userId, lead.rows[0].id, acceptedRuleId, JSON.stringify({ message: 'Mensagem que deve ser bloqueada' })]
    );

    const result = await processApprovedMessages(userId, {
      dry_run: false,
      confirm_send: true,
      ignore_schedule: false,
      limit: 5,
    });

    assert.equal(result.sentCount, 0);
    assert.equal(result.items[0].safety.reason, 'lead_opted_out');

    const queue = await query(
      `SELECT status, last_error
       FROM message_queue
       WHERE id = $1 AND user_id = $2`,
      [message.rows[0].id, userId]
    );

    assert.equal(queue.rows[0].status, 'failed');
    assert.match(queue.rows[0].last_error, /lead_opted_out/);
  });
});
