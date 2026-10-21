import { z } from "zod";
import { db } from "@/lib/db";
import { api, checkOrigin, HttpError } from "@/lib/http";
import { checkPhoneOtp, sendPhoneOtp } from "@/lib/phone-verify";
import { hashPassword, normalizePhone, phoneIdentity } from "@/lib/phone-identity";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), phone: z.string() }),
  z.object({ action: z.literal("register"), phone: z.string(), code: z.string().regex(/^\d{4,10}$/), password: z.string().min(12).max(128), name: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal("reset"), phone: z.string(), code: z.string().regex(/^\d{4,10}$/), password: z.string().min(12).max(128) })
]);

async function rateLimit(key: string, limit: number) {
  const bucket = Math.floor(Date.now() / 3600000);
  const result = await (await db()).collection<{_id:string;count:number;expiresAt:Date}>("rateLimits").findOneAndUpdate(
    { _id: `phone:${key}:${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 7200000) } }, { upsert: true, returnDocument: "after" }
  );
  if ((result?.count || 0) > limit) throw new HttpError(429, "Too many attempts. Please try later.");
}

export const POST = api(async request => {
  checkOrigin(request);
  const body = input.parse(await request.json());
  let phone: string;
  try { phone = normalizePhone(body.phone); } catch { throw new HttpError(400, "Enter a valid Indian mobile number."); }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  await rateLimit(`ip:${ip}`, 20);
  await rateLimit(`number:${phone}`, body.action === "send" ? 5 : 12);
  const database = await db();
  const members = database.collection("members");
  if (body.action === "send") {
    // Bound trial SMS spend even if clients rotate phone numbers or IP addresses.
    const day = new Date().toISOString().slice(0, 10);
    const sends = await database.collection<{_id:string;count:number;expiresAt:Date}>("rateLimits").findOneAndUpdate(
      { _id: `phone:global-send:${day}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 3 * 86400000) } },
      { upsert: true, returnDocument: "after" }
    );
    if ((sends?.count || 0) > 50) throw new HttpError(429, "Mobile verification is busy today. Please try again tomorrow.");
    await sendPhoneOtp(phone);
    return { ok: true, message: "If this number is eligible, a verification code has been sent." };
  }
  const existing = await members.findOne({ phone });
  if (body.action === "register" && existing) throw new HttpError(409, "This number already has an account. Sign in or reset your password.");
  if (body.action === "reset" && !existing) throw new HttpError(404, "No account is registered with this number.");
  await checkPhoneOtp(phone, body.code);
  const email = phoneIdentity(phone);
  const passwordHash = await hashPassword(body.password);
  if (body.action === "register") {
    await members.insertOne({ email, phone, username: phone, authProvider: "phone", name: body.name, role: "standard", active: true, permissions: {}, joinedAt: new Date().toISOString() });
    await database.collection("phoneCredentials").insertOne({ email, passwordHash, updatedAt: new Date().toISOString() });
    await database.collection("audit").insertOne({ action: "phone.register", target: email, createdAt: new Date() });
  } else {
    await database.collection("phoneCredentials").updateOne({ email }, { $set: { passwordHash, updatedAt: new Date().toISOString() } }, { upsert: true });
    await database.collection("audit").insertOne({ action: "phone.password.reset", target: email, createdAt: new Date() });
  }
  return { ok: true };
});
