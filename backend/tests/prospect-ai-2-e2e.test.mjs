import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import autopilotRoutes from '../src/api/routes/autopilot.mjs';
import autopilotOpsRoutes from '../src/api/routes/autopilotOps.mjs';
import leadsRoutes from '../src/api/routes/leads.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import { handleWebhookEvent } from '../src/services/whatsapp/whatsappService.mjs';
import {
  runDueCollectionAutomations,
  saveCollectionAutomationRule,
} from '../src/services/autopilot/collectionAutomationService.mjs';

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

function createEvolutionMock() {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : null;
      calls.push({ method: req.method, url: req.url, body });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url?.startsWith('/message/sendText/')) {
        res.end(JSON.stringify({ key: { id: `mock-${calls.length}`, remoteJid: `${body.number}@s.whatsapp.net` } }));
        return;
      }
      res.end(JSON.stringify({ ok: true, instance: { state: 'open' } }));
    });
  });

  return {
    calls,
    async start() {
      server.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      const { port } = server.address();
      return `http://127.0.0.1:${port}`;
    },
    async stop() {
      if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  };
}

describe('Prospect AI 2.0 E2E', () => {
  let server;
  let baseUrl;
  let evolutionMock;
  let userId;
  let token;
  let credentialId;
  let primaryWhatsappId;
  let sdrWhatsappId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'prospect-ai-2-e2e-secret';
    process.env.EVOLUTION_API_GLOBAL_KEY ||= 'global-test-key';
    process.env.EVOLUTION_WEBHOOK_URL ||= 'http://localhost/evolution/webhook';
    process.env.EVOLUTION_WEBHOOK_SECRET ||= 'webhook-test-secret';
    process.env.AUTOPILOT_WORKSPACE_DAILY_SEND_LIMIT = '50';
    process.env.AUTOPILOT_INSTANCE_DAILY_SEND_LIMIT = '50';

    evolutionMock = createEvolutionMock();
    process.env.EVOLUTION_API_URL = await evolutionMock.start();

    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/autopilot', autopilotRoutes);
    app.use('/api/autopilot', autopilotOpsRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const user = await query(
      `INSERT INTO users (email, password_hash, name, profession, primary_niche, internal_context, approval_whatsapp)
       VALUES ($1, 'hash', 'Prospect AI E2E', 'Growth B2B', 'clinicas', 'Operacao consultiva focada em reunioes qualificadas.', '5565999990000')
       RETURNING id`,
      [`prospect-ai-2-e2e-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `prospect-ai-2-e2e-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const credential = await query(
      `INSERT INTO credentials (
        user_id, name, type, category, api_key_encrypted, api_host, base_url, daily_limit, monthly_limit, status
      ) VALUES (
        $1, 'Serper E2E', 'serper', 'scraper', $2, 'google.serper.dev', 'https://google.serper.dev', 20, 200, 'active'
      )
      RETURNING id`,
      [userId, encrypt('serper-e2e-key')]
    );
    credentialId = credential.rows[0].id;

    const primary = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, is_default, instance_name, instance_token_encrypted, status,
        phone_number, profile_name, simulate_typing
      ) VALUES ($1, 'BDR Principal', TRUE, $2, $3, 'open', '5565999910001', 'BDR Principal', FALSE)
      RETURNING id`,
      [userId, `e2e-bdr-${uniqueTag}`, encrypt('token-bdr')]
    );
    primaryWhatsappId = primary.rows[0].id;

    const sdr = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, is_default, instance_name, instance_token_encrypted, status,
        phone_number, profile_name, simulate_typing
      ) VALUES ($1, 'SDR Backup', FALSE, $2, $3, 'open', '5565999910002', 'SDR Backup', FALSE)
      RETURNING id`,
      [userId, `e2e-sdr-${uniqueTag}`, encrypt('token-sdr')]
    );
    sdrWhatsappId = sdr.rows[0].id;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (evolutionMock) await evolutionMock.stop();
  });

  test('valida fluxo completo de coleta, BDR, WhatsApp, SDR e Kanban com falhas seguras', async () => {
    const collectionRule = await saveCollectionAutomationRule(userId, {
      credential_id: credentialId,
      name: 'Clinicas Cuiaba E2E',
      enabled: true,
      niche: 'clinicas',
      city: 'Cuiaba',
      limit_requested: 5,
      min_interval_minutes: 60,
      next_run_at: new Date(Date.now() - 60_000).toISOString(),
      force_refresh: true,
    });

    const collection = await runDueCollectionAutomations(userId, {
      collector: async () => ({
        leads: [
          {
            nome_empresa: 'Clinica E2E Prime',
            site: 'https://clinica-e2e.example.com',
            telefone: '+5565999912345',
            whatsapp: '+5565999912345',
            cidade: 'Cuiaba',
            nicho: 'clinicas',
            categoria: 'Clinica',
            fonte: 'serper',
            google_id: `e2e-${uniqueTag}`,
            rating: 4.9,
            total_avaliacoes: 140,
            google_maps_url: 'https://maps.google.com/?cid=e2e',
          },
          {
            nome_empresa: 'Clinica E2E Prime Duplicada',
            site: 'https://clinica-e2e.example.com',
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
      }),
    });

    assert.equal(collection.evaluated, 1);
    assert.equal(collection.results[0].status, 'completed');
    assert.equal(collection.results[0].saved, 1);
    assert.equal(collection.results[0].duplicates, 1);

    const collectedLead = await query(
      `UPDATE leads
       SET score = 94, prioridade = 'Alta', status = 'mensagem_pronta', whatsapp_instance_id = $1, updated_at = NOW()
       WHERE user_id = $2 AND google_id = $3
       RETURNING id, nome_empresa, telefone, whatsapp_instance_id`,
      [sdrWhatsappId, userId, `e2e-${uniqueTag}`]
    );
    const leadId = collectedLead.rows[0].id;

    const logs = await query(
      `SELECT event FROM collection_run_logs
       WHERE user_id = $1 AND run_id = $2
       ORDER BY created_at ASC`,
      [userId, collection.results[0].collection_run_id]
    );
    assert.ok(logs.rows.some((row) => row.event === 'automation_collection_started'));
    assert.ok(logs.rows.some((row) => row.event === 'database_saved'));

    const ruleResponse = await request(baseUrl, '/api/autopilot/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'BDR Automatico E2E',
        enabled: true,
        mode: 'automatico_total',
        source_type: 'serper',
        city: 'Cuiaba',
        niche: 'clinicas',
        min_score: 80,
        max_daily_sends: 10,
        max_hourly_sends: 10,
        send_window_start: '00:00',
        send_window_end: '23:59',
        require_manual_approval: false,
        stop_on_reply: true,
        default_whatsapp_instance_id: primaryWhatsappId,
        safety_acceptance: true,
      }),
    });
    assert.equal(ruleResponse.response.status, 201);
    const ruleId = ruleResponse.body.rule.id;
    assert.ok(ruleResponse.body.rule.safety_accepted_at);

    const scheduler = await request(baseUrl, '/api/autopilot/scheduler/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, rule_id: ruleId, limit: 5 }),
    });
    assert.equal(scheduler.response.status, 200);
    assert.equal(scheduler.body.queued, 1);

    const queued = await query(
      `SELECT id, status, whatsapp_instance_id, payload_json
       FROM message_queue
       WHERE user_id = $1 AND lead_id = $2 AND automation_rule_id = $3 AND message_type = 'initial'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, leadId, ruleId]
    );
    assert.equal(queued.rows[0].status, 'approved');
    assert.equal(queued.rows[0].whatsapp_instance_id, primaryWhatsappId);
    assert.match(queued.rows[0].payload_json.message, /Clinica E2E Prime|diagnostico|oportunidade/i);

    const worker = await request(baseUrl, '/api/autopilot/worker/process-approved', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, confirm_send: true, ignore_schedule: false, limit: 5 }),
    });
    assert.equal(worker.response.status, 200);
    assert.equal(worker.body.sentCount, 1);

    const sendCall = evolutionMock.calls.find((call) => call.url?.startsWith(`/message/sendText/e2e-bdr-${uniqueTag}`));
    assert.ok(sendCall);
    assert.equal(sendCall.body.number, '5565999912345');

    await handleWebhookEvent({
      event: 'MESSAGES_UPSERT',
      instance: `e2e-bdr-${uniqueTag}`,
      data: {
        key: {
          id: `reply-${uniqueTag}`,
          remoteJid: '5565999912345@s.whatsapp.net',
          fromMe: false,
        },
        messageType: 'conversation',
        message: {
          conversation: 'Pode ser amanha as 10h para conversarmos?',
        },
      },
    });

    const sdrAnalysis = await request(baseUrl, `/api/autopilot/sdr/replies/${leadId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, timezone: 'America/Cuiaba', duration_minutes: 15 }),
    });
    assert.equal(sdrAnalysis.response.status, 200);
    assert.equal(sdrAnalysis.body.classification.intent, 'meeting_time_proposed');
    assert.equal(sdrAnalysis.body.scheduling_intent.state, 'confirm_scheduling_safely');
    assert.equal(sdrAnalysis.body.decision.result, 'appointment_intent_created');
    assert.equal(sdrAnalysis.body.decision.escalation_required, true);

    const kanban = await request(baseUrl, '/api/leads/kanban?limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(kanban.response.status, 200);
    assert.equal(JSON.stringify(kanban.body).includes('Clinica E2E Prime'), true);

    const sdrEvent = await query(
      `SELECT classification, decision, scheduling_intent, escalation_required
       FROM sdr_events
       WHERE user_id = $1 AND lead_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, leadId]
    );
    assert.equal(sdrEvent.rows[0].classification.intent, 'meeting_time_proposed');
    assert.equal(sdrEvent.rows[0].scheduling_intent.state, 'confirm_scheduling_safely');
    assert.equal(sdrEvent.rows[0].escalation_required, true);

    const missingCredentialRule = await saveCollectionAutomationRule(userId, {
      name: 'Sem Credencial E2E',
      enabled: true,
      query: `sem credencial ${uniqueTag}`,
      city: 'Cuiaba',
      niche: 'clinicas',
      next_run_at: new Date(Date.now() - 60_000).toISOString(),
      max_consecutive_failures: 1,
    });
    await query('UPDATE credentials SET status = $1 WHERE id = $2 AND user_id = $3', ['inactive', credentialId, userId]);
    const missingCredential = await runDueCollectionAutomations(userId, { limit: 5 });
    const missingResult = missingCredential.results.find((item) => item.rule_id === missingCredentialRule.id);
    assert.equal(missingResult.status, 'failed');
    assert.match(missingResult.error, /Nenhuma credencial/);
    await query('UPDATE credentials SET status = $1 WHERE id = $2 AND user_id = $3', ['active', credentialId, userId]);

    const optOutLead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, 'Lead Opt Out E2E', '+5565999917777', '+5565999917777', 'Cuiaba', 'clinicas', 'serper', 91, 'sem_interesse', NOW())
      RETURNING id`,
      [userId]
    );
    await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, whatsapp_instance_id, channel, message_type, status, scheduled_at, payload_json
      ) VALUES ($1, $2, $3, $4, 'whatsapp', 'initial', 'approved', NOW(), $5::jsonb)`,
      [userId, optOutLead.rows[0].id, ruleId, primaryWhatsappId, JSON.stringify({ message: 'Nao deve enviar' })]
    );
    const optOutWorker = await request(baseUrl, '/api/autopilot/worker/process-approved', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, confirm_send: true, ignore_schedule: false, limit: 5 }),
    });
    assert.equal(optOutWorker.body.items[0].safety.reason, 'lead_opted_out');

    const disconnected = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, instance_name, instance_token_encrypted, status, phone_number, simulate_typing
      ) VALUES ($1, 'Desconectado E2E', $2, $3, 'close', '5565999910003', FALSE)
      RETURNING id`,
      [userId, `e2e-disconnected-${uniqueTag}`, encrypt('token-disconnected')]
    );
    const disconnectedLead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, 'Lead Numero Desconectado E2E', '+5565999918888', '+5565999918888', 'Cuiaba', 'clinicas', 'serper', 91, 'mensagem_pronta', NOW())
      RETURNING id`,
      [userId]
    );
    await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, whatsapp_instance_id, channel, message_type, status, scheduled_at, payload_json
      ) VALUES ($1, $2, $3, $4, 'whatsapp', 'initial', 'approved', NOW(), $5::jsonb)`,
      [userId, disconnectedLead.rows[0].id, ruleId, disconnected.rows[0].id, JSON.stringify({ message: 'Falha esperada' })]
    );
    const disconnectedWorker = await request(baseUrl, '/api/autopilot/worker/process-approved', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, confirm_send: true, ignore_schedule: false, limit: 5 }),
    });
    assert.match(disconnectedWorker.body.items[0].error, /WhatsApp desconectado/);

    const limitedRule = await request(baseUrl, '/api/autopilot/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Limite Diario E2E',
        enabled: true,
        mode: 'automatico_total',
        source_type: 'serper',
        city: 'Cuiaba',
        niche: 'clinicas',
        min_score: 80,
        max_daily_sends: 1,
        max_hourly_sends: 10,
        send_window_start: '00:00',
        send_window_end: '23:59',
        require_manual_approval: false,
        default_whatsapp_instance_id: primaryWhatsappId,
        safety_acceptance: true,
      }),
    });
    assert.equal(limitedRule.response.status, 201);

    const limitedLead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, 'Lead Limite E2E', '+5565999919999', '+5565999919999', 'Cuiaba', 'clinicas', 'serper', 91, 'mensagem_pronta', NOW())
      RETURNING id`,
      [userId]
    );
    const previouslySentLead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, 'Lead Ja Enviado Limite E2E', '+5565999916666', '+5565999916666', 'Cuiaba', 'clinicas', 'serper', 91, 'contato_enviado', NOW())
      RETURNING id`,
      [userId]
    );
    await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, whatsapp_instance_id, channel, message_type, status, scheduled_at, sent_at, payload_json
      ) VALUES ($1, $2, $3, $4, 'whatsapp', 'initial', 'sent', NOW(), NOW(), $5::jsonb)`,
      [userId, previouslySentLead.rows[0].id, limitedRule.body.rule.id, primaryWhatsappId, JSON.stringify({ message: 'Ja enviado' })]
    );
    await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, whatsapp_instance_id, channel, message_type, status, scheduled_at, payload_json
      ) VALUES ($1, $2, $3, $4, 'whatsapp', 'initial', 'approved', NOW(), $5::jsonb)`,
      [userId, limitedLead.rows[0].id, limitedRule.body.rule.id, primaryWhatsappId, JSON.stringify({ message: 'Deve bater limite' })]
    );
    const limitedWorker = await request(baseUrl, '/api/autopilot/worker/process-approved', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dry_run: false, confirm_send: true, ignore_schedule: false, limit: 5 }),
    });
    assert.equal(limitedWorker.body.items[0].safety.reason, 'rule_daily_limit_reached');

    const safetyEvents = await query(
      `SELECT event FROM automation_safety_events
       WHERE user_id = $1 AND automation_rule_id = $2`,
      [userId, ruleId]
    );
    assert.ok(safetyEvents.rows.some((row) => row.event === 'safety_acceptance_recorded'));
  });
});
