import { query } from '../database/init.mjs';
import { recordAuditEvent } from './tenancy.mjs';

export const PLAN_LIMITS = {
  starter: { users: 1, leads: 500, imports: 20, integrations: 2 },
  pro: { users: 3, leads: 5000, imports: 200, integrations: 10 },
  business: { users: 10, leads: 25000, imports: 1000, integrations: 30 },
};

export async function ensureBillingSubscription(organizationId, userId = null) {
  if (!organizationId) return null;
  const existing = await query(
    `SELECT os.*, bp.name as plan_name, bp.slug as plan_slug, bp.limits
     FROM organization_subscriptions os
     JOIN billing_plans bp ON bp.id = os.plan_id
     WHERE os.organization_id = $1
     ORDER BY os.created_at DESC
     LIMIT 1`,
    [organizationId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const plan = await query(`SELECT id FROM billing_plans WHERE slug = 'starter' LIMIT 1`);
  const created = await query(
    `INSERT INTO organization_subscriptions (organization_id, plan_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (organization_id) DO NOTHING
     RETURNING *`,
    [organizationId, plan.rows[0].id]
  );
  if (created.rows.length > 0) {
    await recordAuditEvent({
      userId,
      organizationId,
      entityType: 'billing',
      entityId: created.rows[0].id,
      action: 'subscription_created',
      metadata: { plan: 'starter' },
    });
  }
  return ensureBillingSubscription(organizationId, userId);
}

export async function getBillingOverview(organizationId, userId = null) {
  const subscription = await ensureBillingSubscription(organizationId, userId);
  const plans = await query('SELECT id, slug, name, limits, price_cents, currency FROM billing_plans WHERE active = TRUE ORDER BY price_cents ASC');
  const limits = subscription?.limits || PLAN_LIMITS[subscription?.plan_slug] || PLAN_LIMITS.starter;

  const usage = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM organization_members WHERE organization_id = $1) as users,
       (SELECT COUNT(*)::int FROM leads l JOIN users u ON u.id = l.user_id WHERE COALESCE(l.organization_id, u.default_organization_id) = $1) as leads,
       (SELECT COUNT(*)::int FROM collection_runs cr JOIN users u ON u.id = cr.user_id WHERE COALESCE(cr.organization_id, u.default_organization_id) = $1 AND cr.started_at >= DATE_TRUNC('month', NOW())) as imports,
       (SELECT COUNT(*)::int FROM credentials c JOIN users u ON u.id = c.user_id WHERE COALESCE(c.organization_id, u.default_organization_id) = $1 AND c.status <> 'inactive') as integrations`,
    [organizationId]
  );

  return {
    subscription: {
      id: subscription?.id,
      status: subscription?.status || 'active',
      plan_slug: subscription?.plan_slug || 'starter',
      plan_name: subscription?.plan_name || 'Starter',
      current_period_end: subscription?.current_period_end || null,
    },
    limits,
    usage: usage.rows[0] || { users: 0, leads: 0, imports: 0, integrations: 0 },
    plans: plans.rows,
  };
}

export async function assertBillingLimit(organizationId, resource, additional = 1) {
  const overview = await getBillingOverview(organizationId);
  const rawLimit = overview.limits?.[resource];
  const limit = rawLimit === undefined || rawLimit === null ? 0 : Number(rawLimit);
  const used = Number(overview.usage?.[resource] || 0);
  if (Number.isFinite(limit) && used + Number(additional || 0) > limit) {
    const error = new Error(`Limite do plano atingido para ${resource}: ${used}/${limit}`);
    error.status = 402;
    error.code = 'billing_limit_reached';
    error.details = { resource, used, limit, additional };
    throw error;
  }
  return { used, limit, remaining: Math.max(limit - used, 0) };
}

export async function changeSubscriptionPlan(organizationId, userId, planSlug) {
  const plan = await query('SELECT id, slug FROM billing_plans WHERE slug = $1 AND active = TRUE', [planSlug]);
  if (plan.rows.length === 0) {
    const error = new Error('Plano não encontrado');
    error.status = 404;
    throw error;
  }
  const subscription = await ensureBillingSubscription(organizationId, userId);
  const result = await query(
    `UPDATE organization_subscriptions
     SET plan_id = $1, status = 'active', updated_at = NOW()
     WHERE id = $2 AND organization_id = $3
     RETURNING id`,
    [plan.rows[0].id, subscription.id, organizationId]
  );
  await recordAuditEvent({
    userId,
    organizationId,
    entityType: 'billing',
    entityId: result.rows[0].id,
    action: 'subscription_plan_changed',
    metadata: { plan: planSlug },
  });
  return getBillingOverview(organizationId, userId);
}
