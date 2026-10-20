type OrderNews = { title: string; publishedAt: string | null };

const istOffsetMs = 330 * 60_000;

export function indiaDay(timestamp: number) {
  return new Date(timestamp + istOffsetMs).toISOString().slice(0, 10);
}

export function isFreshOrderNews(item: OrderNews, now = Date.now()) {
  const published = Date.parse(item.publishedAt || "");
  if (!Number.isFinite(published) || published > now + 5 * 60_000) return false;
  const today = indiaDay(now);
  const yesterday = indiaDay(now - 24 * 60 * 60_000);
  const day = indiaDay(published);
  if (day !== today && day !== yesterday) return false;
  return /\b(?:orders?|contracts?)\b/i.test(item.title)
    && /\b(?:bags?|bagged|wins?|won|secures?|secured|receives?|received|gets?|got|awards?|awarded|lands?|landed|inks?|inked|signs?|signed)\b/i.test(item.title)
    && !/\b(?:court|tribunal|sebi|tax)\s+orders?\b/i.test(item.title);
}
