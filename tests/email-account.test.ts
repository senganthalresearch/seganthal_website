import assert from "node:assert/strict";
import test from "node:test";
import { normalizeContactPhone } from "../lib/contact-phone";
import { hashPassword, verifyPassword } from "../lib/passwords";

test("site passwords are salted and never match the stored value directly", async () => {
  const password = "correct horse battery staple 2026";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("incorrect horse battery staple", first), false);
  assert.equal(await verifyPassword(password, "scrypt:bad:bad"), false);
  await assert.rejects(hashPassword("too-short"));
});

test("mobile contact is normalized but not used as an authentication credential", () => {
  assert.equal(normalizeContactPhone("+91 98765 43210"), "+919876543210");
  assert.equal(normalizeContactPhone("9876543210"), "+919876543210");
  assert.throws(() => normalizeContactPhone("12345"));
  assert.throws(() => normalizeContactPhone("0091 9876543210"));
});
