import assert from 'node:assert/strict';
import test from 'node:test';
import { csvCell, ema, percentFraction, qualityScore, rsi, swing } from '../lib/analytics';
import { maySignIn, normalizeEmail } from '../lib/access';
import { reportSchema, symbolSchema } from '../lib/validation';
import type { Candle, Metric } from '../lib/types';
import { parseWatchlistEntries } from '../lib/watchlist-import';
import { chatImageSchema, decodeChatImage } from '../lib/chat-image';
import { newsImage } from '../lib/news-image';

test('chat images accept supported image signatures within the size limit', () => {
  const png = { mimeType: 'image/png' as const, data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGQAAAABJRU5ErkJggg==' };
  assert.equal(chatImageSchema.safeParse(png).success, true);
  assert.ok(decodeChatImage(png));
  assert.equal(decodeChatImage({ ...png, mimeType: 'image/jpeg' }), null);
  assert.equal(decodeChatImage({ ...png, data: Buffer.concat([Buffer.from(png.data, 'base64'), Buffer.alloc(350_000)]).toString('base64') }), null);
  assert.equal(chatImageSchema.safeParse({ ...png, mimeType: 'image/svg+xml' }).success, false);
});

test('news images come from HTTPS feed metadata or description images', () => {
  assert.equal(newsImage({ 'media:thumbnail': { '@_url': 'https://example.com/photo.jpg' } }), 'https://example.com/photo.jpg');
  assert.equal(newsImage({ description: '&lt;img src=&quot;https://example.com/story.jpg&quot;&gt;' }), 'https://example.com/story.jpg');
  assert.equal(newsImage({ enclosure: { '@_url': 'javascript:alert(1)' } }), null);
});

test('watchlist import keeps company names together and deduplicates entries', () => {
  assert.deepEqual(parseWatchlistEntries('Netweb Technologies, E2E Networks\nTCS; Netweb Technologies'), ['Netweb Technologies', 'E2E Networks', 'TCS']);
  assert.deepEqual(parseWatchlistEntries('  Tata   Consultancy Services  \r\n\r\n  E2E Networks  '), ['Tata Consultancy Services', 'E2E Networks']);
});

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
