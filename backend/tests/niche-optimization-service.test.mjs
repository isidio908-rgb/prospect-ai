import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import { saveCollectionAutomationRule } from '../src/services/autopilot/collectionAutomationService.mjs';
import {
  applyNicheOptimization,
  getNicheOptimization,
  rollbackNicheOptimization,
  updateNicheOptimizationSettings,
} from '../src/services/autopilot/nicheOptimizationService.mjs';

describe('niche optimization service', () => {
  let userId;
  let instanceId;
  let ruleId;
  const uniqueTag = Date.now();

  before(async () => {
    await initDatabase();

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Niche Optimization')
       RETURNING id`,
      [`niche-optimization-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;

    const instance = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, instance_name, instance_token_encrypted, status, phone_number
      ) VALUES ($1, 'BDR Otimizacao', $2, $3, 'open', '5565999910101')
      RETURNING id`,
      [userId, `niche-optimization-${uniqueTag}`, encrypt('token')]
    );
    instanceId = instance.rows[0].id;

    const collectionRule = await saveCollectionAutomationRule(userId, {
      name: 'Clinicas Cuiaba',
      enabled: true,
      niche: 'clinicas',
      city: 'Cuiaba',
      query: 'clinicas cuiaba',
      optimization_weight: 100,
      next_run_at: new Date(Date.now() - 60_000).toISOString(),
    });
    ruleId = collectionRule.id;

    const statuses = ['reuniao_marcada', 'respondeu', 'respondeu', 'sem_interesse'];
    for (let index = 0; index < statuses.length; index += 1) {
      const lead = await query(
        `INSERT INTO leads (
          user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
        ) VALUES ($1, $2, $3, $3, 'Cuiaba', 'clinicas', 'serper', $4, $5, NOW())
        RETURNING id`,
        [userId, `Clinica Otimizacao ${index}`, `+55659999101${index}`, 80 + index, statuses[index]]
      );
      await query(
        `INSERT INTO message_queue (
          user_id, lead_id, channel, message_type, status, scheduled_at, sent_at, payload_json
        ) VALUES ($1, $2, 'whatsapp', 'initial', 'sent', NOW(), NOW(), '{}'::jsonb)`,
        [userId, lead.rows[0].id]
      );
      if (index < 3) {
        await query(
          `INSERT INTO whatsapp_messages (
            instance_id, lead_id, user_id, remote_jid, from_me, direction, message_type, text_content, status
          ) VALUES ($1, $2, $3, $4, FALSE, 'received', 'text', 'Tenho interesse', 'received')`,
          [instanceId, lead.rows[0].id, userId, `55659999101${index}@s.whatsapp.net`]
        );
      }
      await query(
        `INSERT INTO llm_generations (
          user_id, lead_id, provider, model, purpose, estimated_cost_usd
        ) VALUES ($1, $2, 'openai', 'gpt-test', 'BDR', 0.01)`,
        [userId, lead.rows[0].id]
      );
    }

    await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta
      ) VALUES ($1, 'Imobiliaria Sem Amostra', '+5565999920000', '+5565999920000', 'Cuiaba', 'imobiliarias', 'serper', 70, 'novo', NOW())`,
      [userId]
    );
  });

  after(async () => {
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  test('rankeia nichos, aplica peso controlado e permite rollback', async () => {
    await updateNicheOptimizationSettings(userId, {
      enabled: true,
      min_sample_size: 2,
      max_weight_delta_percent: 20,
    });

    const optimization = await getNicheOptimization(userId);
    const clinicas = optimization.rankings.find((item) => item.niche === 'clinicas');
    const imobiliarias = optimization.rankings.find((item) => item.niche === 'imobiliarias');

    assert.ok(clinicas);
    assert.equal(clinicas.leads_count, 4);
    assert.equal(clinicas.replied_count, 3);
    assert.equal(clinicas.recommendation.eligible, true);
    assert.equal(clinicas.recommendation.direction, 'increase');
    assert.ok(clinicas.recommendation.proposed_weight > 100);
    assert.equal(imobiliarias.recommendation.eligible, false);
    assert.match(imobiliarias.recommendation.reason, /Amostra insuficiente/);

    const applied = await applyNicheOptimization(userId, {
      mode: 'automatic',
      scope_keys: [clinicas.scope_key],
    });
    assert.equal(applied.appliedCount, 1);
    assert.equal(applied.applied[0].rule_id, ruleId);

    const weightedRule = await query(
      `SELECT optimization_weight
       FROM collection_automation_rules
       WHERE id = $1 AND user_id = $2`,
      [ruleId, userId]
    );
    assert.equal(weightedRule.rows[0].optimization_weight, clinicas.recommendation.proposed_weight);

    const rollback = await rollbackNicheOptimization(userId, { event_id: applied.event.id });
    assert.equal(rollback.rolledBackCount, 1);

    const rolledBackRule = await query(
      `SELECT optimization_weight
       FROM collection_automation_rules
       WHERE id = $1 AND user_id = $2`,
      [ruleId, userId]
    );
    assert.equal(rolledBackRule.rows[0].optimization_weight, 100);
  });
});
