"use client";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight, ChevronDown, Phone, MessageCircle, ShieldCheck, Sparkles, Search, X, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "./theme";
import { ResearchIcon, ResearchIllustration, PatternDrawing } from "./research-art";
import { HomeAnnouncement } from "./home-announcement";
import { EmailAccess } from "./email-access";
import type { AnnouncementContent } from "@/lib/site-settings";
import { publicBusiness, publicLinks } from "@/lib/public-content";
import { MembershipOffer } from './membership-offer';
const whatsapp="https://wa.me/919025839615?text=Hello%2C%20I%20would%20like%20details%20about%20the%20Senganthal%20fundamental%20analysis%20classes.";
export default function Login({configured,error,emailAvailable,previewAvailable,announcement}:{configured:boolean;error?:string;emailAvailable:boolean;previewAvailable:boolean;announcement:AnnouncementContent}) {
 const [busy,setBusy]=useState(false),[signInError,setSignInError]=useState(''),[explore,setExplore]=useState(false),[banner,setBanner]=useState(true),[query,setQuery]=useState('');
 const menu=useRef<HTMLDivElement>(null);
 useEffect(()=>{function close(e:KeyboardEvent){if(e.key==='Escape')setExplore(false)}function outside(e:PointerEvent){if(menu.current&&!menu.current.contains(e.target as Node))setExplore(false)}document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside)}},[]);
 const destination=(name:string)=>previewAvailable?'/preview#'+encodeURIComponent(name):'#workspace-access';
 return <main className="edge-welcome">
 {banner&&<div className="welcome-banner"><span lang="ta">சேர்ந்து கற்போம், முதலீடு செய்வோம், சேர்ந்து வளர்வோம்!</span><span>Explore. Learn. Grow together.</span><button aria-label="Dismiss announcement" onClick={()=>setBanner(false)}><X size={17}/></button></div>}
 <header className="welcome-nav"><a className="welcome-brand" href="/"><img src="/senganthal-logo-transparent.png" alt="Senganthal"/><span>SENGANTHAL<small>செங்காந்தள் முதலீட்டுக் குடும்பம்</small></span></a><form className="welcome-search" action={previewAvailable?'/preview':'/login'} onSubmit={e=>{e.preventDefault();if(previewAvailable)window.location.assign('/preview#search='+encodeURIComponent(query));else document.getElementById('workspace-access')?.scrollIntoView({behavior:'smooth'})}}><Search size={17}/><input aria-label="Search stocks and research tools" placeholder="Search stocks, scans & more" value={query} onChange={e=>setQuery(e.target.value)}/></form><div ref={menu} className="welcome-explore"><button aria-expanded={explore} aria-controls="explore-menu" onClick={()=>setExplore(!explore)}>Explore <ChevronDown size={15}/></button>{explore&&<div id="explore-menu" className="welcome-mega-menu">{[['Market',['Trending Stocks','FII / DII Activity','IPO','Deals']],['Analytics Tools',['Scans','Trading Strategies','Chart Patterns','Sector Rotation']],['Personal Research',['My Portfolio','My Watchlists','Custom Scans','Combination Scans']]].map(([heading,names])=><section key={String(heading)}><span>{heading}</span><div>{(names as string[]).map(name=><a href={destination(name)} key={name}><ResearchIcon kind={name} size={37}/>{name}</a>)}</div></section>)}</div>}</div><a className="welcome-learn-link" href="#learning">Learn</a><a className="welcome-learn-link welcome-pricing-link" href="/pricing">Pricing</a><ThemeToggle/><a className="button secondary welcome-login-link" href="#workspace-access">Login</a><a className="button primary" href={previewAvailable?'/preview':'#workspace-access'}>{previewAvailable?'Explore demo':'Get Started'}</a></header>
 {explore&&<div className="welcome-menu-shade"/>}

 <section className="welcome-hero"><div><div className="anniversary-ribbon">Market data & independent research tools</div><h1>Stock Discovery to Conviction:<br/><em>Simplified</em></h1><p>Stock research, deep analytics, market insights and portfolio tracking.<br/>A clearer view. All in one place.</p><div className="welcome-hero-actions"><a className="button primary" href={previewAvailable?'/preview#Team%20Chat':'#workspace-access'}>Explore the Workspace <ArrowRight size={17}/></a><a className="button secondary" href="#learning">Discover Our Tools</a></div><div className="welcome-facts"><span><strong>Market & Analytics</strong>From the big picture to the details</span><span><strong>Your Research</strong>Watchlists, notes and holdings</span><span><strong>Access & pricing</strong><a href="/pricing">See current plan status</a></span></div></div><div className="welcome-hero-art"><ResearchIllustration/><div className="welcome-art-label"><span><i/>A workspace built for curious investors</span><small>Illustrative research display</small></div><a href="tel:+919025839615">Call us for any queries: <Phone size={14}/> <strong>+91 90258 39615</strong></a></div></section>
 <MembershipOffer/>
 {announcement.enabled && <div id="classes" className="welcome-announcement"><HomeAnnouncement value={announcement}/></div>}
 <section className="welcome-today" id="learning"><h2>What’s Happening in <span>Markets Today</span></h2><p>A daily perspective. A deeper understanding.</p><div className="welcome-discovery-grid">{[['Top Stocks','Find the stocks moving today','Trending Stocks'],['Momentum Scan','Explore price, volume and trend','Scans'],['Fundamental Score','Understand the quality of a business','Fundamental Scores']].map(([title,description,target],i)=><a className="welcome-discovery-card" href={destination(target)} key={title}><header><ResearchIcon kind={target} size={34}/><span><strong>{title}</strong><small>{description}</small></span><ChevronDown size={14}/></header>{i===0?<div className="welcome-mock-table">{[['Company A','+2.16%'],['Company B','+1.87%'],['Company C','−0.65%']].map(([name,value],j)=><div key={name}><span>{name}</span><i style={{width:55+j*14}}/><strong className={j===2?'negative':'positive'}>{value}</strong></div>)}</div>:i===1?<div className="welcome-mini-chart"><PatternDrawing kind={3}/><span>Price · Momentum · Volume</span></div>:<div className="welcome-score-art"><svg viewBox="0 0 120 100"><polygon points="60,5 102,28 102,73 60,96 18,73 18,28" fill="#eff9f6" stroke="#abd5c9"/><path d="M60 5v91M18 28l84 45M18 73l84-45" stroke="#bfdacf"/><polygon points="60,17 88,37 98,69 60,76 28,67 36,38" fill="#62c5b0" fillOpacity=".6" stroke="#22a38a"/></svg><strong>Quality. Growth. Value.</strong></div>}<footer>Explore {title.toLowerCase()} <ArrowRight size={14}/></footer></a>)}</div><small className="welcome-demo-caption">Illustrations show sample data, not current market quotes.</small></section>
 <section className="welcome-pathways"><h2>Choose your path to better research</h2><p>Tools to explore independently. A community to learn together.</p><div className="welcome-pathway-headings"><h3>Do It Yourself</h3><h3>Research Together</h3></div><div className="welcome-pathway-grid">{[['scans','Discover stocks with ready-made or custom scans','Explore Scans','Scans'],['chat','Build your understanding with a thoughtful research community','Meet the Community','About Us'],['sector','Know the sectors and stocks gaining market momentum','Explore Sectors','Sector Rotation'],['portfolio','Keep your ideas, watchlists and holdings in one place','Explore Your Workspace','My Portfolio']].map(([kind,title,label,target])=><a key={title} href={destination(target)}><div className="pathway-illustration"><ResearchIcon kind={kind} size={86}/><span>{label} <ChevronDown size={15}/></span></div><h3>{title}</h3></a>)}</div></section>
 <section className="welcome-investment"><div><span className="eyebrow">FROM IDEAS TO UNDERSTANDING</span><h2>Make fundamentals<br/>your foundation.</h2><p>Build a repeatable research process with Senganthal.</p>{['Read financial statements and company filings','Explore valuations, trends and sector performance','Keep your observations in your own research workspace'].map(t=><div className="welcome-check" key={t}><CheckCircle2 size={18}/>{t}</div>)}<a className="button primary" href={whatsapp} target="_blank" rel="noreferrer">Ask about our learning community <ArrowUpRight size={16}/></a></div><div className="welcome-access">
          <section id="workspace-access" className="login-terminal-card">
            <div className="terminal-card-top">
              <span className="terminal-status-badge">
                <span className="pulse-indicator" />
                WORKSPACE ACCESS
              </span>
              <span className="terminal-auth-type">Member sign-in</span>
            </div>

            <h2>Sign In to Terminal</h2>
            <p className="terminal-card-desc">
              Already registered? Sign in with your email and site password. New members create an account with Google once.
            </p>

            {(error || signInError) && (
              <div role="alert" className="login-alert-error">
                {signInError ||
                  (error === "ServiceUnavailable"
                    ? "The team database could not be reached. Please try again shortly or contact your administrator."
                    : error === "AlreadyRegistered"
                    ? "This Google account is already registered. Sign in below with your email and site password, or reset the password."
                    : error === "AccessDenied"
                    ? "This account is unavailable or its access has been revoked. Please contact your administrator."
                    : "Sign-in could not be completed. Check your connection or contact your administrator.")}
              </div>
            )}

            {!configured && (
              <div className="login-alert-warning">
                Google sign-in is awaiting setup. Your administrator needs to connect Google and the team database before members can sign in.
              </div>
            )}

            <EmailAccess emailAvailable={emailAvailable} />

            <div className="email-access-signup"><h3>New member? Create your account</h3><p className="small muted">Use Google to verify your identity for first-time setup. After setup, sign in with the email and password you choose.</p></div>
            <button
              className="google-signin-btn"
              disabled={!configured || busy}
              onClick={async () => {
                setBusy(true);
                setSignInError("");
                try {
                  await signIn("google", { callbackUrl: "/complete-account" });
                } catch {
                  setSignInError("Could not open Google sign-in. Check your connection and try again.");
                  setBusy(false);
                }
              }}
            >
              <span className="google-icon-circle">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </span>
              <span className="btn-text">{busy ? "Opening Google..." : "Sign up with Google"}</span>
              <ArrowUpRight size={18} className="btn-arrow" />
            </button>

            {previewAvailable && (
              <a href="/preview" className="login-preview-action">
                <Sparkles size={15} />
                <span>Take a Look Inside (Demo Terminal)</span>
                <ArrowUpRight size={15} />
              </a>
            )}

            <div className="terminal-security-footer">
              <ShieldCheck size={14} />
              <span>Verified Google registration · protected email sign-in</span>
            </div>
          </section>
 </div></section><footer className="welcome-footer"><a className="welcome-brand" href="/"><img src="/senganthal-logo-transparent.png" alt=""/><span>SENGANTHAL<small>Research & Community</small></span></a><p>{publicBusiness.name}<br/>{publicBusiness.description}<br/>Educational research · Verify figures with original filings.</p><a href="tel:+919025839615"><Phone size={15}/> Contact us</a><a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a><nav className="welcome-legal-links" aria-label="Website information">{publicLinks.map(link=><a href={link.href} key={link.href}>{link.label}</a>)}</nav></footer>
 </main>;
}
