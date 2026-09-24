import { z } from "zod";
import { api, requireMember, limited } from "@/lib/http";
import { quotes, indices, universe } from "@/lib/market";
export const GET = api(async request => {
  const member = await requireMember(); await limited(member, "market", 20);
  const type = new URL(request.url).searchParams.get("type");
  const symbols = type === "basket" ? universe : indices;
  const results = await Promise.allSettled(symbols.map(symbol => quotes([symbol])));
  return { quotes: results.flatMap(r => r.status === "fulfilled" ? r.value : []), unavailable: results.filter(r => r.status === "rejected").length, source: "Yahoo Finance · delayed quotes", universe: type === "basket" ? "20-stock research basket (not the whole NSE market)" : "Indian market indices" };
});

