"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FileText, Globe2, ImagePlus, ListChecks, MessageSquare, Play, Plus, RefreshCw, Search, Send, Upload, X } from "lucide-react";
import type { Message, ReportValues, WatchItem } from "@/lib/types";
import { maxChatImageBytes } from "@/lib/chat-image";
import { demoStock, demoWatchlist } from "@/lib/demo";
import { relativeTime, swing } from "@/lib/analytics";
import { Empty, Loading, Notice, number, request } from "./ui";

type Props = { preview: boolean; onError: (error: string) => void };
type ChatAttachment = { mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string; previewUrl: string };

async function prepareChatImage(file: File): Promise<ChatAttachment> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  const bitmap = await createImageBitmap(file);
  try {
    for (const width of [1600, 1280, 960, 720]) {
      const scale = Math.min(1, width / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const previewUrl = canvas.toDataURL("image/webp", width >= 1280 ? 0.78 : 0.65);
      const [header, data] = previewUrl.split(",", 2);
      const mimeType = header.slice(5, -7) as ChatAttachment["mimeType"];
      if (["image/jpeg", "image/png", "image/webp"].includes(mimeType) && data.length * 3 / 4 <= maxChatImageBytes) return { mimeType, data, previewUrl };
    }
    throw new Error("This image is too large to send. Try a smaller image.");
  } finally {
    bitmap.close();
  }
}

export function ChatPanel({ preview, onError, canPost = true }: Props & { canPost?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!preview);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [imageBusy, setImageBusy] = useState(false);

  const load = useCallback(async () => {
    if (preview) return;
    try {
      setMessages((await request<{ messages: Message[] }>("/api/chat")).messages);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [preview, onError]);

  useEffect(() => {
    void load();
    if (preview) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load, preview]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (preview || (!text.trim() && !attachment)) return;
    setBusy(true);
    try {
      await request("/api/chat", { method: "POST", body: JSON.stringify({ text, ...(attachment ? { image: { mimeType: attachment.mimeType, data: attachment.data } } : {}) }) });
      setText("");
      setAttachment(null);
      await load();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function selectImage(file?: File) {
    if (!file) return;
    setImageBusy(true);
    try {
      setAttachment(await prepareChatImage(file));
      onError("");
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  return <section className="panel chat-panel">
    <div className="panel-heading">
      <div>
        <h2>Research room</h2>
        <p className="small muted">Shared with active team members - updates every 15 seconds</p>
      </div>
      <MessageSquare size={22} />
    </div>
    {preview && <Notice>Team conversations appear here after sign-in. The preview does not show private messages.</Notice>}
    <div className="chat-messages">
      {loading ? <Loading text="Loading conversations..." /> : messages.length ? messages.map(m => <article className="chat-message" key={m.id}>
        <span className="avatar">{m.name.slice(0, 1)}</span>
        <div><strong>{m.name}</strong><small>{relativeTime(m.createdAt)}</small>{m.text && <p>{m.text}</p>}{m.imageId && <a className="chat-image-link" href={"/api/chat/image?id=" + encodeURIComponent(m.imageId)} target="_blank" rel="noreferrer" aria-label={"Open image shared by " + m.name}><img src={"/api/chat/image?id=" + encodeURIComponent(m.imageId)} alt={"Image shared by " + m.name} loading="lazy" /></a>}</div>
      </article>) : <Empty title="A place to think together" text="Share a research idea, ask a question, or discuss a company with your team." />}
    </div>
    <form onSubmit={send} className="chat-compose">
      <div className="chat-compose-main">
        <textarea aria-label="Message to the team" placeholder="Share a thought with your team..." value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={2} required={!attachment} disabled={preview || !canPost || busy} />
        <label className="chat-attach-button" title="Add image"><ImagePlus size={19} /><input aria-label="Add image" type="file" accept="image/png,image/jpeg,image/webp" disabled={preview || !canPost || busy || imageBusy} onChange={e => { void selectImage(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <button className="button primary" disabled={preview || !canPost || busy || imageBusy || (!text.trim() && !attachment)}><Send size={17} />{busy ? "Sending..." : "Send"}</button>
      </div>
      {attachment && <div className="chat-attachment-preview"><img src={attachment.previewUrl} alt="Selected image" /><button type="button" className="icon-button" title="Remove image" aria-label="Remove image" onClick={() => setAttachment(null)}><X size={16} /></button></div>}
    </form>
  </section>;
}

type SwingResult = Partial<ReturnType<typeof swing>> & { symbol: string; error?: string };
type SwingMode = "single" | "watchlist" | "market" | "smallcap";
type StockSuggestion = { symbol: string; name: string; exchange?: string };
const previewMarket = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "LT", "SBIN", "BHARTIARTL", "HINDUNILVR", "AXISBANK", "KOTAKBANK", "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE", "ASIANPAINT", "HCLTECH", "WIPRO", "TATASTEEL", "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC", "ONGC", "ADANIENT", "ADANIPORTS", "COALINDIA", "TECHM", "JSWSTEEL", "GRASIM", "DRREDDY", "CIPLA", "BAJAJFINSV", "HEROMOTOCO", "EICHERMOT", "APOLLOHOSP", "BRITANNIA", "DIVISLAB", "TATAMOTORS"];
const previewSmallcap = ["CAMS", "CDSL", "KAYNES", "KPITTECH", "KEI", "PERSISTENT", "TATAELXSI", "POLYCAB", "DIXON", "AMBER", "BSOFT", "ZENSARTECH", "IEX", "IRCTC", "JUBLINGREA", "KFINTECH", "LATENTVIEW", "RITES", "MAZDOCK", "COCHINSHIP"];

export function SwingPanel({ preview, onError, watchlist }: Props & { watchlist: WatchItem[] }) {
  const [symbols, setSymbols] = useState("TCS");
  const [horizon, setHorizon] = useState("short");
  const [mode, setMode] = useState<SwingMode>("single");
  const [results, setResults] = useState<SwingResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [source, setSource] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const symbolInput = useRef<HTMLInputElement>(null);

  async function universe(kind: "market" | "smallcap") {
    if (preview) return { symbols: kind === "smallcap" ? previewSmallcap : previewMarket, source: "Preview basket" };
    return request<{ symbols: string[]; source: string }>("/api/swing?universe=" + kind);
  }

  async function run(list: string[], label = "symbols") {
    const unique = [...new Set(list.map(s => s.trim().toUpperCase()).filter(Boolean))];
    if (!unique.length || unique.length > 520) {
      onError("Enter between 1 and 520 symbols.");
      return;
    }
    setBusy(true);
    setResults([]);
    onError("");
    try {
      for (let i = 0; i < unique.length; i += 25) {
        setProgress(`Checking ${label}: ${i + 1}-${Math.min(i + 25, unique.length)} of ${unique.length}`);
        const batch = unique.slice(i, i + 25);
        const data = preview
          ? batch.map(symbol => ({ symbol, ...swing(demoStock(symbol).history, horizon === "long") }))
          : (await request<{ results: SwingResult[]; source: string }>("/api/swing?symbols=" + encodeURIComponent(batch.join(",")) + "&horizon=" + horizon)).results;
        setResults(old => [...old, ...data]);
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  useEffect(() => {
    const text = symbols.trim();
    if (mode !== "single" || busy || text.length < 3 || /[,;]/.test(text) || selectedSymbol === text) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = preview
          ? demoWatchlist.filter(item => (item.symbol + item.name).toLowerCase().includes(text.toLowerCase())).map(item => ({ symbol: item.symbol, name: item.name, exchange: "NSE" }))
          : (await request<{ results: StockSuggestion[] }>("/api/swing/search?q=" + encodeURIComponent(text), { signal: controller.signal })).results;
        setSuggestions(results);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [symbols, mode, preview, busy, selectedSymbol]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (mode === "single") {
      setSource("");
      if (selectedSymbol) return run([selectedSymbol], "stock");
      if (/[,;]/.test(symbols)) return run(symbols.split(/[,;\s]+/), "stocks");
      const exact = suggestions.find(item => item.symbol.toUpperCase() === symbols.trim().toUpperCase() || item.name.toUpperCase() === symbols.trim().toUpperCase());
      if (exact) return run([exact.symbol], "stock");
      if (/^[A-Z0-9&.^=-]+$/i.test(symbols.trim())) return run([symbols.trim()], "stock");
      onError("Select a company from the suggestions before checking its setup.");
      return;
    }
    if (mode === "watchlist") return run(watchlist.map(i => i.symbol), "watchlist");
    const data = await universe(mode);
    setSource(data.source);
    return run(data.symbols, mode === "market" ? "whole market" : "smallcap");
  }

  const valid = results.filter(r => !r.error);
  const today = valid.filter(r => r.setup === "today").sort(sortSwing);
  const yesterday = valid.filter(r => r.setup === "yesterday").sort(sortSwing);
  const approaching = valid.filter(r => r.setup === "approaching").sort(sortSwing);
  const unavailable = results.filter(r => r.error);
  const modeCards = [
    { key: "single", label: "Check One Stock", icon: Search, detail: "Search one stock or paste a short list." },
    { key: "watchlist", label: "Scan My Watchlist", icon: ListChecks, detail: `${watchlist.length} saved stocks.` },
    { key: "market", label: "Scan Whole Market", icon: Globe2, detail: "NSE NIFTY 500 when available." },
    { key: "smallcap", label: "Scan Smallcap 250", icon: RefreshCw, detail: "Experimental smallcap universe." }
  ] as const;

  return <>
    <section className="swing-hero">
      <div><h2>Swing Trade</h2><span>EMA 9/20/21 - RSI 14 - volume-confirmed golden cross screener</span></div>
    </section>
    <Notice>Technical analysis identifies price and volume patterns, not guarantees. Always confirm with your own judgement before entering. Educational tool, not investment advice.</Notice>
    <section className="panel swing-tool">
      <div className="swing-mode-grid">
        {modeCards.map(item => <label className={mode === item.key ? "swing-mode selected" : "swing-mode"} key={item.key}>
          <input type="radio" name="swing-mode" value={item.key} checked={mode === item.key} onChange={() => setMode(item.key)} disabled={busy} />
          <item.icon size={16} />
          <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        </label>)}
      </div>
      <form onSubmit={submit}>
        {mode === "single" && <div className="swing-search-block"><label className="swing-symbol-input">Company name or NSE symbol<input ref={symbolInput} value={symbols} onChange={e => { setSelectedSymbol(""); setSymbols(e.target.value.toUpperCase()); }} onKeyDown={e => { if (e.key === "ArrowDown" && suggestions.length) { e.preventDefault(); document.querySelector<HTMLButtonElement>("#swing-suggestion-list button")?.focus(); } else if (e.key === "Escape") setSuggestions([]); }} aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="swing-suggestion-list" placeholder="TCS or company name" required disabled={busy} /></label>{suggestions.length > 0 && <div id="swing-suggestion-list" className="swing-suggestions" role="listbox" aria-label="Matching companies">{suggestions.map(item => <button type="button" role="option" aria-selected={false} key={item.symbol} disabled={busy} onClick={() => { setSelectedSymbol(item.symbol); setSymbols(item.symbol); setSuggestions([]); symbolInput.current?.focus(); }} onKeyDown={e => { if (e.key === "Escape") { setSuggestions([]); symbolInput.current?.focus(); } }}><span><strong>{item.name}</strong><small>{item.symbol}{item.exchange ? " - " + item.exchange : ""}</small></span><ArrowRight size={15} /></button>)}</div>}</div>}
        <div className="swing-actions">
          <label>Trade horizon<select value={horizon} onChange={e => setHorizon(e.target.value)} disabled={busy}><option value="short">Short term - EMA 9 / 21</option><option value="long">Long term - EMA 50 / 200</option></select></label>
          <button className="button primary" disabled={busy || (mode === "watchlist" && !watchlist.length)}><Play size={16} />{buttonLabel(mode)}</button>
        </div>
      </form>
      <p className="small muted">{mode === "market" ? "Scans NIFTY 500 when NSE provides the universe. The first technically qualified results are grouped below." : mode === "smallcap" ? "Smallcap scan is experimental because liquidity and spreads can change quickly." : "Stocks are fetched separately so one unavailable quote does not stop the whole scan."}</p>
    </section>
    {busy && <Loading text={progress} />}
    {results.length > 0 && <div className="alert success" role="status">Scan complete - {today.length} crossed today, {yesterday.length} crossed yesterday, {approaching.length} approaching.{source ? " " + source + "." : ""}</div>}
    <SwingBucket title="Golden Cross Today" tone="today" rows={today} empty={results.length ? "No golden crosses today in this scan." : ""} />
    <SwingBucket title="Golden Cross Yesterday, still fresh" tone="yesterday" rows={yesterday} empty={results.length ? "No fresh crosses from yesterday in this scan." : ""} />
    <SwingBucket title="Approaching Golden Cross, early warning" tone="approaching" rows={approaching} empty={results.length ? "No near-cross setups in this scan." : ""} />
    {unavailable.length > 0 && <details className="admin-details"><summary>Unavailable history ({unavailable.length})</summary><p className="small muted">{unavailable.map(r => r.symbol).join(", ")}</p></details>}
    {!results.length && !busy && <Empty title="Swing scanner ready" text="Choose a scan mode and run the screener to see today's crosses, fresh crosses, and early warnings." />}
  </>;
}

function sortSwing(a: SwingResult, b: SwingResult) {
  return (b.volumeRatio ?? 0) - (a.volumeRatio ?? 0) || (b.rsi ?? 0) - (a.rsi ?? 0);
}

function buttonLabel(mode: SwingMode) {
  return mode === "watchlist" ? "Scan My Watchlist" : mode === "market" ? "Scan Whole Market" : mode === "smallcap" ? "Scan Smallcap" : "Check Setup";
}

function SwingBucket({ title, rows, tone, empty }: { title: string; rows: SwingResult[]; tone: string; empty: string }) {
  return <section className="swing-bucket">
    <h2><span className={"bucket-dot " + tone} />{title} ({rows.length})</h2>
    {rows.length ? <div className="swing-list">{rows.map(row => <SwingCard row={row} key={row.symbol} />)}</div> : empty && <p className="small muted swing-empty">{empty}</p>}
  </section>;
}

function SwingCard({ row }: { row: SwingResult }) {
  const target = row.trade?.targetLow !== null && row.trade?.targetLow !== undefined && row.trade?.targetHigh !== null && row.trade?.targetHigh !== undefined ? "Rs " + number(row.trade.targetLow, 0) + " - " + number(row.trade.targetHigh, 0) : "-";
  return <details className="swing-card">
    <summary><span>{row.symbol} - {String(row.signal || "Setup").toUpperCase()} - Rs {number(row.close)}</span><small>RSI {number(row.rsi, 1)} - Vol {number(row.volumeRatio)}x</small></summary>
    <div className="swing-card-body">
      <div className="swing-card-head"><strong>{row.symbol}</strong><span>{row.signal}</span><small>CMP Rs {number(row.close)} - RSI {number(row.rsi, 1)} {row.checks?.rsiHealthy ? "sweet spot" : "watch"}</small></div>
      <strong className="small">Your rulebook, checked live:</strong>
      <ul className="swing-rule-list">
        <Rule ok={row.checks?.trendUp} text="Price above EMA rule for selected horizon" />
        <Rule ok={row.checks?.crossed || row.checks?.crossedYesterday || row.checks?.approaching} text="Golden-cross timing matched this bucket" />
        <Rule ok={row.checks?.volumeConfirmed} text="Volume bullish, trending above 20-session average" />
        <Rule ok={row.checks?.rsiHealthy} text="RSI in 45-70 sweet spot" />
        <Rule ok={row.rsi !== null && row.rsi !== undefined && row.rsi < 80} text="RSI below overheated zone" />
      </ul>
      <div className="swing-trade-grid">
        <div><span>Entry</span><strong>Rs {number(row.trade?.entry)}</strong><em>Latest close</em></div>
        <div><span>Stop loss</span><strong>Rs {number(row.trade?.stopLoss)} <small>{lossPct(row)}</small></strong><em>Entry - (2 x ATR 14)</em></div>
        <div><span>Target</span><strong>{target}</strong><em>Entry x 1.08 to Entry x 1.12</em></div>
        <div><span>Risk/reward</span><strong>1:{number(row.trade?.riskReward, 2)}</strong><em>(Target - entry) / (Entry - stop)</em></div>
      </div>
      <p className="small muted">Trailing stop: once in profit, exit if price closes below EMA21. If RSI moves above 70, tighten the trail.</p>
    </div>
  </details>;
}

function Rule({ ok, text }: { ok?: boolean; text: string }) {
  return <li className={ok ? "pass" : "fail"}><span>{ok ? "Pass" : "Not met"}</span>{text}</li>;
}

function lossPct(row: SwingResult) {
  const entry = row.trade?.entry, stop = row.trade?.stopLoss;
  return entry !== null && entry !== undefined && stop !== null && stop !== undefined && entry > 0 ? "(" + number((stop / entry - 1) * 100, 1) + "%)" : "";
}

const numericFields = [["revenue", "Revenue"], ["netProfit", "Net profit"], ["operatingCashFlow", "Operating cash flow"], ["totalDebt", "Total debt"], ["equity", "Equity"]] as const;

export function ReportsPanel({ preview, onError, initialSymbol }: Props & { initialSymbol: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<ReportValues | null>(null);
  const [saved, setSaved] = useState<ReportValues[]>([]);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (preview) return;
    try {
      setSaved((await request<{ reports: ReportValues[] }>("/api/reports")).reports);
    } catch (e) {
      onError((e as Error).message);
    }
  }, [preview, onError]);

  useEffect(() => { void load(); }, [load]);

  async function extract(e: React.FormEvent) {
    e.preventDefault();
    if (!file || preview) return;
    if (file.size > 3 * 1024 * 1024) {
      onError("Choose a PDF no larger than 3 MB.");
      return;
    }
    setBusy(true);
    setValues(null);
    onError("");
    setNotice("");
    const body = new FormData();
    body.set("file", file);
    body.set("symbol", symbol);
    body.set("consent", String(consent));
    try {
      setValues((await request<{ values: ReportValues }>("/api/reports", { method: "POST", body })).values);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!values || preview) return;
    setBusy(true);
    try {
      await request("/api/reports", { method: "POST", body: JSON.stringify(values) });
      await load();
      setValues(null);
      setNotice("Reviewed figures saved to your research records.");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Notice>Enter figures from an official company filing, or upload a PDF to extract them. Review the figures before saving. Your PDF is sent to Anthropic only when you select Extract. The original file is not stored by this app.</Notice>
    <section className="panel">
      <div className="panel-heading"><div><h2>Enter filing figures</h2><p className="small muted">Record figures directly from a company filing. PDF extraction is optional.</p></div><FileText size={24} /></div>
      <button className="button secondary" disabled={preview || busy} onClick={() => { onError(""); setNotice(""); setValues({ symbol, period: "", revenue: null, netProfit: null, operatingCashFlow: null, totalDebt: null, equity: null, notes: "" }); }}><Plus size={16} />Enter figures manually</button>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h2>Read a company filing</h2><p className="small muted">PDF only - up to 3 MB - use a short results filing, not a full annual report</p></div><FileText size={24} /></div>
      <form onSubmit={extract}>
        <label>Company symbol<input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} required maxLength={24} placeholder="e.g. TCS" disabled={preview || busy} /></label>
        <label className="upload-zone"><Upload size={30} /><strong>{file ? file.name : "Choose a results PDF"}</strong><span>Quarterly or annual financial results</span><input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} disabled={preview || busy} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={preview || busy} required />I agree to send this PDF to Anthropic for extraction.</label>
        <button className="button primary" disabled={preview || busy || !file || !consent}><FileText size={16} />{busy ? "Processing..." : "Extract figures"}</button>
      </form>
      {preview && <p className="small muted">Connect the extraction service and sign in to upload a filing.</p>}
    </section>
    {values && <section className="panel">
      <h2>Review before saving</h2>
      <p className="muted">All amounts are in INR crore. Confirm the company, period, units and figures against your PDF.</p>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>Symbol<input value={values.symbol} onChange={e => setValues({ ...values, symbol: e.target.value })} required /></label>
          <label>Period ending<input type="date" value={values.period} onChange={e => setValues({ ...values, period: e.target.value })} required /></label>
          {numericFields.map(([key, label]) => <label key={key}>{label} (INR Cr)<input type="number" step="any" min={key === "totalDebt" ? 0 : undefined} value={values[key] ?? ""} onChange={e => setValues({ ...values, [key]: e.target.value === "" ? null : Number(e.target.value) })} /></label>)}
        </div>
        <label>Basis, page references and notes<textarea value={values.notes} onChange={e => setValues({ ...values, notes: e.target.value })} rows={4} /></label>
        <button className="button primary" disabled={busy}><Check size={17} />Confirm & save reviewed figures</button>
      </form>
    </section>}
    {notice && <div className="alert" role="status">{notice}</div>}
    <section className="panel">
      <h2>Your reviewed filings</h2>
      <p className="small muted">Saved separately from provider data to preserve the reporting period and source.</p>
      {saved.length ? <div className="table-wrap"><table>
        <thead><tr><th>Symbol</th><th>Period ending</th><th>Revenue (Cr)</th><th>Profit (Cr)</th><th>OCF / profit</th><th>Debt / equity</th></tr></thead>
        <tbody>{saved.map(r => <tr key={r.symbol + r.period}>
          <td><strong>{r.symbol}</strong><details><summary className="small">Notes</summary><p>{r.notes}</p></details></td>
          <td>{r.period}</td>
          <td>{number(r.revenue)}</td>
          <td>{number(r.netProfit)}</td>
          <td>{r.netProfit && r.netProfit > 0 && r.operatingCashFlow !== null ? number(r.operatingCashFlow / r.netProfit) + "x" : "-"}</td>
          <td>{r.equity && r.equity > 0 && r.totalDebt !== null ? number(r.totalDebt / r.equity) + "x" : "-"}</td>
        </tr>)}</tbody>
      </table></div> : <Empty title="Your filing library starts here" text="Confirmed financial figures will be saved privately to your account." />}
    </section>
  </>;
}
