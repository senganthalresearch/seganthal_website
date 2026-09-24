import { z } from "zod";
import { api, requireMember, requirePermission, limited } from "@/lib/http";
import { analyze, search } from "@/lib/market";
import { symbolSchema } from "@/lib/validation";
export const GET = api(async request => {
  const member = await requirePermission("analyze"); await limited(member, "stocks", 30);
  const params = new URL(request.url).searchParams;
  if (params.has("q")) return { results: await search(z.string().trim().min(1).max(100).parse(params.get("q"))) };
  return analyze(symbolSchema.parse(params.get("symbol")));
});

