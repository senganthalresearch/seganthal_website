import { cached, quotes } from "./market";
import { upstreamJson } from "./upstream";
import { numeric, parseCsv, quarterReturns } from "./data-utils";
import type { Quote } from "./types";

export const nseBase = "https://www.nseindia.com";

type Row = Record<string, unknown>;

export async function nseJson<T = Record<string, unknown>>(path: string): Promise<T> {
  return cached("nse:" + path, async () => {
    return upstreamJson<T>("NSE", nseBase + path, {
      headers: { Accept: "application/json,text/plain,*/*", "User-Agent": "Mozilla/5.0", Referer: "https://www.nseindia.com/" }
    });
  }, 60000);
}

export function nseTime(value: unknown) {
  const s = String(value || "");
  if (!s) return null;
  const d = new Date(/\d{2}:\d{2}/.test(s) ? s + " GMT+0530" : s + " 15:30 GMT+0530");
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export function rankings(rows: Quote[]) {
  const valid = rows.filter(r => r.changePercent !== null);
  return {
    gainers: [...valid].filter(r => r.changePercent! > 0).sort((a, b) => b.changePercent! - a.changePercent!).slice(0, 10),
    losers: [...valid].filter(r => r.changePercent! < 0).sort((a, b) => a.changePercent! - b.changePercent!).slice(0, 10),
    coverage: rows.length,
    asOf: rows.find(r => r.asOf)?.asOf || null
  };
}

export async function indexConstituents(index = "NIFTY TOTAL MKT") {
  const response = await nseJson<{ data: { data?: Row[] } }>("/api/NextApi/apiClient/marketWatchApi?functionName=getIndicesData&symbol=" + encodeURIComponent(index));
  const rows = response.data?.data;
  if (!Array.isArray(rows) || !rows.length) throw new Error("Index constituents unavailable");
  return rows.filter(r => r.priority !== 1 && r.series === "EQ").map(r => ({ symbol: String(r.symbol), name: String(r.companyName || r.symbol), price: numeric(r.lastPrice), change: numeric(r.change), changePercent: numeric(r.pChange), asOf: nseTime(r.lastUpdateTime), currency: "INR" }));
}

const snapshotIndices = [
  { name: "NIFTY 50", yahoo: ["^NSEI", "NIFTYBEES.NS"], aliases: ["NIFTY 50"] },
  { name: "SENSEX", yahoo: ["^BSESN", "SENSEXETF.BO"], aliases: ["SENSEX", "S&P BSE SENSEX"] },
  { name: "NIFTY BANK", yahoo: ["^NSEBANK", "BANKBEES.NS"], aliases: ["NIFTY BANK", "NIFTY BANK INDEX"] },
  { name: "NIFTY IT", yahoo: ["^CNXIT", "ITBEES.NS"], aliases: ["NIFTY IT"] },
  { name: "NIFTY AUTO", yahoo: ["^CNXAUTO", "AUTOBEES.NS"], aliases: ["NIFTY AUTO"] },
  { name: "NIFTY PHARMA", yahoo: ["^CNXPHARMA", "PHARMABEES.NS"], aliases: ["NIFTY PHARMA", "NIFTY HEALTHCARE INDEX"] },
  { name: "NIFTY FMCG", yahoo: ["^CNXFMCG", "HNGSNGBEES.NS"], aliases: ["NIFTY FMCG"] },
  { name: "NIFTY METAL", yahoo: ["^CNXMETAL", "METALBEES.NS"], aliases: ["NIFTY METAL"] },
  { name: "NIFTY NEXT 50", yahoo: ["^NSMIDCP", "JUNIORBEES.NS"], aliases: ["NIFTY NEXT 50"] },
  { name: "NIFTY 100", yahoo: ["^CNX100", "SETFNIF100.NS"], aliases: ["NIFTY 100"] },
  { name: "NIFTY MIDCAP 100", yahoo: ["MIDCAPETF.NS", "MOM100.NS"], aliases: ["NIFTY MIDCAP 100", "NIFTY MIDCAP100"] },
  { name: "NIFTY SMALLCAP 100", yahoo: ["SETFSMALL.NS", "SMALLCAP.NS"], aliases: ["NIFTY SMALLCAP 100", "NIFTY SMLCAP 100", "NIFTY SMALLCAP100"] }
] as const;

async function snapshotFallback(symbols: readonly string[]) {
  for (const symbol of symbols) {
    try {
      const quote = (await quotes([symbol]))[0];
      if (quote?.price !== null) return quote;
    } catch {}
  }
  return null;
}

export async function snapshot(): Promise<{ quotes: Quote[]; source: string; fetchedAt: string }> {
  const [nse, fallbacks] = await Promise.allSettled([
    nseJson<{ data: Row[] }>("/api/NextApi/apiClient?functionName=getIndexData&type=All"),
    Promise.allSettled(snapshotIndices.map(index => snapshotFallback(index.yahoo)))
  ]);
  const rows = snapshotIndices.map((index, i) => {
    const sourceRows = nse.status === "fulfilled" && Array.isArray(nse.value.data) ? nse.value.data : [];
    const r = sourceRows.find(row => index.aliases.some(alias => String(row.indexName || "").trim().toUpperCase() === alias.toUpperCase()));
    const fallback = fallbacks.status === "fulfilled" && fallbacks.value[i].status === "fulfilled" ? fallbacks.value[i].value : null;
    const price = numeric(r?.last) ?? fallback?.price ?? null, prev = numeric(r?.previousClose);
    return { symbol: index.name, name: index.name, price, change: price !== null && prev !== null ? price - prev : fallback?.change ?? null, changePercent: numeric(r?.percChange) ?? fallback?.changePercent ?? null, asOf: nseTime(r?.timeVal) ?? fallback?.asOf ?? null, currency: "INR" };
  });
  return { quotes: rows, source: "NSE indices with Yahoo Finance index / ETF fallback", fetchedAt: new Date().toISOString() };
}

export async function flows() {
  const rows = await nseJson<Row[]>("/api/fiidiiTradeReact");
  if (!Array.isArray(rows)) throw new Error("Institutional activity unavailable");
  return { rows: rows.map(r => ({ date: String(r.date), category: String(r.category), buy: numeric(r.buyValue), sell: numeric(r.sellValue), net: numeric(r.netValue) })), source: "NSE - INR crore", fetchedAt: new Date().toISOString() };
}

export async function deals() {
  const r = await nseJson<{ BULK_DEALS_DATA: Row[]; BLOCK_DEALS_DATA: Row[] }>("/api/snapshot-capital-market-largedeal");
  const map = (rows: Row[]) => rows.map(r => ({ symbol: String(r.symbol), client: String(r.clientName), side: String(r.buySell), quantity: numeric(r.qty), price: numeric(r.watp), date: String(r.date) }));
  if (!Array.isArray(r.BULK_DEALS_DATA) || !Array.isArray(r.BLOCK_DEALS_DATA)) throw new Error("Deals unavailable");
  return { bulk: map(r.BULK_DEALS_DATA), block: map(r.BLOCK_DEALS_DATA), source: "NSE published bulk / block deals", fetchedAt: new Date().toISOString() };
}

export async function endOfDay() {
  return cached("nse:eod", async () => {
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    for (let back = 0; back < 7; back++) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const stamp = String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + d.getFullYear();
      const url = `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${stamp}.csv`;
      const r = await fetch(url, { signal: AbortSignal.timeout(6500) });
      if (r.status === 404) continue;
      if (!r.ok) throw new Error("Daily report unavailable");
      const csv = await r.text();
      if (!csv.startsWith("SYMBOL,")) throw new Error("Invalid daily report");
      const all = parseCsv(csv).filter(r => r.SERIES === "EQ");
      const rows: Quote[] = all.map(r => {
        const price = numeric(r.CLOSE_PRICE), prev = numeric(r.PREV_CLOSE);
        return { symbol: r.SYMBOL, name: r.SYMBOL, price, change: price !== null && prev !== null ? price - prev : null, changePercent: price !== null && prev !== null && prev > 0 ? (price / prev - 1) * 100 : null, asOf: nseTime(r.DATE1), currency: "INR" };
      });
      return { ...rankings(rows), source: "NSE daily security report - EQ series", sourceUrl: url, reportDate: all[0]?.DATE1 };
    }
    throw new Error("No daily report published in the past week");
  }, 3600000);
}

export async function migrations(days = 180, all = false) {
  const from = new Date();
  from.setDate(from.getDate() - (all ? 365 * 8 : days));
  const date = (d: Date) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const r = await nseJson<{ data: Row[] }>("/api/circulars?fromDate=" + date(from) + "&toDate=" + date(new Date()));
  if (!Array.isArray(r.data)) throw new Error("Circular feed unavailable");
  return {
    rows: r.data.filter(r => {
      const subject = String(r.sub || ""), stamp = String(r.cirDate || "");
      const time = Date.parse(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T00:00:00Z`);
      return /migrat/i.test(subject) && /main\s*board|SME|emerge/i.test(subject) && !/procedure|guideline|criteria|framework/i.test(subject) && time >= from.getTime();
    }).map(r => {
      const rawLink = String(r.circFilelink || "").trim();
      const url = rawLink.startsWith("http") ? rawLink : (rawLink ? `https://nsearchives.nseindia.com/${rawLink.replace(/^\/+/, "")}` : "");
      return { date: String(r.cirDisplayDate), subject: String(r.sub), reference: String(r.circDisplayNo || "NSE Circular"), url };
    }),
    source: "NSE migration-related listing circulars",
    fetchedAt: new Date().toISOString()
  };
}

export const sectors = [
  "NIFTY IT",
  "NIFTY AUTO",
  "NIFTY PHARMA",
  "NIFTY FMCG",
  "NIFTY METAL",
  "NIFTY BANK",
  "NIFTY PSU BANK",
  "NIFTY FINANCIAL SERVICES",
  "NIFTY REALTY",
  "NIFTY ENERGY",
  "NIFTY MEDIA"
] as const;

function dateParam(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function nseDate(value: unknown) {
  const text = String(value || "").trim();
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text);
  if (match) {
    const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(match[2].toUpperCase());
    if (month >= 0) return new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString();
  }
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

async function historicalIndexRows(index: string) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 760);
  const rows: Row[] = [];
  for (let start = new Date(from); start <= to; start.setDate(start.getDate() + 120)) {
    const end = new Date(start);
    end.setDate(end.getDate() + 119);
    if (end > to) end.setTime(to.getTime());
    try {
      const response = await nseJson<{ data: Row[] }>("/api/historicalOR/indicesHistory?indexType=" + encodeURIComponent(index) + "&from=" + dateParam(start) + "&to=" + dateParam(end));
      if (Array.isArray(response.data)) rows.push(...response.data);
    } catch {}
  }
  const seen = new Set<string>();
  return rows.flatMap(row => {
    const date = nseDate(row.EOD_TIMESTAMP ?? row.HI_TIMESTAMP);
    const close = numeric(row.EOD_CLOSE_INDEX_VAL);
    if (!date || close === null || close <= 0 || seen.has(date.slice(0, 10))) return [];
    seen.add(date.slice(0, 10));
    return [{ date, close }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export async function rotation() {
  return cached("sector:rotation:nse:v1", async () => {
    const rows = await Promise.all(sectors.map(async name => {
      const history = await historicalIndexRows(name);
      const returns = quarterReturns(history, new Date(), true);
      return { name, returns, error: history.length < 40 ? `NSE returned ${history.length} usable daily rows` : "" };
    }));
    rows.sort((a, b) => (b.returns.at(-1)?.value ?? -999) - (a.returns.at(-1)?.value ?? -999));
    return { rows, source: "NSE historicalOR/indicesHistory sector index closes - quarterly returns", fetchedAt: new Date().toISOString() };
  }, 21600000);
}

export type Holding = { FII: number | null; DII: number | null; HNI: number | null; promoterHolding: number | null; promoterPledge: number | null };

export function parseHoldings(rows: Row[], promoterHolding: number | null = null, promoterPledge: number | null = null): Holding {
  let domestic = false, dii: number | null = null;
  const fpi: number[] = [], hni: number[] = [];
  for (const r of rows) {
    const label = String(r.COL_I || "").replace(/\s+/g, " ").trim();
    const val = numeric(r.COL_VIII);
    if (/Institutions \(Domestic\)/i.test(label)) domestic = true;
    else if (/Institutions \(Foreign\)|Non-institutions/i.test(label)) domestic = false;
    if (domestic && /Sub-Total/i.test(label)) dii = val;
    if (/Foreign Portfolio Investors?\s*(?:Category|\()/i.test(label) && val !== null) fpi.push(val);
    if (/individuals.*(?:in excess|above).*2\s*lakhs/i.test(label) && val !== null) hni.push(val);
  }
  const sum = (n: number[]) => n.length ? Math.round(n.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  return { FII: sum(fpi), DII: dii, HNI: sum(hni), promoterHolding, promoterPledge };
}

export async function stake(symbol: string) {
  return cached("stake:" + symbol, async () => {
    const reports = await nseJson<Row[]>("/api/corporate-share-holdings-master?index=equities&symbol=" + encodeURIComponent(symbol));
    if (!Array.isArray(reports)) throw new Error("Shareholding filings unavailable");
    const quarterEnds = (date: string) => {
      const d = new Date(date);
      return Number.isFinite(d.getTime()) && [2, 5, 8, 11].includes(d.getMonth()) && d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    };
    const ordered = [...reports].filter(r => quarterEnds(String(r.date))).sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)) || Date.parse(String(b.broadcastDate)) - Date.parse(String(a.broadcastDate)));
    const unique = ordered.filter((r, i) => ordered.findIndex(x => x.date === r.date) === i).slice(0, 2);
    if (!unique.length) throw new Error("No quarterly shareholding filings");
    const values = await Promise.all(unique.map(async r => {
      const rows = await nseJson<Row[]>("/api/corporate-share-holdings-equities?ndsId=" + encodeURIComponent(String(r.recordId)) + "&index=public-shareholder");
      if (!Array.isArray(rows)) throw new Error("Shareholding detail unavailable");
      let promoterPledge: number | null = null;
      try {
        const promoterRows = await nseJson<Row[]>("/api/corporate-share-holdings-equities?ndsId=" + encodeURIComponent(String(r.recordId)) + "&index=promoter");
        const total = Array.isArray(promoterRows) ? promoterRows.find(row => /Total Shareholding of Promoter/i.test(String(row.COL_I || ""))) : undefined;
        promoterPledge = numeric(total?.COL_XII_A) ?? numeric(total?.COL_XIII_A);
      } catch {}
      return { period: String(r.date), ...parseHoldings(rows, numeric(r.pr_and_prgrp), promoterPledge) };
    }));
    const current = values[0], previous = values[1] || null;
    return { symbol, current, previous, sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=" + encodeURIComponent(symbol), fetchedAt: new Date().toISOString() };
  }, 86400000);
}
