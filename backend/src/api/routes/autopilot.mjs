import express from 'express';
import { z } from 'zod';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { normalizeAutopilotRule } from '../../services/autopilot/autopilotService.mjs';
import {
  createApprovalBatch,
  getApprovalBatch,
  listApprovalBatches,
  markApprovalBatchRequested,
  processApprovalReply,
  sendTextToApprovalNumber,
} from '../../services/autopilot/approvalBatchService.mjs';

const router = express.Router();

router.use(authenticate);

const ruleSchema = z.object({
  name: z.string().min(3).max(255),
  enabled: z.boolean().optional().default(false),
  mode: z.enum(['assistido', 'automatico']).optional().default('assistido'),
  source_type: z.string().max(100).optional().or(z.literal('')),
  niche: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(255).optional().or(z.literal('')),
  min_score: z.number().int().min(0).max(100).optional().default(60),
  max_daily_sends: z.number().int().min(1).max(500).optional().default(20),
  max_hourly_sends: z.number().int().min(1).max(100).optional().default(5),
  send_window_start: z.string().regex(/^\d{2}:\d{2}$/).optional().default('09:00'),
  send_window_end: z.string().regex(/^\d{2}:\d{2}$/).optional().default('17:00'),
  timezone: z.string().max(100).optional().default('America/Cuiaba'),
  require_manual_approval: z.boolean().optional().default(true),
  stop_on_reply: z.boolean().optional().default(true),
  followup_1_delay_hours: z.number().int().min(1).max(720).optional().default(24),
  followup_2_delay_hours: z.number().int().min(1).max(720).optional().default(48),
  notes: z.string().max(3000).optional().or(z.literal('')),
});

const updateRuleSchema = ruleSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
});

const createApprovalBatchSchema = z.object({
  limit: z.number().int().min(1).max(10).optional().default(5),
  min_score: z.number().int().min(0).max(100).optional(),
  city: z.string().max(255).optional().or(z.literal('')),
  niche: z.string().max(255).optional().or(z.literal('')),
  source_type: z.string().max(100).optional().or(z.literal('')),
  expires_in_minutes: z.number().int().min(10).max(1440).optional().default(120),
  send_approval_request: z.boolean().optional().default(true),
});

const processApprovalCommandSchema = z.object({
  text: z.string().min(1).max(500),
  from_phone: z.string().max(50).optional().or(z.literal('')),
});

function nullIfBlank(value) {
  if (value === undefined) return undefined;
  const next = String(value || '').trim();
  return next ? next : null;
}

function sanitizeRulePayload(data) {
  const normalized = normalizeAutopilotRule(data);
  return {
    ...data,
    ...normalized,
    source_type: nullIfBlank(data.source_type),
    niche: nullIfBlank(data.niche),
    city: nullIfBlank(data.city),
    notes: nullIfBlank(data.notes),
  };
}

function mapRule(row) {
  if (!row) return null;
  return {
    ...row,
    min_score: Number(row.min_score || 0),
    max_daily_sends: Number(row.max_daily_sends || 0),
    max_hourly_sends: Number(row.max_hourly_sends || 0),
    followup_1_delay_hours: Number(row.followup_1_delay_hours || 0),
    followup_2_delay_hours: Number(row.followup_2_delay_hours || 0),
  };
}

function handleServiceError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

async function ensureApprovalRequestCanBeSent(userId) {
  const result = await query(
    `SELECT status
     FROM whatsapp_instances
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );

  const instance = result.rows[0];
  if (!instance) {
    const error = new Error('Conecte um numero de WhatsApp antes de enviar solicitacoes de aprovacao.');
    error.status = 400;
    throw error;
  }

  if (instance.status !== 'open') {
    const error = new Error('WhatsApp desconectado. Reconecte antes de enviar solicitacoes de aprovacao.');
    error.status = 409;
    throw error;
  }
}

router.get('/rules', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM automation_rules
       WHERE user_id = $1
       ORDER BY enabled DESC, created_at DESC`,
      [req.user.id]
    );

    res.json({ rules: result.rows.map(mapRule) });
  } catch (error) {
    next(error);
  }
});

router.post('/rules', async (req, res, next) => {
  try {
    const data = sanitizeRulePayload(ruleSchema.parse(req.body));

    const result = await query(
      `INSERT INTO automation_rules (
        user_id, name, enabled, mode, source_type, niche, city, min_score,
        max_daily_sends, max_hourly_sends, send_window_start, send_window_end,
        timezone, require_manual_approval, stop_on_reply,
        followup_1_delay_hours, followup_2_delay_hours, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18
      )
      RETURNING *`,
      [
        req.user.id,
        data.name,
        data.enabled,
        data.mode,
        data.source_type,
        data.niche,
        data.city,
        data.min_score,
        data.max_daily_sends,
        data.max_hourly_sends,
        data.send_window_start,
        data.send_window_end,
        data.timezone,
        data.require_manual_approval,
        data.stop_on_reply,
        data.followup_1_delay_hours,
        data.followup_2_delay_hours,
        data.notes,
      ]
    );

    res.status(201).json({ rule: mapRule(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.patch('/rules/:id', async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT * FROM automation_rules WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Regra de automação não encontrada' });
    }

    const parsed = updateRuleSchema.parse(req.body);
    const merged = sanitizeRulePayload({ ...existing.rows[0], ...parsed });

    const result = await query(
      `UPDATE automation_rules SET
        name = $1,
        enabled = $2,
        mode = $3,
        source_type = $4,
        niche = $5,
        city = $6,
        min_score = $7,
        max_daily_sends = $8,
        max_hourly_sends = $9,
        send_window_start = $10,
        send_window_end = $11,
        timezone = $12,
        require_manual_approval = $13,
        stop_on_reply = $14,
        followup_1_delay_hours = $15,
        followup_2_delay_hours = $16,
        notes = $17,
        updated_at = NOW()
       WHERE id = $18 AND user_id = $19
       RETURNING *`,
      [
        merged.name,
        merged.enabled,
        merged.mode,
        merged.source_type,
        merged.niche,
        merged.city,
        merged.min_score,
        merged.max_daily_sends,
        merged.max_hourly_sends,
        merged.send_window_start,
        merged.send_window_end,
        merged.timezone,
        merged.require_manual_approval,
        merged.stop_on_reply,
        merged.followup_1_delay_hours,
        merged.followup_2_delay_hours,
        merged.notes,
        req.params.id,
        req.user.id,
      ]
    );

    res.json({ rule: mapRule(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.delete('/rules/:id', async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM automation_rules
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regra de automação não encontrada' });
    }

    res.json({ success: true, deletedId: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

router.get('/approval-batches', async (req, res, next) => {
  try {
    const batches = await listApprovalBatches(req.user.id, {
      status: req.query.status ? String(req.query.status) : undefined,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });

    res.json({ batches });
  } catch (error) {
    next(error);
  }
});

router.post('/approval-batches', async (req, res, next) => {
  try {
    const data = createApprovalBatchSchema.parse(req.body || {});

    if (data.send_approval_request !== false) {
      await ensureApprovalRequestCanBeSent(req.user.id);
    }

    const result = await createApprovalBatch(req.user.id, {
      ...data,
      city: nullIfBlank(data.city),
      niche: nullIfBlank(data.niche),
      source_type: nullIfBlank(data.source_type),
    });

    let sent = false;
    if (data.send_approval_request !== false) {
      await sendTextToApprovalNumber(req.user.id, result.batch.approval_whatsapp, result.approvalText);
      await markApprovalBatchRequested(req.user.id, result.batch.id);
      sent = true;
    }

    res.status(201).json({ ...result, sent });
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.post('/approval-batches/process-command', async (req, res, next) => {
  try {
    const data = processApprovalCommandSchema.parse(req.body || {});
    const result = await processApprovalReply({
      userId: req.user.id,
      fromPhone: data.from_phone || req.user.approval_whatsapp,
      text: data.text,
    });

    if (!result.handled) {
      return res.status(400).json({
        error: 'Comando de aprovação não processado',
        reason: result.reason,
      });
    }

    if (result.success === false) {
      return res.status(400).json({
        ...result,
        error: 'Comando de aprovação não aplicado',
        reason: result.reason || 'command_not_applied',
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/approval-batches/:id', async (req, res, next) => {
  try {
    const result = await getApprovalBatch(req.user.id, req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Lote de aprovação não encontrado' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/queue', async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const params = [req.user.id];
    const where = ['mq.user_id = $1'];

    if (status) {
      params.push(status);
      where.push(`mq.status = $${params.length}`);
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT
        mq.id, mq.lead_id, mq.automation_rule_id, mq.automation_run_id,
        mq.approval_batch_id, mq.channel, mq.message_type, mq.status, mq.scheduled_at,
        mq.approval_requested_at, mq.approved_at, mq.sent_at, mq.cancelled_at,
        mq.approved_by_channel, mq.approval_response_text,
        mq.attempts, mq.last_error, mq.payload_json, mq.created_at, mq.updated_at,
        l.nome_empresa, l.telefone, l.whatsapp, l.cidade, l.nicho, l.score, l.prioridade,
        ar.name as automation_rule_name
       FROM message_queue mq
       LEFT JOIN leads l ON l.id = mq.lead_id AND l.user_id = mq.user_id
       LEFT JOIN automation_rules ar ON ar.id = mq.automation_rule_id AND ar.user_id = mq.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY mq.scheduled_at ASC, mq.created_at ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ messages: result.rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/queue/:id/approve', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE message_queue
       SET status = 'approved', approved_at = NOW(), approved_by_channel = 'api', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem pendente não encontrada' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch('/queue/:id/cancel', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE message_queue
       SET status = 'cancelled', cancelled_at = NOW(), approval_response_text = COALESCE(approval_response_text, 'Cancelado via API'), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'approved', 'queued')
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensagem cancelável não encontrada' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
