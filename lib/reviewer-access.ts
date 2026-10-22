import { createHash } from "node:crypto";
import { verifyPassword } from "./passwords";

export type ReviewerConfig = { email: string; passwordHash: string; expiresAt: number; fingerprint: string };
export function reviewerConfig(env: Record<string, string | undefined> = process.env, now = Date.now()): ReviewerConfig | null {
  const email = (env.REVIEWER_LOGIN_EMAIL || "").trim().toLowerCase();
  const passwordHash = env.REVIEWER_PASSWORD_HASH || "";
  const expiresAt = Date.parse(env.REVIEWER_ACCESS_EXPIRES_AT || "");
  const administrators = (env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase());
  if (env.REVIEWER_LOGIN_ENABLED !== "true" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || administrators.includes(email)
    || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash) || !Number.isFinite(expiresAt) || expiresAt <= now) return null;
  return { email, passwordHash, expiresAt, fingerprint: createHash("sha256").update(`${email}:${passwordHash}:${expiresAt}`).digest("hex") };
}
export function validReviewerSession(email: string, fingerprint: unknown, env: Record<string, string | undefined> = process.env, now = Date.now()) {
  const config = reviewerConfig(env, now);
  return Boolean(config && email.toLowerCase() === config.email && typeof fingerprint === "string" && fingerprint === config.fingerprint);
}
export async function reviewerPasswordMatches(password: string, config: ReviewerConfig) {
  return password.length >= 12 && password.length <= 128 && await verifyPassword(password, config.passwordHash);
}
