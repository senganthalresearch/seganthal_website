import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { maySignIn, normalizeEmail, owners } from "./access";
import { normalizePhone, verifyPassword } from "./phone-identity";
import type { Member } from "./types";

export const configured = () => ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "MONGODB_URI", "ADMIN_EMAILS"].every(key => Boolean(process.env[key]));
export async function memberFor(email: string): Promise<Member | null> {
  const normalized = normalizeEmail(email);
  if (owners().includes(normalized)) return { email: normalized, role: "admin", active: true };
  const member = await (await db()).collection<Member>("members").findOne({ email: normalized, active: true });
  return member ? { email: member.email, name: member.name, role: member.role, active: member.active, permissions: member.permissions } : null;
}
export const authOptions: NextAuthOptions = {
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || "not-configured", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not-configured", authorization: { params: { scope: "openid email profile", prompt: "select_account" } } }), CredentialsProvider({ name: "Mobile number", credentials: { phone: { label: "Mobile number", type: "text" }, password: { label: "Password", type: "password" } }, async authorize(credentials) {
    if (!credentials?.phone || !credentials.password) return null;
    let phone: string;
    try { phone = normalizePhone(credentials.phone); } catch { return null; }
    const database = await db();
    const bucket = Math.floor(Date.now() / 3600000);
    const attempts = await database.collection<{_id:string;count:number;expiresAt:Date}>("rateLimits").findOneAndUpdate(
      { _id: `password:${phone}:${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 7200000) } }, { upsert: true, returnDocument: "after" }
    );
    if ((attempts?.count || 0) > 20) return null;
    const member = await database.collection<Member>("members").findOne({ phone, active: true });
    if (!member) return null;
    const credential = await database.collection<{email:string;passwordHash:string}>("phoneCredentials").findOne({ email: member.email });
    if (!credential || !await verifyPassword(credentials.password, credential.passwordHash)) return null;
    return { id: member.email, email: member.email, name: member.name || phone };
  } })],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (!configured() || !user.email) return false;
      try {
        if (account?.provider === "credentials") return Boolean((await memberFor(user.email))?.active);
        if (account?.provider !== "google" || (profile as { email_verified?: boolean })?.email_verified !== true) return false;
        const email = normalizeEmail(user.email);
        if (!owners().includes(email)) {
          await (await db()).collection("members").updateOne({ email }, { $setOnInsert: { email, name: user.name || "", role: "standard", active: true, permissions: {}, joinedAt: new Date().toISOString() } }, { upsert: true });
        }
        const member = await memberFor(email);
        if (!maySignIn(account?.provider, (profile as {email_verified?: boolean})?.email_verified, Boolean(member?.active))) return false;
        await (await db()).collection("users").updateOne({ email: normalizeEmail(user.email) }, { $set: { name: user.name, lastLoginAt: new Date() } }, { upsert: true });
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
