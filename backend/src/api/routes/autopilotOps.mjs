import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.mjs';
import {
  applyReplyNextAction,
  applyStopOnReply,
  buildLeadDiagnosticDocument,
  classifyRecentReplies,
  createAssistedAppointment,
  getAutopilotStats,
  listAutomationRuns,
  listCommercialReplies,
  processApprovedMessages,
  queueFollowups,
  runAssistedScheduler,
} from '../../services/autopilot/autopilotExecutionService.mjs';
import {
  applyCommercialTemplate,
  getCommercialTemplateCatalog,
  previewCommercialTemplate,
} from '../../services/autopilot/commercialTemplateService.mjs';
import {
  applyAdvancedCommercialDiagnostic,
  buildAdvancedCommercialDiagnostic,
} from '../../services/autopilot/commercialDiagnosticService.mjs';
import {
  getSemiAutoCommercialPlan,
  runSemiAutoCommercialCycle,
} from '../../services/autopilot/semiAutoCommercialService.mjs';

const router = express.Router();

router.use(authenticate);

const schedulerSchema = z.object({
  rule_id: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(500).optional().default(50),
  dry_run: z.boolean().optional().default(true),
});

const workerSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(10),
  dry_run: z.boolean().optional().default(true),
  confirm_send: z.boolean().optional().default(false),
  ignore_schedule: z.boolean().optional().default(false),
});

const simpleRunSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
  dry_run: z.boolean().optional().default(true),
});

const semiAutoRunSchema = z.object({
  dry_run: z.boolean().optional().default(true),
  approve_collection: z.boolean().optional().default(false),
  credential_id: z.number().int().positive().optional(),
  query: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(255).optional().or(z.literal('')),
  niche: z.string().max(255).optional().or(z.literal('')),
  region: z.string().max(50).optional().or(z.literal('')),
  language: z.string().max(20).optional().or(z.literal('')),
  limit: z.number().int().min(1).max(100).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  zoom: z.number().int().min(1).max(20).optional(),
  verify_whatsapp_exists: z.boolean().optional(),
  force_refresh: z.boolean().optional(),
  extract_emails_and_contacts: z.boolean().optional(),
  analyze_saved_leads: z.boolean().optional().default(true),
  analysis_limit: z.number().int().min(1).max(100).optional(),
  min_score: z.number().int().min(0).max(100).optional(),
  scheduler_limit: z.number().int().min(1).max(500).optional(),
  create_approval_batch: z.boolean().optional().default(true),
  send_approval_request: z.boolean().optional().default(true),
  batch_limit: z.number().int().min(1).max(10).optional(),
  batch_expires_in_minutes: z.number().int().min(10).max(1440).optional(),
  process_approved: z.boolean().optional().default(true),
  ignore_schedule: z.boolean().optional().default(false),
  worker_limit: z.number().int().min(1).max(100).optional(),
});

const appointmentSchema = z.object({
  lead_id: z.number().int().positive(),
  scheduled_for: z.string().max(255).optional().or(z.literal('')),
  note: z.string().max(1000).optional().or(z.literal('')),
});

const replyActionSchema = z.object({
  action: z.enum(['mark_responded', 'mark_meeting', 'mark_not_interested', 'create_followup', 'mark_pricing']),
  note: z.string().max(1000).optional().or(z.literal('')),
  scheduled_for: z.string().max(255).optional().or(z.literal('')),
});

const templateSchema = z.object({
  lead_id: z.number().int().positive(),
  niche_key: z.string().max(100).optional().or(z.literal('')),
  tone: z.enum(['consultivo', 'direto', 'diagnostico', 'oportunidade']).optional().default('consultivo'),
});

function handleServiceError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getAutopilotStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

router.get('/runs', async (req, res, next) => {
  try {
    const runs = await listAutomationRuns(req.user.id, {
      limit: Number(req.query.limit || 30),
      offset: Number(req.query.offset || 0),
    });
    res.json({ runs });
  } catch (error) {
    next(error);
  }
});

router.get('/semi-auto/plan', async (req, res, next) => {
  try {
    const plan = await getSemiAutoCommercialPlan(req.user.id);
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

router.post('/semi-auto/run', async (req, res, next) => {
  try {
    const data = semiAutoRunSchema.parse(req.body || {});
    const result = await runSemiAutoCommercialCycle(req.user.id, req.user, data);
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.post('/scheduler/run', async (req, res, next) => {
  try {
    const data = schedulerSchema.parse(req.body || {});
    const result = await runAssistedScheduler(req.user.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/worker/process-approved', async (req, res, next) => {
  try {
    const data = workerSchema.parse(req.body || {});
    const result = await processApprovedMessages(req.user.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/followups/queue', async (req, res, next) => {
  try {
    const data = simpleRunSchema.parse(req.body || {});
    const result = await queueFollowups(req.user.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/stop-on-reply', async (req, res, next) => {
  try {
    const result = await applyStopOnReply(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/replies/classify', async (req, res, next) => {
  try {
    const data = simpleRunSchema.parse(req.body || {});
    const result = await classifyRecentReplies(req.user.id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/replies/inbox', async (req, res, next) => {
  try {
    const result = await listCommercialReplies(req.user.id, {
      limit: Number(req.query.limit || 30),
      intent: req.query.intent ? String(req.query.intent) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/replies/:leadId/action', async (req, res, next) => {
  try {
    const data = replyActionSchema.parse(req.body || {});
    const result = await applyReplyNextAction(req.user.id, Number(req.params.leadId), data);
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.get('/templates/catalog', async (req, res, next) => {
  try {
    res.json(getCommercialTemplateCatalog());
  } catch (error) {
    next(error);
  }
});

router.post('/templates/preview', async (req, res, next) => {
  try {
    const data = templateSchema.parse(req.body || {});
    const result = await previewCommercialTemplate(req.user.id, req.user, data);
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.post('/templates/apply', async (req, res, next) => {
  try {
    const data = templateSchema.parse(req.body || {});
    const result = await applyCommercialTemplate(req.user.id, req.user, data);
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.get('/diagnostics/:leadId/advanced', async (req, res, next) => {
  try {
    const result = await buildAdvancedCommercialDiagnostic(req.user.id, req.user, Number(req.params.leadId));
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.post('/diagnostics/:leadId/advanced/apply', async (req, res, next) => {
  try {
    const result = await applyAdvancedCommercialDiagnostic(req.user.id, req.user, Number(req.params.leadId));
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.post('/appointments', async (req, res, next) => {
  try {
    const data = appointmentSchema.parse(req.body || {});
    const result = await createAssistedAppointment(req.user.id, data);
    res.status(201).json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

router.get('/diagnostics/:leadId', async (req, res, next) => {
  try {
    const result = await buildLeadDiagnosticDocument(req.user.id, Number(req.params.leadId));
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, next);
  }
});

export default router;
