"use client";
import { signIn } from "next-auth/react";
import {
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Phone,
  MessageCircle,
  TrendingUp,
  Layers,
  Award,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { useState } from "react";

const topics = [
  "Read balance sheets and cash flow with confidence",
  "Understand financial ratios and business quality",
  "Explore growth opportunities and long-term potential",
  "Build a framework for valuation and risk",
  "Learn moving averages, RSI, MACD and chart essentials",
  "Revisit lessons with class recordings"
];

const whatsapp =
  "https://wa.me/919025839615?text=Hello%2C%20I%20would%20like%20details%20about%20the%20Senganthal%20fundamental%20analysis%20classes.";

export default function Login({
  configured,
  error,
  previewAvailable
}: {
  configured: boolean;
  error?: string;
  previewAvailable: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [signInError, setSignInError] = useState("");

  return (
    <main className="anniversary-login">
      {/* Sleek Navigation Bar */}
      <header className="anniversary-header">
        <a href="/login" className="anniversary-brand">
          <img
            src="/senganthal-logo-transparent.png"
            alt="Senganthal Research Logo"
            className="anniversary-brand-img"
          />
          <div className="anniversary-brand-text">
            <span className="anniversary-brand-title">செங்காந்தல்</span>
            <span className="anniversary-brand-sub">RESEARCH & COMMUNITY</span>
          </div>
        </a>

        <div className="anniversary-header-meta">
          <div className="anniversary-anniv-tag">
            <Award size={13} />
            <span>1st Anniversary • Growing Together</span>
          </div>

          <div className="anniversary-header-actions">
            <a
              href="tel:+919025839615"
              className="anniversary-header-link"
              title="Call Senganthal"
            >
              <Phone size={13} />
              <span>+91 90258 39615</span>
            </a>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="anniversary-header-link highlight"
              title="WhatsApp Community Support"
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main 2-Column Space-Optimized Grid */}
      <div className="anniversary-content-grid">
        {/* Left Hero & Capabilities */}
        <section className="anniversary-hero-col">
          {/* Celebratory 1st Anniversary Hero Badge with Orbit & Typography */}
          <div className="anniversary-celebration-hero">
            <div className="anniversary-medallion-badge" aria-label="Celebrating our 1st Anniversary">
              <div className="anniversary-orbit-ring" aria-hidden="true" />
              <div className="anniversary-orbit-glow" aria-hidden="true" />
              <Sparkles className="anniversary-sparkle spark-one" aria-hidden="true" />
              <Sparkles className="anniversary-sparkle spark-two" aria-hidden="true" />
              <span className="anniversary-one-num">1<sup>st</sup></span>
              <span className="anniversary-anniv-label">ANNIVERSARY</span>
              <span className="anniversary-anniv-milestone">GROWING TOGETHER</span>
            </div>

            <div className="anniversary-hero-headline-wrap">
              <div className="anniversary-kicker-badge">
                <span className="anniversary-kicker-dot" />
                <span>MILESTONE YEAR • முதலீடு முதல் இடம்</span>
              </div>
              <h1 className="anniversary-headline-text">
                A year of learning.
                <br />
                <span className="anniversary-gold-text">A community growing together.</span>
              </h1>
              <div className="anniversary-tamil-slogan">
                <Sparkles size={14} />
                <span>Tamil Nadu&apos;s Institutional Stock Research & Learning Platform</span>
              </div>
            </div>
          </div>

          <p className="anniversary-lead">
            Empowering serious investors and learners with institutional-grade balance sheet
            analytics, Peter Lynch & Graham valuation frameworks, and real-time exchange filing scans.
          </p>

          {/* 4 Pillars in Compact 2x2 Layout */}
          <div className="anniversary-pillars">
            <div className="pillar-card">
              <div className="pillar-icon">
                <BookOpen size={16} />
              </div>
              <div className="pillar-body">
                <strong>Fundamental Depth</strong>
                <p>Balance sheets, debt serviceability, cash flow health & margin trends.</p>
              </div>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon gold">
                <Sparkles size={16} />
              </div>
              <div className="pillar-body">
                <strong>Valuation Frameworks</strong>
                <p>Peter Lynch fair value, Graham Number & intrinsic DCF benchmarks.</p>
              </div>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon">
                <TrendingUp size={16} />
              </div>
              <div className="pillar-body">
                <strong>Swing Catalyst Timing</strong>
                <p>50 & 200 DMA trendlines, RSI momentum & volume breakout detection.</p>
              </div>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon gold">
                <Layers size={16} />
              </div>
              <div className="pillar-body">
                <strong>Institutional Pulse</strong>
                <p>Quarterly FII & DII stake shifts, bulk/block deals & SME migrations.</p>
              </div>
            </div>
          </div>

          {/* Curriculum Highlights Bar */}
          <div className="anniversary-curriculum-strip">
            <span className="strip-label">CORE CURRICULUM:</span>
            <span className="strip-pill">Balance Sheets</span>
            <span className="strip-pill">Financial Ratios</span>
            <span className="strip-pill">Valuation & Risk</span>
            <span className="strip-pill">DMA / RSI Charts</span>
            <span className="strip-pill">Recorded Lessons</span>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="strip-link"
            >
              Ask about classes & fees <ArrowUpRight size={13} />
            </a>
          </div>
        </section>

        {/* Right Access Station Column */}
        <aside className="anniversary-access-column">
          {/* Main Terminal Access Card */}
          <section className="login-terminal-card">
            <div className="terminal-card-top">
              <span className="terminal-status-badge">
                <span className="pulse-indicator" />
                WORKSPACE ACCESS
              </span>
              <span className="terminal-auth-type">Google OAuth 2.0</span>
            </div>

            <h2>Sign In to Terminal</h2>
            <p className="terminal-card-desc">
              Connect with your authorized Google account to access your portfolio tracking,
              stock scorecards, and exchange filings.
            </p>

            {(error || signInError) && (
              <div role="alert" className="login-alert-error">
                {signInError ||
                  (error === "ServiceUnavailable"
                    ? "The team database could not be reached. Please try again shortly or contact your administrator."
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

            <button
              className="google-signin-btn"
              disabled={!configured || busy}
              onClick={async () => {
                setBusy(true);
                setSignInError("");
                try {
                  await signIn("google", { callbackUrl: "/" });
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
              <span className="btn-text">{busy ? "Opening Google..." : "Continue with Google"}</span>
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
              <span>Google OAuth verified • Passwords stay private</span>
            </div>
          </section>

          {/* Senganthal Learning & Mentorship Card */}
          <section className="login-community-card">
            <div className="community-card-head">
              <span className="community-card-overline">SENGANTHAL ACADEMY</span>
              <h3>Make Fundamentals Your Foundation</h3>
              <p>Join our comprehensive practical learning program to research companies with confidence.</p>
            </div>

            <div className="community-contact-buttons">
              <a href="tel:+919025839615" className="comm-btn comm-call">
                <Phone size={14} /> Call us
              </a>
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="comm-btn comm-wa"
              >
                <MessageCircle size={14} /> WhatsApp Us
              </a>
            </div>

            <details className="community-enrolled-details">
              <summary>Already enrolled or paid fees?</summary>
              <p>
                Send your name and transaction ID via WhatsApp to +91 90258 39615. Our team will verify and
                grant workspace access.
              </p>
            </details>
          </section>
        </aside>
      </div>

      {/* Clean Bottom Footer */}
      <footer className="anniversary-footer">
        <span>
          <strong>SENGANTHAL</strong> | Celebrating 1st Anniversary of Research Community
        </span>
        <span>Strictly educational research & financial analysis • Not SEBI registered investment advice</span>
      </footer>
    </main>
  );
}
