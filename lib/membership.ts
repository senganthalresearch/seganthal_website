import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { normalizeEmail, owners } from "./access";
import type { Member } from "./types";

const scrypt = promisify(scryptCallback);
export const annualPricePaise = 60000;

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) throw new Error("Enter a valid Indian mobile number.");
  return `+91${local}`;
}

export function phoneIdentity(phone: string) {
  const digest = createHash("sha256").update(phone).digest("hex").slice(0, 40);
  return `phone.${digest}@members.senganthal.invalid`;
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new Error("Use a password of 12 to 128 characters.");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, digest] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(digest || "")) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

export async function uniqueUsername(email: string) {
  const prefix = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 16) || "member";
  const members = (await db()).collection("members");
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${prefix}${randomBytes(3).toString("hex")}`;
    if (!await members.findOne({ username: candidate })) return candidate;
  }
  throw new Error("Could not assign a unique username.");
}

export function hasAccess(member: Member) {
  return member.role === "admin" || owners().includes(normalizeEmail(member.email)) || (member.active && [member.paidUntil, member.adminGrantUntil].some(until => Boolean(until) && Date.parse(until || "") > Date.now()));
}

export async function registeredMember(email: string): Promise<Member | null> {
  const normalized = normalizeEmail(email);
  if (owners().includes(normalized)) return { email: normalized, username: normalized.split("@")[0], role: "admin", active: true, authProvider: "google" };
  const member = await (await db()).collection<Member>("members").findOne({ email: normalized });
  if (!member || !member.active) return null;
  const { _id: _unused, ...safe } = member as Member & { _id?: unknown };
  return safe;
}
