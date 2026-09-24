"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, BarChart3, BookOpen, Check, Download, FileText, RefreshCw, Star } from "lucide-react";
import { scorePoints, scoreRules } from "@/lib/analytics";
import type { Metric, Stock, WatchItem } from "@/lib/types";
import { Chart, Change, metricValue, money, number, Notice, request } from "./ui";

type Props = { stock: Stock; preview: boolean; watchlist: WatchItem[]; group: string; onGroup: (value: string) => void; onAdd: () => void; onAnalyze: (symbol: string) => void; onFilings: () => void; canSave: boolean; canExport: boolean };
type Holdings = { current: { period: string; FII: number | null; DII: number | null; HNI: number | null; promoterHolding: number | null; promoterPledge: number | null }; sourceUrl: string };

const rules: Record<string, string> = {
  revenueGrowth: ">25% = 10pts, >15% = 7pts, >10% = 4pts",
  patGrowth: ">25% = 10pts, >15% = 7pts, >10% = 4pts",
  epsGrowth: ">20% = 8pts, >10% = 5pts",
  roe: ">20% = 8pts, >15% = 5pts",
  roce: ">20% = 7pts, >15% = 4pts",
  opm: ">15% = 6pts, >10% = 3pts",
  npm: ">10% = 4pts, >5% = 2pts",
  de: "<0.5x = 8pts, <1x = 5pts",
  interestCoverage: ">5x = 6pts, >3x = 3pts",
  currentRatio: ">1.5x = 6pts, >1x = 3pts",
  fcf: "Positive FCF = 6pts",
  ocfPat: ">0.8x = 4pts, >0.5x = 2pts",
  promoterHolding: ">50% = 6pts, >35% = 3pts"
};

const formulas: Record<string, string> = {
  pe: "CMP / EPS",
  pb: "CMP / book value per share",
  yield: "Dividend / CMP x 100",
  roe: "PAT / shareholders' equity x 100",
  roce: "ROE x 0.88 approximation",
  de: "Total debt / shareholders' equity",
  interestCoverage: "EBIT / interest expense",
  opm: "Operating profit / revenue x 100",
  npm: "Net profit / revenue x 100",
  revenueGrowth: "((Latest revenue / oldest revenue)^(1 / years) - 1) x 100",
  patGrowth: "((Latest PAT / oldest PAT)^(1 / years) - 1) x 100",
  epsGrowth: "((Latest EPS / oldest EPS)^(1 / years) - 1) x 100",
  earningsGrowth: "Provider earnings growth or annual PAT growth",
  fcf: "Operating cash flow - capex",
  ocfPat: "Operating cash flow / PAT",
  marketCap: "CMP x shares outstanding",
  currentRatio: "Current assets / current liabilities",
  quickRatio: "(Current assets - inventory) / current liabilities",
  graham: "sqrt(22.5 x EPS x book value)",
  intrinsicValue: "EPS x (8.5 + 2 x growth) x 6 / 8",
  marginSafety: "(Intrinsic value - CMP) / intrinsic value x 100",
  eps: "Net profit / outstanding shares",
  bookValue: "Shareholders' equity / outstanding shares",
  revenue: "Total operating revenue",
  netIncome: "PAT attributable to common shareholders",
  totalDebt: "Short-term debt + long-term debt",
  totalCash: "Cash and cash equivalents",
  operatingCashFlow: "Cash flow from operations",
  fcfYield: "Free cash flow / market cap x 100",
  promoterHolding: "Promoter shares / total shares x 100",
  promoterPledge: "Pledged promoter shares / promoter holding x 100"
};

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="analyser-section"><div className="analyser-section-title"><h2>{title}</h2>{note && <span>{note}</span>}</div>{children}</section>;
}

function MetricCard({ metric }: { metric: Metric }) {
  const points = scorePoints(metric);
  const state = metric.value === null ? "missing" : points !== null ? points > 0 ? "pass" : "review" : metric.good === true ? "pass" : metric.good === false ? "review" : "context";
  return <div className={`analyser-metric ${state}`}><span>{metric.label}</span><strong>{metricValue(metric)}</strong>{formulas[metric.key] && <em>{formulas[metric.key]}</em>}<small>{metric.value === null ? "Provider did not supply this value" : points !== null ? `${points} pts in PDF score` : metric.good === true ? "Meets checklist" : metric.good === false ? "Needs review" : metric.period ? new Date(metric.period).toLocaleDateString("en-IN") : "For context"}</small></div>;
}

export function StockAnalysis({ stock, preview, watchlist, group, onGroup, onAdd, onAnalyze, onFilings, canSave, canExport }: Props) {
  const [tab, setTab] = useState<"insights" | "data">("insights");
  const [holdings, setHoldings] = useState<Holdings | null>(null), [holdingState, setHoldingState] = useState(""), [retry, setRetry] = useState(0);

  useEffect(() => {
    setHoldings(null);
    if (preview) { setHoldingState("Shareholding is not included in this illustrative sample."); return; }
    if (stock.symbol.endsWith(".BO")) { setHoldingState("BSE shareholding is not available from the connected NSE feed."); return; }
    const controller = new AbortController();
    setHoldingState("Loading quarterly NSE filings...");
    request<Holdings>("/api/stakes?symbol=" + encodeURIComponent(stock.symbol.replace(/\.NS$/, "")), { signal: controller.signal }).then(data => { setHoldings(data); setHoldingState(""); }).catch(() => { if (!controller.signal.aborted) setHoldingState("Shareholding filings could not be loaded. Try again or check exchange filings."); });
    return () => controller.abort();
  }, [stock.symbol, preview, retry]);

  const find = (key: string) => stock.metrics.find(m => m.key === key);
  const value = (key: string) => find(key)?.value ?? null;
  const metrics = (keys: string[]) => keys.map(key => find(key)).filter((m): m is Metric => Boolean(m));
  const symbol = stock.symbol.replace(/\.(NS|BO)$/, "");
  const exchange = stock.symbol.endsWith(".BO") ? "https://www.bseindia.com/" : "https://www.nseindia.com/get-quotes/equity?symbol=" + encodeURIComponent(symbol);
  const graham = value("graham");
  const intrinsic = value("intrinsicValue");
  const marginSafety = value("marginSafety");
  const fcfYield = value("fcfYield");
  const eps = value("eps");
  const earningsGrowth = value("earningsGrowth");
  const dividendYield = value("yield") ?? 0;
  const lynch = eps !== null && earningsGrowth !== null && earningsGrowth > 0 ? eps * (earningsGrowth + Math.max(0, dividendYield)) : null;

  return <div className="stock-analyser-report">
    <section className="analyser-company">
      <div><span className="eyebrow">{stock.symbol} &middot; {stock.sector}</span><h2>{stock.name}</h2><p>{stock.industry}</p><div className="quote-line"><strong>{money(stock.price)}</strong><Change value={stock.changePercent} /></div><small>Quote as of {stock.asOf ? new Date(stock.asOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "unavailable"}</small></div>
      <div className="analyser-score"><span>PDF WEIGHTED SCORE</span><strong>{stock.score ?? "-"}<small>/100</small></strong><span>{stock.coverage} factors available</span></div>
    </section>

    <div className="analyser-save"><label>Watchlist group<input value={group} onChange={e => onGroup(e.target.value)} maxLength={50} /></label><button className="button primary" disabled={!canSave} onClick={onAdd}><Star size={15} />{watchlist.some(i => i.symbol === stock.symbol) ? "Update watchlist" : "Add to watchlist"}</button><button className="button secondary" disabled={!canExport} onClick={() => window.print()}><Download size={15} />Print / save PDF</button></div>
    <details open className="analyser-overview"><summary><BookOpen size={16} /> Company overview - what this business does</summary><p>{stock.description || "Company description is not available."}</p></details>
    <div className="analyser-links"><a href={"https://www.tradingview.com/chart/?symbol=" + encodeURIComponent((stock.symbol.endsWith(".BO") ? "BSE:" : "NSE:") + symbol)} target="_blank" rel="noreferrer">TradingView <ArrowUpRight size={14} /></a><a href={exchange} target="_blank" rel="noreferrer">Exchange filings <ArrowUpRight size={14} /></a><button onClick={onFilings}><FileText size={14} />Reviewed company filings</button></div>

    <Section title="PDF score factors" note="All 13 calculations from the guide"><div className="analyser-metrics">{metrics(["revenueGrowth", "patGrowth", "epsGrowth", "roe", "roce", "opm", "npm", "de", "interestCoverage", "currentRatio", "fcf", "ocfPat", "promoterHolding"]).map(m => <MetricCard key={m.key} metric={m} />)}</div></Section>
    <Section title="Key metrics" note={preview ? "Illustrative sample" : "Source: Yahoo Finance + exchange filings"}><div className="analyser-metrics">{metrics(["pe", "pb", "eps", "bookValue", "yield", "roe", "roce", "de", "interestCoverage", "opm", "npm"]).map(m => <MetricCard key={m.key} metric={m} />)}</div></Section>
    <Section title="Business metrics" note="Score growth figures use CAGR from annual fundamentals"><div className="analyser-metrics">{metrics(["marketCap", "revenue", "netIncome", "revenueGrowth", "patGrowth", "epsGrowth", "earningsGrowth", "fcf", "ocfPat", "fcfYield"]).map(m => <MetricCard key={m.key} metric={m} />)}</div></Section>

    <Section title="Shareholding pattern" note={holdings ? "NSE filings - " + holdings.current.period : "Quarterly exchange filings"}>
      {holdingState && <div className="analyser-data-note" role="status">{holdingState}{!preview && !stock.symbol.endsWith(".BO") && <button className="text-button" onClick={() => setRetry(n => n + 1)}><RefreshCw size={14} />Retry</button>}</div>}
      <div className="analyser-metrics">{(["FII", "DII", "HNI"] as const).map(key => <div className="analyser-metric context" key={key}><span>{key === "FII" ? "Foreign portfolio investors" : key === "DII" ? "Domestic institutions" : "HNI individuals"}</span><strong>{holdings?.current[key] != null ? number(holdings.current[key]) + "%" : "Not available"}</strong><small>{holdings ? "Reported holding" : "Not supplied"}</small></div>)}{metrics(["promoterHolding", "promoterPledge"]).map(m => <MetricCard key={m.key} metric={m} />)}</div>
      {holdings && <a className="analyser-source" href={holdings.sourceUrl} target="_blank" rel="noreferrer">View source filing <ArrowUpRight size={14} /></a>}
    </Section>

    <Section title="Valuation" note="Model context, not a price target">
      <div className="analyser-valuations">
        <article className={intrinsic !== null && stock.price !== null && intrinsic > stock.price ? "gain" : "context"}><span>INTRINSIC VALUE</span><strong>{money(intrinsic)}</strong><em>{formulas.intrinsicValue}</em><p>Benjamin Graham-style estimate from the PDF, using EPS and the highest available growth input with the 6/8 yield adjustment.</p><small>{marginSafety !== null ? "MOS: " + number(marginSafety, 1) + "%" : "Requires EPS, growth and CMP"}</small></article>
        <article className={fcfYield !== null && fcfYield >= 0 ? "gain" : fcfYield !== null ? "loss" : "context"}><span>FREE CASH FLOW YIELD</span><strong>{fcfYield !== null ? number(fcfYield, 1) + "%" : "Not available"}</strong><em>{formulas.fcfYield}</em><p>Free cash flow divided by market value. Higher positive yield can indicate better cash-flow support.</p><small>{fcfYield !== null ? "Derived from provider fundamentals" : "Requires free cash flow and market cap"}</small></article>
        <article><span>GRAHAM NUMBER</span><strong>{money(graham)}</strong><em>{formulas.graham}</em><p>Conservative valuation method using EPS and book value per share.</p><small>{graham !== null && graham > 0 && stock.price !== null ? "Market price / Graham: " + number(stock.price / graham) + "x" : "Requires positive EPS and book value"}</small></article>
        <article className={lynch !== null && stock.price !== null && lynch > stock.price ? "gain" : "context"}><span>PETER LYNCH LENS</span><strong>{money(lynch)}</strong><em>EPS x (growth + dividend yield)</em><p>EPS multiplied by available growth plus dividend yield. Treat it as a rough lens, not a forecast.</p><small>{lynch !== null ? "Rough growth lens" : "Requires positive EPS and growth"}</small></article>
      </div>
      <div className="analyser-metrics">{metrics(["currentRatio", "quickRatio", "totalDebt", "totalCash", "operatingCashFlow", "fcf", "intrinsicValue", "marginSafety"]).map(m => <MetricCard key={m.key} metric={m} />)}</div>
    </Section>

    <div className="analyser-tabs" role="tablist" aria-label="Research detail"><button id="insight-tab" role="tab" aria-controls="insight-panel" aria-selected={tab === "insights"} onClick={() => setTab("insights")}><Check size={15} />Research insights</button><button id="data-tab" role="tab" aria-controls="data-panel" aria-selected={tab === "data"} onClick={() => setTab("data")}><BarChart3 size={15} />Financial data & sources</button></div>
    {tab === "insights" ? <div id="insight-panel" role="tabpanel" aria-labelledby="insight-tab" className="analyser-insights"><article className="analyser-insight summary"><h3>Research summary</h3><p>{stock.score === null ? "Too few PDF score inputs are available to calculate a score." : "PDF weighted score: " + stock.score + "/100."} {stock.coverage} of {scoreRules.length} score factors were available. These generic thresholds need sector and company context.</p></article>{stock.metrics.filter(m => rules[m.key]).map(m => { const points = scorePoints(m); return <article key={m.key} className={"analyser-insight " + (m.value === null ? "summary" : points && points > 0 ? "pass" : "review")}><h3>{m.label} - {m.value === null ? "Data unavailable" : `${points ?? 0} points`}</h3><p>{metricValue(m)}. Formula: {formulas[m.key] || "Provider supplied value"}. Score rule: {rules[m.key]}. {m.value === null ? "Excluded from the score." : m.period ? "Period: " + new Date(m.period).toLocaleDateString("en-IN") + "." : "Verify the reporting period with company filings."}</p></article>; })}</div> : <section id="data-panel" role="tabpanel" aria-labelledby="data-tab" className="panel"><h2>Reported financial data</h2><p className="small muted">Provider snapshot. Annual fallback values use Yahoo fundamentals time series when the quote summary is incomplete. Open reviewed company filings for your saved reporting periods.</p><button className="button secondary" onClick={onFilings}><FileText size={16} />Open reviewed filings</button><div className="table-wrap"><table><thead><tr><th>Metric</th><th>Value</th><th>Formula</th><th>Period</th><th>Source</th></tr></thead><tbody>{stock.metrics.map(m => <tr key={m.key}><td>{m.label}</td><td>{metricValue(m)}</td><td><small>{formulas[m.key] || "-"}</small></td><td>{m.period ? new Date(m.period).toLocaleDateString("en-IN") : "Not supplied"}</td><td>{m.source}</td></tr>)}</tbody></table></div></section>}

    <Section title="Price history" note="Daily closes - up to two years"><Chart history={stock.history} /></Section>
    <Section title="Your research watchlist" note="Select a company to analyse"><p className="analyser-data-note">Continue researching your saved companies. This list is not a set of stock recommendations.</p>{watchlist.length ? <div className="table-wrap"><table><thead><tr><th>Company</th><th>Symbol</th><th>Group</th><th>Research</th></tr></thead><tbody>{watchlist.map(item => <tr key={item.symbol}><td>{item.name}</td><td>{item.symbol}</td><td>{item.group}</td><td><button className="text-button" onClick={() => onAnalyze(item.symbol)}>Analyse <ArrowUpRight size={14} /></button></td></tr>)}</tbody></table></div> : <p className="analyser-data-note">Add companies to your watchlist to compare research ideas here.</p>}</Section>
    <details className="analyser-method"><summary>Scoring method and data limitations</summary><p>The score uses the weighted point ladder from the SRT user guide. Missing factors are excluded from calculation but also earn no points; at least three PDF score factors are required. Thresholds may not suit every sector. The score is not a buy, hold, or sell recommendation.</p><p>Fetched {new Date(stock.fetchedAt).toLocaleString("en-IN")}. Provider metrics may cover different periods.</p></details>{stock.warnings.map(w => <Notice key={w}>{w}</Notice>)}
  </div>;
}
