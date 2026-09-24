import assert from 'node:assert/strict';
import test from 'node:test';
import { csvCell, ema, percentFraction, qualityScore, rsi, swing } from '../lib/analytics';
import { maySignIn, normalizeEmail } from '../lib/access';
import { reportSchema, symbolSchema } from '../lib/validation';
import type { Candle, Metric } from '../lib/types';

test('only verified Google accounts with active membership can sign in', () => {
  assert.equal(maySignIn('google', true, true), true);
  for (const args of [['google', false, true], ['google', true, false], ['other', true, true], ['google', 'true', true]] as const) {
    assert.equal(maySignIn(args[0], args[1], args[2]), false);
  }
  assert.equal(normalizeEmail(' Owner@Example.com '), 'owner@example.com');
});
test('filing dates reject calendar rollover and accept leap years', () => {
  const filing = { symbol: 'TCS', period: '2024-02-29', revenue: null, netProfit: null, operatingCashFlow: null, totalDebt: null, equity: null };
  assert.equal(reportSchema.safeParse(filing).success, true);
  for (const period of ['2025-02-29', '2026-02-31', '2026-04-31', '2026-13-01']) {
    assert.equal(reportSchema.safeParse({ ...filing, period }).success, false);
  }
  assert.equal(reportSchema.safeParse({ ...filing, totalDebt: -1 }).success, false);
});
test('symbols support NSE, BSE and indices while rejecting query fragments', () => {
  assert.equal(symbolSchema.parse(' tcs.ns '), 'TCS.NS');
  for (const symbol of ['500325.BO', 'M&M', '^NSEI']) assert.equal(symbolSchema.safeParse(symbol).success, true);
  for (const symbol of ['', 'TCS?foo', '<script>']) assert.equal(symbolSchema.safeParse(symbol).success, false);
});
test('PDF score uses weighted formula rules and requires three assessed checks', () => {
  const metric = (key: string, value: number | null): Metric => ({ key, label: key, value, unit: '', source: 'test' });
  assert.deepEqual(qualityScore([metric('revenueGrowth', 20), metric('patGrowth', null), metric('roe', 16)]), { score: null, coverage: 2 });
  assert.deepEqual(qualityScore([metric('revenueGrowth', 26), metric('patGrowth', 16), metric('roe', 21), metric('de', 0.75), metric('promoterHolding', null)]), { score: 30, coverage: 4 });
  assert.equal(percentFraction(0.025), 2.5);
  assert.equal(percentFraction(NaN), null);
});
test('EMA and RSI handle insufficient, flat, rising and falling histories', () => {
  assert.deepEqual(ema([1, 2], 3), [null, null]);
  assert.deepEqual(ema([1, 2, 3, 4], 3), [null, null, 2, 3]);
  assert.equal(rsi([1, 2]), null);
  assert.equal(rsi(Array(20).fill(100)), 50);
  assert.equal(rsi(Array.from({ length: 20 }, (_, i) => i)), 100);
  assert.equal(rsi(Array.from({ length: 20 }, (_, i) => 20 - i)), 0);
});
test('volume confirmation uses the previous twenty sessions and a new cross', () => {
  const candles: Candle[] = Array.from({ length: 22 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, close: i === 21 ? 110 : 100, volume: i === 21 ? 150 : 100 }));
  assert.equal(swing(candles).signal, 'Golden cross today');
  assert.equal(swing(candles).setup, 'today');
  assert.equal(swing(candles).volumeRatio, 1.5);
  assert.equal(swing(candles, true).signal, 'Insufficient history');
  candles.push({ date: '2026-01-23', close: 111, volume: 200 });
  assert.equal(swing(candles).signal, 'Crossed yesterday');
  assert.equal(swing(candles).setup, 'yesterday');
});
test('CSV export escapes quotes and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell(null), '""');
});
