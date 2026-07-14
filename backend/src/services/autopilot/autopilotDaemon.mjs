import crypto from 'node:crypto';
import cron from 'node-cron';
import { query } from '../../database/init.mjs';
import {
  applyStopOnReply,
  processApprovedMessages,
  runAssistedScheduler,
} from './autopilotExecutionService.mjs';
import { runDueCollectionAutomations } from './collectionAutomationService.mjs';

const LOCK_KEY = 'autopilot-daemon';

let running = false;
let task = null;

function envFlag(name, fallback = true) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return !['0', 'false', 'no', 'off', 'disabled'].includes(String(value).trim().toLowerCase());
}

function envInt(name, fallback, min, max) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    code: error?.code,
  };
}

export function isAutopilotDaemonGloballyEnabled() {
  return envFlag('AUTOPILOT_DAEMON_ENABLED', true)
    && !envFlag('AUTOPILOT_DAEMON_KILL_SWITCH', false);
}

export async function listUsersWithActiveAutomation() {
  const result = await query(
    `SELECT DISTINCT ar.user_id
     FROM automation_rules ar
     LEFT JOIN automation_daemon_settings ads ON ads.user_id = ar.user_id
     WHERE ar.enabled = TRUE
       AND COALESCE(ads.enabled, TRUE) = TRUE
       AND (ads.paused_until IS NULL OR ads.paused_until <= NOW())`
  );
  return result.rows.map((row) => row.user_id);
}

export async function getUserDaemonSetting(userId) {
  const result = await query(
    `SELECT user_id, enabled, paused_until, kill_switch_reason, created_at, updated_at
     FROM automation_daemon_settings
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || {
    user_id: userId,
    enabled: true,
    paused_until: null,
    kill_switch_reason: null,
  };
}

export async function setUserDaemonSetting(userId, data = {}) {
  const enabled = data.enabled;
  const pausedUntil = data.paused_until ?? data.pausedUntil ?? null;
  const reason = data.reason ?? data.kill_switch_reason ?? null;

  const result = await query(
    `INSERT INTO automation_daemon_settings (user_id, enabled, paused_until, kill_switch_reason, updated_at)
     VALUES ($1, COALESCE($2, TRUE), $3, $4, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       enabled = COALESCE($2, automation_daemon_settings.enabled),
       paused_until = $3,
       kill_switch_reason = $4,
       updated_at = NOW()
     RETURNING user_id, enabled, paused_until, kill_switch_reason, created_at, updated_at`,
    [userId, typeof enabled === 'boolean' ? enabled : null, pausedUntil, reason]
  );

  return result.rows[0];
}

export async function acquireDaemonLock({
  lockKey = LOCK_KEY,
  ownerId = `${process.pid}-${crypto.randomUUID()}`,
  ttlSeconds = envInt('AUTOPILOT_DAEMON_LOCK_TTL_SECONDS', 240, 30, 1800),
  metadata = {},
} = {}) {
  const result = await query(
    `INSERT INTO automation_daemon_locks (lock_key, owner_id, locked_until, metadata, updated_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'), $4::jsonb, NOW())
     ON CONFLICT (lock_key)
     DO UPDATE SET
       owner_id = EXCLUDED.owner_id,
       locked_until = EXCLUDED.locked_until,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     WHERE automation_daemon_locks.locked_until <= NOW()
     RETURNING lock_key, owner_id, locked_until, metadata, created_at, updated_at`,
    [lockKey, ownerId, ttlSeconds, JSON.stringify(metadata)]
  );

  return result.rows[0] || null;
}

export async function releaseDaemonLock({ lockKey = LOCK_KEY, ownerId } = {}) {
  const result = await query(
    `DELETE FROM automation_daemon_locks
     WHERE lock_key = $1 AND owner_id = $2
     RETURNING lock_key`,
    [lockKey, ownerId]
  );
  return result.rowCount > 0;
}

export async function recordDaemonLog({
  userId = null,
  runId = null,
  tickId = null,
  level = 'info',
  event,
  message = null,
  metadata = {},
} = {}) {
  if (!event) return null;

  const result = await query(
    `INSERT INTO automation_daemon_logs
      (user_id, run_id, daemon_tick_id, level, event, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, user_id, run_id, daemon_tick_id, level, event, message, metadata, created_at`,
    [userId, runId, tickId, level, event, message, JSON.stringify(metadata)]
  );
  return result.rows[0];
}

export async function getAutopilotDaemonStatus(userId = null, options = {}) {
  const logsLimit = Math.min(Math.max(Number(options.logsLimit || 20), 1), 100);
  const lockResult = await query(
    `SELECT lock_key, owner_id, locked_until, metadata, created_at, updated_at
     FROM automation_daemon_locks
     WHERE lock_key = $1`,
    [LOCK_KEY]
  );

  const logParams = userId ? [userId, logsLimit] : [logsLimit];
  const logsResult = await query(
    userId
      ? `SELECT id, user_id, run_id, daemon_tick_id, level, event, message, metadata, created_at
         FROM automation_daemon_logs
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY created_at DESC
         LIMIT $2`
      : `SELECT id, user_id, run_id, daemon_tick_id, level, event, message, metadata, created_at
         FROM automation_daemon_logs
         ORDER BY created_at DESC
         LIMIT $1`,
    logParams
  );

  return {
    global: {
      enabled: isAutopilotDaemonGloballyEnabled(),
      schedule: process.env.AUTOPILOT_DAEMON_CRON || '*/5 * * * *',
      schedulerLimit: envInt('AUTOPILOT_DAEMON_SCHEDULER_LIMIT', 50, 1, 500),
      workerLimit: envInt('AUTOPILOT_DAEMON_WORKER_LIMIT', 10, 1, 100),
      lockTtlSeconds: envInt('AUTOPILOT_DAEMON_LOCK_TTL_SECONDS', 240, 30, 1800),
    },
    user: userId ? await getUserDaemonSetting(userId) : null,
    lock: lockResult.rows[0] || null,
    logs: logsResult.rows,
  };
}

async function runUserAutomation(userId, services, limits, options) {
  const setting = await getUserDaemonSetting(userId);
  if (setting.enabled === false || (setting.paused_until && new Date(setting.paused_until) > new Date())) {
    return {
      userId,
      status: 'skipped',
      reason: setting.enabled === false ? 'user_disabled' : 'user_paused',
    };
  }

  const stopOnReply = await services.applyStopOnReply(userId);
  const collection = await services.runDueCollectionAutomations(userId, {
    limit: limits.collectionLimit,
  });
  const scheduler = await services.runAssistedScheduler(userId, {
    dry_run: Boolean(options.dryRun),
    limit: limits.schedulerLimit,
  });
  const worker = await services.processApprovedMessages(userId, {
    dry_run: Boolean(options.dryRun),
    confirm_send: !options.dryRun,
    ignore_schedule: false,
    limit: limits.workerLimit,
  });

  return {
    userId,
    status: 'completed',
    collectionsEvaluated: collection.evaluated,
    collections: collection.results,
    cancelledFollowups: stopOnReply.cancelledCount,
    evaluated: scheduler.evaluated,
    queued: scheduler.queued,
    skipped: scheduler.skipped,
    sent: worker.sentCount,
  };
}

async function runUserWithRetry(userId, services, limits, options) {
  const maxRetries = envInt('AUTOPILOT_DAEMON_USER_RETRIES', 1, 0, 5);
  const backoffMs = envInt('AUTOPILOT_DAEMON_RETRY_BACKOFF_MS', 250, 0, 10000);
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt += 1;
    try {
      await options.log({
        userId,
        level: 'info',
        event: 'user_started',
        message: 'Autopilot user cycle started',
        metadata: { attempt },
      });
      const result = await runUserAutomation(userId, services, limits, options);
      return { ...result, attempts: attempt };
    } catch (error) {
      lastError = error;
      await options.log({
        userId,
        level: 'error',
        event: 'user_failed',
        message: error.message,
        metadata: { attempt, error: serializeError(error) },
      });

      if (attempt > maxRetries) break;
      if (backoffMs > 0) await options.sleep(backoffMs * attempt);
    }
  }

  return {
    userId,
    status: 'failed',
    attempts: attempt,
    error: lastError?.message || 'Unknown daemon user failure',
  };
}

export async function runAutopilotDaemonTick(options = {}) {
  if (!isAutopilotDaemonGloballyEnabled()) {
    return { skipped: true, reason: 'daemon_disabled' };
  }

  if (running) {
    return { skipped: true, reason: 'already_running' };
  }

  running = true;

  const tickId = options.tickId || crypto.randomUUID();
  const ownerId = options.ownerId || `${process.pid}-${tickId}`;
  const services = options.services || {
    applyStopOnReply,
    processApprovedMessages,
    runAssistedScheduler,
    runDueCollectionAutomations,
  };
  const limits = {
    collectionLimit: options.collectionLimit || envInt('AUTOPILOT_DAEMON_COLLECTION_LIMIT', 5, 1, 50),
    schedulerLimit: options.schedulerLimit || envInt('AUTOPILOT_DAEMON_SCHEDULER_LIMIT', 50, 1, 500),
    workerLimit: options.workerLimit || envInt('AUTOPILOT_DAEMON_WORKER_LIMIT', 10, 1, 100),
  };
  const log = options.recordLogs === false
    ? async () => null
    : (entry) => recordDaemonLog({ tickId, ...entry });
  const runOptions = {
    ...options,
    log,
    sleep: options.sleep || sleep,
    dryRun: options.dryRun ?? envFlag('AUTOPILOT_DAEMON_DRY_RUN', false),
  };
  let lock = null;

  try {
    await log({
      level: 'info',
      event: 'tick_started',
      message: 'Autopilot daemon tick started',
      metadata: { ownerId, limits, dryRun: runOptions.dryRun },
    });

    if (!options.skipDbLock) {
      lock = await acquireDaemonLock({
        ownerId,
        ttlSeconds: options.lockTtlSeconds,
        metadata: { tickId, startedAt: new Date().toISOString() },
      });

      if (!lock) {
        await log({
          level: 'warn',
          event: 'lock_not_acquired',
          message: 'Autopilot daemon lock is held by another process',
        });
        return { skipped: true, reason: 'lock_not_acquired', tickId };
      }
    }

    const users = options.userIds || await listUsersWithActiveAutomation();
    const results = [];

    for (const userId of users) {
      const result = await runUserWithRetry(userId, services, limits, runOptions);
      results.push(result);
      await log({
        userId,
        level: result.status === 'failed' ? 'error' : 'info',
        event: result.status === 'completed' ? 'user_completed' : `user_${result.status}`,
        message: `Autopilot user cycle ${result.status}`,
        metadata: result,
      });
    }

    const summary = {
      skipped: false,
      tickId,
      users: users.length,
      dryRun: runOptions.dryRun,
      results,
    };

    await log({
      level: 'info',
      event: 'tick_completed',
      message: 'Autopilot daemon tick completed',
      metadata: summary,
    });

    return summary;
  } catch (error) {
    await log({
      level: 'error',
      event: 'tick_failed',
      message: error.message,
      metadata: { error: serializeError(error) },
    });
    throw error;
  } finally {
    if (lock) {
      await releaseDaemonLock({ ownerId });
    }
    running = false;
  }
}

export function startAutopilotDaemon() {
  if (!isAutopilotDaemonGloballyEnabled()) {
    console.log('[AUTOPILOT] Daemon automatico desativado por ambiente');
    return null;
  }

  if (task) return task;

  const schedule = process.env.AUTOPILOT_DAEMON_CRON || '*/5 * * * *';
  task = cron.schedule(schedule, async () => {
    console.log('[AUTOPILOT] Rodando daemon automatico...');
    try {
      const result = await runAutopilotDaemonTick();
      console.log('[AUTOPILOT] Daemon concluido', result);
    } catch (error) {
      console.error('[AUTOPILOT] Erro no daemon automatico:', error);
    }
  });

  console.log(`[AUTOPILOT] Daemon automatico iniciado: ${schedule}`);
  return task;
}
