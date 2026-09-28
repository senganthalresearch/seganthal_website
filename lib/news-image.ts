type FeedImage = string | { "@_url"?: unknown } | Array<string | { "@_url"?: unknown }>;

function imageUrl(value: FeedImage | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  const raw = typeof first === "string" ? first : first?.["@_url"];
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function newsImage(item: Record<string, unknown>): string | null {
  const fromTag = imageUrl(item["media:content"] as FeedImage | undefined)
    ?? imageUrl(item["media:thumbnail"] as FeedImage | undefined)
    ?? imageUrl(item.enclosure as FeedImage | undefined);
  if (fromTag) return fromTag;
  const description = String(item.description ?? "").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
  const match = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(description);
  return imageUrl(match?.[1]);
}
