import { z } from "zod";
import { api, requirePermission, limited } from "@/lib/http";
import { history } from "@/lib/market";
import { swing } from "@/lib/analytics";
import { indexConstituents } from "@/lib/dashboard-data";
import { symbolSchema } from "@/lib/validation";

export const maxDuration = 60;

const fallbackMarket = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "LT", "SBIN", "BHARTIARTL", "HINDUNILVR", "AXISBANK", "KOTAKBANK", "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE", "ASIANPAINT", "HCLTECH", "WIPRO", "TATASTEEL", "ULTRACEMCO", "NESTLEIND", "POWERGRID", "NTPC", "ONGC", "ADANIENT", "ADANIPORTS", "COALINDIA", "TECHM", "JSWSTEEL", "GRASIM", "DRREDDY", "CIPLA", "BAJAJFINSV", "HEROMOTOCO", "EICHERMOT", "APOLLOHOSP", "BRITANNIA", "DIVISLAB", "TATAMOTORS"];
const fallbackSmallcap = ["CAMS", "CDSL", "KAYNES", "KPITTECH", "KEI", "PERSISTENT", "TATAELXSI", "POLYCAB", "DIXON", "AMBER", "BSOFT", "ZENSARTECH", "IEX", "IRCTC", "JUBLINGREA", "KFINTECH", "LATENTVIEW", "RITES", "MAZDOCK", "COCHINSHIP"];

export const GET = api(async request => {
  const member = await requirePermission("swing");
  await limited(member, "swing", 30);
  const params = new URL(request.url).searchParams;
  const universe = params.get("universe");

  if (universe) {
    const index = universe === "smallcap" ? "NIFTY SMALLCAP 250" : "NIFTY 500";
    try {
      const rows = await indexConstituents(index);
      return { symbols: rows.map(r => r.symbol), source: "NSE " + index + " constituents" };
    } catch {
      return { symbols: universe === "smallcap" ? fallbackSmallcap : fallbackMarket, source: "Fallback scan basket" };
    }
  }

  const symbols = z.array(symbolSchema).min(1).max(25).parse((params.get("symbols") || "").split(","));
  const results = await Promise.allSettled(symbols.map(async symbol => ({ symbol, ...swing(await history(symbol), params.get("horizon") === "long") })));
  return {
    results: results.map((r, i) => r.status === "fulfilled" ? r.value : { symbol: symbols[i], error: "History unavailable" }),
    source: "Yahoo Finance - daily candles; current session may be incomplete"
  };
});
