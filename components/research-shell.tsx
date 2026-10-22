"use client";
import { useAccountStorage } from "./account-storage";
import { useEffect, useState } from "react";
import { BarChart3, Search, LayoutGrid, PiggyBank, NotebookPen, MessageCircle, Menu, X, LogOut, ChevronRight, ArrowLeft, BookOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { Member } from "@/lib/types";
import { can } from "@/lib/permissions";
import { ThemeToggle } from "./theme";
import { ResearchIcon } from "./research-art";

export const researchNavigation = {
  Market: ["Market Home", "Indices", "Investment Cases", "Trending Stocks", "News & Updates", "Deals", "FII / DII Activity", "Sectors", "Research Insights", "IPO", "Investors", "SME Zone", "Learn"],
  Analytics: ["Analytics Home", "Scans", "Custom Scans", "Combination Scans", "Chart Patterns", "Trading Strategies", "Fundamental Scores", "Sector Rotation", "Market Breadth", "Index Analytics", "Investor Portfolios", "Investment Themes", "Company Filings", "Business Houses", "F&O Zone"],
  "My Space": ["Stock Analyzer", "My Watchlists", "My Portfolio", "Team Chat", "PDF Upload", "About Us", "Admin"],
  "Mutual Funds": ["Fund Explorer"]
};
export type ResearchGroup = keyof typeof researchNavigation;
const aliases: Record<string,string> = { Dashboard: "Market Home", Watchlist: "My Watchlists", News: "News & Updates", "Swing Trade": "Trading Strategies" };

export function ResearchShell({ children, view, member, preview, onNavigate, onSearch, onLeave }: { children: React.ReactNode; view: string; member: Member; preview: boolean; onNavigate: (name:string)=>void; onSearch:(query:string)=>void; onLeave:()=>void }) {
  const current = aliases[view] || view;
  const inferred = (Object.entries(researchNavigation).find(([,items])=>items.includes(current))?.[0] || "Market") as ResearchGroup;
  const [group,setGroup] = useState<ResearchGroup>(inferred);
  const [menu,setMenu] = useState(false);
  const [side,setSide] = useState<"notes"|null>(null);
  const [infoOpen,setInfoOpen] = useState(false);
  const [search,setSearch] = useState("");
  const {value:note,setValue:setNote,status:noteStatus,ready:notesReady,retry:retryNotes} = useAccountStorage("note:"+current,"",preview,member.email);
  useEffect(()=>{setGroup(inferred);setMenu(false)},[inferred,current]);
  const permitted = (name:string) => name === "Admin" || name === "PDF Upload" ? member.role === "admin" : name === "Stock Analyzer" ? can(member,"analyze") : name === "Trading Strategies" ? can(member,"swing") : true;
  function go(name:string) {onNavigate(name);setMenu(false);setInfoOpen(false);window.history.replaceState(null,"","#"+encodeURIComponent(name))}
  return <div data-section={inferred} className={`research-shell ${side?'':'info-closed'}`}>
    <a className="skip-content" href="#research-content">Skip to research</a>
    <header className="research-header">
      <button className="research-brand" onClick={()=>go("Market Home")} aria-label="Senganthal market home"><img src="/senganthal-logo-transparent.png" alt=""/><span>SENGANTHAL<small>RESEARCH & COMMUNITY</small></span></button>
      <form className="global-research-search" onSubmit={e=>{e.preventDefault();if(search.trim()){onSearch(search.trim());setSearch("")}}}><Search size={21}/><input aria-label="Search the research workspace" placeholder="Search for stocks, scans and more" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>↵</kbd></form>
      <div className="research-header-actions"><ThemeToggle/><span className="research-member" title={member.email}>{member.name?.split(" ")[0]||"Member"}<small>{preview?"Explore demo":"Member workspace"}</small></span><button className="icon-button" onClick={onLeave} title={preview?"Exit preview":"Sign out"} aria-label={preview?"Exit preview":"Sign out"}><LogOut size={17}/></button><button className="icon-button research-mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Toggle navigation" aria-expanded={menu}>{menu?<X size={19}/>:<Menu size={19}/>}</button></div>
    </header>
    <nav className="research-rail" aria-label="Research categories">{([{name:"Market",Icon:BarChart3},{name:"Analytics",Icon:Search},{name:"My Space",Icon:LayoutGrid},{name:"Mutual Funds",Icon:PiggyBank}] as const).map(({name,Icon})=><button key={name} className={group===name?'selected':''} onClick={()=>{setGroup(name);setMenu(true)}} aria-pressed={group===name}><Icon size={21}/><span>{name}</span></button>)}<button onClick={()=>go("About Us")} className={`rail-about ${current==='About Us'?'active':''}`} aria-current={current==='About Us'?'page':undefined}><ResearchIcon kind="About Us" size={30}/><span>About Us</span></button><button onClick={()=>go("Learn")} className="rail-bottom"><BookOpen size={20}/><span>Learn</span></button></nav>
    <nav className={`research-sidebar ${menu?'open':''}`} aria-label="Main navigation"><div className="research-sidebar-title">{group}<button className="icon-button research-mobile-menu" aria-label="Close navigation" onClick={()=>setMenu(false)}><X size={16}/></button></div><div className="research-nav-items">{researchNavigation[group].filter(permitted).map(name=><button key={name} className={`nav-item ${current===name?'active':''}`} aria-current={current===name?'page':undefined} onClick={()=>go(name)}><ResearchIcon kind={name} size={25}/><span>{name}</span>{current===name&&<ChevronRight size={13}/>}</button>)}</div><div className="research-sidebar-foot"><span className="free-dot"/>Independent market research tools</div></nav>
    {menu&&<button className="research-mobile-shade" aria-label="Close navigation backdrop" onClick={()=>setMenu(false)}/>}
    <main id="research-content" className="research-content" key={current}>
      <div className="research-page-title"><button aria-label="Return to market home" className="text-button" onClick={()=>go("Market Home")}><ArrowLeft size={21}/></button><h1>{current}</h1><button className="icon-button info-toggle" aria-label={side?"Hide notes":"Show notes"} onClick={()=>{if(window.innerWidth<=1000){setSide("notes");setInfoOpen(!infoOpen)}else setSide(side?null:"notes")}}>{side?<PanelRightClose size={18}/>:<PanelRightOpen size={18}/>}</button></div>
      {preview&&<div className="research-demo-label">DEMO WORKSPACE <span>Illustrative figures · explore every tool for free</span></div>}
      <div className="research-page-body">{children}</div>
    </main>
    {side&&<aside className="research-info" data-open={infoOpen}><div className="research-sidebar-title">Research notes<button className="icon-button info-mobile-close" onClick={()=>{setSide(null);setInfoOpen(false)}} aria-label="Close notes"><X size={16}/></button></div><div className="research-info-body"><h3>Your notes on {current}</h3><p className="muted">{preview?"Saved in this preview browser.":"Saved to your account across devices."}</p><textarea aria-label="Personal research notes" placeholder="Capture a question, observation or follow-up…" rows={14} maxLength={10000} value={typeof note==='string'?note:''} disabled={!notesReady} onChange={e=>setNote(e.target.value)}/><small role="status">{noteStatus}</small>{noteStatus.startsWith("Not synced")&&<button className="text-button" onClick={retryNotes}>Retry save</button>}</div></aside>}
    <nav className="research-tools-rail" aria-label="Workspace utilities"><button className={side==='notes'?'selected':''} onClick={()=>{setSide('notes');setInfoOpen(true)}}><NotebookPen size={20}/><span>Notes</span></button><button onClick={()=>go('My Portfolio')}><PiggyBank size={20}/><span>Holdings</span></button><button onClick={()=>go('Team Chat')}><MessageCircle size={20}/><span>Club</span></button></nav>
  </div>;
}
