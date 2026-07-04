import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutopilotDecision,
  buildInitialMessageQueueItem,
  getNextSendAt,
  isWithinSendWindow,
  normalizeAutopilotRule,
  shouldQueueInitialMessage,
} from '../src/services/autopilot/autopilotService.mjs';

const baseLead = {
  id: 10,
  user_id: 5,
  nome_empresa: 'Imobiliária Teste',
  telefone: '+5565999999999',
  whatsapp: '+5565999999999',
  cidade: 'Cuiaba',
  nicho: 'imobiliarias',
  fonte: 'serper',
  score: 82,
  status: 'mensagem_pronta',
};

const baseRule = {
  id: 7,
  enabled: true,
  mode: 'assistido',
  source_type: 'serper',
  city: 'Cuiaba',
  niche: 'imobiliarias',
  min_score: 60,
  send_window_start: '09:00',
  send_window_end: '17:00',
};

describe('autopilot foundation', () => {
  test('normaliza regra em modo assistido com aprovação manual obrigatória', () => {
    const rule = normalizeAutopilotRule({ enabled: true, mode: 'assistido', require_manual_approval: false });

    assert.equal(rule.enabled, true);
    assert.equal(rule.mode, 'assistido');
    assert.equal(rule.require_manual_approval, true);
    assert.equal(rule.min_score, 60);
  });

  test('bloqueia fila quando regra está desligada', () => {
    const decision = shouldQueueInitialMessage(baseLead, { ...baseRule, enabled: false });

    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'rule_disabled');
  });

  test('bloqueia leads sem contato utilizável', () => {
    const decision = shouldQueueInitialMessage({ ...baseLead, telefone: '', whatsapp: '' }, baseRule);

    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'missing_contact');
  });

  test('bloqueia leads abaixo do score mínimo', () => {
    const decision = shouldQueueInitialMessage({ ...baseLead, score: 40 }, baseRule);

    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'score_below_minimum');
  });

  test('bloqueia mensagem inicial duplicada ativa', () => {
    const decision = shouldQueueInitialMessage(baseLead, baseRule, [
      { message_type: 'initial', status: 'pending' },
    ]);

    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'initial_message_already_exists');
  });

  test('aprova lead compatível e cria item pendente em modo assistido', () => {
    const decision = buildAutopilotDecision(baseLead, baseRule, [], {
      now: new Date('2026-07-03T13:00:00'),
      automationRunId: 99,
    });

    assert.equal(decision.eligible, true);
    assert.equal(decision.reason, 'eligible');
    assert.equal(decision.queueItem.status, 'pending');
    assert.equal(decision.queueItem.message_type, 'initial');
    assert.equal(decision.queueItem.automation_rule_id, 7);
    assert.equal(decision.queueItem.automation_run_id, 99);
    assert.equal(decision.queueItem.payload_json.leadName, 'Imobiliária Teste');
    assert.equal(decision.queueItem.payload_json.manualApproval, true);
  });

  test('permite aprovação automática apenas quando a regra estiver configurada para isso', () => {
    const item = buildInitialMessageQueueItem(baseLead, {
      ...baseRule,
      mode: 'automatico',
      require_manual_approval: false,
    }, {
      now: new Date('2026-07-03T13:00:00'),
    });

    assert.equal(item.status, 'approved');
    assert.equal(item.payload_json.manualApproval, false);
  });

  test('respeita janela de envio e joga para próximo horário seguro', () => {
    const inside = new Date('2026-07-03T13:00:00');
    const beforeWindow = new Date('2026-07-03T07:30:00');
    const afterWindow = new Date('2026-07-03T20:30:00');

    assert.equal(isWithinSendWindow(inside, baseRule), true);
    assert.equal(isWithinSendWindow(beforeWindow, baseRule), false);
    assert.equal(getNextSendAt(beforeWindow, baseRule).getHours(), 9);

    const next = getNextSendAt(afterWindow, baseRule);
    assert.equal(next.getDate(), 4);
    assert.equal(next.getHours(), 9);
  });
});
