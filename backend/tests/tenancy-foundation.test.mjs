import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../src/api/routes/auth.mjs';
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

describe('tenancy foundation', () => {
  let server;
  let baseUrl;
  let token;
  let userId;
  let legacyUserId;
  let legacyToken;
  let legacyLeadId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'tenancy-foundation-secret';
    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (legacyUserId) await query('DELETE FROM users WHERE id = $1', [legacyUserId]);
  });

  test('cadastro cria workspace padrão e retorna memberships', async () => {
    const registered = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `tenant-${uniqueTag}@prospect.ai`,
        password: 'senha123',
        name: 'Tenant Owner',
      }),
    });

    assert.equal(registered.response.status, 201);
    assert.ok(registered.body.user.organization_id);
    assert.equal(registered.body.user.workspace.role, 'owner');
    token = registered.body.token;
    userId = registered.body.user.id;

    const me = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(me.response.status, 200);
    assert.equal(me.body.user.organization_id, registered.body.user.organization_id);
    assert.equal(me.body.workspaces.length, 1);
    assert.equal(me.body.workspaces[0].role, 'owner');
  });

  test('usuário legado recebe workspace ao autenticar e operações críticas geram auditoria', async () => {
    const legacy = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Legacy Tenant')
       RETURNING id`,
      [`tenant-legacy-${uniqueTag}@prospect.ai`]
    );
    legacyUserId = legacy.rows[0].id;
    legacyToken = jwt.sign({ userId: legacyUserId, email: `tenant-legacy-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const lead = await query(
      `INSERT INTO leads (user_id, nome_empresa, telefone, cidade, nicho, status, data_coleta)
       VALUES ($1, 'Lead Tenant', '+5565999910101', 'Cuiaba', 'clinicas', 'novo', NOW())
       RETURNING id`,
      [legacyUserId]
    );
    legacyLeadId = lead.rows[0].id;

    const me = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${legacyToken}` },
    });

    assert.equal(me.response.status, 200);
    assert.ok(me.body.user.organization_id);

    const updated = await request(baseUrl, `/api/leads/${legacyLeadId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${legacyToken}` },
      body: JSON.stringify({ status: 'analisado', responsavel: 'SDR' }),
    });
    assert.equal(updated.response.status, 200);

    const deleted = await request(baseUrl, `/api/leads/${legacyLeadId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${legacyToken}` },
    });
    assert.equal(deleted.response.status, 200);

    const audit = await query(
      `SELECT action, organization_id
       FROM audit_events
       WHERE user_id = $1 AND entity_type = 'lead'
       ORDER BY created_at ASC`,
      [legacyUserId]
    );

    assert.deepEqual(audit.rows.map((row) => row.action), ['lead_updated', 'lead_deleted']);
    assert.ok(audit.rows.every((row) => row.organization_id === me.body.user.organization_id));
  });
});
