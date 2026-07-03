import express from 'express';
import { authenticate } from '../middleware/auth.mjs';
import { listCollectionRunLogs, listCollectionRuns } from '../../services/collectionRunService.mjs';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const runs = await listCollectionRuns(req.user.id, {
      limit: req.query.limit,
      offset: req.query.offset,
    });

    res.json({ runs });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/logs', async (req, res, next) => {
  try {
    const logs = await listCollectionRunLogs(req.user.id, req.params.id);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

export default router;
