import { query } from '../../database/init.mjs';

export const APPROVAL_BATCH_STATUSES = ['pending', 'partially_approved', 'approved', 'cancelled', 'expired'];
export const APPROVAL_ITEM_STATUSES = ['pending', 'approved', 'cancelled'];

export function normalizeApprovalNumber(value) {
  let digits = String(value || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function normalizeCommandText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function parseApprovalCommand(text) {
  const normalized = normalizeCommandText(text);

  const batchMatch = normalized.match(/^(APROVAR|CANCELAR) LOTE (\d+)$/);
  if (batchMatch) {
    return {
      action: batchMatch[1] === 'APROVAR' ? 'approve' : 'cancel',
      scope: 'batch',
      batchId: Number(batchMatch[2]),
      positions: [],
    };
  }

  const itemMatch = normalized.match(/^(APROVAR|CANCELAR) (\d+)\s*:\s*([\d,\s]+)$/);
  if (itemMatch) {
    const positions = Array.from(new Set(
      itemMatch[3]
        .split(',')
        .map((item) => Number(String(item).trim()))
        .filter((item) => Number.isInteger(item) && item > 0)
    ));

    if (positions.length === 0) return null;

    return {
      action: itemMatch[1] === 'APROVAR' ? 'approve' : 'cancel',
      scope: 'items',
      batchId: Number(itemMatch[2]),
      positions,
    };
  }

  return null;
}

function truncate(value, max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function getMessageText(row) {
  const payload = row.payload_json || {};
  return truncate(
    payload.message ||
    payload.text ||
    payload.body ||
    payload.messageText ||
    row.mensagem_whatsapp ||
    'Mensagem ainda nao gerada para este lead.'
  );
}

export function buildApprovalBatchText(batch, items) {
  const lines = [
    `Lote de aprovacao #${batch.id}`,
    '',
    `Total: ${items.length} mensagem(ns) pendente(s)`,
    `Expira em: ${new Date(batch.expires_at).toLocaleString('pt-BR')}`,
    '',
  ];

  for (const item of items) {
    lines.push(`${item.position}. ${item.nome_empresa || 'Lead sem nome'}`);
    lines.push(`Cidade: ${item.cidade || '-'}`);
    lines.push(`Nicho: ${item.nicho || '-'}`);
    lines.push(`Score: ${item.score ?? '-'}`);
    lines.push(`Tipo: ${item.message_type || 'initial'}`);
    lines.push(`Mensagem: "${getMessageText(item)}"`);
    lines.push('');
  }

  lines.push('Responda com um dos comandos:');
  lines.push(`APROVAR LOTE ${batch.id}`);
  lines.push(`CANCELAR LOTE ${batch.id}`);
  lines.push(`APROVAR ${batch.id}:1,3`);
  lines.push(`CANCELAR ${batch.id}:2`);

  return lines.join('\n');
}

function buildPendingWhere(filters, params) {
  const where = [
    'mq.user_id = $1',
    "mq.status = 'pending'",
    'mq.approval_batch_id IS NULL',
  ];

  if (filters.min_score !== undefined) {
    params.push(filters.min_score);
    where.push(`COALESCE(l.score, 0) >= $${params.length}`);
  }

  if (filters.city) {
    params.push(filters.city);
    where.push(`LOWER(COALESCE(l.cidade, '')) = LOWER($${params.length})`);
  }

  if (filters.niche) {
    params.push(filters.niche);
    where.push(`LOWER(COALESCE(l.nicho, '')) = LOWER($${params.length})`);
  }

  if (filters.source_type) {
    params.push(filters.source_type);
    where.push(`LOWER(COALESCE(l.fonte, '')) = LOWER($${params.length})`);
  }

  return where;
}

export async function listApprovalBatches(userId, { status, limit = 50, offset = 0 } = {}) {
  const params = [userId];
  const where = ['ab.user_id = $1'];

  if (status) {
    params.push(status);
    where.push(`ab.status = $${params.length}`);
  }

  params.push(Math.min(Number(limit || 50), 100), Math.max(Number(offset || 0), 0));

  const result = await query(
    `SELECT ab.*
     FROM approval_batches ab
     WHERE ${where.join(' AND ')}
     ORDER BY ab.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return result.rows;
}

export async function getApprovalBatch(userId, batchId) {
  const batchResult = await query(
    'SELECT * FROM approval_batches WHERE id = $1 AND user_id = $2',
    [batchId, userId]
  );

  if (batchResult.rows.length === 0) return null;

  const itemsResult = await query(
    `SELECT
      abi.id as batch_item_id, abi.position, abi.status as batch_item_status,
      mq.id as message_queue_id, mq.message_type, mq.status, mq.payload_json,
      mq.scheduled_at, mq.approved_at, mq.cancelled_at,
      l.nome_empresa, l.cidade, l.nicho, l.score, l.prioridade, l.mensagem_whatsapp
     FROM approval_batch_items abi
     JOIN message_queue mq ON mq.id = abi.message_queue_id AND mq.user_id = abi.user_id
     LEFT JOIN leads l ON l.id = mq.lead_id AND l.user_id = mq.user_id
     WHERE abi.approval_batch_id = $1 AND abi.user_id = $2
     ORDER BY abi.position ASC`,
    [batchId, userId]
  );

  return { batch: batchResult.rows[0], items: itemsResult.rows };
}

export async function createApprovalBatch(userId, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 5), 1), 10);
  const expiresInMinutes = Math.min(Math.max(Number(options.expires_in_minutes || 120), 10), 1440);

  const userResult = await query(
    'SELECT id, approval_whatsapp FROM users WHERE id = $1',
    [userId]
  );
  const approvalWhatsapp = normalizeApprovalNumber(userResult.rows[0]?.approval_whatsapp);
  if (!approvalWhatsapp) {
    const error = new Error('Configure o WhatsApp de aprovacao no perfil antes de criar lotes.');
    error.status = 400;
    throw error;
  }

  const params = [userId];
  const where = buildPendingWhere(options, params);
  params.push(limit);

  const pendingResult = await query(
    `SELECT
      mq.id as message_queue_id, mq.message_type, mq.payload_json, mq.scheduled_at,
      l.nome_empresa, l.cidade, l.nicho, l.score, l.prioridade, l.mensagem_whatsapp
     FROM message_queue mq
     LEFT JOIN leads l ON l.id = mq.lead_id AND l.user_id = mq.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(l.score, 0) DESC, mq.scheduled_at ASC, mq.created_at ASC
     LIMIT $${params.length}`,
    params
  );

  if (pendingResult.rows.length === 0) {
    const error = new Error('Nenhuma mensagem pendente disponivel para aprovacao.');
    error.status = 404;
    throw error;
  }

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const batchResult = await query(
    `INSERT INTO approval_batches (
      user_id, status, approval_whatsapp, total_items, expires_at
    ) VALUES ($1, 'pending', $2, $3, $4)
    RETURNING *`,
    [userId, approvalWhatsapp, pendingResult.rows.length, expiresAt]
  );

  const batch = batchResult.rows[0];
  const items = [];

  for (let index = 0; index < pendingResult.rows.length; index += 1) {
    const row = pendingResult.rows[index];
    const position = index + 1;

    await query(
      `INSERT INTO approval_batch_items (
        user_id, approval_batch_id, message_queue_id, position, status
      ) VALUES ($1, $2, $3, $4, 'pending')`,
      [userId, batch.id, row.message_queue_id, position]
    );

    await query(
      `UPDATE message_queue SET
        approval_batch_id = $1,
        approval_requested_at = NOW(),
        updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [batch.id, row.message_queue_id, userId]
    );

    items.push({ ...row, position, status: 'pending' });
  }

  return {
    batch,
    items,
    approvalText: buildApprovalBatchText(batch, items),
  };
}

export async function markApprovalBatchRequested(userId, batchId) {
  await query(
    `UPDATE approval_batches
     SET requested_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [batchId, userId]
  );
}

async function recalculateBatch(userId, batchId, responseText = null) {
  const counts = await query(
    `SELECT
      COUNT(*)::int as total_items,
      COUNT(*) FILTER (WHERE status = 'approved')::int as approved_items,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled_items,
      COUNT(*) FILTER (WHERE status = 'pending')::int as pending_items
     FROM approval_batch_items
     WHERE approval_batch_id = $1 AND user_id = $2`,
    [batchId, userId]
  );

  const row = counts.rows[0];
  let status = 'pending';
  if (row.cancelled_items === row.total_items) status = 'cancelled';
  else if (row.approved_items === row.total_items) status = 'approved';
  else if (row.approved_items > 0 || row.cancelled_items > 0) status = 'partially_approved';

  const result = await query(
    `UPDATE approval_batches SET
      status = $1,
      total_items = $2,
      approved_items = $3,
      cancelled_items = $4,
      responded_at = CASE WHEN $5::text IS NULL THEN responded_at ELSE NOW() END,
      response_text = COALESCE($5, response_text),
      updated_at = NOW()
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [status, row.total_items, row.approved_items, row.cancelled_items, responseText, batchId, userId]
  );

  return result.rows[0];
}

async function applyCommand(userId, command, responseText) {
  const loaded = await getApprovalBatch(userId, command.batchId);
  if (!loaded) {
    return { handled: true, success: false, confirmationText: `Lote ${command.batchId} nao encontrado.` };
  }

  if (new Date(loaded.batch.expires_at).getTime() < Date.now()) {
    await query(
      `UPDATE approval_batches SET status = 'expired', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [command.batchId, userId]
    );
    return { handled: true, success: false, confirmationText: `Lote ${command.batchId} expirou. Gere um novo lote.` };
  }

  if (!['pending', 'partially_approved'].includes(loaded.batch.status)) {
    return { handled: true, success: false, confirmationText: `Lote ${command.batchId} ja esta com status ${loaded.batch.status}.` };
  }

  const actionStatus = command.action === 'approve' ? 'approved' : 'cancelled';
  const queueStatus = command.action === 'approve' ? 'approved' : 'cancelled';
  const timestampColumn = command.action === 'approve' ? 'approved_at' : 'cancelled_at';

  const params = [command.batchId, userId];
  let positionFilter = '';

  if (command.scope === 'items') {
    params.push(command.positions);
    positionFilter = `AND abi.position = ANY($${params.length}::int[])`;
  }

  const affected = await query(
    `WITH selected AS (
       SELECT abi.id, abi.message_queue_id
       FROM approval_batch_items abi
       WHERE abi.approval_batch_id = $1
         AND abi.user_id = $2
         AND abi.status = 'pending'
         ${positionFilter}
     ), updated_items AS (
       UPDATE approval_batch_items abi
       SET status = $3, updated_at = NOW()
       FROM selected
       WHERE abi.id = selected.id
       RETURNING abi.message_queue_id
     )
     UPDATE message_queue mq
     SET status = $4,
         ${timestampColumn} = NOW(),
         approved_by_channel = 'whatsapp_approval_batch',
         approval_response_text = $5,
         updated_at = NOW()
     FROM updated_items
     WHERE mq.id = updated_items.message_queue_id
       AND mq.user_id = $2
     RETURNING mq.id`,
    [...params, actionStatus, queueStatus, responseText]
  );

  const batch = await recalculateBatch(userId, command.batchId, responseText);
  const label = command.action === 'approve' ? 'aprovado(s)' : 'cancelado(s)';
  return {
    handled: true,
    success: true,
    batch,
    affectedCount: affected.rows.length,
    confirmationText: `Lote ${command.batchId} atualizado: ${affected.rows.length} item(ns) ${label}. Status: ${batch.status}.`,
  };
}

export async function processApprovalReply({ userId, fromPhone, text }) {
  const normalizedFrom = normalizeApprovalNumber(fromPhone);
  const userResult = await query(
    'SELECT id, approval_whatsapp FROM users WHERE id = $1',
    [userId]
  );

  const approvalWhatsapp = normalizeApprovalNumber(userResult.rows[0]?.approval_whatsapp);
  if (!approvalWhatsapp || normalizedFrom !== approvalWhatsapp) {
    return { handled: false, reason: 'unauthorized_number' };
  }

  const command = parseApprovalCommand(text);
  if (!command) {
    return { handled: false, reason: 'unknown_command' };
  }

  return applyCommand(userId, command, text);
}
