"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { AnnouncementContent } from "@/lib/site-settings";

export function HomeAnnouncement({ value }: { value: AnnouncementContent }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!expanded) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [expanded]);
  if (!value.enabled) return null;
  return <section className="home-announcement" aria-label="Community announcement">
    <div className="home-announcement-copy"><span className="eyebrow">FROM THE COMMUNITY</span><h2>{value.title}</h2><p>{value.description}</p><div className="home-announcement-actions">{value.linkUrl && value.linkLabel && <a className="button primary" href={value.linkUrl} target="_blank" rel="noopener noreferrer">{value.linkLabel}<ArrowUpRight size={16}/></a>}{value.image && <button className="button secondary" onClick={() => setExpanded(true)}>View class poster</button>}</div></div>
    {value.image && <button className="home-announcement-image" onClick={() => setExpanded(true)} aria-label="Open class announcement poster"><img src={value.image} alt={value.title} loading="eager"/></button>}
    {expanded && value.image && <div className="announcement-lightbox" role="presentation" onMouseDown={() => setExpanded(false)}><div role="dialog" aria-modal="true" aria-label={value.title} onMouseDown={event => event.stopPropagation()}><button className="icon-button" aria-label="Close poster" onClick={() => setExpanded(false)}><X size={22}/></button><img src={value.image} alt={value.title}/></div></div>}
  </section>;
}
