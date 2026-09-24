import { z } from "zod";
import { db } from "@/lib/db";
import { api, requireMember, requirePermission, checkOrigin, limited } from "@/lib/http";
export const GET = api(async () => {
  await requireMember();
  const docs = await (await db()).collection("messages").find({}, { projection: { email: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
  return { messages: docs.reverse().map(({ _id, ...doc }) => ({ ...doc, id: String(_id) })) };
});
export const POST = api(async request => {
  checkOrigin(request); const member = await requirePermission("chat"); await limited(member, "chat", 15);
  const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(await request.json());
  await (await db()).collection("messages").insertOne({ text, email: member.email, name: member.name || "Team member", createdAt: new Date().toISOString() });
  return { ok: true };
});

