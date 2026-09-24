import { NextResponse } from "next/server";
import { currentMember } from "./auth";
import { db } from "./db";
import type { Member } from "./types";
import { ZodError } from "zod";
import { can, type Permission } from './permissions';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function requireMember(admin = false) {
  const member = await currentMember();
  if (!member) throw new HttpError(401, "Sign in with an approved Google account to continue.");
  if (admin && member.role !== "admin") throw new HttpError(403, "Administrator access required.");
  return member;
}
export async function requirePermission(permission: Permission) {
  const member = await requireMember();
  if (!can(member, permission)) throw new HttpError(403, "Your account does not have permission for this feature. Contact an administrator.");
  return member;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (origin !== expected) throw new HttpError(403, "Request origin not allowed.");
}
export async function limited(member: Member, action: string, limit = 30) {
  const bucket = Math.floor(Date.now() / 60000);
  const database = await db();
  const result = await database.collection<{_id: string; count: number; expiresAt: Date}>("rateLimits").findOneAndUpdate(
    { _id: `${member.email}:${action}:${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 120000) } }, { upsert: true, returnDocument: "after" }
  );
  if ((result?.count || 0) > limit) throw new HttpError(429, "Too many requests. Please wait a minute and try again.");
}
export function api(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    try { const data = await handler(request); return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } }); }
    catch (error) {
      const status = error instanceof HttpError ? error.status : error instanceof ZodError ? 400 : 503;
      const message = error instanceof HttpError ? error.message : error instanceof ZodError ? "Please check the supplied fields." : "This service is unavailable right now. Please try again shortly.";
      if (status >= 500) {
        try { await (await db()).collection("errors").insertOne({ page: new URL(request.url).pathname, kind: "ServiceError", message, createdAt: new Date() }); } catch { /* The error log must not replace the original response. */ }
      }
      return NextResponse.json({ error: message }, { status });
    }
  };
}
