"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, BarChart3, BookOpen, Check, Download, FileText, RefreshCw, Star, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { scorePoints, scoreRules } from "@/lib/analytics";
import type { Metric, Stock, WatchItem, FinancialStatementRow } from "@/lib/types";
import { Change, metricValue, money, number, Notice, request } from "./ui";

type Props = { stock: Stock; preview: boolean; watchlist: WatchItem[]; group: string; onGroup: (value: string) => void; onAdd: () => void; onAnalyze: (symbol: string) => void; onFilings: () => void; canSave: boolean; canExport: boolean };
type Holdings = { current: { period: string; FII: number | null; DII: number | null; HNI: number | null; promoterHolding: number | null; promoterPledge: number | null }; sourceUrl: string };

const idealRanges: Record<string, string> = {
  revenueGrowth: "> 15% (3-5Y CAGR)",
  patGrowth: "> 15% (3-5Y CAGR)",
  epsGrowth: "> 10% - 20% (3-5Y CAGR)",
  roe: "> 15% (Ideal > 20%)",
  roce: "> 15% (Ideal > 20%)",
  opm: "> 15% (Core pricing power)",
  npm: "> 10% (Bottom line conversion)",
  de: "< 1.0x (Ideal < 0.5x)",
  interestCoverage: "> 3.0x (Solvency buffer)",
  currentRatio: "1.5x - 2.5x (Working capital)",
  fcf: "> 0 (Organic cash generation)",
  ocfPat: "> 0.8x (Cash conversion)",
  promoterHolding: "> 35% (Promoter skin in game)"
};

const maxPoints: Record<string, number> = {
  revenueGrowth: 10,
  patGrowth: 10,
  epsGrowth: 8,
  roe: 8,
  roce: 7,
  opm: 6,
  npm: 4,
  de: 8,
  interestCoverage: 6,
  currentRatio: 6,
  fcf: 6,
  ocfPat: 4,
  promoterHolding: 6
};

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

function MetricCard({ metric, scoreContext = false }: { metric: Metric; scoreContext?: boolean }) {
  const points = scorePoints(metric);
  const state = metric.value === null ? "missing" : scoreContext && points !== null ? points > 0 ? "pass" : "review" : metric.good === true ? "pass" : metric.good === false ? "review" : "context";
  const note = metric.value === null
    ? "Provider did not supply this value"
    : scoreContext && points !== null
      ? `${points} pts in Fundamental score`
      : points !== null
        ? "Score factor shown only in the 13-factor score above"
        : metric.good === true
          ? "Meets checklist"
          : metric.good === false
            ? "Needs review"
            : metric.period
              ? new Date(metric.period).toLocaleDateString("en-IN")
              : "For context";
  return <div className={`analyser-metric ${state}`}><span>{metric.label}</span><strong>{metricValue(metric)}</strong>{formulas[metric.key] && <em>{formulas[metric.key]}</em>}<small>{note}</small></div>;
}

function ScorecardMatrix({ metrics }: { metrics: Metric[] }) {
  const scoreKeys = ["revenueGrowth", "patGrowth", "epsGrowth", "roe", "roce", "opm", "npm", "de", "interestCoverage", "currentRatio", "fcf", "ocfPat", "promoterHolding"];
  const rows = scoreKeys.map(key => {
    const m = metrics.find(item => item.key === key);
    const pts = m ? scorePoints(m) : null;
    const max = maxPoints[key] || 10;
    const status = m?.value === null || !m ? "missing" : (pts && pts >= max * 0.7) ? "pass" : (pts && pts > 0) ? "average" : "review";
    return { key, label: m?.label || key, metric: m, pts, max, status, ideal: idealRanges[key] || "-", formula: formulas[key] || "-" };
  });

  return (
    <div className="scorecard-matrix-panel">
      <div className="table-wrap scorecard-table-wrap">
        <table className="scorecard-table">
          <thead>
            <tr>
              <th>Factor / Metric</th>
              <th>Reported Value</th>
              <th>Ideal Range</th>
              <th>Formula</th>
              <th>Points Awarded</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className={r.status}>
                <td><strong>{r.label}</strong></td>
                <td className="value-cell">{r.metric ? metricValue(r.metric) : "—"}</td>
                <td className="ideal-cell"><span className="ideal-pill">{r.ideal}</span></td>
                <td className="formula-cell"><small>{r.formula}</small></td>
                <td className="points-cell"><strong>{r.pts !== null ? `${r.pts} / ${r.max}` : "—"}</strong></td>
                <td>
                  <span className={`status-badge ${r.status}`}>
                    {r.status === "pass" ? "Passed" : r.status === "average" ? "Moderate" : r.status === "missing" ? "No data" : "Below"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialResultsTable({ financials }: { financials?: Stock["financials"] }) {
  const [mode, setMode] = useState<"quarterly" | "annual">("quarterly");
  const rows = mode === "quarterly" ? (financials?.quarterly || []) : (financials?.annual || []);

  return (
    <div className="financial-results-block">
      <div className="financial-results-toolbar">
        <div className="tabs">
          <button type="button" className={mode === "quarterly" ? "selected" : ""} onClick={() => setMode("quarterly")}>Quarterly Results</button>
          <button type="button" className={mode === "annual" ? "selected" : ""} onClick={() => setMode("annual")}>Annual Results (FY)</button>
        </div>
        <span className="small muted">Figures in ₹ Crores (except EPS & Margins)</span>
      </div>
      <div className="table-wrap scroll-table">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Sales / Revenue</th>
              <th>Operating Profit</th>
              <th>OPM %</th>
              <th>Net Profit (PAT)</th>
              <th>NPM %</th>
              <th>EPS (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.period}>
                <td><strong>{r.period}</strong></td>
                <td>{r.revenue !== null ? `₹${number(r.revenue, 0)} Cr` : "—"}</td>
                <td>{r.operatingProfit !== null ? `₹${number(r.operatingProfit, 0)} Cr` : "—"}</td>
                <td className={r.opm !== null && r.opm >= 15 ? "positive" : ""}>{r.opm !== null ? `${number(r.opm, 1)}%` : "—"}</td>
                <td className={r.netProfit !== null && r.netProfit >= 0 ? "positive" : "negative"}>{r.netProfit !== null ? `₹${number(r.netProfit, 0)} Cr` : "—"}</td>
                <td className={r.npm !== null && r.npm >= 10 ? "positive" : ""}>{r.npm !== null ? `${number(r.npm, 1)}%` : "—"}</td>
                <td>{r.eps !== null ? `₹${number(r.eps, 2)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty-inline">Financial statement results are loading or unavailable for this company.</p>}
      </div>
    </div>
  );
}

export function StockAnalysis({ stock, preview, watchlist, group, onGroup, onAdd, onAnalyze, onFilings, canSave, canExport }: Props) {
  const [tab, setTab] = useState<"insights" | "results" | "data">("insights");
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
  const isBse = stock.symbol.endsWith(".BO");
  const exchangeQuote = isBse
    ? (/^\d+$/.test(symbol)
        ? `https://www.bseindia.com/stock-share-price/x/y/${symbol}/`
        : `https://www.bseindia.com/stock-share-price/stock-quote/?q=${encodeURIComponent(symbol)}`)
    : `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`;
  const exchangeFilings = isBse
    ? `https://www.bseindia.com/corporates/ann.html?scrip=${encodeURIComponent(symbol)}`
    : `https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=${encodeURIComponent(symbol)}`;

  const graham = value("graham");
  const intrinsic = value("intrinsicValue");
  const marginSafety = value("marginSafety");
  const fcfYield = value("fcfYield");
  const eps = value("eps");
  const earningsGrowth = value("earningsGrowth");
  const dividendYield = value("yield") ?? 0;
  const lynch = eps !== null && earningsGrowth !== null && earningsGrowth > 0 ? eps * (earningsGrowth + Math.max(0, dividendYield)) : null;

  // Categorize insights for clear key takeaways
  const scoredMetrics = stock.metrics.filter(m => rules[m.key]);
  const strengths = scoredMetrics.filter(m => {
    const pts = scorePoints(m);
    const max = maxPoints[m.key] || 10;
    return pts !== null && pts >= max * 0.7;
  });
  const reviewItems = scoredMetrics.filter(m => {
    const pts = scorePoints(m);
    return m.value !== null && (pts === null || pts < (maxPoints[m.key] || 10) * 0.7);
  });
  const missingItems = scoredMetrics.filter(m => m.value === null);

  return <div className="stock-analyser-report">
    <section className="analyser-company">
      <div>
        <span className="eyebrow">{stock.symbol} &middot; {stock.sector}</span>
        <h2>{stock.name}</h2>
        <p>{stock.industry}</p>
        <div className="quote-line">
          <strong>{money(stock.price)}</strong>
          <Change value={stock.changePercent} />
        </div>
        <small>Quote as of {stock.asOf ? new Date(stock.asOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "unavailable"}</small>
      </div>
      <div className="analyser-score">
        <span>FUNDAMENTAL SCORE</span>
        <strong>{stock.score ?? "-"}<small>/100</small></strong>
        <span>{stock.coverage} of {scoreRules.length} factors available</span>
      </div>
    </section>

    {/* Consolidated Scorecard Ratios & Ideal Ranges Panel */}
    <details className="scorecard-matrix-accordion">
      <summary><BarChart3 size={16} /> View All Fundamentals ({stock.score ?? "-"}/100)</summary>
      <ScorecardMatrix metrics={stock.metrics} />
    </details>

    <div className="analyser-save">
      <label>Watchlist group<input value={group} onChange={e => onGroup(e.target.value)} maxLength={50} /></label>
      <button className="button primary" disabled={!canSave} onClick={onAdd}><Star size={15} />{watchlist.some(i => i.symbol === stock.symbol) ? "Update watchlist" : "Add to watchlist"}</button>
      <button className="button secondary" disabled={!canExport} onClick={() => window.print()}><Download size={15} />Print / save PDF</button>
    </div>

    <details open className="analyser-overview">
      <summary><BookOpen size={16} /> Company overview - what this business does</summary>
      <p>{stock.description || "Company description is not available."}</p>
    </details>

    <div className="analyser-links">
      <a href={"https://www.tradingview.com/chart/?symbol=" + encodeURIComponent((isBse ? "BSE:" : "NSE:") + symbol)} target="_blank" rel="noreferrer">TradingView <ArrowUpRight size={14} /></a>
      <a href={exchangeQuote} target="_blank" rel="noreferrer">{isBse ? "BSE Stock Page" : "NSE Stock Page"} <ArrowUpRight size={14} /></a>
      <a href={exchangeFilings} target="_blank" rel="noreferrer">{isBse ? "BSE Announcements" : "NSE Filings"} <ArrowUpRight size={14} /></a>
      <button onClick={onFilings}><FileText size={14} />Reviewed company filings</button>
    </div>

    <Section title="Fundamental score factors" note="All 13 calculations from the guide">
      <div className="analyser-metrics">{metrics(["revenueGrowth", "patGrowth", "epsGrowth", "roe", "roce", "opm", "npm", "de", "interestCoverage", "currentRatio", "fcf", "ocfPat", "promoterHolding"]).map(m => <MetricCard key={m.key} metric={m} scoreContext />)}</div>
    </Section>

    <Section title="Key metrics" note={preview ? "Illustrative sample - not added again to score" : "Source: Yahoo Finance + exchange filings - context only"}>
      <div className="analyser-metrics">{metrics(["pe", "pb", "eps", "bookValue", "yield", "roe", "roce", "de", "interestCoverage", "opm", "npm"]).map(m => <MetricCard key={m.key} metric={m} />)}</div>
    </Section>

    <Section title="Business metrics" note="Business context; duplicated score factors are not added again">
      <div className="analyser-metrics">{metrics(["marketCap", "revenue", "netIncome", "revenueGrowth", "patGrowth", "epsGrowth", "earningsGrowth", "fcf", "ocfPat", "fcfYield"]).map(m => <MetricCard key={m.key} metric={m} />)}</div>
    </Section>

    <Section title="Shareholding pattern" note={holdings ? "NSE filings - " + holdings.current.period + " - context only below" : "Quarterly exchange filings - context only below"}>
      {holdingState && <div className="analyser-data-note" role="status">{holdingState}{!preview && !isBse && <button className="text-button" onClick={() => setRetry(n => n + 1)}><RefreshCw size={14} />Retry</button>}</div>}
      <div className="analyser-metrics">{(["FII", "DII", "HNI"] as const).map(key => <div className="analyser-metric context" key={key}><span>{key === "FII" ? "Foreign portfolio investors" : key === "DII" ? "Domestic institutions" : "HNI individuals"}</span><strong>{holdings?.current[key] != null ? number(holdings.current[key]) + "%" : "Not available"}</strong><small>{holdings ? "Reported holding" : "Not supplied"}</small></div>)}{metrics(["promoterHolding", "promoterPledge"]).map(m => <MetricCard key={m.key} metric={m} />)}</div>
      {holdings && <a className="analyser-source" href={holdings.sourceUrl} target="_blank" rel="noreferrer">View source filing <ArrowUpRight size={14} /></a>}
    </Section>

    <Section title="Valuation models" note="CMP-anchored fair value estimates - not added to Fundamental score">
      {/* Prominent Current Market Price (CMP) Indicator */}
      <div className="valuation-cmp-banner">
        <div className="cmp-badge">
          <span>Current Market Price (CMP)</span>
          <strong>{money(stock.price)}</strong>
          <small>Live baseline for fair value & margin of safety models</small>
        </div>
      </div>
      <div className="analyser-valuations">
        <article className={intrinsic !== null && stock.price !== null ? (intrinsic > stock.price ? "gain" : "loss") : "context"}>
          <span>INTRINSIC VALUE</span>
          <strong>{money(intrinsic)}</strong>
          <div className="cmp-comparison-line">CMP: <strong>{money(stock.price)}</strong> vs Fair Value: <strong>{money(intrinsic)}</strong></div>
          <p>Benjamin Graham-style formula from the SRT guide using EPS and sustainable growth rate with the 6/8 yield adjustment.</p>
          <small className={marginSafety !== null ? (marginSafety > 0 ? "positive-val" : "negative-val") : "context-val"}>
            {marginSafety !== null ? (marginSafety > 0 ? `+${number(marginSafety, 1)}% Margin of Safety (CMP < Intrinsic)` : `${number(marginSafety, 1)}% Premium over Intrinsic`) : "Requires EPS & growth"}
          </small>
        </article>
        <article className={fcfYield !== null ? (fcfYield >= 7 ? "gain" : fcfYield >= 0 ? "context" : "loss") : "context"}>
          <span>FREE CASH FLOW YIELD</span>
          <strong>{fcfYield !== null ? number(fcfYield, 1) + "%" : "Not available"}</strong>
          <div className="cmp-comparison-line">FCF Yield: <strong>{fcfYield !== null ? number(fcfYield, 1) + "%" : "N/A"}</strong> vs 10Y Yield ~7.0%</div>
          <p>Annual Free Cash Flow divided by total Market Capitalisation. Compares organic cash generation against sovereign debt yield.</p>
          <small className={fcfYield !== null ? (fcfYield >= 7 ? "positive-val" : fcfYield >= 0 ? "context-val" : "negative-val") : "context-val"}>
            {fcfYield !== null ? (fcfYield >= 7 ? "Yield exceeds 10Y sovereign benchmark (~7%)" : fcfYield >= 0 ? "Positive FCF yield below 10Y benchmark" : "Negative free cash flow") : "Requires positive free cash flow"}
          </small>
        </article>
        <article className={graham !== null && stock.price !== null ? (stock.price <= graham ? "gain" : "loss") : "context"}>
          <span>GRAHAM NUMBER</span>
          <strong>{money(graham)}</strong>
          <div className="cmp-comparison-line">CMP: <strong>{money(stock.price)}</strong> vs Graham: <strong>{money(graham)}</strong></div>
          <p>Conservative valuation ceiling calculated as sqrt(22.5 x EPS x Book Value). Suitable for defensive value analysis.</p>
          <small className={graham !== null && stock.price !== null ? (stock.price <= graham ? "positive-val" : "negative-val") : "context-val"}>
            {graham !== null && stock.price !== null ? (stock.price <= graham ? "Undervalued (CMP <= Graham Number)" : `Trading at ${number(stock.price / graham, 2)}x Graham number`) : "Requires positive EPS & book value"}
          </small>
        </article>
        <article className={lynch !== null && stock.price !== null ? (lynch > stock.price ? "gain" : "loss") : "context"}>
          <span>PETER LYNCH LENS</span>
          <strong>{money(lynch)}</strong>
          <div className="cmp-comparison-line">CMP: <strong>{money(stock.price)}</strong> vs Lynch Value: <strong>{money(lynch)}</strong></div>
          <p>Peter Lynch fair value heuristic: EPS multiplied by growth plus dividend yield. Illustrative rule of thumb.</p>
          <small className={lynch !== null && stock.price !== null ? (lynch > stock.price ? "positive-val" : "negative-val") : "context-val"}>
            {lynch !== null && stock.price !== null ? (stock.price < lynch ? "Trading below Lynch growth fair value" : "Trading above Lynch fair value") : "Requires positive EPS & earnings growth"}
          </small>
        </article>
      </div>
      <div className="analyser-metrics">{metrics(["currentRatio", "quickRatio", "totalDebt", "totalCash", "operatingCashFlow", "fcf", "intrinsicValue", "marginSafety"]).map(m => <MetricCard key={m.key} metric={m} />)}</div>
    </Section>

    <div className="analyser-tabs" role="tablist" aria-label="Research detail">
      <button id="insight-tab" role="tab" aria-controls="insight-panel" aria-selected={tab === "insights"} onClick={() => setTab("insights")}>
        <Check size={15} />Research Insights & Key Takeaways
      </button>
      <button id="results-tab" role="tab" aria-controls="results-panel" aria-selected={tab === "results"} onClick={() => setTab("results")}>
        <TrendingUp size={15} />Annual & Quarterly Results
      </button>
      <button id="data-tab" role="tab" aria-controls="data-panel" aria-selected={tab === "data"} onClick={() => setTab("data")}>
        <BarChart3 size={15} />Financial Data & Line Items
      </button>
    </div>

    {tab === "insights" && (
      <div id="insight-panel" role="tabpanel" aria-labelledby="insight-tab" className="analyser-insights-structured">
        <article className="analyser-insight summary">
          <div className="summary-header">
            <div>
              <h3>Research Executive Summary</h3>
              <p>{stock.score === null ? "Too few score factors available to compute an aggregate quality score." : `Total Fundamental Quality Score: ${stock.score}/100. ${stock.coverage} of ${scoreRules.length} core factors evaluated.`}</p>
            </div>
            <div className="summary-badge-group">
              <span className="badge-pill pass"><ShieldCheck size={13} /> {strengths.length} Strengths</span>
              {reviewItems.length > 0 && <span className="badge-pill review"><AlertTriangle size={13} /> {reviewItems.length} Areas to Watch</span>}
            </div>
          </div>
        </article>

        {/* Clear Key Fundamental Strengths */}
        {strengths.length > 0 && (
          <article className="analyser-insight pass">
            <h3>🌟 Key Fundamental Strengths (Passed Score Factors)</h3>
            <ul className="takeaways-list">
              {strengths.map(m => {
                const pts = scorePoints(m);
                return (
                  <li key={m.key}>
                    <strong>{m.label} ({metricValue(m)}):</strong> Awarded <b>{pts} points</b>. Solid performance exceeding ideal benchmark ({idealRanges[m.key] || "Benchmark met"}).
                  </li>
                );
              })}
            </ul>
          </article>
        )}

        {/* Key Attention Areas */}
        {reviewItems.length > 0 && (
          <article className="analyser-insight review">
            <h3>⚠️ Risk Factors & Attention Areas (Below Benchmark)</h3>
            <ul className="takeaways-list">
              {reviewItems.map(m => {
                const pts = scorePoints(m);
                return (
                  <li key={m.key}>
                    <strong>{m.label} ({metricValue(m)}):</strong> Scored {pts ?? 0} points. Trailing benchmark target ({idealRanges[m.key] || "Needs review"}).
                  </li>
                );
              })}
            </ul>
          </article>
        )}

        {/* Missing / Excluded Items */}
        {missingItems.length > 0 && (
          <article className="analyser-insight summary">
            <h3>ℹ️ Excluded / Unreported Checklist Items</h3>
            <p className="small muted">
              The following metrics were not published or unavailable from exchange filings and are omitted from score calculation: {missingItems.map(m => m.label).join(", ")}.
            </p>
          </article>
        )}
      </div>
    )}

    {tab === "results" && (
      <section id="results-panel" role="tabpanel" aria-labelledby="results-tab" className="panel">
        <div className="panel-heading">
          <div>
            <h2>Financial Results (Annual & Quarterly)</h2>
            <p className="small muted">Historical income statement trends for sales, operating profits, margins, and earnings per share.</p>
          </div>
        </div>
        <FinancialResultsTable financials={stock.financials} />
      </section>
    )}

    {tab === "data" && (
      <section id="data-panel" role="tabpanel" aria-labelledby="data-tab" className="panel">
        <h2>Reported financial data</h2>
        <p className="small muted">Provider snapshot. Annual fallback values use Yahoo fundamentals time series when the quote summary is incomplete. Open reviewed company filings for your saved reporting periods.</p>
        <button className="button secondary" onClick={onFilings}><FileText size={16} />Open reviewed filings</button>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Formula</th>
                <th>Period</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {stock.metrics.map(m => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  <td>{metricValue(m)}</td>
                  <td><small>{formulas[m.key] || "-"}</small></td>
                  <td>{m.period ? new Date(m.period).toLocaleDateString("en-IN") : "Not supplied"}</td>
                  <td>{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

    <Section title="Your research watchlist" note="Select a company to analyse">
      <p className="analyser-data-note">Continue researching your saved companies. This list is not a set of stock recommendations.</p>
      {watchlist.length ? <div className="table-wrap"><table><thead><tr><th>Company</th><th>Symbol</th><th>Group</th><th>Research</th></tr></thead><tbody>{watchlist.map(item => <tr key={item.symbol}><td>{item.name}</td><td>{item.symbol}</td><td>{item.group}</td><td><button className="text-button" onClick={() => onAnalyze(item.symbol)}>Analyse <ArrowUpRight size={14} /></button></td></tr>)}</tbody></table></div> : <p className="analyser-data-note">Add companies to your watchlist to compare research ideas here.</p>}
    </Section>

    <details className="analyser-method">
      <summary>Scoring method and data limitations</summary>
      <p>The score uses the weighted point ladder from the SRT user guide. Missing factors are excluded from calculation but also earn no points; at least three fundamental score factors are required. Thresholds may not suit every sector. The score is not a buy, hold, or sell recommendation.</p>
      <p>Fetched {new Date(stock.fetchedAt).toLocaleString("en-IN")}. Provider metrics may cover different periods.</p>
    </details>
    {stock.warnings.map(w => <Notice key={w}>{w}</Notice>)}
  </div>;
}
