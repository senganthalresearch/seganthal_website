import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, normalizePhone, phoneIdentity, verifyPassword } from "../lib/phone-identity";

test("mobile identity accepts only Indian numbers and is stable", () => {
  const phone = normalizePhone("98765 43210");
  assert.equal(phone, "+919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), phone);
  assert.throws(() => normalizePhone("12345 67890"));
  assert.throws(() => normalizePhone("98765 4321"));
  assert.equal(phoneIdentity(phone), phoneIdentity(normalizePhone("+91 98765 43210")));
  assert.ok(!phoneIdentity(phone).includes("98765"));
});

test("mobile password hash verifies the correct password only", async () => {
  const hash = await hashPassword("a long unique passphrase");
  assert.ok(hash.startsWith("scrypt:"));
  assert.equal(await verifyPassword("a long unique passphrase", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(await verifyPassword("a long unique passphrase", "bad-hash"), false);
  await assert.rejects(() => hashPassword("short"));
});
