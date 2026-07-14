import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  acquireDaemonLock,
  getAutopilotDaemonStatus,
  releaseDaemonLock,
  runAutopilotDaemonTick,
  setUserDaemonSetting,
} from '../src/services/autopilot/autopilotDaemon.mjs';
import autopilotOpsRoutes from '../src/api/routes/autopilotOps.mjs';
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

function createServices({ delay = false, failFirst = false } = {}) {
  let schedulerCalls = 0;
  let release;
  const blocker = delay ? new Promise((resolve) => { release = resolve; }) : null;

  return {
    release,
    calls: () => schedulerCalls,
    services: {
      applyStopOnReply: async () => ({ cancelledCount: 0 }),
      runDueCollectionAutomations: async () => ({ evaluated: 0, results: [] }),
      runAssistedScheduler: async () => {
        schedulerCalls += 1;
        if (failFirst && schedulerCalls === 1) {
          throw new Error('temporary scheduler failure');
        }
        if (blocker) await blocker;
        return { evaluated: 1, queued: 1, skipped: 0 };
      },
      processApprovedMessages: async () => ({ sentCount: 1 }),
    },
  };
}

describe('autopilot daemon controls', () => {
  let userId;
  let token;
  let server;
  let baseUrl;
  const uniqueTag = Date.now();
  const previousEnv = {
    AUTOPILOT_DAEMON_KILL_SWITCH: process.env.AUTOPILOT_DAEMON_KILL_SWITCH,
    AUTOPILOT_DAEMON_USER_RETRIES: process.env.AUTOPILOT_DAEMON_USER_RETRIES,
    AUTOPILOT_DAEMON_RETRY_BACKOFF_MS: process.env.AUTOPILOT_DAEMON_RETRY_BACKOFF_MS,
  };

  before(async () => {
    process.env.JWT_SECRET ||= 'autopilot-daemon-test-secret';
    process.env.AUTOPILOT_DAEMON_KILL_SWITCH = 'false';
    process.env.AUTOPILOT_DAEMON_USER_RETRIES = '1';
    process.env.AUTOPILOT_DAEMON_RETRY_BACKOFF_MS = '0';

    await initDatabase();

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Daemon Test')
       RETURNING id`,
      [`daemon-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;
    token = jwt.sign({ userId, email: `daemon-${uniqueTag}@prospect.ai` }, process.env.JWT_SECRET, { expiresIn: '1h' });

    await query(
      `INSERT INTO automation_rules (user_id, name, enabled, mode, source_type, niche, city)
       VALUES ($1, 'Daemon Rule', TRUE, 'assistido', 'serper', 'clinicas', 'Cuiaba')`,
      [userId]
    );

    const app = express();
    app.use(express.json());
    app.use('/api/autopilot', autopilotOpsRoutes);
    app.use(errorHandler);

    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);

    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test('respeita kill switch global sem executar servicos', async () => {
    process.env.AUTOPILOT_DAEMON_KILL_SWITCH = 'true';
    const mock = createServices();

    const result = await runAutopilotDaemonTick({
      userIds: [userId],
      services: mock.services,
      skipDbLock: true,
      recordLogs: false,
    });

    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'daemon_disabled');
    assert.equal(mock.calls(), 0);
    process.env.AUTOPILOT_DAEMON_KILL_SWITCH = 'false';
  });

  test('bloqueia dois ticks simultaneos no mesmo processo', async () => {
    const mock = createServices({ delay: true });
    const first = runAutopilotDaemonTick({
      userIds: [userId],
      services: mock.services,
      skipDbLock: true,
      recordLogs: false,
    });

    const second = await runAutopilotDaemonTick({
      userIds: [userId],
      services: mock.services,
      skipDbLock: true,
      recordLogs: false,
    });

    mock.release();
    const firstResult = await first;

    assert.equal(second.skipped, true);
    assert.equal(second.reason, 'already_running');
    assert.equal(firstResult.results[0].status, 'completed');
  });

  test('faz retry curto quando um usuario falha temporariamente', async () => {
    const mock = createServices({ failFirst: true });

    const result = await runAutopilotDaemonTick({
      userIds: [userId],
      services: mock.services,
      skipDbLock: true,
      recordLogs: false,
    });

    assert.equal(result.skipped, false);
    assert.equal(result.results[0].status, 'completed');
    assert.equal(result.results[0].attempts, 2);
    assert.equal(mock.calls(), 2);
  });

  test('usa lock no banco para impedir daemon duplicado entre processos', async () => {
    const ownerId = `daemon-test-${uniqueTag}`;
    const lock = await acquireDaemonLock({
      ownerId,
      ttlSeconds: 60,
      metadata: { test: true },
    });

    assert.ok(lock);

    const duplicated = await runAutopilotDaemonTick({
      userIds: [userId],
      services: createServices().services,
      recordLogs: false,
      ownerId: `daemon-test-duplicate-${uniqueTag}`,
    });

    assert.equal(duplicated.skipped, true);
    assert.equal(duplicated.reason, 'lock_not_acquired');

    const released = await releaseDaemonLock({ ownerId });
    assert.equal(released, true);
  });

  test('pausa usuario e expõe status via API', async () => {
    const pausedUntil = new Date(Date.now() + 60_000).toISOString();
    const settings = await setUserDaemonSetting(userId, {
      enabled: true,
      paused_until: pausedUntil,
      reason: 'janela de manutencao',
    });

    assert.equal(settings.enabled, true);
    assert.ok(settings.paused_until);

    const run = await runAutopilotDaemonTick({
      userIds: [userId],
      services: createServices().services,
      skipDbLock: true,
      recordLogs: false,
    });

    assert.equal(run.results[0].status, 'skipped');
    assert.equal(run.results[0].reason, 'user_paused');

    const status = await getAutopilotDaemonStatus(userId, { logsLimit: 5 });
    assert.equal(status.user.kill_switch_reason, 'janela de manutencao');

    const response = await request(baseUrl, '/api/autopilot/daemon/status', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.response.status, 200);
    assert.equal(response.body.status.user.kill_switch_reason, 'janela de manutencao');
  });

  test('atualiza controles do daemon via API autenticada', async () => {
    const patch = await request(baseUrl, '/api/autopilot/daemon/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        enabled: false,
        paused_until: null,
        reason: 'pausa manual',
      }),
    });

    assert.equal(patch.response.status, 200);
    assert.equal(patch.body.settings.enabled, false);
    assert.equal(patch.body.settings.kill_switch_reason, 'pausa manual');

    const run = await runAutopilotDaemonTick({
      userIds: [userId],
      services: createServices().services,
      skipDbLock: true,
      recordLogs: false,
    });

    assert.equal(run.results[0].status, 'skipped');
    assert.equal(run.results[0].reason, 'user_disabled');
  });
});
