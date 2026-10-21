import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { googleSignupDecision, normalizeEmail, owners } from "./access";
import { verifyPassword } from "./passwords";
import type { Member } from "./types";

export const configured = () => ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "MONGODB_URI", "ADMIN_EMAILS"].every(key => Boolean(process.env[key]));
export async function memberFor(email: string): Promise<Member | null> {
  const normalized = normalizeEmail(email);
  if (owners().includes(normalized)) return { email: normalized, role: "admin", active: true };
  const member = await (await db()).collection<Member>("members").findOne({ email: normalized, active: true });
  return member ? { email: member.email, name: member.name, username: member.username, contactPhone: member.contactPhone, authProvider: member.authProvider, emailVerifiedAt: member.emailVerifiedAt, onboardedAt: member.onboardedAt, role: member.role, active: member.active, permissions: member.permissions } : null;
}
export const authOptions: NextAuthOptions = {
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || "not-configured", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not-configured", authorization: { params: { scope: "openid email profile", prompt: "select_account" } } }), CredentialsProvider({ id: "email-password", name: "Email and password", credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } }, async authorize(credentials) {
    const email = String(credentials?.email || "").trim().toLowerCase();
    const password = String(credentials?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 128) return null;
    const database = await db();
    const bucket = Math.floor(Date.now() / 3600000);
    const attempts = await database.collection<{_id:string;count:number;expiresAt:Date}>("rateLimits").findOneAndUpdate(
      { _id: `email-password:${email}:${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 7200000) } }, { upsert: true, returnDocument: "after" }
    );
    if ((attempts?.count || 0) > 20) return null;
    const member = await database.collection<Member>("members").findOne({ email, active: true });
    if (!member?.emailVerifiedAt || !member.onboardedAt) return null;
    const credential = await database.collection<{email:string;passwordHash:string}>("emailCredentials").findOne({ email });
    if (!credential || !await verifyPassword(password, credential.passwordHash)) return null;
    return { id: member.email, email: member.email, name: member.name || email };
  } })],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (!configured() || !user.email) return false;
      try {
        if (account?.provider === "email-password") {
          const member = await memberFor(user.email);
          return Boolean(member?.active && member.emailVerifiedAt && member.onboardedAt);
        }
        if (account?.provider !== "google" || (profile as { email_verified?: boolean })?.email_verified !== true) return false;
        const email = normalizeEmail(user.email);
        const owner = owners().includes(email);
        const database = await db();
        const members = database.collection<Member>("members");
        const existing = owner ? null : await members.findOne({ email });
        const administrator = owner || existing?.role === "admin";
        const decision = googleSignupDecision((profile as { email_verified?: boolean })?.email_verified, administrator, existing);
        if (decision === "already-registered") return "/login?error=AlreadyRegistered";
        if (decision === "denied") return false;
        if (!owner && !existing) {
          await members.updateOne({ email }, { $setOnInsert: { email, username: email, authProvider: "google", name: user.name || "", role: "standard", active: true, permissions: {}, joinedAt: new Date().toISOString() } }, { upsert: true });
        }
        if (!owner) {
          const latest = await members.findOne({ email });
          const latestDecision = googleSignupDecision(true, latest?.role === "admin", latest);
          if (latestDecision === "already-registered") return "/login?error=AlreadyRegistered";
          if (latestDecision === "denied") return false;
        }
        await database.collection("users").updateOne({ email }, { $set: { name: user.name, lastLoginAt: new Date() } }, { upsert: true });
        return true;
      } catch { return "/login?error=ServiceUnavailable"; }
    },
    async session({ session }) { if (session.user?.email) session.user.email = normalizeEmail(session.user.email); return session; }
  }
};
export async function currentMember() {
  if (!configured()) return null;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const member = await memberFor(session.user.email);
  return member ? { ...member, name: session.user.name || member.name || member.email.split("@")[0] } : null;
}
