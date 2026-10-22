import Link from "next/link";
import type { ReactNode } from "react";
import { publicContact, publicLinks } from "@/lib/public-content";

export function PublicPage({ title, eyebrow, intro, children }: { title: string; eyebrow?: string; intro: string; children: ReactNode }) {
  return <div className="public-site">
    <header className="public-header"><Link className="public-brand" href="/login"><img src="/senganthal-logo-transparent.png" alt=""/><span>SENGANTHAL<small>Research & community</small></span></Link><nav aria-label="Public pages"><Link href="/about">About</Link><Link href="/pricing">Pricing</Link><Link href="/contact">Contact</Link><Link className="public-signin" href="/login#workspace-access">Member sign in</Link></nav></header>
    <main className="public-main"><div className="public-hero"><span className="public-eyebrow">{eyebrow || "SENGANTHAL RESEARCH"}</span><h1>{title}</h1><p>{intro}</p></div><div className="public-card">{children}</div></main>
    <footer className="public-footer"><div><strong>SENGANTHAL</strong><p>Financial data and research tools. Market investments involve risk.</p><a href={`mailto:${publicContact.email}`}>{publicContact.email}</a><span> · </span><a href={`tel:${publicContact.phoneHref}`}>{publicContact.phoneDisplay}</a></div><nav aria-label="Legal and support links">{publicLinks.map(link=><Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></footer>
  </div>;
}

export function DraftNotice() { return <aside className="public-notice"><strong>Before paid launch</strong><p>Subscriptions are in preparation. Checkout is not yet available. Remaining service details and payment processing must be completed before any charge is accepted.</p></aside>; }
