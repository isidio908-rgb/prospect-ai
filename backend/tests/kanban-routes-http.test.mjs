import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import leadsRoutes from '../src/api/routes/leads.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';

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

describe('kanban routes HTTP', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let otherToken;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'kanban-routes-test-secret';
    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/leads', leadsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Kanban User')
       RETURNING id`,
      [`kanban-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `kanban-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUser = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Other Kanban User')
       RETURNING id`,
      [`kanban-other-${uniqueTag}@prospect.ai`]
    );
    otherUserId = otherUser.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `kanban-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const instance = await query(
      `INSERT INTO whatsapp_instances (user_id, label, instance_name, status, phone_number)
       VALUES ($1, 'BDR Cuiaba', $2, 'open', '5565999990000')
       RETURNING id`,
      [userId, `kanban-${uniqueTag}`]
    );

    const lead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, prioridade,
        status, proxima_acao, responsavel, whatsapp_instance_id, data_coleta
      ) VALUES (
        $1, 'Clinica Kanban', '+5565999911111', '+5565999911111', 'Cuiaba', 'clinicas', 'serper', 91, 'Alta',
        'respondeu', 'Confirmar horario sugerido pelo lead.', 'SDR', $2, NOW() - INTERVAL '3 days'
      )
      RETURNING id`,
      [userId, instance.rows[0].id]
    );

    await query(
      `INSERT INTO whatsapp_messages (instance_id, lead_id, user_id, remote_jid, from_me, direction, text_content, created_at)
       VALUES ($1, $2, $3, '5565999911111@s.whatsapp.net', FALSE, 'received', 'Pode ser amanha as 10h?', NOW())`,
      [instance.rows[0].id, lead.rows[0].id, userId]
    );

    await query(
      `INSERT INTO sdr_events (
        user_id, lead_id, classification, decision, scheduling_intent, escalation_required, status_anterior, status_novo
      ) VALUES (
        $1, $2, $3::jsonb, $4::jsonb, $5::jsonb, TRUE, 'contato_enviado', 'respondeu'
      )`,
      [
        userId,
        lead.rows[0].id,
        JSON.stringify({ intent: 'meeting_time_proposed' }),
        JSON.stringify({ action: 'confirm_scheduling_safely' }),
        JSON.stringify({ calendar_payload: { external_event_created: false } }),
      ]
    );

    await query(
      `INSERT INTO leads (user_id, nome_empresa, cidade, nicho, status, data_coleta)
       VALUES ($1, 'Lead Outro Usuario', 'Cuiaba', 'clinicas', 'novo', NOW())`,
      [otherUserId]
    );
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('retorna colunas kanban enriquecidas e isoladas por usuario', async () => {
    const own = await request(baseUrl, '/api/leads/kanban?reply_status=needs_human', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(own.response.status, 200);
    assert.equal(own.body.summary.total, 1);
    assert.equal(own.body.summary.needs_human, 1);

    const responded = own.body.columns.find((column) => column.id === 'respondeu');
    assert.equal(responded.count, 1);
    assert.equal(responded.leads[0].nome_empresa, 'Clinica Kanban');
    assert.equal(responded.leads[0].whatsapp_instance_label, 'BDR Cuiaba');
    assert.equal(responded.leads[0].needs_human, true);

    const other = await request(baseUrl, '/api/leads/kanban', {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    assert.equal(other.response.status, 200);
    assert.equal(other.body.summary.total, 1);
    assert.equal(other.body.columns.flatMap((column) => column.leads).some((lead) => lead.nome_empresa === 'Clinica Kanban'), false);
  });
});
