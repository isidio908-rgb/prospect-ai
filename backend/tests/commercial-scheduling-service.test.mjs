import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfirmedSchedulingSummary,
  buildSchedulingInvite,
  buildSuggestedSchedulingSlots,
} from '../src/services/autopilot/commercialSchedulingService.mjs';

describe('assisted commercial scheduling', () => {
  test('gera sugestoes de horarios comerciais com quantidade controlada', () => {
    const slots = buildSuggestedSchedulingSlots({
      now: new Date('2026-07-06T12:00:00Z'),
      timezone: 'America/Cuiaba',
      count: 3,
      preferred_period: 'afternoon',
      duration_minutes: 20,
    });

    assert.equal(slots.length, 3);
    assert.equal(slots[0].timezone, 'America/Cuiaba');
    assert.equal(slots[0].duration_minutes, 20);
    assert.match(slots[0].label, /14:00|15:30|16:30/);
  });

  test('monta convite com empresa, profissao e duracao', () => {
    const message = buildSchedulingInvite({
      lead: { nome_empresa: 'Clinica Teste' },
      user: { name: 'Aloisio', profession: 'Gestor de Trafego', primary_niche: 'clinicas' },
      slots: [{ label: 'ter, 07/07 as 14:00' }, { label: 'ter, 07/07 as 15:30' }],
      durationMinutes: 15,
      note: 'Lead pediu detalhes sobre captacao de pacientes.',
    });

    assert.match(message, /Clinica Teste/);
    assert.match(message, /Gestor de Trafego/);
    assert.match(message, /15 minutos/);
    assert.match(message, /ter, 07\/07 as 14:00/);
    assert.match(message, /captacao de pacientes/);
  });

  test('resume confirmacao sem prometer evento externo', () => {
    const summary = buildConfirmedSchedulingSummary({
      lead: { nome_empresa: 'Imobiliaria Exemplo' },
      scheduledFor: '2026-07-07 15:30',
      note: 'Confirmar por WhatsApp antes da chamada.',
    });

    assert.match(summary, /Imobiliaria Exemplo/);
    assert.match(summary, /2026-07-07 15:30/);
    assert.match(summary, /Confirmar por WhatsApp/);
  });
});
