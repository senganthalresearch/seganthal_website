import { cached } from "./request-cache";
import { upstreamJson, UpstreamError } from "./upstream";
import { numeric } from "./data-utils";
import type { Quote } from "./types";

const base = "https://www.nseindia.com";
const headers = { Accept: "application/json,text/plain,*/*", "User-Agent": "Mozilla/5.0", Referer: base + "/" };
type Row = Record<string, unknown>;
function record(value: unknown): Row { return value && typeof value === "object" ? value as Row : {}; }
export function canUseNse(symbol: string) { return !symbol.startsWith("^") && !symbol.endsWith(".BO"); }
export function parseNseQuote(payload: unknown, symbol: string): Quote {
  const clean = symbol.replace(/\.NS$/, "");
  const rows = record(payload).equityResponse;
  const row = Array.isArray(rows) ? rows.find(value => {
    const meta = record(record(value).metaData);
    return meta.symbol === clean && meta.series === "EQ";
  }) : undefined;
  const value = record(row), meta = record(value.metaData), book = record(value.orderBook);
  const price = numeric(book.lastPrice);
  if (!row || price === null || price <= 0) throw new UpstreamError("NSE", "invalid_response");
  const stamp = typeof value.lastUpdateTime === "string" ? Date.parse(value.lastUpdateTime + " GMT+0530") : NaN;
  return { symbol: clean, name: typeof meta.companyName === "string" ? meta.companyName : clean,
    price, change: numeric(meta.change), changePercent: numeric(meta.pChange), currency: "INR",
    asOf: Number.isFinite(stamp) ? new Date(stamp).toISOString() : null, source: "NSE" };
}
export async function nseQuote(symbol: string): Promise<Quote> {
  if (!canUseNse(symbol)) throw new UpstreamError("NSE", "invalid_response");
  const clean = symbol.replace(/\.NS$/, "");
  return cached("nseQuote:" + clean, async () => parseNseQuote(await upstreamJson("NSE",
    base + "/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=" + encodeURIComponent(clean), { headers }), clean));
}
export function parseNseSearch(payload: unknown) {
  const rows = record(payload).data;
  if (!Array.isArray(rows)) throw new UpstreamError("NSE", "invalid_response");
  const seen = new Set<string>();
  return rows.flatMap(value => {
    const row = record(value);
    if (row.series !== "EQ" || typeof row.symbol !== "string" || typeof row.companyName !== "string" || seen.has(row.symbol)) return [];
    seen.add(row.symbol);
    return [{ symbol: row.symbol, name: row.companyName, exchange: "NSE" }];
  }).slice(0, 10);
}
export async function nseSearch(query: string) {
  return cached("nseSearch:" + query, async () => parseNseSearch(await upstreamJson("NSE",
    base + "/api/NextApi/globalSearch/equity?symbol=" + encodeURIComponent(query), { headers })), 3600000);
}
