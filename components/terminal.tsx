"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Download, FileText, Flower2, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Newspaper, Plus, Search, ShieldCheck, Star, Sun, TrendingUp, X } from "lucide-react";
import type { Member, NewsItem, Stock, WatchItem } from "@/lib/types";
import { demoNews, demoStock, demoWatchlist } from "@/lib/demo";
import { csvCell, relativeTime } from "@/lib/analytics";
import { Empty, Loading, request } from "./ui";
import { ChatPanel, ReportsPanel, SwingPanel } from "./workflows";
import { StockAnalysis } from "./stock-analysis";
import { Dashboard } from "./dashboard";
import { Administration, ContentEditor } from "./administration";
import { Banner, AboutUs } from "./community";
import { defaultSettings, type SiteSettings } from "@/lib/site-settings";
import { can, roleNames } from "@/lib/permissions";

type View = "Dashboard" | "Stock Analyzer" | "Watchlist" | "News" | "Team Chat" | "PDF Upload" | "Swing Trade" | "Admin" | "About Us";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
  const [newsSource, setNewsSource] = useState<"all" | "moneycontrol" | "google">("all");
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [analyzed, setAnalyzed] = useState<Stock[]>([]);
  const [settingsReady, setSettingsReady] = useState(preview);
  const [group, setGroup] = useState("All groups");
  const [watchQuery, setWatchQuery] = useState("");
  const [newGroup, setNewGroup] = useState("General");
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("senganthal-theme");
    const next = saved === "dark" || saved === "light" ? saved : window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    setClock(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " IST");
  }, []);

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
    const load = () => request<SiteSettings>("/api/settings").then(value => { setSettings(value); setSettingsReady(true); }).catch(e => setError(e.message));
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => clearInterval(timer);
  }, [preview]);

  const navigate = (next: View) => { setView(next); setMenuOpen(false); setError(""); };
  const loadWatchlist = useCallback(async () => { if (!preview) setWatchlist((await request<{ items: WatchItem[] }>("/api/watchlist")).items); }, [preview]);
  const loadNews = useCallback(async (q = "India stock market", source: "all" | "moneycontrol" | "google" = "all") => {
    if (preview) return;
    setNewsSource(source);
    setNewsBusy(true);
    setError("");
    try {
      setNews((await request<{ items: NewsItem[] }>("/api/news?q=" + encodeURIComponent(q) + "&source=" + source)).items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setNewsBusy(false);
    }
  }, [preview]);

  useEffect(() => { void loadWatchlist().catch(e => setError(e.message)); void loadNews(); }, [loadWatchlist, loadNews]);
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

  async function importItems() {
    if (preview) { setToast("Sign in to import a watchlist."); return; }
    const symbols = [...new Set(importText.toUpperCase().split(/[\s,;]+/).filter(Boolean))];
    if (!symbols.length || symbols.length > 100) { setError("Enter between 1 and 100 stock symbols."); return; }
    setBusy(true);
    try {
      await request("/api/watchlist", { method: "POST", body: JSON.stringify({ items: symbols.map(symbol => ({ symbol, name: symbol, group: newGroup.trim() || "General" })) }) });
      await loadWatchlist();
      setImportOpen(false);
      setImportText("");
      setToast("Watchlist imported.");
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

  function switchTheme() {
    setTheme(current => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("senganthal-theme", next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  }

  const visibleWatchlist = watchlist.filter(i => (group === "All groups" || i.group === group) && (i.name + i.symbol).toLowerCase().includes(watchQuery.toLowerCase()));
  const exitLabel = preview ? "Exit preview" : "Logout";
  const leaveWorkspace = () => preview ? window.location.assign("/login") : void signOut({ callbackUrl: "/login" });
  const displayName = currentMember.name?.trim() || currentMember.email.split("@")[0];
  const initials = displayName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const visibleNavigation = navigation.filter(item => item.name === "Admin" ? currentMember.role === "admin" : item.name === "Stock Analyzer" ? can(currentMember, "analyze") : item.name === "PDF Upload" ? can(currentMember, "reports") : item.name === "Swing Trade" ? can(currentMember, "swing") : true);
  useEffect(() => { if (view === "Admin" && currentMember.role !== "admin") setView("Dashboard"); }, [currentMember.role, view]);

  return <div className="app-shell modern-shell" data-theme={theme}>
    <header className="app-header">
      <div className="brand-actions">
        <a href={preview ? "/preview" : "/"} className="brand-card">
          <img className="brand-logo" src="/senganthal-logo.jpg" alt="Senganthal logo" />
          <span><strong lang="ta">செங்காந்தள் முதலீட்டுக் குடும்பம்</strong><small>பங்குச்சந்தை அடிப்படை பகுப்பாய்வு</small></span>
          <em>{clock}</em>
        </a>
        <div className="header-actions">
          <div className="signed-in-user" title={currentMember.email}>
            <span className="top-avatar">{initials}</span>
            <span><strong>{displayName}</strong><small>{roleNames[currentMember.role]}</small></span>
          </div>
          <button className="button secondary" onClick={() => setToast("Password changes are managed by your sign-in provider.")}><KeyRound size={15} />Change Password</button>
          <button className="button secondary" onClick={switchTheme}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}{theme === "dark" ? "Light" : "Dark"}</button>
          <button className="topbar-logout danger" onClick={leaveWorkspace}><LogOut size={15} />{exitLabel}</button>
          <button className="icon-button nav-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(v => !v)}><Menu size={20} /></button>
        </div>
      </div>
      <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Main navigation">
        {visibleNavigation.map(item => <button key={item.name} className={view === item.name ? "nav-item active" : "nav-item"} aria-current={view === item.name ? "page" : undefined} onClick={() => navigate(item.name)}><item.icon size={16} /><span>{item.name}</span>{item.name === "Watchlist" && <span className="nav-count">{watchlist.length}</span>}</button>)}
      </nav>
    </header>

    {preview && <div className="preview-banner"><InfoIcon />Sample workspace - all figures are illustrative. Content edits stay in this preview.<a href="/login">Go to sign in <ArrowUpRight size={13} /></a></div>}

    <main className="main-content">
      <div className="page-heading"><div><div className="eyebrow">{view === "Dashboard" ? "YOUR DAILY PERSPECTIVE" : "SENGANTHAL RESEARCH"}</div><h1>{view === "Dashboard" ? "Market overview" : view}</h1><p>{subtitles[view]}</p></div></div>
      {error && <div role="alert" className="alert error">{error}<button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}

      {view === "Dashboard" && <><Banner value={settings.banner} /><Dashboard preview={preview} watchlist={watchlist} analyzed={analyzed} onAnalyze={symbol => void analyze(symbol)} exportAllowed={can(currentMember, "export")} analysisAllowed={can(currentMember, "analyze")} /></>}
      {view === "About Us" && <><AboutUs content={settings.about} />{can(currentMember, "aboutEdit") && settingsReady && <ContentEditor preview={preview} member={currentMember} settings={settings} onSettings={setSettings} onError={setError} />}</>}
      {view === "Stock Analyzer" && <><div className="analyser-search-title">Search a stock <span>Company name - NSE / BSE symbol</span></div><form className="search-form standalone analyser-search" onSubmit={search}><Search size={20} /><input aria-label="Company name or symbol" placeholder="Company name or NSE / BSE symbol" value={query} onChange={e => setQuery(e.target.value)} required /><button className="button primary" disabled={busy}>Search</button></form>{matches.length > 0 && <section className="panel search-results">{matches.map(m => <button key={m.symbol} disabled={busy} onClick={() => void analyze(m.symbol)}><span><strong>{m.name}</strong><small>{m.symbol}</small></span><span>Analyze <ArrowRight size={15} /></span></button>)}</section>}{busy ? <Loading text="Retrieving company data and fundamentals..." /> : stock ? <StockAnalysis key={stock.symbol} stock={stock} preview={preview} watchlist={watchlist} group={newGroup} onGroup={setNewGroup} onAdd={() => void add(stock.symbol, stock.name)} onAnalyze={symbol => void analyze(symbol)} onFilings={() => can(currentMember, "reports") ? navigate("PDF Upload") : setToast("Your account does not have access to PDF Upload. Ask your administrator.")} canSave={can(currentMember, "watchlist")} canExport={can(currentMember, "export")} /> : <Empty title="Start with a company" text="Search by name or symbol, then select the exact company to see sourced fundamentals." />}</>}
      {view === "Watchlist" && <><div className="toolbar"><div className="input-icon"><Search size={17} /><input aria-label="Search watchlist" placeholder="Find a saved company..." value={watchQuery} onChange={e => setWatchQuery(e.target.value)} /></div><select aria-label="Filter group" value={group} onChange={e => setGroup(e.target.value)}>{["All groups", ...new Set(watchlist.map(i => i.group))].map(g => <option key={g}>{g}</option>)}</select><button className="button secondary" disabled={!can(currentMember, "watchlist")} onClick={() => setImportOpen(!importOpen)}><Plus size={16} />Bulk import</button><button className="button secondary" onClick={exportList} disabled={!watchlist.length || !can(currentMember, "export")}><Download size={16} />Export CSV</button></div>{importOpen && <section className="panel"><h2>Import stock symbols</h2><p className="muted">Paste up to 100 NSE symbols separated by commas or new lines. Use .BO for BSE.</p><label>Group<input value={newGroup} onChange={e => setNewGroup(e.target.value)} maxLength={50} /></label><label>Symbols<textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="TCS, RELIANCE, HDFCBANK" rows={4} /></label><button className="button primary" disabled={busy} onClick={() => void importItems()}>Import watchlist</button></section>}<section className="panel"><div className="panel-heading"><h2>Saved companies</h2><span className="count-badge">{visibleWatchlist.length} stocks</span></div>{visibleWatchlist.length ? <div className="table-wrap"><table><thead><tr><th>Company</th><th>Group</th><th>Research</th><th></th></tr></thead><tbody>{visibleWatchlist.map(i => <tr key={i.symbol}><td><strong>{i.symbol}</strong><small>{i.name}</small></td><td><span className="pill">{i.group}</span></td><td><button className="text-button" disabled={!can(currentMember, "analyze")} onClick={() => void analyze(i.symbol)}>Analyze <ArrowUpRight size={15} /></button></td><td><button className="icon-button" aria-label={"Remove " + i.symbol} disabled={!can(currentMember, "watchlist")} onClick={() => void remove(i.symbol)}><X size={16} /></button></td></tr>)}</tbody></table></div> : <Empty title="No saved companies here" text="Add a company from Stock Analyzer or import a list of symbols." />}</section></>}
      {view === "News" && <><form className="search-form standalone" onSubmit={e => { e.preventDefault(); void loadNews(query || "India stock market", newsSource); }}><Search size={19} /><input aria-label="News search" placeholder="Search company or market news..." value={query} onChange={e => setQuery(e.target.value)} /><button className="button primary" disabled={newsBusy}>Search news</button></form><div className="tabs"><button className={newsSource==='all'?'selected':''} onClick={() => void loadNews("India stock market", "all")}>Indian markets</button><button className={newsSource==='moneycontrol'?'selected':''} onClick={() => void loadNews("India stock market", "moneycontrol")}>Moneycontrol</button><button onClick={() => void loadNews("US global stock market", "google")}>Global markets</button><button onClick={() => void loadNews("India company quarterly results", "all")}>Company results</button></div>{newsBusy ? <Loading text="Loading market news..." /> : <div className="news-grid">{news.map((n, i) => <a className="panel news-card" href={n.url} target="_blank" rel="noreferrer" key={n.url + i}><span className="eyebrow">{n.source}</span><h2>{n.title}</h2><div className="news-bottom"><span className="small muted">{preview ? "Sample article" : relativeTime(n.publishedAt)}</span><ArrowUpRight size={19} /></div></a>)}</div>}{!news.length && !newsBusy && <Empty title="No news found" text="Try a company name or a broader search." />}</>}
      {view === "Team Chat" && <ChatPanel preview={preview} canPost={can(currentMember, "chat")} onError={setError} />}
      {view === "Admin" && currentMember.role === "admin" && (settingsReady ? <Administration preview={preview} member={currentMember} settings={settings} onSettings={setSettings} onError={setError} /> : <Loading />)}
      {view === "PDF Upload" && <ReportsPanel preview={preview} initialSymbol={stock?.symbol || ""} onError={setError} />}
      {view === "Swing Trade" && <SwingPanel preview={preview} watchlist={watchlist} onError={setError} />}
      <footer className="page-footer"><span><Flower2 size={14} />Senganthal Research Terminal</span><span>Educational research only - verify figures with official filings.</span></footer>
    </main>

    {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
  </div>;
}

function InfoIcon() {
  return <BookOpen size={14} />;
}
