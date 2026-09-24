import { cached, history, quotes } from "./market";
import { numeric, parseCsv, quarterReturns } from "./data-utils";
import type { Quote } from "./types";
import YahooFinance from "yahoo-finance2";

export const nseBase = "https://www.nseindia.com";

type Row = Record<string, unknown>;

export async function nseJson<T = Record<string, unknown>>(path: string): Promise<T> {
  return cached("nse:" + path, async () => {
    const r = await fetch(nseBase + path, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("NSE feed unavailable");
    return r.json() as Promise<T>;
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
  ["NIFTY PHARMA", ["^CNXPHARMA", "PHARMABEES.NS"]],
  ["NIFTY IT", ["^CNXIT", "ITBEES.NS"]],
  ["NIFTY METAL", ["^CNXMETAL", "METALBEES.NS"]],
  ["NIFTY REALTY", ["^CNXREALTY"]],
  ["NIFTY AUTO", ["^CNXAUTO", "AUTOBEES.NS"]],
  ["NIFTY BANK", ["^NSEBANK", "BANKBEES.NS"]],
  ["NIFTY PSU BANK", ["^CNXPSUBANK", "PSUBANKBEES.NS"]],
  ["NIFTY FIN SERVICE", ["NIFTY_FIN_SERVICE.NS", "^CNXFINANCE"]],
  ["NIFTY ENERGY", ["^CNXENERGY"]],
  ["NIFTY FMCG", ["^CNXFMCG"]]
] as const;

const sectorBaskets: Record<(typeof sectors)[number][0], string[]> = {
  "NIFTY PHARMA": ["SUNPHARMA", "CIPLA", "DRREDDY", "DIVISLAB", "LUPIN"],
  "NIFTY IT": ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM"],
  "NIFTY METAL": ["TATASTEEL", "JSWSTEEL", "HINDALCO", "JINDALSTEL", "VEDL"],
  "NIFTY REALTY": ["DLF", "LODHA", "GODREJPROP", "OBEROIRLTY", "PHOENIXLTD"],
  "NIFTY AUTO": ["MARUTI", "TATAMOTORS", "M&M", "EICHERMOT", "HEROMOTOCO"],
  "NIFTY BANK": ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK"],
  "NIFTY PSU BANK": ["SBIN", "BANKBARODA", "PNB", "CANBK", "UNIONBANK"],
  "NIFTY FIN SERVICE": ["BAJFINANCE", "BAJAJFINSV", "SBILIFE", "HDFCLIFE", "CHOLAFIN"],
  "NIFTY ENERGY": ["RELIANCE", "ONGC", "NTPC", "POWERGRID", "COALINDIA"],
  "NIFTY FMCG": ["ITC", "HINDUNILVR", "NESTLEIND", "BRITANNIA", "DABUR"]
};

function averageReturns(rows: ReturnType<typeof quarterReturns>[]) {
  const quarters = rows[0]?.map(r => r.quarter) || quarterReturns([]).map(r => r.quarter);
  return quarters.map((quarter, i) => {
    const values = rows.map(r => r[i]?.value).filter((v): v is number => v !== null && v !== undefined);
    return { quarter, value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
  });
}

async function basketReturns(name: (typeof sectors)[number][0]) {
  const settled = await Promise.allSettled(sectorBaskets[name].map(async symbol => quarterReturns(await history(symbol), new Date(), true)));
  const rows = settled.flatMap(result => result.status === "fulfilled" && result.value.some(r => r.value !== null) ? [result.value] : []);
  return rows.length ? averageReturns(rows) : null;
}

export async function rotation() {
  return cached("sector:rotation:v3", async () => {
    const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    const start = new Date();
    start.setFullYear(start.getFullYear() - 3);
    const rows = [];
    for (let i = 0; i < sectors.length; i += 3) {
      rows.push(...await Promise.all(sectors.slice(i, i + 3).map(async ([name, symbols]) => {
        for (const symbol of symbols) {
          try {
            const data = await yahoo.chart(symbol, { period1: start, interval: "1mo" });
            const returns = quarterReturns(data.quotes.filter(q => q.close !== null).map(q => ({ date: q.date.toISOString(), close: q.close! })), new Date(), true);
            if (returns.some(r => r.value !== null)) return { name, returns, error: symbols[0] === symbol ? "" : "Proxy history: " + symbol };
          } catch {}
        }
        const basket = await basketReturns(name);
        if (basket) return { name, returns: basket, error: "Representative basket" };
        return { name, returns: quarterReturns([]), error: "Price history unavailable" };
      })));
    }
    return { rows, source: "Yahoo Finance sector index history with representative basket fallback - completed calendar quarters", fetchedAt: new Date().toISOString() };
  }, 3600000);
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
