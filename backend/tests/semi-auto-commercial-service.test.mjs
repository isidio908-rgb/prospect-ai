import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCollectionQuery,
  buildSemiAutoPlanFromHistory,
} from '../src/services/autopilot/semiAutoCommercialService.mjs';

describe('semi-auto commercial autopilot planning', () => {
  test('monta query de coleta por nicho, cidade e regiao', () => {
    assert.equal(
      buildCollectionQuery('imobiliarias', 'Cuiaba', 'MT'),
      'imobiliarias em Cuiaba, MT'
    );

    assert.equal(buildCollectionQuery('clinicas odontologicas', 'Sinop'), 'clinicas odontologicas em Sinop');
    assert.equal(buildCollectionQuery('', 'Cuiaba', 'MT'), 'Cuiaba, MT');
    assert.equal(buildCollectionQuery('', '', 'br'), '');
  });

  test('sugere credencial ativa e recorte historico mais produtivo', () => {
    const plan = buildSemiAutoPlanFromHistory({
      history: [
        {
          id: 10,
          status: 'completed',
          source_type: 'rapidapi',
          query: 'clinicas em Cuiaba, MT',
          city: 'Cuiaba',
          niche: 'clinicas',
          region: 'MT',
          saved_count: 2,
          duplicate_count: 0,
          started_at: '2026-07-01T10:00:00Z',
        },
        {
          id: 11,
          status: 'completed',
          source_type: 'serper',
          query: 'imobiliarias em Cuiaba, MT',
          city: 'Cuiaba',
          niche: 'imobiliarias',
          region: 'MT',
          saved_count: 8,
          duplicate_count: 1,
          started_at: '2026-07-02T10:00:00Z',
        },
      ],
      credentials: [
        { id: 21, name: 'Serper principal', type: 'serper', status: 'active' },
        { id: 24, name: 'RapidAPI reserva', type: 'rapidapi', status: 'active' },
      ],
      queueStats: { pending: 3, approved: 2 },
      leadStats: { need_analysis: 4, high_score: 9 },
    });

    assert.equal(plan.ready, true);
    assert.equal(plan.recommendation.credential_id, 21);
    assert.equal(plan.recommendation.source_type, 'serper');
    assert.equal(plan.recommendation.query, 'imobiliarias em Cuiaba, MT');
    assert.equal(plan.source_history.collection_run_id, 11);
    assert.equal(plan.queue.pending, 3);
    assert.equal(plan.leads.high_score, 9);
    assert.ok(plan.reasons.some((reason) => reason.includes('mensagens aprovadas')));
  });

  test('marca plano como nao pronto sem credencial ou historico suficiente', () => {
    const plan = buildSemiAutoPlanFromHistory({
      history: [],
      credentials: [],
      queueStats: {},
      leadStats: {},
    });

    assert.equal(plan.ready, false);
    assert.equal(plan.recommendation.credential_id, null);
    assert.equal(plan.recommendation.query, '');
    assert.equal(plan.recommendation.region, '');
    assert.ok(plan.reasons.includes('Nenhuma credencial ativa de coleta encontrada.'));
    assert.ok(plan.reasons.includes('Historico insuficiente para sugerir query; informe nicho e cidade manualmente.'));
  });

  test('documenta travas de seguranca do fluxo semi-automatico', () => {
    const plan = buildSemiAutoPlanFromHistory({
      history: [{ id: 1, status: 'completed', query: 'restaurantes em Cuiaba', saved_count: 1 }],
      credentials: [{ id: 1, name: 'Serper', type: 'serper', status: 'active' }],
    });

    assert.ok(plan.safety.some((item) => item.includes('approve_collection=true')));
    assert.ok(plan.safety.some((item) => item.includes('approved')));
    assert.ok(plan.safety.some((item) => item.includes('stop-on-reply')));
  });
});
