import express from 'express';
import { authenticate } from '../middleware/auth.mjs';
import {
  clearCollectionCacheForRun,
  listCollectionRunLogs,
  listCollectionRuns,
} from '../../services/collectionRunService.mjs';

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

router.delete('/:id/cache', async (req, res, next) => {
  try {
    const result = await clearCollectionCacheForRun(req.user.id, req.params.id);

    if (!result) {
      return res.status(404).json({ error: 'Execução de coleta não encontrada' });
    }

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      hadCacheKey: result.hadCacheKey,
    });
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
