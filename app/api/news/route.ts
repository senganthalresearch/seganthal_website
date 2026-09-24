import { XMLParser } from "fast-xml-parser";
import { api, requireMember, limited, HttpError } from "@/lib/http";
import { cached } from "@/lib/market";

type NewsRow = { title: string; url: string; source: string; publishedAt: string | null };
const parser = new XMLParser({ ignoreAttributes: false, processEntities: false });
const moneycontrolFeeds = [
  "https://www.moneycontrol.com/rss/latestnews.xml",
  "https://www.moneycontrol.com/rss/business.xml",
  "https://www.moneycontrol.com/rss/marketreports.xml",
  "https://www.moneycontrol.com/rss/buzzingstocks.xml",
  "https://www.moneycontrol.com/rss/economy.xml",
  "https://www.moneycontrol.com/rss/results.xml",
  "https://www.moneycontrol.com/rss/internationalmarkets.xml"
] as const;
const recentMoneycontrolDays = 7;

function titleOf(value: unknown) {
  return typeof value === "object" && value !== null ? String((value as Record<string, unknown>)["#text"] || "") : String(value || "");
}

function linkOf(value: unknown) {
  if (Array.isArray(value)) return linkOf(value[0]);
  if (typeof value === "object" && value !== null) return String((value as Record<string, unknown>)["@_href"] || "");
  return String(value || "");
}

function parseItems(xml: string, fallbackSource: string): NewsRow[] {
  const parsed = parser.parse(xml);
  const entries = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
  return (Array.isArray(entries) ? entries : [entries]).map((item: Record<string, unknown>) => {
    const source = item.source as Record<string, unknown> | string;
    const rawUrl = linkOf(item.link);
    const url = rawUrl.startsWith("http://www.moneycontrol.com") ? rawUrl.replace("http://", "https://") : rawUrl;
    const timestamp = Date.parse(String(item.pubDate || item.published || item.updated || ""));
    return {
      title: titleOf(item.title).replace(/\s+-\s+Moneycontrol\.com$/i, ""),
      url: url.startsWith("https://") ? url : "",
      source: typeof source === "object" ? String(source?.["#text"] || fallbackSource) : String(source || fallbackSource),
      publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
    };
  }).filter(item => item.title && item.url);
}

async function fetchFeed(url: string, source: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Senganthal Research Terminal/1.0" } });
  if (!response.ok) throw new Error(source + " feed unavailable");
  return parseItems(await response.text(), source);
}

async function googleNews(query: string) {
  return fetchFeed("https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-IN&gl=IN&ceid=IN:en", "Google News");
}

async function googleMoneycontrolNews(query: string) {
  return fetchFeed("https://news.google.com/rss/search?q=" + encodeURIComponent("site:moneycontrol.com/news " + query) + "&hl=en-IN&gl=IN&ceid=IN:en", "Moneycontrol");
}

function isRecent(item: NewsRow, days = recentMoneycontrolDays) {
  const time = Date.parse(item.publishedAt || "");
  return Number.isFinite(time) && Date.now() - time <= days * 86400000;
}

function isGenericMoneycontrolTitle(title: string) {
  return /^(Business News, Economic News, Indian Stock Market News|Share\/Stock Market News|Latest Business News)$/i.test(title.trim());
}

async function moneycontrolNews(query: string) {
  const current = await googleMoneycontrolNews(query).then(items => items.filter(item => isRecent(item) && !isGenericMoneycontrolTitle(item.title))).catch(() => []);
  if (current.length) return current;
  const settled = await Promise.allSettled(moneycontrolFeeds.map(url => fetchFeed(url, "Moneycontrol")));
  const terms = query.toLowerCase().split(/\s+/).filter(word => word.length > 2 && !["india", "stock", "market", "news"].includes(word));
  const items = settled.flatMap(result => result.status === "fulfilled" ? result.value : []).filter(item => isRecent(item) && !isGenericMoneycontrolTitle(item.title));
  const filtered = items.filter(item => !terms.length || terms.some(term => item.title.toLowerCase().includes(term)));
  return filtered.length ? filtered : items;
}

function dedupe(items: NewsRow[]) {
  const seen = new Set<string>();
  const time = (value: string | null) => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return items.sort((a, b) => time(b.publishedAt) - time(a.publishedAt)).filter(item => {
    const key = (item.url || item.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

export const GET = api(async request => {
  const member = await requireMember(); await limited(member, "news", 20);
  const raw = new URL(request.url).searchParams.get("q") || "India stock market";
  const source = new URL(request.url).searchParams.get("source") === "moneycontrol" ? "moneycontrol" : new URL(request.url).searchParams.get("source") === "google" ? "google" : "all";
  const query = raw.trim().slice(0, 100);
  return cached("news:v2:" + source + ":" + query, async () => {
    const results = await Promise.allSettled([
      ...(source !== "moneycontrol" ? [googleNews(query)] : []),
      ...(source !== "google" ? [moneycontrolNews(query)] : [])
    ]);
    const items = dedupe(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
    if (!items.length) throw new HttpError(502, "News feed unavailable.");
    return { items, fetchedAt: new Date().toISOString() };
  }, 300000);
});

