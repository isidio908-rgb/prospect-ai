import { after, afterEach, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import { queueFollowups, runAssistedScheduler } from '../src/services/autopilot/autopilotExecutionService.mjs';

const originalFetch = globalThis.fetch;

describe('BDR agent scheduler integration', () => {
  let userId;
  let ruleId;
  let leadId;
  const uniqueTag = Date.now();

  before(async () => {
    process.env.JWT_SECRET ||= 'bdr-agent-test-secret';
    await initDatabase();

    const user = await query(
      `INSERT INTO users (email, password_hash, name, profession, primary_niche, internal_context)
       VALUES ($1, 'hash', 'BDR Teste', 'Closer B2B', 'Imobiliárias', 'Foco total em levar para reunião consultiva.')
       RETURNING id`,
      [`bdr-agent-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;

    const rule = await query(
      `INSERT INTO automation_rules (
        user_id, name, enabled, mode, source_type, niche, city, min_score,
        require_manual_approval, send_window_start, send_window_end
      ) VALUES (
        $1, 'BDR Imobiliarias', TRUE, 'assistido', 'serper', 'imobiliarias', 'Cuiaba', 60,
        TRUE, '00:00', '23:59'
      )
      RETURNING id`,
      [userId]
    );
    ruleId = rule.rows[0].id;

    const lead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta,
        tem_site, tem_pixel_meta, tem_whatsapp_site
      ) VALUES (
        $1, 'Imobiliaria BDR Teste', '+5565999911111', '+5565999911111', 'Cuiaba', 'imobiliarias', 'serper', 88, 'analisado', NOW(),
        TRUE, FALSE, TRUE
      )
      RETURNING id`,
      [userId]
    );
    leadId = lead.rows[0].id;
  });

  after(async () => {
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('scheduler prepara rascunho BDR por fallback e enfileira payload rastreavel', async () => {
    const result = await runAssistedScheduler(userId, {
      rule_id: ruleId,
      limit: 1,
      dry_run: false,
    });

    assert.equal(result.queued, 1);
    assert.equal(result.skipped, 0);

    const queue = await query(
      `SELECT payload_json
       FROM message_queue
       WHERE user_id = $1 AND lead_id = $2 AND automation_rule_id = $3
       ORDER BY id DESC
       LIMIT 1`,
      [userId, leadId, ruleId]
    );

    assert.equal(queue.rows.length, 1);
    assert.equal(queue.rows[0].payload_json.bdr.source, 'template_fallback');
    assert.equal(queue.rows[0].payload_json.bdr.generated, false);
    assert.match(queue.rows[0].payload_json.message, /diagnóstico rápido|diagnostico rapido/i);

    const lead = await query('SELECT status, mensagem_whatsapp FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
    assert.equal(lead.rows[0].status, 'mensagem_pronta');
    assert.match(lead.rows[0].mensagem_whatsapp, /Imobiliaria BDR Teste/);
  });

  test('scheduler usa LLM ativa para gerar mensagem BDR auditada', async () => {
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);

      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer sk-bdr-test-key');
      assert.equal(body.model, 'gpt-4o-mini');
      assert.match(body.messages[0].content, /BDR profissional/);

      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: 'Olá, vi que a Imobiliaria BDR LLM tem oportunidade de melhorar rastreamento e conversão. Posso te mostrar um diagnóstico rápido em 15 minutos?',
          },
        }],
        usage: {
          prompt_tokens: 300,
          completion_tokens: 45,
          total_tokens: 345,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const credential = await query(
      `INSERT INTO credentials (
        user_id, name, type, category, api_key_encrypted, model, daily_limit, monthly_limit, status
      ) VALUES ($1, 'OpenAI BDR Test', 'openai', 'llm', $2, 'gpt-4o-mini', 10, 100, 'active')
      RETURNING id`,
      [userId, encrypt('sk-bdr-test-key')]
    );

    const lead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta,
        tem_site, tem_pixel_meta, tem_whatsapp_site
      ) VALUES (
        $1, 'Imobiliaria BDR LLM', '+5565999922222', '+5565999922222', 'Cuiaba', 'imobiliarias', 'serper', 92, 'analisado', NOW(),
        TRUE, FALSE, TRUE
      )
      RETURNING id`,
      [userId]
    );
    const llmLeadId = lead.rows[0].id;

    const result = await runAssistedScheduler(userId, {
      rule_id: ruleId,
      limit: 5,
      dry_run: false,
    });

    assert.equal(result.queued, 1);

    const queue = await query(
      `SELECT payload_json
       FROM message_queue
       WHERE user_id = $1 AND lead_id = $2 AND automation_rule_id = $3
       ORDER BY id DESC
       LIMIT 1`,
      [userId, llmLeadId, ruleId]
    );

    assert.equal(queue.rows.length, 1);
    assert.equal(queue.rows[0].payload_json.bdr.source, 'llm');
    assert.equal(queue.rows[0].payload_json.bdr.generated, true);
    assert.equal(queue.rows[0].payload_json.bdr.provider, 'openai');
    assert.ok(queue.rows[0].payload_json.bdr.generationId);

    const generation = await query(
      `SELECT provider, model, purpose, prompt_tokens, completion_tokens, total_tokens, status
       FROM llm_generations
       WHERE id = $1 AND user_id = $2`,
      [queue.rows[0].payload_json.bdr.generationId, userId]
    );
    assert.equal(generation.rows[0].purpose, 'bdr_initial');
    assert.equal(generation.rows[0].provider, 'openai');
    assert.equal(generation.rows[0].model, 'gpt-4o-mini');
    assert.equal(generation.rows[0].prompt_tokens, 300);
    assert.equal(generation.rows[0].completion_tokens, 45);
    assert.equal(generation.rows[0].total_tokens, 345);
    assert.equal(generation.rows[0].status, 'success');

    const usage = await query('SELECT used_today, used_month FROM credentials WHERE id = $1', [credential.rows[0].id]);
    assert.equal(usage.rows[0].used_today, 1);
    assert.equal(usage.rows[0].used_month, 1);
  });

  test('follow-up por silencio usa LLM ativa e preserva auditoria', async () => {
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);

      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer sk-bdr-test-key');
      assert.match(body.messages[0].content, /retomar a conversa/);

      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: 'Oi, passando para retomar meu diagnóstico rápido. Posso te mostrar em 15 minutos onde a Imobiliaria Follow LLM pode melhorar a conversão?',
          },
        }],
        usage: {
          prompt_tokens: 260,
          completion_tokens: 38,
          total_tokens: 298,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const lead = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, telefone, whatsapp, cidade, nicho, fonte, score, status, data_coleta,
        tem_site, tem_pixel_meta, tem_whatsapp_site
      ) VALUES (
        $1, 'Imobiliaria Follow LLM', '+5565999933333', '+5565999933333', 'Cuiaba', 'imobiliarias', 'serper', 90, 'contato_enviado', NOW(),
        TRUE, FALSE, TRUE
      )
      RETURNING id`,
      [userId]
    );
    const followLeadId = lead.rows[0].id;

    const sent = await query(
      `INSERT INTO message_queue (
        user_id, lead_id, automation_rule_id, channel, message_type, status, scheduled_at, sent_at, payload_json
      ) VALUES ($1, $2, $3, 'whatsapp', 'initial', 'sent', NOW() - INTERVAL '25 hours', NOW() - INTERVAL '25 hours', $4::jsonb)
      RETURNING id`,
      [userId, followLeadId, ruleId, JSON.stringify({ message: 'Mensagem inicial enviada.' })]
    );

    const result = await queueFollowups(userId, { limit: 5, dry_run: false });
    assert.equal(result.queuedCount, 1);

    const queue = await query(
      `SELECT payload_json, message_type, status
       FROM message_queue
       WHERE user_id = $1 AND lead_id = $2 AND message_type = 'followup_1'
       ORDER BY id DESC
       LIMIT 1`,
      [userId, followLeadId]
    );

    assert.equal(queue.rows.length, 1);
    assert.equal(queue.rows[0].status, 'pending');
    assert.equal(queue.rows[0].payload_json.sourceMessageId, sent.rows[0].id);
    assert.equal(queue.rows[0].payload_json.followup.source, 'llm');
    assert.equal(queue.rows[0].payload_json.followup.generated, true);
    assert.ok(queue.rows[0].payload_json.followup.generationId);

    const generation = await query(
      `SELECT purpose, provider, prompt_tokens, completion_tokens, total_tokens, status
       FROM llm_generations
       WHERE id = $1 AND user_id = $2`,
      [queue.rows[0].payload_json.followup.generationId, userId]
    );
    assert.equal(generation.rows[0].purpose, 'followup_1');
    assert.equal(generation.rows[0].provider, 'openai');
    assert.equal(generation.rows[0].prompt_tokens, 260);
    assert.equal(generation.rows[0].completion_tokens, 38);
    assert.equal(generation.rows[0].total_tokens, 298);
    assert.equal(generation.rows[0].status, 'success');
  });
});
