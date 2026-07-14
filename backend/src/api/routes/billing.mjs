import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.mjs';
import { changeSubscriptionPlan, getBillingOverview } from '../../services/billing.mjs';

const router = express.Router();
router.use(authenticate);

const planSchema = z.object({
  plan_slug: z.enum(['starter', 'pro', 'business']),
});

router.get('/', async (req, res, next) => {
  try {
    const overview = await getBillingOverview(req.user.organization_id, req.user.id);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

router.patch('/subscription', async (req, res, next) => {
  try {
    const data = planSchema.parse(req.body || {});
    const overview = await changeSubscriptionPlan(req.user.organization_id, req.user.id, data.plan_slug);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

export default router;
