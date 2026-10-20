import { api, requireMember, limited, checkOrigin, HttpError } from "@/lib/http";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
export const GET = api(async () => {
  const member = await requireAdmin();
  return { reports: await (await db()).collection("reports").find({ owner: member.email }, { projection: { _id: 0, owner: 0 } }).sort({ savedAt: -1 }).limit(50).toArray() };
});
export const POST = api(async request => {
  checkOrigin(request); const member = await requireAdmin(); await limited(member, "reports", 4);
  if (request.headers.get("content-type")?.includes("application/json")) {
    const values = reportSchema.parse(await request.json());
    await (await db()).collection("reports").updateOne({ owner: member.email, symbol: values.symbol, period: values.period }, { $set: { ...values, owner: member.email, savedAt: new Date().toISOString() } }, { upsert: true });
    return { ok: true };
  }
  throw new HttpError(400, "Read PDFs privately in your browser, then submit reviewed figures as JSON.");
});

async function requireAdmin() {
  const member = await requireMember();
  if (member.role !== "admin") throw new HttpError(403, "PDF Upload is available for administrators only.");
  return member;
}

