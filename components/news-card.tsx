"use client";
import { useState } from "react";
import { ArrowUpRight, Bookmark, Newspaper } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { relativeTime } from "@/lib/analytics";

export function NewsCard({ item, preview, saved, onSave }: { item: NewsItem; preview: boolean; saved: boolean; onSave: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <article className="news-story">
    <a className="news-story-link" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${item.title}`}>
      <div className="news-story-media">{item.imageUrl && !imageFailed ? <img src={item.imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)}/> : <div className="news-story-placeholder"><Newspaper size={34}/><span>MARKET BRIEF</span></div>}</div>
      <div className="news-story-copy"><span className="news-story-source">{item.source}</span><h2>{item.title}</h2><div className="news-story-bottom"><span>{preview ? "Sample article" : relativeTime(item.publishedAt)}</span><span>Read story <ArrowUpRight size={15}/></span></div></div>
    </a>
    <button type="button" className={`news-story-save ${saved ? "saved" : ""}`} onClick={onSave} aria-label={saved ? `Remove saved story: ${item.title}` : `Save story: ${item.title}`} title={saved ? "Remove saved story" : "Save story"}><Bookmark size={17} fill={saved ? "currentColor" : "none"}/></button>
  </article>;
}
