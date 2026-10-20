import { z } from "zod";
import { db } from "@/lib/db";
import { api, checkOrigin, HttpError, limited, requireMember } from "@/lib/http";
import { normalizePhone } from "@/lib/membership";
import { owners } from "@/lib/access";

export const POST = api(async request => {
  checkOrigin(request);
  const admin = await requireMember(true);
  await limited(admin, "grant", 20);
  const body = z.object({ target: z.string().trim().min(3), days: z.number().int().min(0).max(3650), reason: z.string().trim().min(5).max(300) }).parse(await request.json());
  const database = await db();
  let lookup: Record<string, string>;
  if (body.target.includes("@")) lookup = { email: z.email().parse(body.target.toLowerCase()) };
  else { try { lookup = { phone: normalizePhone(body.target) }; } catch { throw new HttpError(400, "Enter a member email or Indian mobile number."); } }
  const member = await database.collection<{email:string;role:string}>("members").findOne(lookup);
  if (!member) throw new HttpError(404, "Create the member account first, then grant access.");
  if (owners().includes(member.email) || member.role === "admin") throw new HttpError(400, "Administrator access is managed separately.");
  const until = body.days ? new Date(Date.now() + body.days * 86400000).toISOString() : "";
  await database.collection("members").updateOne({ email: member.email }, { $set: { adminGrantUntil: until, grantReason: body.reason, grantUpdatedBy: admin.email, grantUpdatedAt: new Date().toISOString() } });
  await database.collection("audit").insertOne({ action: body.days ? "member.grant" : "member.grant.revoke", actor: admin.email, target: member.email, days: body.days, reason: body.reason, createdAt: new Date() });
  return { ok: true, until };
});
