import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import autopilotOpsRoutes from '../src/api/routes/autopilotOps.mjs';
import { errorHandler } from '../src/api/middleware/errorHandler.mjs';
import { initDatabase, query } from '../src/database/init.mjs';

function hasSensitivePattern(payload) {
  return /api_key|apiKey|api_key_encrypted|secret|Bearer|x-api-key|prompt bruto|system prompt|chave-super-secreta/i.test(
    typeof payload === 'string' ? payload : JSON.stringify(payload)
  );
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') && text ? JSON.parse(text) : text;
  return { response, body };
}

describe('LLM usage reporting routes', () => {
  let server;
  let baseUrl;
  let userId;
  let otherUserId;
  let leadId;
  let token;
  let otherToken;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'llm-usage-report-secret';
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
       VALUES ($1, 'hash', 'LLM Usage User')
       RETURNING id`,
      [`llm-usage-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `llm-usage-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const otherUser = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Other LLM User')
       RETURNING id`,
      [`llm-usage-other-${uniqueTag}@prospect.ai`]
    );
    otherUserId = otherUser.rows[0].id;
    otherToken = jwt.sign({ userId: otherUserId, email: `llm-usage-other-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const lead = await query(
      `INSERT INTO leads (user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta)
       VALUES ($1, 'Lead LLM Seguro', '+5565999912121', '+5565999912121', 'Cuiaba', 'clinicas', 'serper', 91, 'analisado', NOW())
       RETURNING id`,
      [userId]
    );
    leadId = lead.rows[0].id;

    await query(
      `INSERT INTO llm_generations (
        user_id, lead_id, task_id, purpose, provider, model, status,
        prompt_tokens, completion_tokens, total_tokens, usage_estimated,
        estimated_cost_usd, prompt_chars, response_chars, duration_ms, error_message
      ) VALUES
      ($1, $2, 'task-bdr', 'bdr_initial', 'openai', 'gpt-4o-mini', 'success', 300, 45, 345, FALSE, 0.00018000, 1800, 280, 920, NULL),
      ($1, $2, 'task-follow', 'followup_1', 'openai', 'gpt-4o-mini', 'error_provider', 260, 0, 260, TRUE, 0.00010000, 1700, 0, 1200, 'provider recusou chamada; prompt bruto e chave-super-secreta foram omitidos')`,
      [userId, leadId]
    );

    await query(
      `INSERT INTO llm_generations (
        user_id, purpose, provider, model, status, total_tokens, estimated_cost_usd
      ) VALUES ($1, 'assistant', 'anthropic', 'claude-test', 'success', 999, 9.99000000)`,
      [otherUserId]
    );
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('lista uso LLM sanitizado por usuário com filtros', async () => {
    const { response, body } = await request(baseUrl, '/api/autopilot/llm-usage?provider=openai&limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    assert.equal(body.summary.total_count, 2);
    assert.equal(body.summary.total_tokens, 605);
    assert.equal(body.summary.error_count, 1);
    assert.equal(body.groups[0].provider, 'openai');
    assert.equal(body.generations.length, 2);
    assert.equal(body.generations[0].lead_name, 'Lead LLM Seguro');
    assert.equal(body.generations.some((generation) => generation.provider === 'anthropic'), false);
    assert.equal(hasSensitivePattern(body), false);
  });

  test('exporta CSV sem dados sensíveis e respeita isolamento', async () => {
    const { response, body } = await request(baseUrl, '/api/autopilot/llm-usage/export.csv', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/csv/);
    assert.match(body, /bdr_initial/);
    assert.doesNotMatch(body, /anthropic|claude-test/);
    assert.equal(hasSensitivePattern(body), false);
  });

  test('outro usuário não acessa histórico alheio', async () => {
    const { response, body } = await request(baseUrl, '/api/autopilot/llm-usage', {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    assert.equal(response.status, 200);
    assert.equal(body.summary.total_count, 1);
    assert.equal(body.generations[0].provider, 'anthropic');
  });
});
