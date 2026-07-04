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

describe('commercial templates routes', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let token;
  let otherToken;
  let leadId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'commercial-templates-test-secret';
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
        `commercial-templates-${uniqueTag}@prospect.ai`,
        'hash',
        'Templates User',
        'Gestor de Trafego Pago',
        'Imobiliarias',
        'Abordar como diagnostico consultivo e priorizar leads com tracking ausente.',
      ]
    );
    userId = userResult.rows[0].id;
    token = jwt.sign({ userId, email: `commercial-templates-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUserResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`commercial-templates-other-${uniqueTag}@prospect.ai`, 'hash', 'Outro Usuario']
    );
    otherUserId = otherUserResult.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `commercial-templates-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const leadResult = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, site, telefone, whatsapp, cidade, nicho, categoria,
        fonte, score, status, data_coleta, rating, total_avaliacoes,
        tem_pixel_meta, tem_gtm, tem_ga4, tem_whatsapp_site, tem_formulario, tempo_carregamento_ms
      ) VALUES (
        $1, 'Imobiliaria Template Teste', 'https://example.com', '+5565999997777', '+5565999997777',
        'Cuiaba', 'imobiliarias', 'Imobiliaria', 'serper', 92, 'analisado', NOW(), 4.7, 180,
        false, false, false, false, false, 4100
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

  test('lista catalogo de templates sem segredos', async () => {
    const listed = await request(baseUrl, '/api/autopilot/templates/catalog', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.niches.some((niche) => niche.key === 'imobiliarias'), true);
    assert.equal(listed.body.tones.some((tone) => tone.key === 'consultivo'), true);
    assert.equal(hasSecretPattern(listed.body), false);
  });

  test('gera previa usando nicho, dores observadas e contexto profissional', async () => {
    const preview = await request(baseUrl, '/api/autopilot/templates/preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, tone: 'diagnostico', niche_key: 'imobiliarias' }),
    });

    assert.equal(preview.response.status, 200);
    assert.equal(preview.body.niche_key, 'imobiliarias');
    assert.equal(preview.body.tone_key, 'diagnostico');
    assert.match(preview.body.messages.initial, /Imobiliaria Template Teste/);
    assert.match(preview.body.messages.initial, /Pixel Meta|Google Tag Manager|GA4/);
    assert.match(preview.body.professional_context, /Gestor de Trafego Pago/);
    assert.equal(preview.body.pains.some((pain) => pain.key === 'sem_pixel'), true);
    assert.equal(hasSecretPattern(preview.body), false);
  });

  test('impede outro usuario de aplicar template em lead de terceiro', async () => {
    const response = await request(baseUrl, '/api/autopilot/templates/apply', {
      method: 'POST',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ lead_id: leadId, tone: 'consultivo', niche_key: 'imobiliarias' }),
    });

    assert.equal(response.response.status, 404);
    assert.equal(response.body.error, 'Lead nao encontrado');
    assert.equal(hasSecretPattern(response.body), false);
  });

  test('aplica template no lead e registra historico', async () => {
    const applied = await request(baseUrl, '/api/autopilot/templates/apply', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: leadId, tone: 'oportunidade', niche_key: 'imobiliarias' }),
    });

    assert.equal(applied.response.status, 200);
    assert.match(applied.body.lead.mensagem_whatsapp, /Imobiliaria Template Teste/);
    assert.match(applied.body.lead.mensagem_whatsapp_followup, /retomar minha mensagem/);
    assert.match(applied.body.lead.proxima_acao, /Template/);
    assert.equal(hasSecretPattern(applied.body), false);

    const followups = await query(
      `SELECT mensagem
       FROM lead_followups
       WHERE user_id = $1 AND lead_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, leadId]
    );

    assert.match(followups.rows[0].mensagem, /Templates/);
  });
});
