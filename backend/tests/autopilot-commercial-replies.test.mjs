import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import autopilotOpsRoutes from '../src/api/routes/autopilotOps.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';
import { classifyReplyText } from '../src/services/autopilot/autopilotExecutionService.mjs';
import { classifySdrReplyText } from '../src/services/autopilot/sdrAgentService.mjs';

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

describe('autopilot commercial replies', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let otherToken;
  let leadId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'autopilot-commercial-replies-test-secret';
    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/autopilot', autopilotOpsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const userResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`commercial-replies-${uniqueTag}@prospect.ai`, 'hash', 'Comercial Replies']
    );
    userId = userResult.rows[0].id;
    token = jwt.sign({ userId, email: `commercial-replies-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUserResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`commercial-replies-other-${uniqueTag}@prospect.ai`, 'hash', 'Outro Usuario']
    );
    otherUserId = otherUserResult.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `commercial-replies-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const leadResult = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [userId, 'Clinica Respondeu', '+5565999991000', '+5565999991000', 'Cuiaba', 'clinicas', 'serper', 91, 'contato_enviado']
    );
    leadId = leadResult.rows[0].id;

    const instanceResult = await query(
      `INSERT INTO whatsapp_instances (user_id, instance_name, status, phone_number)
       VALUES ($1, $2, 'open', $3)
       RETURNING id`,
      [userId, `commercial-replies-${uniqueTag}`, '+5565999990000']
    );

    await query(
      `INSERT INTO whatsapp_messages (instance_id, lead_id, user_id, remote_jid, from_me, direction, text_content, created_at)
       VALUES
       ($1, $2, $3, '5565999991000@s.whatsapp.net', TRUE, 'sent', 'Mensagem inicial enviada', NOW() - INTERVAL '20 minutes'),
       ($1, $2, $3, '5565999991000@s.whatsapp.net', FALSE, 'received', 'Pode marcar uma reuniao amanha?', NOW() - INTERVAL '5 minutes')`,
      [instanceResult.rows[0].id, leadId, userId]
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('classifica resposta comercial de reuniao', () => {
    const classification = classifyReplyText('Pode marcar uma reuniao amanha?');

    assert.equal(classification.intent, 'meeting');
    assert.equal(classification.confidence > 0.7, true);
  });

  test('classifica resposta SDR com horario proposto sem confirmar agenda automaticamente', () => {
    const classification = classifySdrReplyText('Pode ser amanha as 10h?');

    assert.equal(classification.intent, 'meeting_time_proposed');
    assert.equal(classification.stage, 'scheduling');
    assert.equal(classification.qualification, 'high_intent');
  });

  test('lista inbox comercial sem expor segredos', async () => {
    const listed = await request(baseUrl, '/api/autopilot/replies/inbox?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.total, 1);
    assert.equal(listed.body.replies[0].lead_id, leadId);
    assert.equal(listed.body.replies[0].classification.intent, 'meeting');
    assert.match(listed.body.replies[0].suggested_reply, /horarios|horários/i);
    assert.equal(hasSecretPattern(listed.body), false);
  });

  test('impede outro usuario de aplicar acao no lead', async () => {
    const response = await request(baseUrl, `/api/autopilot/replies/${leadId}/action`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ action: 'mark_meeting', note: 'Tentativa externa' }),
    });

    assert.equal(response.response.status, 404);
    assert.equal(response.body.error, 'Lead nao encontrado');
    assert.equal(hasSecretPattern(response.body), false);
  });

  test('aplica proxima acao comercial no CRM e historico', async () => {
    const applied = await request(baseUrl, `/api/autopilot/replies/${leadId}/action`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: 'mark_meeting',
        scheduled_for: 'Amanha 09:00',
        note: 'Lead pediu reuniao pelo WhatsApp.',
      }),
    });

    assert.equal(applied.response.status, 200);
    assert.equal(applied.body.lead.status, 'reuniao_marcada');
    assert.match(applied.body.lead.proxima_acao, /Amanha 09:00/);
    assert.equal(hasSecretPattern(applied.body), false);

    const followups = await query(
      `SELECT tipo, status_anterior, status_novo, mensagem
       FROM lead_followups
       WHERE user_id = $1 AND lead_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, leadId]
    );

    assert.equal(followups.rows[0].tipo, 'reuniao');
    assert.equal(followups.rows[0].status_anterior, 'contato_enviado');
    assert.equal(followups.rows[0].status_novo, 'reuniao_marcada');
  });

  test('SDR prepara intenção de agendamento sem criar evento externo', async () => {
    const sdrLead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, 'Clinica SDR', '+5565999992000', '+5565999992000', 'Cuiaba', 'clinicas', 'serper', 93, 'contato_enviado', NOW())
      RETURNING id`,
      [userId]
    );
    const sdrLeadId = sdrLead.rows[0].id;

    const instance = await query(
      `SELECT id FROM whatsapp_instances WHERE user_id = $1 ORDER BY id ASC LIMIT 1`,
      [userId]
    );

    await query(
      `INSERT INTO whatsapp_messages (instance_id, lead_id, user_id, remote_jid, from_me, direction, text_content, created_at)
       VALUES ($1, $2, $3, '5565999992000@s.whatsapp.net', FALSE, 'received', 'Tenho interesse, pode me mandar horarios?', NOW())
       RETURNING id`,
      [instance.rows[0].id, sdrLeadId, userId]
    );

    const dryRun = await request(baseUrl, `/api/autopilot/sdr/replies/${sdrLeadId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: true, preferred_period: 'morning' }),
    });

    assert.equal(dryRun.response.status, 200);
    assert.equal(dryRun.body.dryRun, true);
    assert.equal(dryRun.body.classification.intent, 'meeting_request');
    assert.equal(dryRun.body.decision.action, 'offer_scheduling_slots');
    assert.equal(dryRun.body.scheduling_intent.calendar_payload.external_event_created, false);
    assert.equal(dryRun.body.scheduling_intent.slots.length > 0, true);
    assert.equal(hasSecretPattern(dryRun.body), false);

    const applied = await request(baseUrl, `/api/autopilot/sdr/replies/${sdrLeadId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, preferred_period: 'morning' }),
    });

    assert.equal(applied.response.status, 200);
    assert.equal(applied.body.lead.status, 'respondeu');
    assert.equal(applied.body.event.escalation_required, false);
    assert.equal(applied.body.event.scheduling_intent.calendar_payload.external_event_created, false);
    assert.match(applied.body.decision.recommended_message, /horarios|horários/i);

    const history = await query(
      `SELECT tipo, status_anterior, status_novo, mensagem
       FROM lead_followups
       WHERE user_id = $1 AND lead_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, sdrLeadId]
    );
    assert.equal(history.rows[0].tipo, 'sdr');
    assert.equal(history.rows[0].status_anterior, 'contato_enviado');
    assert.equal(history.rows[0].status_novo, 'respondeu');
    assert.match(history.rows[0].mensagem, /Raciocinio/i);
  });

  test('SDR escala horario proposto para humano antes de marcar reuniao', async () => {
    const response = await request(baseUrl, `/api/autopilot/sdr/replies/${leadId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        dry_run: false,
        text: 'Pode ser amanha as 10h?',
      }),
    });

    assert.equal(response.response.status, 200);
    assert.equal(response.body.classification.intent, 'meeting_time_proposed');
    assert.equal(response.body.decision.action, 'confirm_scheduling_safely');
    assert.equal(response.body.decision.escalation_required, true);
    assert.equal(response.body.lead.status, 'respondeu');
    assert.equal(response.body.scheduling_intent.calendar_payload.external_event_created, false);
  });

  test('SDR impede outro usuario de analisar lead alheio', async () => {
    const response = await request(baseUrl, `/api/autopilot/sdr/replies/${leadId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ text: 'Tenho interesse', dry_run: false }),
    });

    assert.equal(response.response.status, 404);
    assert.equal(response.body.error, 'Lead nao encontrado');
    assert.equal(hasSecretPattern(response.body), false);
  });
});
