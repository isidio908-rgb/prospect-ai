import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import billingRoutes from '../src/api/routes/billing.mjs';
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

describe('billing routes and limits', () => {
  let server;
  let baseUrl;
  let userId;
  let token;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'billing-routes-secret';
    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use('/api/billing', billingRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Billing User')
       RETURNING id`,
      [`billing-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `billing-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('retorna assinatura interna e permite trocar plano com auditoria', async () => {
    const overview = await request(baseUrl, '/api/billing', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(overview.response.status, 200);
    assert.equal(overview.body.subscription.plan_slug, 'starter');
    assert.ok(overview.body.limits.leads);

    const changed = await request(baseUrl, '/api/billing/subscription', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan_slug: 'pro' }),
    });

    assert.equal(changed.response.status, 200);
    assert.equal(changed.body.subscription.plan_slug, 'pro');

    const audit = await query(
      `SELECT action FROM audit_events WHERE user_id = $1 AND entity_type = 'billing' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    assert.equal(audit.rows[0].action, 'subscription_plan_changed');
  });

  test('bloqueia criação de lead quando limite do plano é atingido', async () => {
    const org = await query('SELECT default_organization_id FROM users WHERE id = $1', [userId]);
    const plan = await query(`SELECT id FROM billing_plans WHERE slug = 'starter'`);
    try {
      await query(
        `UPDATE billing_plans SET limits = '{"users":1,"leads":0,"imports":1,"integrations":1}'::jsonb WHERE slug = 'starter'`
      );
      await query(
        `UPDATE organization_subscriptions SET plan_id = $1 WHERE organization_id = $2`,
        [plan.rows[0].id, org.rows[0].default_organization_id]
      );

      const created = await request(baseUrl, '/api/leads/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome_empresa: 'Lead Bloqueado Billing' }),
      });

      assert.equal(created.response.status, 402);
      assert.match(created.body.error, /Limite do plano/);
    } finally {
      await query(
        `UPDATE billing_plans SET limits = '{"users":1,"leads":500,"imports":20,"integrations":2}'::jsonb WHERE slug = 'starter'`
      );
    }
  });
});
