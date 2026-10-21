import { z } from "zod";
import { currentMember } from "@/lib/auth";
import { normalizeEmail } from "@/lib/access";
import { normalizeContactPhone } from "@/lib/contact-phone";
import { db } from "@/lib/db";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/email-otp";
import { api, checkOrigin, HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/passwords";

const email = z.email().trim().toLowerCase();
const code = z.string().regex(/^\d{6}$/);
const password = z.string().min(12).max(128);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("verify"), code }),
  z.object({ action: z.literal("complete"), phone: z.string(), password }),
  z.object({ action: z.literal("reset-send"), email }),
  z.object({ action: z.literal("reset"), email, code, password })
]);

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function pendingMember() {
  const member = await currentMember();
  if (!member || member.role === "admin" || !member.active) throw new HttpError(401, "Sign in with Google to set up your account.");
  return member;
}

export const POST = api(async request => {
  checkOrigin(request);
  const body = input.parse(await request.json());
  const database = await db();
  if (body.action === "reset-send") {
    const bucket = Math.floor(Date.now() / 3600000);
    const attempts = await database.collection<{_id:string;count:number;expiresAt:Date}>("rateLimits").findOneAndUpdate(
      { _id: `email-reset-ip:${requestIp(request)}:${bucket}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 7200000) } },
      { upsert: true, returnDocument: "after" }
    );
    if ((attempts?.count || 0) > 20) throw new HttpError(429, "Too many code requests. Please try later.");
    const address = normalizeEmail(body.email);
    const member = await database.collection("members").findOne({ email: address, active: true, onboardedAt: { $exists: true } });
    const credential = member && await database.collection("emailCredentials").findOne({ email: address });
    if (credential) await sendEmailOtp("reset", address, requestIp(request));
    return { ok: true, message: "If this account exists, a verification code has been sent." };
  }
  if (body.action === "reset") {
    const address = normalizeEmail(body.email);
    const credential = await database.collection("emailCredentials").findOne({ email: address });
    if (!credential) throw new HttpError(400, "The code is invalid or expired.");
    await verifyEmailOtp("reset", address, body.code);
    const passwordHash = await hashPassword(body.password);
    await database.collection("emailCredentials").updateOne({ email: address }, { $set: { passwordHash, updatedAt: new Date().toISOString() } });
    await database.collection("audit").insertOne({ action: "email.password.reset", target: address, createdAt: new Date() });
    return { ok: true };
  }
  const member = await pendingMember();
  if (body.action === "send") {
    if (member.emailVerifiedAt) throw new HttpError(409, "Your email is already verified.");
    await sendEmailOtp("onboarding", member.email, requestIp(request));
    return { ok: true };
  }
  if (body.action === "verify") {
    if (member.emailVerifiedAt) throw new HttpError(409, "Your email is already verified.");
    await verifyEmailOtp("onboarding", member.email, body.code);
    const result = await database.collection("members").updateOne({ email: member.email, active: true }, { $set: { emailVerifiedAt: new Date().toISOString(), username: member.email } });
    if (!result.matchedCount) throw new HttpError(409, "This account is no longer available.");
    await database.collection("audit").insertOne({ action: "email.verified", target: member.email, createdAt: new Date() });
    return { ok: true };
  }
  if (!member.emailVerifiedAt || member.onboardedAt) throw new HttpError(409, "Verify your email before completing account setup.");
  let contactPhone: string;
  try { contactPhone = normalizeContactPhone(body.phone); } catch { throw new HttpError(400, "Enter a valid Indian mobile number."); }
  const passwordHash = await hashPassword(body.password);
  await database.collection("emailCredentials").updateOne({ email: member.email }, { $set: { passwordHash, updatedAt: new Date().toISOString() } }, { upsert: true });
  const result = await database.collection("members").updateOne({ email: member.email, active: true, onboardedAt: { $exists: false } }, { $set: { contactPhone, onboardedAt: new Date().toISOString(), username: member.email } });
  if (!result.matchedCount) throw new HttpError(409, "This account is already set up or no longer available.");
  await database.collection("audit").insertOne({ action: "email.account.complete", target: member.email, createdAt: new Date() });
  return { ok: true };
});
