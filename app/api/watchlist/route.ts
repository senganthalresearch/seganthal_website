import { z } from "zod";
import { db } from "@/lib/db";
import { api, requireMember, requirePermission, checkOrigin, limited } from "@/lib/http";
import { watchSchema, symbolSchema } from "@/lib/validation";
export const GET = api(async () => {
  const member = await requireMember();
  return { items: await (await db()).collection("watchlist").find({ owner: member.email }, { projection: { _id: 0, owner: 0 } }).sort({ group: 1, addedAt: -1 }).limit(500).toArray() };
});
export const POST = api(async request => {
  checkOrigin(request); const member = await requirePermission("watchlist"); await limited(member, "watchlist", 30);
  const { items } = z.object({ items: z.array(watchSchema).min(1).max(100) }).parse(await request.json());
  const collection = (await db()).collection("watchlist");
  await collection.bulkWrite(items.map(item => ({ updateOne: { filter: { owner: member.email, symbol: item.symbol }, update: { $set: item, $setOnInsert: { owner: member.email, addedAt: new Date().toISOString() } }, upsert: true } })));
  return { ok: true };
});
export const DELETE = api(async request => {
  checkOrigin(request); const member = await requirePermission("watchlist");
  const { symbol } = z.object({ symbol: symbolSchema }).parse(await request.json());
  await (await db()).collection("watchlist").deleteOne({ owner: member.email, symbol });
  return { ok: true };
});

