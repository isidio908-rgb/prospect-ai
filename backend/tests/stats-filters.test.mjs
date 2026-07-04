import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStatsFilterContext,
  normalizeStatsFilters,
} from '../src/api/routes/stats.mjs';

describe('dashboard stats filters', () => {
  const now = new Date('2026-07-03T15:00:00.000Z');

  test('mantem todo periodo como padrao para preservar metricas atuais', () => {
    const context = buildStatsFilterContext(18, {}, now);

    assert.equal(context.whereClause, 'user_id = $1');
    assert.deepEqual(context.params, [18]);
    assert.equal(context.filters.period, 'all');
    assert.equal(context.filters.fonte, null);
  });

  test('adiciona filtro de fonte e periodo usando parametros SQL seguros', () => {
    const context = buildStatsFilterContext(18, { period: '7d', fonte: 'Serper' }, now);

    assert.match(context.whereClause, /user_id = \$1/);
    assert.match(context.whereClause, /LOWER\(COALESCE\(fonte, 'indefinida'\)\) = LOWER\(\$2\)/);
    assert.match(context.whereClause, /data_coleta >= \$3/);
    assert.match(context.whereClause, /data_coleta <= \$4/);
    assert.equal(context.params[0], 18);
    assert.equal(context.params[1], 'Serper');
    assert.ok(context.params[2] instanceof Date);
    assert.ok(context.params[3] instanceof Date);
  });

  test('normaliza periodo customizado com datas validas', () => {
    const filters = normalizeStatsFilters({
      period: 'custom',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-03',
    }, now);

    assert.equal(filters.period, 'custom');
    assert.equal(filters.dateFrom.getHours(), 0);
    assert.equal(filters.dateTo.getHours(), 23);
    assert.ok(filters.dateFromIso);
    assert.ok(filters.dateToIso);
  });

  test('ignora periodo invalido e fonte all', () => {
    const context = buildStatsFilterContext(18, { period: 'drop table', fonte: 'all' }, now);

    assert.equal(context.whereClause, 'user_id = $1');
    assert.deepEqual(context.params, [18]);
    assert.equal(context.filters.period, 'all');
    assert.equal(context.filters.fonte, null);
  });
});
