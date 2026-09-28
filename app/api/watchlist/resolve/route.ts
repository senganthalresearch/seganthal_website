import { z } from "zod";
import { api, checkOrigin, limited, requirePermission } from "@/lib/http";
import { search } from "@/lib/market";

export const maxDuration = 60;

export const POST = api(async request => {
  checkOrigin(request);
  const member = await requirePermission("watchlist");
  await limited(member, "watchlist-resolve", 20);
  const { entries } = z.object({ entries: z.array(z.string().trim().min(1).max(100)).min(1).max(100) }).parse(await request.json());
  const matches: { input: string; choices: Awaited<ReturnType<typeof search>> }[] = [];
  for (let i = 0; i < entries.length; i += 5) {
    const batch = await Promise.all(entries.slice(i, i + 5).map(async input => {
      try {
        const found = await search(input);
        const exact = found.filter(item => item.symbol.toUpperCase() === input.toUpperCase());
        return { input, choices: (exact.length ? exact : found).slice(0, 5) };
      } catch {
        return { input, choices: [] };
      }
    }));
    matches.push(...batch);
  }
  return { matches };
});
