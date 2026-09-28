import { z } from "zod";
import { api, limited, requirePermission } from "@/lib/http";
import { search } from "@/lib/market";

export const GET = api(async request => {
  const member = await requirePermission("swing");
  await limited(member, "swing-search", 90);
  const query = z.string().trim().min(2).max(100).parse(new URL(request.url).searchParams.get("q"));
  return { results: await search(query) };
});
