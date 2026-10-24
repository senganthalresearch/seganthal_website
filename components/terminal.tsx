"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Download, FileText, Flower2, LayoutDashboard, LogOut, Menu, MessageSquare, Newspaper, Plus, Search, ShieldCheck, Sparkles, Star, TrendingUp, X } from "lucide-react";
import type { Member, NewsItem, Stock, WatchItem } from "@/lib/types";
import { demoNews, demoStock, demoWatchlist } from "@/lib/demo";
import { csvCell } from "@/lib/analytics";
import { Empty, Loading, request } from "./ui";
import { ChatPanel, ReportsPanel, SwingPanel } from "./workflows";
import { StockAnalysis } from "./stock-analysis";
import { Dashboard } from "./dashboard";
import { Administration, ContentEditor } from "./administration";
import { AboutUs } from "./community";
import { bannerVisible, defaultSettings, type SiteSettings } from "@/lib/site-settings";
import { can, roleNames } from "@/lib/permissions";
import { parseWatchlistEntries } from "@/lib/watchlist-import";
import { WatchlistAlerts } from "./watchlist-alerts";
import { CompanyLogo } from "./company-logo";
import { addVisit, readVisits, visitKey } from "@/lib/trending";
import { ResearchShell, researchNavigation } from "./research-shell";
import { MarketHome, ResearchExplorer } from "./research-explorer";
import { NewsCard } from "./news-card";

type ImportChoice = { symbol: string; name: string; exchange?: string };
type ImportMatch = { input: string; choices: ImportChoice[]; symbol: string };

type View = "Explore" | "Dashboard" | "Stock Analyzer" | "Watchlist" | "News" | "Team Chat" | "PDF Upload" | "Swing Trade" | "Admin" | "About Us";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Stock Analyzer", icon: Search },
  { name: "Watchlist", icon: Star },
  { name: "News", icon: Newspaper },
  { name: "Team Chat", icon: MessageSquare },
  { name: "PDF Upload", icon: FileText },
  { name: "Swing Trade", icon: TrendingUp },
  { name: "About Us", icon: BookOpen },
  { name: "Admin", icon: ShieldCheck }
] as const;

const subtitles: Record<View, string> = {
  Explore: "Explore your research workspace.",
  Dashboard: "A clear view of the market. A focused start to your research.",
  "Stock Analyzer": "Look beyond the price. Understand the business.",
  Watchlist: "Keep your next research idea close.",
  News: "The stories shaping your market.",
  "Team Chat": "A shared space for thoughtful conversations.",
  "PDF Upload": "Bring company filings into your research.",
  "Swing Trade": "Price, momentum, and volume - in perspective.",
  "About Us": "Our founder, journey, and community.",
  Admin: "A trusted workspace starts with the right access."
};

export default function Terminal({ member, preview = false }: { member: Member; preview?: boolean }) {
  const [currentMember, setCurrentMember] = useState<Member>(member);
  const [view, setView] = useState<View>("Dashboard");
  const [explorePage, setExplorePage] = useState("Analytics Home");
  const [reportsOpened, setReportsOpened] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("");
  const [watchlist, setWatchlist] = useState<WatchItem[]>(preview ? demoWatchlist : []);
  const [news, setNews] = useState<NewsItem[]>(preview ? demoNews : []);
  const [stock, setStock] = useState<Stock | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ symbol: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [newsBusy, setNewsBusy] = useState(false);
  const newsRequestId = useRef(0);
  const [newsSource, setNewsSource] = useState<"all" | "moneycontrol" | "google">("all");
  const [newsTab, setNewsTab] = useState<"market" | "orders" | "results" | "moneycontrol" | "global">("market");
  const [savedNews, setSavedNews] = useState<NewsItem[]>([]);
  const [savedNewsOnly, setSavedNewsOnly] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [analyzed, setAnalyzed] = useState<Stock[]>([]);
  const [settingsReady, setSettingsReady] = useState(preview);
  const [group, setGroup] = useState("All groups");
  const [watchQuery, setWatchQuery] = useState("");
  const [newGroup, setNewGroup] = useState("General");
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importMatches, setImportMatches] = useState<ImportMatch[] | null>(null);

  useEffect(() => {
    setClock(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " IST");
  }, []);
  useEffect(() => { try { const value = JSON.parse(localStorage.getItem(`senganthal-saved-news:${preview ? "preview" : currentMember.email}`) || "[]"); if (Array.isArray(value)) setSavedNews(value.filter(item => item && typeof item.url === "string" && typeof item.title === "string").slice(0, 100)); } catch { setSavedNews([]); } }, [preview, currentMember.email]);
  function toggleSavedNews(item: NewsItem) { setSavedNews(current => { const next = current.some(row => row.url === item.url && row.title === item.title) ? current.filter(row => row.url !== item.url || row.title !== item.title) : [item, ...current].slice(0, 100); try { localStorage.setItem(`senganthal-saved-news:${preview ? "preview" : currentMember.email}`, JSON.stringify(next)); } catch { setToast("Browser storage is unavailable; saved stories will last only this session."); } return next; }); }

  const refreshMember = useCallback(async () => {
    if (preview) return;
    try {
      const response = await fetch("/api/me", { signal: AbortSignal.timeout(15000) });
      const result = await response.json().catch(() => ({})) as { member?: Member };
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setToast("Your account access changed. Please sign in again.");
          setTimeout(() => void signOut({ callbackUrl: "/login" }), 1200);
        }
        return;
      }
      if (!result.member) return;
      setCurrentMember(result.member);
    } catch {
      /* Keep the current view during brief network or database interruptions. */
    }
  }, [preview]);

  useEffect(() => {
    if (preview) return;
    void refreshMember();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refreshMember(); }, 30000);
    window.addEventListener("focus", refreshMember);
    return () => { clearInterval(timer); window.removeEventListener("focus", refreshMember); };
  }, [preview, refreshMember]);

  useEffect(() => {
    if (preview) return;
    const heartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: view }),
        keepalive: true
      }).catch(() => {});
    };
    heartbeat();
    const timer = setInterval(heartbeat, 30000);
    window.addEventListener("focus", heartbeat);
    return () => { clearInterval(timer); window.removeEventListener("focus", heartbeat); };
  }, [preview, view]);

  useEffect(() => {
    if (preview) return;
    const load = () => request<SiteSettings>("/api/settings").then(value => { setSettings(value); setSettingsReady(true); }).catch(e => setError(e.message));
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => clearInterval(timer);
  }, [preview]);

  const navigate = (next: View) => { setView(next); setMenuOpen(false); setError(""); };
  const loadWatchlist = useCallback(async () => { if (!preview) setWatchlist((await request<{ items: WatchItem[] }>("/api/watchlist")).items); }, [preview]);
  const loadNews = useCallback(async (q = "India stock market", source: "all" | "moneycontrol" | "google" = "all", mode: "standard" | "orders" = "standard") => {
    const requestId = ++newsRequestId.current;
    if (preview) {
      setNews(mode === "orders" ? demoNews.filter(item => /order|contract/i.test(item.title + " " + item.source)) : demoNews);
      return;
    }
    setNewsSource(source);
    setNewsBusy(true);
    setError("");
    try {
      const path = "/api/news?q=" + encodeURIComponent(q) + "&source=" + source + (mode === "orders" ? "&mode=orders" : "");
      const result = await request<{ items: NewsItem[]; warning?: string }>(path, mode === "orders" ? { cache: "no-store" } : {});
      if (requestId === newsRequestId.current) {setNews(result.items);if(result.warning)setError(result.warning);}
    } catch (e) {
      if (requestId === newsRequestId.current) {
        setNews([]);
        setError((e as Error).message);
      }
    } finally {
      if (requestId === newsRequestId.current) setNewsBusy(false);
    }
  }, [preview]);

  useEffect(() => { void loadWatchlist().catch(e => setError(e.message)); void loadNews(); }, [loadWatchlist, loadNews]);
  useEffect(() => {
    if (preview || view !== "News" || newsTab !== "orders") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadNews(query, "all", "orders");
    }, 120000);
    return () => clearInterval(timer);
  }, [preview, view, newsTab, query, loadNews]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 5000); return () => clearTimeout(id); }, [toast]);

  async function analyze(symbol: string) {
    if (!can(currentMember, "analyze")) return;
    navigate("Stock Analyzer");
    setBusy(true);
    setError("");
    setStock(null);
    setMatches([]);
    try {
      const result = preview ? demoStock(symbol) : await request<Stock>("/api/stocks?symbol=" + encodeURIComponent(symbol));
      setStock(result);
      try { const key = visitKey(preview ? "preview" : currentMember.email); localStorage.setItem(key, JSON.stringify(addVisit(readVisits(localStorage.getItem(key)), result))); } catch { /* Research still works without browser storage. */ }
      if (!preview) void request("/api/visits", {method:"POST",body:JSON.stringify({symbol:result.symbol,name:result.name})}).catch(() => setToast("Company opened; visit history could not sync."));
      setAnalyzed(items => [result, ...items.filter(i => i.symbol !== result.symbol)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    navigate("Stock Analyzer");
    setBusy(true);
    setError("");
    setMatches([]);
    try {
      const results = preview ? demoWatchlist.filter(item => (item.symbol + item.name).toLowerCase().includes(query.toLowerCase())) : (await request<{ results: { symbol: string; name: string }[] }>("/api/stocks?q=" + encodeURIComponent(query))).results;
      setMatches(results);
      if (!results.length) setError("No matching NSE or BSE companies found. Try a symbol such as TCS or RELIANCE.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const text = query.trim();
    if (view !== "Stock Analyzer" || text.length < 3) {
      if (view === "Stock Analyzer") setMatches([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = preview
          ? demoWatchlist.filter(item => (item.symbol + item.name).toLowerCase().includes(text.toLowerCase()))
          : (await request<{ results: { symbol: string; name: string }[] }>("/api/stocks?q=" + encodeURIComponent(text), { signal: controller.signal })).results;
        setMatches(results);
      } catch {
        if (!controller.signal.aborted) setMatches([]);
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query, view, preview]);

  async function add(symbol: string, name: string) {
    if (preview) { setToast("This is a read-only preview. Sign in to save your watchlist."); return; }
    setBusy(true);
    try {
      await request("/api/watchlist", { method: "POST", body: JSON.stringify({ items: [{ symbol, name, group: newGroup.trim() || "General" }] }) });
      await loadWatchlist();
      setToast(symbol + " saved to your watchlist.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(symbol: string) {
    if (preview) { setToast("This is a read-only preview."); return; }
    try {
      await request("/api/watchlist", { method: "DELETE", body: JSON.stringify({ symbol }) });
      await loadWatchlist();
      setToast("Removed from your watchlist.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reviewImport() {
    const entries = parseWatchlistEntries(importText);
    if (!entries.length || entries.length > 100) { setError("Enter between 1 and 100 companies or stock symbols, separated by commas or new lines."); return; }
    setBusy(true);
    setError("");
    try {
      const matches = preview
        ? entries.map(input => ({ input, choices: demoWatchlist.filter(item => item.symbol.toLowerCase() === input.toLowerCase() || item.name.toLowerCase().includes(input.toLowerCase())).map(item => ({ symbol: item.symbol, name: item.name, exchange: "NSE" })) }))
        : (await request<{ matches: { input: string; choices: ImportChoice[] }[] }>("/api/watchlist/resolve", { method: "POST", body: JSON.stringify({ entries }) })).matches;
      setImportMatches(matches.map(match => ({ ...match, symbol: match.choices[0]?.symbol || "" })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importItems() {
    const items = [...new Map((importMatches || []).flatMap(match => {
      const choice = match.choices.find(item => item.symbol === match.symbol);
      return choice ? [[choice.symbol, { symbol: choice.symbol, name: choice.name, group: newGroup.trim() || "General" }] as const] : [];
    })).values()];
    if (!items.length) { setError("Choose at least one matched company before importing."); return; }
    setBusy(true);
    setError("");
    try {
      if (preview) setWatchlist(prev => [...prev.filter(item => !items.some(added => added.symbol === item.symbol)), ...items]);
      else {
        await request("/api/watchlist", { method: "POST", body: JSON.stringify({ items }) });
        await loadWatchlist();
      }
      setImportOpen(false);
      setImportText("");
      setImportMatches(null);
      setToast(`Imported ${items.length} ${items.length === 1 ? "company" : "companies"} to your watchlist${preview ? " (Preview)" : ""}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function exportList() {
    const rows = [["Symbol", "Company", "Group"], ...watchlist.map(i => [i.symbol, i.name, i.group])].map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + rows], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "senganthal-watchlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleWatchlist = watchlist.filter(i => (group === "All groups" || i.group === group) && (i.name + i.symbol).toLowerCase().includes(watchQuery.toLowerCase()));
  const exitLabel = preview ? "Exit preview" : "Logout";
  const leaveWorkspace = () => preview && !member.reviewDemo ? window.location.assign("/login") : void signOut({ callbackUrl: "/login" });
  const displayName = currentMember.name?.trim() || currentMember.email.split("@")[0];
  const initials = displayName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const visibleNavigation = navigation.filter(item => item.name === "Admin" ? currentMember.role === "admin" : item.name === "Stock Analyzer" ? can(currentMember, "analyze") : item.name === "PDF Upload" ? currentMember.role === "admin" : item.name === "Swing Trade" ? can(currentMember, "swing") : true);
  const visibleNews = savedNewsOnly ? savedNews : news;
  useEffect(() => { if (view === "Admin" && currentMember.role !== "admin") setView("Dashboard"); }, [currentMember.role, view]);

  function openResearch(name: string) {
    const routes: Record<string, View> = { "Market Home": "Dashboard", "My Watchlists": "Watchlist", "News & Updates": "News", "Trading Strategies": "Swing Trade", "Stock Analyzer": "Stock Analyzer", "Team Chat": "Team Chat", "PDF Upload": "PDF Upload", "About Us": "About Us", Admin: "Admin" };
    if (routes[name]) { navigate(routes[name]); return; }
    setExplorePage(name); navigate("Explore");
  }
  function globalSearch(text: string) {
    const page = Object.values(researchNavigation).flat().find(name => name.toLowerCase().includes(text.toLowerCase()));
    if (page) openResearch(page);
    else if (can(currentMember, "analyze")) { setQuery(text); navigate("Stock Analyzer"); }
    else setToast("Your administrator can enable stock analysis for your account.");
  }
  const followResearchHash = useRef<(hash: string) => void>(() => {});
  useEffect(() => {
    followResearchHash.current = hash => {
      if (!hash) navigate("Dashboard");
      else if (hash.startsWith("search=")) globalSearch(hash.slice(7));
      else if (Object.values(researchNavigation).flat().includes(hash)) openResearch(hash);
    };
  });
  useEffect(() => {
    const followHash = () => {
      let hash = "";
      try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      followResearchHash.current(hash);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);
  return <ResearchShell view={view === "Explore" ? explorePage : view} member={currentMember} preview={preview} onNavigate={openResearch} onSearch={globalSearch} onLeave={leaveWorkspace}>
      {view === "Dashboard" && bannerVisible(settings.banner) && <div className="marketing-scroll dashboard-scroll" style={{ background: `linear-gradient(110deg,${settings.banner.colorStart},${settings.banner.colorEnd})`, color: settings.banner.textColor }}><span>{settings.banner.text}</span></div>}

      {error && <div role="alert" className="alert error">{error}<button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}

      {view === "Dashboard" && <><MarketHome preview={preview} onNavigate={openResearch} onAnalyze={symbol => void analyze(symbol)} allowed={can(currentMember, "analyze")} /><details className="research-all-reports" onToggle={event => { if (event.currentTarget.open) setReportsOpened(true); }}><summary>Full dashboard reports, migrations & shareholding</summary>{reportsOpened && <Dashboard preview={preview} watchlist={watchlist} analyzed={analyzed} onAnalyze={symbol => void analyze(symbol)} exportAllowed={currentMember.active} analysisAllowed={can(currentMember, "analyze")} canScan={currentMember.role === "admin"} />}</details></>}
      {view === "Explore" && <ResearchExplorer key={explorePage} page={explorePage} preview={preview} member={currentMember} watchlist={watchlist} analyzed={analyzed} onAnalyze={symbol => void analyze(symbol)} onNavigate={openResearch} />}
      {view === "About Us" && <><AboutUs content={settings.about} />{can(currentMember, "aboutEdit") && settingsReady && <ContentEditor preview={preview} member={currentMember} settings={settings} onSettings={setSettings} onError={setError} />}</>}
      {view === "Stock Analyzer" && <><div className="analyser-search-title">Search a stock <span>Type at least 3 letters for company suggestions</span></div><form className="search-form standalone analyser-search" onSubmit={search}><Search size={20} /><input aria-label="Company name or symbol" placeholder="Company name or NSE / BSE symbol" value={query} onChange={e => setQuery(e.target.value)} required /><button className="button primary" disabled={busy}>Search</button></form>{matches.length > 0 && <section className="panel search-results stock-suggestion-list" aria-label="Matching companies">{matches.map(m => <button key={m.symbol} disabled={busy} onClick={() => void analyze(m.symbol)}><CompanyLogo symbol={m.symbol} name={m.name}/><span className="suggestion-company-name"><strong>{m.name}</strong><small>{m.symbol}</small></span><span>Analyze <ArrowRight size={15} /></span></button>)}</section>}{busy ? <Loading text="Retrieving company data and fundamentals..." /> : stock ? <StockAnalysis key={stock.symbol} stock={stock} preview={preview} watchlist={watchlist} group={newGroup} onGroup={setNewGroup} onAdd={() => void add(stock.symbol, stock.name)} onAnalyze={symbol => void analyze(symbol)} onFilings={() => currentMember.role === "admin" ? navigate("PDF Upload") : setToast("PDF Upload is available for administrators only.")} canSave={can(currentMember, "watchlist")} canExport={can(currentMember, "export")} /> : <Empty title="Start with a company" text="Search by name or symbol, then select the exact company to see sourced fundamentals." />}</>}
      {view === "Watchlist" && <>
        <div className="toolbar"><div className="input-icon"><Search size={17} /><input aria-label="Search watchlist" placeholder="Find a saved company..." value={watchQuery} onChange={e => setWatchQuery(e.target.value)} /></div><select aria-label="Filter group" value={group} onChange={e => setGroup(e.target.value)}>{["All groups", ...new Set(watchlist.map(i => i.group))].map(g => <option key={g}>{g}</option>)}</select><button className="button secondary" disabled={!can(currentMember, "watchlist")} onClick={() => setImportOpen(!importOpen)}><Plus size={16} />Bulk import</button><button className="button secondary" onClick={exportList} disabled={!watchlist.length || !can(currentMember, "export")}><Download size={16} />Export CSV</button></div>
        {importOpen && <section className="panel watchlist-import">
          <h2>Bulk import companies</h2>
          <p className="muted">Enter up to 100 company names or symbols. Separate entries with commas or new lines.</p>
          <label>Group<input value={newGroup} onChange={e => setNewGroup(e.target.value)} maxLength={50} /></label>
          <label>Companies or symbols<textarea value={importText} onChange={e => { setImportText(e.target.value); setImportMatches(null); }} placeholder="Netweb Technologies, E2E Networks" rows={4} /></label>
          <button className="button primary" disabled={busy || !importText.trim()} onClick={() => void reviewImport()}><Search size={16} />Review matches</button>
          {importMatches && <div className="watchlist-import-review">
            <h3>Review company matches</h3>
            <div className="table-wrap"><table className="import-match-table"><thead><tr><th>Entered</th><th>Company and symbol</th></tr></thead><tbody>{importMatches.map((match, index) => <tr key={match.input + index}><td>{match.input}</td><td>{match.choices.length ? <select aria-label={"Company match for " + match.input} value={match.symbol} onChange={e => setImportMatches(rows => rows?.map((row, i) => i === index ? { ...row, symbol: e.target.value } : row) || null)}><option value="">Skip this entry</option>{match.choices.map(choice => <option key={choice.symbol} value={choice.symbol}>{choice.name} ({choice.symbol})</option>)}</select> : <span className="muted">No verified match. Check the spelling.</span>}</td></tr>)}</tbody></table></div>
            <button className="button primary" disabled={busy || !importMatches.some(match => match.symbol)} onClick={() => void importItems()}><Plus size={16} />Import {new Set(importMatches.map(match => match.symbol).filter(Boolean)).size} companies</button>
          </div>}
        </section>}
        <WatchlistAlerts preview={preview} member={currentMember} watchlist={watchlist} onAnalyze={symbol=>void analyze(symbol)}/><section className="panel watchlist-saved"><div className="panel-heading"><h2>Saved companies</h2><span className="count-badge">{visibleWatchlist.length} stocks</span></div>{visibleWatchlist.length ? <div className="table-wrap"><table className="watchlist-table"><thead><tr><th>Company</th><th>Group</th><th>Research</th><th></th></tr></thead><tbody>{visibleWatchlist.map(i => <tr key={i.symbol}><td className="watchlist-company"><div className="watchlist-company-identity"><CompanyLogo symbol={i.symbol} name={i.name}/><span><strong>{i.name}</strong><small>{i.symbol}</small></span></div></td><td className="watchlist-group"><span className="pill">{i.group}</span></td><td className="watchlist-research"><button className="text-button" disabled={!can(currentMember, "analyze")} onClick={() => void analyze(i.symbol)}>Analyze <ArrowUpRight size={15} /></button></td><td className="watchlist-remove"><button className="icon-button" aria-label={"Remove " + i.symbol} disabled={!can(currentMember, "watchlist")} onClick={() => void remove(i.symbol)}><X size={16} /></button></td></tr>)}</tbody></table></div> : <Empty title="No saved companies here" text="Add a company from Stock Analyzer or import a list of symbols." />}</section>
      </>}
      {view === "News" && <>
        <form className="search-form standalone" onSubmit={e => { e.preventDefault(); void loadNews(newsTab === "orders" ? query : query || "India stock market", newsSource, newsTab === "orders" ? "orders" : "standard"); }}>
          <Search size={19} />
          <input aria-label="News search" placeholder={newsTab === "orders" ? "Filter by company name..." : "Search company or market news..."} value={query} onChange={e => setQuery(e.target.value)} />
          <button className="button primary" disabled={newsBusy}>Search news</button>
        </form>
        <div className="tabs">
          <button className={newsTab === "market" ? "selected" : ""} onClick={() => { setNewsTab("market"); setQuery(""); void loadNews("India stock market", "all"); }}>Indian markets</button>
          <button className={newsTab === "orders" ? "selected" : ""} onClick={() => { setNewsTab("orders"); setQuery(""); void loadNews("", "all", "orders"); }}>Order Wins / Contracts</button>
          <button className={newsTab === "results" ? "selected" : ""} onClick={() => { setNewsTab("results"); setQuery("quarterly results"); void loadNews("India company quarterly results", "all"); }}>Company results</button>
          <button className={newsTab === "moneycontrol" ? "selected" : ""} onClick={() => { setNewsTab("moneycontrol"); void loadNews("India stock market", "moneycontrol"); }}>Moneycontrol</button>
          <button className={newsTab === "global" ? "selected" : ""} onClick={() => { setNewsTab("global"); void loadNews("US global stock market", "google"); }}>Global markets</button>
        </div>
        <div className="news-controls"><span>{savedNewsOnly ? `${savedNews.length} saved stories` : `${news.length} current stories`}</span><button className="button secondary" aria-pressed={savedNewsOnly} onClick={() => setSavedNewsOnly(!savedNewsOnly)}>{savedNewsOnly ? "Show latest" : `Saved (${savedNews.length})`}</button><button className="button secondary" disabled={newsBusy} onClick={() => void loadNews(newsTab === "orders" ? query : query || "India stock market", newsSource, newsTab === "orders" ? "orders" : "standard")}>Refresh</button></div>
        {newsBusy && !savedNewsOnly && <Loading text="Loading market news..." />}
        {(!newsBusy || savedNewsOnly) && <div className="news-grid">{visibleNews.map(item => <NewsCard key={item.url + item.title} item={item} preview={preview} saved={savedNews.some(row => row.url === item.url && row.title === item.title)} onSave={() => toggleSavedNews(item)}/>)}</div>}
        {!visibleNews.length && !newsBusy && <Empty title={savedNewsOnly ? "No saved stories yet" : newsTab === "orders" ? "No recent order wins" : "No news found"} text={savedNewsOnly ? "Use the bookmark on a news card to keep it here." : newsTab === "orders" ? "No matching order or contract wins were published today or yesterday (IST)." : "Try a company name or a broader search."} />}
      </>}
      {view === "Team Chat" && <ChatPanel preview={preview} canPost={can(currentMember, "chat")} onError={setError} />}
      {view === "Admin" && currentMember.role === "admin" && (settingsReady ? <Administration preview={preview} member={currentMember} settings={settings} onSettings={setSettings} onError={setError} /> : <Loading />)}
      {view === "PDF Upload" && currentMember.role === "admin" && <ReportsPanel preview={preview} initialSymbol={stock?.symbol || ""} onError={setError} />}
      {view === "Swing Trade" && <SwingPanel preview={preview} watchlist={watchlist} onError={setError} />}
      <footer className="page-footer"><span><Flower2 size={14} />Senganthal Research Terminal</span><span>Educational research only - verify figures with official filings.</span></footer>
    {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
  </ResearchShell>;
}

function InfoIcon() {
  return <BookOpen size={14} />;
}
