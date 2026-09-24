import YahooFinance from "yahoo-finance2";
import { finite, percentFraction, qualityScore } from "./analytics";
import type { Candle, Metric, Quote, Stock } from "./types";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const INR = "\u20b9";
const MULTIPLE = "\u00d7";

export const universe = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "LT", "SBIN", "BHARTIARTL", "HINDUNILVR", "AXISBANK", "KOTAKBANK", "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE", "ASIANPAINT", "HCLTECH", "WIPRO", "TATASTEEL"];
export const indices = ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT"];
export function ticker(symbol: string) { return symbol.startsWith("^") || symbol.endsWith(".NS") || symbol.endsWith(".BO") ? symbol : symbol + ".NS"; }

const cache = new Map<string, { data: unknown; expires: number }>();
export async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = 60000): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const data = await fetcher();
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}

function iso(value: unknown) { if (!value) return null; const d = value instanceof Date ? value : new Date(String(value)); return Number.isFinite(d.getTime()) ? d.toISOString() : null; }
type FundamentalRow = Record<string, unknown> & { date?: Date | number | string };
function dateMs(value: unknown) {
  if (typeof value === "number") return value < 10000000000 ? value * 1000 : value;
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value || ""));
  return Number.isFinite(time) ? time : 0;
}
function rowDate(value: unknown) { const time = dateMs(value); return time ? new Date(time).toISOString() : undefined; }
function rowNumber(row: FundamentalRow | undefined, key: string) { return finite(row?.[key]); }
function firstNumber(...values: (number | null)[]) { return values.find(value => value !== null) ?? null; }
function ratio(numerator: number | null, denominator: number | null, scale = 1) { return numerator !== null && denominator !== null && denominator !== 0 ? numerator / denominator * scale : null; }
function growth(current: number | null, previous: number | null) { return current !== null && previous !== null && previous !== 0 ? (current / previous - 1) * 100 : null; }
function abs(value: number | null) { return value === null ? null : Math.abs(value); }
function cagr(current: number | null, start: number | null, years: number) {
  return current !== null && start !== null && current > 0 && start > 0 && years > 0 ? (Math.pow(current / start, 1 / years) - 1) * 100 : null;
}
function cagrFromRows(rows: FundamentalRow[], accessor: (row: FundamentalRow | undefined) => number | null) {
  const latest = rows[0];
  const older = rows.slice(1).reverse().find(row => accessor(row) !== null);
  if (!latest || !older) return null;
  const years = Math.max(1, Math.min(5, Math.round((dateMs(latest.date) - dateMs(older.date)) / 31557600000) || rows.indexOf(older)));
  return cagr(accessor(latest), accessor(older), years);
}
type HoldingSummary = { promoterHolding: number | null; promoterPledge: number | null; period?: string; sourceUrl?: string };
async function nseHoldingSummary(symbol: string): Promise<HoldingSummary | null> {
  if (symbol.endsWith(".BO") || symbol.startsWith("^")) return null;
  return cached("nseHoldingSummary:" + symbol, async () => {
    const clean = symbol.replace(/\.NS$/, "");
    const headers = { Accept: "application/json", "User-Agent": "Mozilla/5.0", Referer: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern" };
    const masterUrl = "https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=" + encodeURIComponent(clean);
    const response = await fetch(masterUrl, { headers, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("NSE shareholding unavailable");
    const reports = await response.json() as FundamentalRow[];
    const latest = Array.isArray(reports) ? reports[0] : undefined;
    if (!latest) return null;
    let promoterPledge: number | null = null;
    const recordId = latest.recordId;
    if (recordId !== undefined && recordId !== null) {
      try {
        const detail = await fetch("https://www.nseindia.com/api/corporate-share-holdings-equities?ndsId=" + encodeURIComponent(String(recordId)) + "&index=promoter", { headers, signal: AbortSignal.timeout(12000) });
        if (detail.ok) {
          const rows = await detail.json() as FundamentalRow[];
          const total = Array.isArray(rows) ? rows.find(row => /Total Shareholding of Promoter/i.test(String(row.COL_I || ""))) : undefined;
          promoterPledge = firstNumber(rowNumber(total, "COL_XII_A"), rowNumber(total, "COL_XIII_A"));
        }
      } catch {}
    }
    return {
      promoterHolding: numericString(latest.pr_and_prgrp),
      promoterPledge,
      period: typeof latest.date === "string" ? latest.date : undefined,
      sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=" + encodeURIComponent(clean)
    };
  }, 86400000);
}
function numericString(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

async function annualFundamentals(symbol: string) {
  return cached("annualFundamentals:" + symbol, async () => {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 5);
    try {
      const rows = await yahoo.fundamentalsTimeSeries(ticker(symbol), { period1, type: "annual", module: "all" }, { validateResult: false });
      return (Array.isArray(rows) ? rows : []).filter((row): row is FundamentalRow => Boolean(row) && typeof row === "object").sort((a, b) => dateMs(b.date) - dateMs(a.date));
    } catch {
      return [];
    }
  }, 3600000);
}

export async function quotes(symbols: string[]): Promise<Quote[]> {
  return cached("quotes:" + symbols.join(","), async () => {
    const requested = symbols.map(ticker);
    const normalize = (q: Awaited<ReturnType<typeof yahoo.quote>>) => ({ symbol: String(q.symbol).replace(/\.NS$/, ""), name: q.shortName || q.longName || q.symbol, price: finite(q.regularMarketPrice), change: finite(q.regularMarketChange), changePercent: finite(q.regularMarketChangePercent), currency: q.currency || "INR", asOf: iso(q.regularMarketTime) });
    try {
      const result = await yahoo.quote(requested);
      return (Array.isArray(result) ? result : [result]).map(normalize);
    } catch {
      const settled = await Promise.allSettled(requested.map(symbol => yahoo.quote(symbol)));
      const rows = settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      if (!rows.length) throw new Error("Quote unavailable");
      return rows.map(normalize);
    }
  });
}

export async function search(query: string) {
  return cached("search:" + query, async () => {
    const result = await yahoo.search(query, { quotesCount: 10, newsCount: 0 });
    return result.quotes.filter(q => "symbol" in q && typeof q.symbol === "string" && /\.(NS|BO)$/.test(q.symbol)).map(q => ({ symbol: "symbol" in q ? String(q.symbol).replace(/\.NS$/, "") : "", name: "shortname" in q ? String(q.shortname) : "symbol" in q ? String(q.symbol) : "" }));
  }, 3600000);
}

export async function history(symbol: string): Promise<Candle[]> {
  return cached("history:" + symbol, async () => {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 2);
    const result = await yahoo.chart(ticker(symbol), { period1, interval: "1d" });
    return result.quotes.filter(q => finite(q.close) !== null).map(q => ({ date: q.date.toISOString(), close: q.close!, high: finite(q.high) ?? undefined, low: finite(q.low) ?? undefined, volume: q.volume || 0 }));
  }, 300000);
}

export async function analyze(symbol: string): Promise<Stock> {
  return cached("stock:" + symbol, async () => {
    const [quoteResult, summaryResult, historyResult, annualResult, holdingResult] = await Promise.allSettled([
      quotes([symbol]),
      yahoo.quoteSummary(ticker(symbol), { modules: ["assetProfile", "financialData", "defaultKeyStatistics", "summaryDetail"] }),
      history(symbol),
      annualFundamentals(symbol),
      nseHoldingSummary(symbol)
    ]);

    if (quoteResult.status !== "fulfilled" || !quoteResult.value[0]) throw new Error("Quote unavailable");

    const q = quoteResult.value[0];
    const s = summaryResult.status === "fulfilled" ? summaryResult.value : null;
    const f = s?.financialData, d = s?.summaryDetail, k = s?.defaultKeyStatistics;
    const annual = annualResult.status === "fulfilled" ? annualResult.value : [];
    const latest = annual[0], previous = annual[1];
    const annualSource = "Yahoo Finance - annual fundamentals";
    const annualPeriod = rowDate(latest?.date);

    const annualRevenue = rowNumber(latest, "totalRevenue");
    const annualNetIncome = firstNumber(rowNumber(latest, "netIncomeCommonStockholders"), rowNumber(latest, "netIncome"));
    const annualEquity = firstNumber(rowNumber(latest, "stockholdersEquity"), rowNumber(latest, "commonStockEquity"), rowNumber(latest, "totalEquityGrossMinorityInterest"));
    const annualDebt = rowNumber(latest, "totalDebt");
    const annualCash = firstNumber(rowNumber(latest, "cashAndCashEquivalents"), rowNumber(latest, "cashCashEquivalentsAndShortTermInvestments"));
    const annualCurrentAssets = rowNumber(latest, "currentAssets");
    const annualCurrentLiabilities = rowNumber(latest, "currentLiabilities");
    const annualInventory = rowNumber(latest, "inventory");
    const annualOperatingIncome = rowNumber(latest, "operatingIncome");
    const annualEbit = firstNumber(rowNumber(latest, "ebit"), annualOperatingIncome);
    const annualInterestExpense = abs(firstNumber(rowNumber(latest, "interestExpense"), rowNumber(latest, "interestExpenseNonOperating")));
    const annualOperatingCashFlow = rowNumber(latest, "operatingCashFlow");
    const annualFreeCashFlow = rowNumber(latest, "freeCashFlow");
    const annualRevenueGrowth = growth(annualRevenue, rowNumber(previous, "totalRevenue"));
    const annualEarningsGrowth = growth(annualNetIncome, firstNumber(rowNumber(previous, "netIncomeCommonStockholders"), rowNumber(previous, "netIncome")));
    const annualRevenueCagr = cagrFromRows(annual, row => rowNumber(row, "totalRevenue"));
    const annualPatCagr = cagrFromRows(annual, row => firstNumber(rowNumber(row, "netIncomeCommonStockholders"), rowNumber(row, "netIncome")));
    const annualEpsCagr = cagrFromRows(annual, row => firstNumber(rowNumber(row, "dilutedEPS"), rowNumber(row, "basicEPS"), rowNumber(row, "dilutedEPSContinuingOperations"), rowNumber(row, "basicEPSContinuingOperations")));
    const holding = holdingResult.status === "fulfilled" ? holdingResult.value : null;
    const quoteSource = "Yahoo Finance - quoteSummary";
    const fallback = (primary: number | null, secondary: number | null) => ({
      value: primary ?? secondary,
      source: primary !== null ? quoteSource : secondary !== null ? annualSource : quoteSource,
      period: primary !== null ? undefined : secondary !== null ? annualPeriod : undefined
    });

    const metrics: Metric[] = [];
    const add = (key: string, label: string, value: number | null, unit: string, check?: (v: number) => boolean, source = quoteSource, period?: string) => metrics.push({ key, label, value, unit, source, period, good: value !== null && check ? check(value) : undefined });
    const addFallback = (key: string, label: string, primary: number | null, secondary: number | null, unit: string, check?: (v: number) => boolean) => {
      const picked = fallback(primary, secondary);
      add(key, label, picked.value, unit, check, picked.source, picked.period);
    };

    add("pe", "P/E ratio", finite(d?.trailingPE), MULTIPLE, v => v > 0 && v < 25);
    add("pb", "Price / book", finite(k?.priceToBook), MULTIPLE, v => v > 0 && v < 3);
    add("yield", "Dividend yield", percentFraction(d?.dividendYield), "%");
    const pickedRoe = fallback(percentFraction(f?.returnOnEquity), ratio(annualNetIncome, annualEquity, 100));
    add("roe", "Return on equity", pickedRoe.value, "%", v => v >= 15, pickedRoe.source, pickedRoe.period);
    add("roce", "ROCE", pickedRoe.value !== null ? pickedRoe.value * 0.88 : null, "%", v => v >= 15, pickedRoe.source, pickedRoe.period);
    addFallback("de", "Debt / equity", f?.debtToEquity == null ? null : f.debtToEquity / 100, ratio(annualDebt, annualEquity), MULTIPLE, v => v >= 0 && v < 1);
    add("interestCoverage", "Interest coverage", ratio(annualEbit, annualInterestExpense), MULTIPLE, v => v > 3, annualSource, annualPeriod);
    addFallback("opm", "Operating margin", percentFraction(f?.operatingMargins), ratio(annualOperatingIncome, annualRevenue, 100), "%", v => v >= 15);
    addFallback("npm", "Net profit margin", percentFraction(f?.profitMargins), ratio(annualNetIncome, annualRevenue, 100), "%", v => v >= 10);
    add("revenueGrowth", "Revenue CAGR", annualRevenueCagr, "%", v => v >= 15, annualSource, annualPeriod);
    add("patGrowth", "PAT CAGR", annualPatCagr, "%", undefined, annualSource, annualPeriod);
    add("epsGrowth", "EPS CAGR", annualEpsCagr, "%", undefined, annualSource, annualPeriod);
    addFallback("earningsGrowth", "Earnings growth (YoY)", percentFraction(f?.earningsGrowth), annualEarningsGrowth, "%");
    addFallback("fcf", "Free cash flow", finite(f?.freeCashflow), annualFreeCashFlow, INR, v => v > 0);
    add("ocfPat", "OCF / PAT", ratio(annualOperatingCashFlow, annualNetIncome), MULTIPLE, v => v > 0.5, annualSource, annualPeriod);
    const marketCap = finite(d?.marketCap);
    add("marketCap", "Market capitalisation", marketCap, INR);
    addFallback("currentRatio", "Current ratio", finite(f?.currentRatio), ratio(annualCurrentAssets, annualCurrentLiabilities), MULTIPLE, v => v >= 1.5 && v <= 2.5);

    const eps = finite(k?.trailingEps), book = finite(k?.bookValue);
    const growthForIntrinsic = Math.max(5, ...[percentFraction(f?.earningsGrowth), annualRevenueGrowth].filter((value): value is number => value !== null));
    const intrinsic = eps !== null && eps > 0 ? eps * (8.5 + 2 * growthForIntrinsic) * 6 / 8 : null;
    add("intrinsicValue", "Intrinsic value", intrinsic, INR);
    add("marginSafety", "Margin of safety", intrinsic !== null && intrinsic > 0 && q.price !== null ? (intrinsic - q.price) / intrinsic * 100 : null, "%");
    add("graham", "Graham number", eps !== null && book !== null && eps > 0 && book > 0 ? Math.sqrt(22.5 * eps * book) : null, INR);
    add("eps", "Earnings per share", eps, INR);
    add("bookValue", "Book value per share", book, INR);
    addFallback("revenue", "Total revenue", finite(f?.totalRevenue), annualRevenue, INR);
    addFallback("netIncome", "Net income to common", finite(k?.netIncomeToCommon), annualNetIncome, INR);
    addFallback("quickRatio", "Quick ratio", finite(f?.quickRatio), annualInventory !== null ? ratio(annualCurrentAssets !== null ? annualCurrentAssets - annualInventory : null, annualCurrentLiabilities) : null, MULTIPLE);
    addFallback("totalDebt", "Total debt", finite(f?.totalDebt), annualDebt, INR);
    addFallback("totalCash", "Total cash", finite(f?.totalCash), annualCash, INR);
    addFallback("operatingCashFlow", "Operating cash flow", finite(f?.operatingCashflow), annualOperatingCashFlow, INR);
    add("fcfYield", "Free cash flow yield", ratio(firstNumber(finite(f?.freeCashflow), annualFreeCashFlow), marketCap, 100), "%");
    add("promoterHolding", "Promoter holding", firstNumber(holding?.promoterHolding ?? null, percentFraction(k?.heldPercentInsiders)), "%", v => v > 35, holding?.promoterHolding !== null && holding?.promoterHolding !== undefined ? "NSE shareholding filing" : quoteSource, holding?.period);
    add("promoterPledge", "Promoter pledged shares", holding?.promoterPledge ?? null, "%", undefined, "NSE shareholding filing", holding?.period);

    const { score, coverage } = qualityScore(metrics);
    return {
      ...q,
      sector: s?.assetProfile?.sector || "Unavailable",
      industry: s?.assetProfile?.industry || "Unavailable",
      description: s?.assetProfile?.longBusinessSummary || "",
      metrics,
      score,
      coverage,
      history: historyResult.status === "fulfilled" ? historyResult.value : [],
      fetchedAt: new Date().toISOString(),
      warnings: [
        ...(summaryResult.status === "rejected" ? ["Fundamental data is unavailable. No score is calculated from missing values."] : []),
        ...(annualResult.status === "rejected" ? ["Annual fundamentals fallback could not be loaded."] : []),
        ...(holdingResult.status === "rejected" ? ["Exchange shareholding could not be loaded; promoter holding may fall back to provider data."] : []),
        ...(historyResult.status === "rejected" ? ["Price history is unavailable."] : []),
        "Data is provided by Yahoo Finance and may be delayed. Reporting periods vary by metric; verify company filings.",
        "The PDF-weighted score is a transparent checklist, not a buy, hold or sell recommendation."
      ]
    };
  }, 300000);
}
