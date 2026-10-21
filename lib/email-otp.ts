import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./http";

type Purpose = "onboarding" | "reset";
type Challenge = { _id: string; codeHash: string; expiresAt: Date; attempts: number };

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_OTP_FROM && process.env.NEXTAUTH_SECRET);
}

function digest(purpose: Purpose, email: string, code: string) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET || "").update(`${purpose}\0${email}\0${code}`).digest("hex");
}

function emailContent(purpose: Purpose, code: string) {
  const resetting = purpose === "reset";
  const subject = resetting ? "Reset your Senganthal password" : "Verify your Senganthal email";
  const heading = resetting ? "Reset your password" : "Verify your email";
  const instruction = resetting
    ? "Use this code to choose a new Senganthal password."
    : "Use this code to finish setting up your Senganthal account.";
  return {
    subject,
    text: `${heading}\n\n${instruction}\n\nYour code: ${code}\n\nThis code expires in 10 minutes. Never share it with anyone. If you did not request it, you can ignore this email.`,
    html: `<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f3f6fb;font-family:Arial,sans-serif;color:#16243a"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;margin:0 auto;background:#fff;border:1px solid #dfe7f1;border-radius:14px"><tr><td style="padding:28px"><p style="margin:0 0 20px;color:#165dc0;font-size:13px;font-weight:700;letter-spacing:2px">SENGANTHAL</p><h1 style="margin:0 0 12px;font-size:25px;line-height:1.25;color:#16243a">${heading}</h1><p style="margin:0 0 20px;font-size:15px;line-height:1.6">${instruction}</p><p style="margin:0 0 20px;padding:18px;background:#eef4ff;border-radius:10px;text-align:center;color:#153d85;font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#53647d">This code expires in 10 minutes. Never share it with anyone.</p><p style="margin:0;font-size:13px;line-height:1.6;color:#53647d">If you did not request this, you can safely ignore this email.</p></td></tr></table></body></html>`
  };
}

async function rateLimit(key: string, limit: number, periodMs: number) {
  const bucket = Math.floor(Date.now() / periodMs);
  const result = await (await db()).collection<{_id:string;count:number;expiresAt:Date}>("rateLimits").findOneAndUpdate(
    { _id: `email-otp:${key}:${bucket}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 2 * periodMs) } },
    { upsert: true, returnDocument: "after" }
  );
  if ((result?.count || 0) > limit) throw new HttpError(429, "Too many code requests. Please try later.");
}

export async function sendEmailOtp(purpose: Purpose, email: string, ip: string) {
  if (!emailDeliveryConfigured()) throw new HttpError(503, "Email verification is being configured. Please try later.");
  await rateLimit(`ip:${ip}`, 20, 3600000);
  await rateLimit(`email:${email}`, 5, 3600000);
  await rateLimit("global", 100, 86400000);
  const code = randomInt(0, 1000000).toString().padStart(6, "0");
  const content = emailContent(purpose, code);
  const collection = (await db()).collection<Challenge>("emailOtpChallenges");
  const id = `${purpose}:${email}`;
  const codeHash = digest(purpose, email, code);
  await collection.updateOne({ _id: id }, { $set: { codeHash, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60000) } }, { upsert: true });
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_OTP_FROM,
        to: [email],
        ...content
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    await collection.deleteOne({ _id: id, codeHash });
    throw new HttpError(502, "The verification email could not be sent. Please try again.");
  }
  if (!response.ok) {
    await collection.deleteOne({ _id: id, codeHash });
    throw new HttpError(502, "The verification email could not be sent. Please check the email sender setup.");
  }
}

export async function verifyEmailOtp(purpose: Purpose, email: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the six-digit email code.");
  const collection = (await db()).collection<Challenge>("emailOtpChallenges");
  const id = `${purpose}:${email}`;
  const challenge = await collection.findOne({ _id: id, expiresAt: { $gt: new Date() } });
  if (!challenge) throw new HttpError(400, "This code has expired. Request a new one.");
  const attempts = await collection.findOneAndUpdate({ _id: id, codeHash: challenge.codeHash }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
  if (!attempts || attempts.attempts > 5) {
    await collection.deleteOne({ _id: id, codeHash: challenge.codeHash });
    throw new HttpError(400, "Too many attempts. Request a new code.");
  }
  const actual = Buffer.from(digest(purpose, email, code), "hex");
  const expected = Buffer.from(challenge.codeHash, "hex");
  if (!timingSafeEqual(actual, expected)) throw new HttpError(400, "The email code is incorrect.");
  const consumed = await collection.deleteOne({ _id: id, codeHash: challenge.codeHash });
  if (!consumed.deletedCount) throw new HttpError(400, "This code has already been used.");
}
