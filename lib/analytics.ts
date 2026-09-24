import type { Candle, Metric } from "./types";
export function finite(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
export function percentFraction(value: unknown) { const number = finite(value); return number === null ? null : number * 100; }

type ScoreRule = { key: string; max: number; points: (value: number) => number };
export const scoreRules: ScoreRule[] = [
  { key: "revenueGrowth", max: 10, points: v => v > 25 ? 10 : v > 15 ? 7 : v > 10 ? 4 : 0 },
  { key: "patGrowth", max: 10, points: v => v > 25 ? 10 : v > 15 ? 7 : v > 10 ? 4 : 0 },
  { key: "epsGrowth", max: 8, points: v => v > 20 ? 8 : v > 10 ? 5 : 0 },
  { key: "roe", max: 8, points: v => v > 20 ? 8 : v > 15 ? 5 : 0 },
  { key: "roce", max: 7, points: v => v > 20 ? 7 : v > 15 ? 4 : 0 },
  { key: "opm", max: 6, points: v => v > 15 ? 6 : v > 10 ? 3 : 0 },
  { key: "npm", max: 4, points: v => v > 10 ? 4 : v > 5 ? 2 : 0 },
  { key: "de", max: 8, points: v => v >= 0 && v < 0.5 ? 8 : v >= 0 && v < 1 ? 5 : 0 },
  { key: "interestCoverage", max: 6, points: v => v > 5 ? 6 : v > 3 ? 3 : 0 },
  { key: "currentRatio", max: 6, points: v => v > 1.5 ? 6 : v > 1 ? 3 : 0 },
  { key: "fcf", max: 6, points: v => v > 0 ? 6 : 0 },
  { key: "ocfPat", max: 4, points: v => v > 0.8 ? 4 : v > 0.5 ? 2 : 0 },
  { key: "promoterHolding", max: 6, points: v => v > 50 ? 6 : v > 35 ? 3 : 0 }
];

export function scorePoints(metric: Metric) {
  const rule = scoreRules.find(item => item.key === metric.key);
  return rule && metric.value !== null ? rule.points(metric.value) : null;
}

export function qualityScore(metrics: Metric[]) {
  const byKey = new Map(metrics.map(metric => [metric.key, metric]));
  const assessed = scoreRules.flatMap(rule => {
    const metric = byKey.get(rule.key);
    return metric?.value !== null && metric?.value !== undefined ? [{ rule, value: metric.value }] : [];
  });
  const points = assessed.reduce((sum, item) => sum + item.rule.points(item.value), 0);
  return { score: assessed.length >= 3 ? Math.min(100, Math.round(points)) : null, coverage: assessed.length };
}
export function ema(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length < period) return result;
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = value;
  for (let i = period; i < values.length; i++) { value = values[i] * 2 / (period + 1) + value * (1 - 2 / (period + 1)); result[i] = value; }
  return result;
}
export function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) { const d = values[i] - values[i - 1]; gains += Math.max(0, d); losses += Math.max(0, -d); }
  gains /= period; losses /= period;
  for (let i = period + 1; i < values.length; i++) { const d = values[i] - values[i - 1]; gains = (gains * (period - 1) + Math.max(0, d)) / period; losses = (losses * (period - 1) + Math.max(0, -d)) / period; }
  return losses === 0 ? gains === 0 ? 50 : 100 : 100 - 100 / (1 + gains / losses);
}
export function atr(history: Candle[], period = 14) {
  if (history.length <= period) return null;
  const ranges = history.map((c, i) => {
    const previous = i > 0 ? history[i - 1].close : c.close;
    const high = finite(c.high) ?? Math.max(c.close, previous);
    const low = finite(c.low) ?? Math.min(c.close, previous);
    return Math.max(high - low, Math.abs(high - previous), Math.abs(low - previous));
  });
  const recent = ranges.slice(-period);
  return recent.length === period ? recent.reduce((sum, value) => sum + value, 0) / period : null;
}
export function swing(history: Candle[], longTerm = false) {
  const closes = history.map(c => c.close), fast = ema(closes, longTerm ? 50 : 9), slow = ema(closes, longTerm ? 200 : 21);
  const a = fast.at(-1) ?? null, b = slow.at(-1) ?? null, pa = fast.at(-2) ?? null, pb = slow.at(-2) ?? null;
  const ppa = fast.at(-3) ?? null, ppb = slow.at(-3) ?? null;
  const volumes = history.slice(-21, -1);
  const average = volumes.length === 20 ? volumes.reduce((s, c) => s + c.volume, 0) / 20 : 0;
  const volumeRatio = average > 0 ? (history.at(-1)?.volume || 0) / average : null;
  const recentVolume = history.slice(-3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
  const previousVolume = history.slice(-6, -3).reduce((sum, candle) => sum + candle.volume, 0) / 3;
  const volumeTrendRatio = previousVolume > 0 ? recentVolume / previousVolume : null;
  const crossed = a !== null && b !== null && pa !== null && pb !== null && a > b && pa <= pb;
  const crossedYesterday = a !== null && b !== null && pa !== null && pb !== null && ppa !== null && ppb !== null && a > b && pa > pb && ppa <= ppb;
  const gapPercent = a !== null && b !== null && b > 0 ? (b - a) / b * 100 : null;
  const approaching = gapPercent !== null && gapPercent > 0 && gapPercent <= (longTerm ? 3 : 2);
  const momentum = rsi(closes);
  const trendUp = a !== null && b !== null && a > b;
  const volumeConfirmed = volumeRatio !== null && volumeRatio >= 1.2 && volumeTrendRatio !== null && volumeTrendRatio >= 1.1;
  const close = history.at(-1)?.close ?? null;
  const previous = history.at(-2)?.close ?? close;
  const changePercent = close !== null && previous !== null && previous > 0 ? (close / previous - 1) * 100 : null;
  const recent = history.slice(-10).map(c => c.close);
  const volatility = atr(history);
  const entry = close;
  const stopLoss = close !== null && volatility !== null ? close - 2 * volatility : null;
  const targetLow = close !== null ? close * 1.08 : null;
  const targetHigh = close !== null ? close * 1.12 : null;
  const riskReward = entry !== null && stopLoss !== null && targetLow !== null && entry > stopLoss ? (targetLow - entry) / (entry - stopLoss) : null;
  return {
    fast: a,
    slow: b,
    rsi: momentum,
    volumeRatio,
    volumeTrendRatio,
    atr: volatility,
    signal: a === null || b === null ? "Insufficient history" : crossed ? (volumeConfirmed ? "Golden cross today" : "Bullish cross today") : crossedYesterday ? "Crossed yesterday" : approaching ? "Approaching golden cross" : trendUp ? "Above trend" : "Below trend",
    asOf: history.at(-1)?.date || null,
    close,
    changePercent,
    gapPercent,
    setup: crossed ? "today" as const : crossedYesterday ? "yesterday" as const : approaching ? "approaching" as const : "none" as const,
    trade: { entry, stopLoss, targetLow, targetHigh, riskReward },
    checks: {
      trendUp,
      crossed,
      crossedYesterday,
      approaching,
      volumeConfirmed,
      rsiHealthy: momentum !== null && momentum >= 45 && momentum <= 70,
      enoughHistory: a !== null && b !== null
    }
  };
}
export function relativeTime(date: string | null, now = Date.now()) {
  if (!date || !Number.isFinite(Date.parse(date))) return "Time unavailable";
  const minutes = Math.max(0, Math.floor((now - Date.parse(date)) / 60000));
  return minutes < 1 ? "Just now" : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
}
export function csvCell(value: unknown) {
  let str = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(str)) str = "'" + str;
  return '"' + str.replaceAll('"', '""') + '"';
}

