import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import autopilotOpsRoutes from '../src/api/routes/autopilotOps.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';

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

describe('advanced commercial diagnostics routes', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let otherToken;
  let leadId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'advanced-diagnostics-test-secret';
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
      `INSERT INTO users (email, password_hash, name, profession, primary_niche, internal_context)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        `advanced-diagnostics-${uniqueTag}@prospect.ai`,
        'hash',
        'Diagnostics User',
        'Gestor de Trafego Pago',
        'Clinicas',
        'Separar fatos de inferencias e nao prometer resultado financeiro.',
      ]
    );
    userId = userResult.rows[0].id;
    token = jwt.sign({ userId, email: `advanced-diagnostics-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUserResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`advanced-diagnostics-other-${uniqueTag}@prospect.ai`, 'hash', 'Outro Usuario']
    );
    otherUserId = otherUserResult.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `advanced-diagnostics-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const leadResult = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, site, telefone, whatsapp, cidade, nicho, categoria,
        fonte, score, prioridade, status, data_coleta, rating, total_avaliacoes,
        tem_site, tem_https, tem_pixel_meta, tem_gtm, tem_ga4, tem_google_ads_tag,
        tem_whatsapp_site, tem_formulario, tempo_carregamento_ms
      ) VALUES (
        $1, 'Clinica Diagnostico Teste', 'https://example.com', '+5565999991111', '+5565999991111',
        'Cuiaba', 'clinicas', 'Clinica', 'serper', 94, 'alta', 'analisado', NOW(), 4.8, 220,
        true, true, false, false, false, false, false, false, 4200
      )
      RETURNING id`,
      [userId]
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

  test('gera diagnostico avancado com fatos, inferencias e material comercial', async () => {
    const result = await request(baseUrl, `/api/autopilot/diagnostics/${leadId}/advanced`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.nome_empresa, 'Clinica Diagnostico Teste');
    assert.equal(result.body.niche.key, 'clinicas');
    assert.equal(result.body.gaps.some((gap) => gap.key === 'sem_pixel'), true);
    assert.match(result.body.whatsapp_summary, /Clinica Diagnostico Teste/);
    assert.match(result.body.markdown, /Fatos Observados/);
    assert.match(result.body.loom_script, /Nao significa|nao significa/i);
    assert.match(result.body.meeting_script, /15 minutos|Pergunta/);
    assert.match(result.body.llm_context, /Gestor de Trafego Pago/);
    assert.equal(hasSecretPattern(result.body), false);
  });

  test('impede outro usuario de acessar diagnostico de lead de terceiro', async () => {
    const result = await request(baseUrl, `/api/autopilot/diagnostics/${leadId}/advanced`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    assert.equal(result.response.status, 404);
    assert.equal(result.body.error, 'Lead nao encontrado');
    assert.equal(hasSecretPattern(result.body), false);
  });

  test('aplica diagnostico no lead sem criar envio automatico', async () => {
    const beforeQueue = await query('SELECT COUNT(*)::int AS total FROM message_queue WHERE user_id = $1', [userId]);

    const applied = await request(baseUrl, `/api/autopilot/diagnostics/${leadId}/advanced/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(applied.response.status, 200);
    assert.match(applied.body.lead.diagnostico, /Diagnostico Comercial/);
    assert.match(applied.body.lead.proxima_acao, /Diagnostico comercial avancado/);
    assert.equal(hasSecretPattern(applied.body), false);

    const afterQueue = await query('SELECT COUNT(*)::int AS total FROM message_queue WHERE user_id = $1', [userId]);
    assert.equal(afterQueue.rows[0].total, beforeQueue.rows[0].total);

    const followups = await query(
      `SELECT mensagem
       FROM lead_followups
       WHERE user_id = $1 AND lead_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, leadId]
    );
    assert.match(followups.rows[0].mensagem, /Diagnostico avancado/);
  });
});
