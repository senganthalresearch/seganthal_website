import { XMLParser } from "fast-xml-parser";
import { api, requireMember, limited, HttpError } from "@/lib/http";
import { cached } from "@/lib/market";
import { newsImage } from "@/lib/news-image";
import { indiaDay, isFreshOrderNews } from "@/lib/order-news";
import { createNewsFallback } from '@/lib/news-cache';
const withFallback=createNewsFallback();

type NewsRow = { title: string; url: string; source: string; publishedAt: string | null; imageUrl: string | null };
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
  if(!parsed?.rss?.channel&&!parsed?.feed)throw new HttpError(502,'The news provider returned an invalid feed. Please retry shortly.');
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
      publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
      imageUrl: newsImage(item)
    };
  }).filter(item => item.title && item.url);
}

async function fetchFeed(url: string, source: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000), headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Senganthal Research Terminal/1.0" } });
  if (!response.ok) throw new Error(source + " feed unavailable");
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty news feed');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();throw new Error('News feed too large');}chunks.push(value);}}finally{reader.releaseLock();}
  return parseItems(Buffer.concat(chunks).toString('utf8'), source);
}

async function googleNews(query: string) {
  return fetchFeed("https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-IN&gl=IN&ceid=IN:en", "Google News");
}

async function recentOrderNews(query: string) {
  const company = query.replace(/["()]/g, " ").trim();
  const searches = [
    "India listed company bags order",
    "India stocks secures contract",
    "India company receives order",
    "India company wins contract"
  ];
  const results = await Promise.allSettled(searches.map(search => googleNews(`${company} ${search} when:2d`)));
  if (results.every(result => result.status === "rejected")) throw new HttpError(502, "Recent order news feed unavailable.");
  return dedupe(results.flatMap(result => result.status === "fulfilled" ? result.value : []).filter(item => isFreshOrderNews(item)));
}

async function googleMoneycontrolNews(query: string) {
  return fetchFeed("https://news.google.com/rss/search?q=" + encodeURIComponent("site:moneycontrol.com/news " + query) + "&hl=en-IN&gl=IN&ceid=IN:en", "Moneycontrol");
}

function isRecent(item: NewsRow, days = recentMoneycontrolDays) {
  const time = Date.parse(item.publishedAt || "");
  return Number.isFinite(time) && time <= Date.now()+300000 && Date.now() - time <= days * 86400000;
}

function isGenericMoneycontrolTitle(title: string) {
  return /^(Business News, Economic News, Indian Stock Market News|Share\/Stock Market News|Latest Business News)$/i.test(title.trim());
}

async function moneycontrolNews(query: string) {
  const current = await googleMoneycontrolNews(query).then(items => items.filter(item => isRecent(item) && !isGenericMoneycontrolTitle(item.title))).catch(() => []);
  if (current.length) return current;
  const settled = await Promise.allSettled(moneycontrolFeeds.map(url => fetchFeed(url, "Moneycontrol")));
  if(settled.every(result=>result.status==='rejected'))throw new HttpError(502,'Moneycontrol news is temporarily unavailable.');
  const terms = query.toLowerCase().split(/\s+/).filter(word => word.length > 2 && !["india", "stock", "market", "news"].includes(word));
  const items = settled.flatMap(result => result.status === "fulfilled" ? result.value : []).filter(item => isRecent(item) && !isGenericMoneycontrolTitle(item.title));
  const filtered = items.filter(item => !terms.length || terms.some(term => item.title.toLowerCase().includes(term)));
  return terms.length ? filtered : items;
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
  const params = new URL(request.url).searchParams;
  const orders = params.get("mode") === "orders";
  const raw = params.get("q") || (orders ? "" : "India stock market");
  const source = params.get("source") === "moneycontrol" ? "moneycontrol" : params.get("source") === "google" ? "google" : "all";
  const query = raw.trim().slice(0, 100);
  if (orders) return cached("news:orders:v1:" + indiaDay(Date.now()) + ":" + query.toLowerCase(), async () => ({
    items: await recentOrderNews(query), fetchedAt: new Date().toISOString()
  }), 60000);
  const key="news:v4:" + source + ":" + query;
  const result=await withFallback(key,()=>cached(key, async () => {
    const results = await Promise.allSettled([
      ...(source !== "moneycontrol" ? [googleNews(query)] : []),
      ...(source !== "google" ? [moneycontrolNews(query)] : [])
    ]);
    const items = dedupe(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
    if (results.every(result=>result.status==='rejected')) throw new HttpError(502, "News providers are temporarily unavailable. Please retry shortly.");
    return { items, fetchedAt: new Date().toISOString(), warning:results.some(result=>result.status==='rejected')?'Some news sources are unavailable. Showing available results.':undefined };
  }, 300000));
  return {...result.data,stale:result.stale,...(result.stale?{warning:`News refresh failed. Showing previously fetched articles from ${result.data.fetchedAt}. Please retry shortly.`}:{})};
});

