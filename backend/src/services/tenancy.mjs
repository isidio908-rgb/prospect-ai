import { query } from '../database/init.mjs';

export async function ensureUserWorkspace(user) {
  if (!user?.id) return null;

  const existing = await query(
    `SELECT o.id, o.name, om.role
     FROM organizations o
     JOIN organization_members om ON om.organization_id = o.id
     WHERE om.user_id = $1
     ORDER BY CASE WHEN o.id = $2 THEN 0 ELSE 1 END, o.created_at ASC
     LIMIT 1`,
    [user.id, user.default_organization_id || null]
  );

  if (existing.rows.length > 0) {
    const workspace = existing.rows[0];
    if (!user.default_organization_id) {
      await query('UPDATE users SET default_organization_id = $1, updated_at = NOW() WHERE id = $2', [workspace.id, user.id]);
    }
    return workspace;
  }

  const org = await query(
    `INSERT INTO organizations (name, owner_user_id)
     VALUES ($1, $2)
     RETURNING id, name`,
    [`${user.name || user.email || 'Prospect AI'} Workspace`, user.id]
  );
  const workspace = org.rows[0];

  await query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (organization_id, user_id) DO NOTHING`,
    [workspace.id, user.id]
  );
  await query('UPDATE users SET default_organization_id = $1, updated_at = NOW() WHERE id = $2', [workspace.id, user.id]);

  return { ...workspace, role: 'owner' };
}

export async function getUserWorkspaces(userId) {
  const result = await query(
    `SELECT o.id, o.name, o.owner_user_id, om.role, om.created_at
     FROM organization_members om
     JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = $1
     ORDER BY o.created_at ASC`,
    [userId]
  );
  return result.rows;
}

export async function recordAuditEvent({ userId, organizationId = null, entityType, entityId = null, action, metadata = {} }) {
  if (!userId || !entityType || !action) return null;
  const result = await query(
    `INSERT INTO audit_events (user_id, organization_id, entity_type, entity_id, action, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, created_at`,
    [userId, organizationId, entityType, entityId ? String(entityId) : null, action, JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}
