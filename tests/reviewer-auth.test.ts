import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "../lib/passwords";

test("reviewer credentials create only a demo session and cannot become a normal account", async () => {
  const password = "Review-test-password-2381!";
  Object.assign(process.env, {
    NEXTAUTH_URL: "http://localhost:3199", NEXTAUTH_SECRET: "test-session-secret-not-production",
    GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", MONGODB_URI: "test-only",
    ADMIN_EMAILS: "owner@example.test", REVIEWER_LOGIN_ENABLED: "true",
    REVIEWER_LOGIN_EMAIL: "review@example.test", REVIEWER_PASSWORD_HASH: await hashPassword(password),
    REVIEWER_ACCESS_EXPIRES_AT: new Date(Date.now() + 86400000).toISOString()
  });
  const dbModule = require("../lib/db");
  const original = dbModule.db;
  let attempts = 0;
  const reads: string[] = [];
  dbModule.db = async () => ({ collection(name: string) {
    reads.push(name);
    assert.equal(name, "rateLimits", "Reviewer login must not read production members or credentials");
    return { findOneAndUpdate: async () => ({ count: ++attempts }) };
  } });
  try {
    const { authOptions } = require("../lib/auth");
    const provider = authOptions.providers.find((item: { options?: { id?: string } }) => item.options?.id === "email-password");
    const authorize = provider.options.authorize;
    assert.equal(await authorize({ email: "review@example.test", password: "Wrong-test-password-2381!" }), null);
    const user = await authorize({ email: "review@example.test", password });
    assert.equal(user.reviewDemo, true);
    assert.equal(user.email, "review@example.test");
    assert.equal(await authOptions.callbacks.signIn({ account: { provider: "email-password" }, user }), true);
    const token = await authOptions.callbacks.jwt({ token: {}, user });
    const session = await authOptions.callbacks.session({ session: { user: { email: user.email } }, token });
    assert.equal(session.reviewDemo, true);
    assert.equal(session.reviewFingerprint, user.reviewFingerprint);
    assert.equal(await authOptions.callbacks.signIn({ account: { provider: "google" }, profile: { email_verified: true }, user }), false);
    attempts = 20;
    assert.equal(await authorize({ email: "review@example.test", password }), null, "Rate limit must reject further attempts");
    attempts = 0;
    process.env.REVIEWER_LOGIN_ENABLED = "false";
    assert.equal(await authorize({ email: "review@example.test", password }), null);
    assert.equal(await authOptions.callbacks.signIn({ account: { provider: "email-password" }, user }), false);
    assert.ok(reads.length > 0);
  } finally { dbModule.db = original; }
});
