import assert from "node:assert/strict";
import test from "node:test";
import { annualPricePaise, hasAccess, hashPassword, normalizePhone, phoneIdentity, verifyPassword } from "../lib/membership";
import { dailyStockSchema, dailyStockVisible } from "../lib/site-settings";
import type { Member } from "../lib/types";

test("annual membership only opens while payment or grant is current", () => {
  const base: Member = { email: "member@example.com", role: "standard", active: true };
  assert.equal(annualPricePaise, 60000);
  assert.equal(hasAccess(base), false);
  assert.equal(hasAccess({ ...base, paidUntil: new Date(Date.now() + 100000).toISOString() }), true);
  assert.equal(hasAccess({ ...base, paidUntil: new Date(Date.now() - 100000).toISOString() }), false);
  assert.equal(hasAccess({ ...base, adminGrantUntil: new Date(Date.now() + 100000).toISOString() }), true);
  assert.equal(hasAccess({ ...base, active: false, adminGrantUntil: new Date(Date.now() + 100000).toISOString() }), false);
  assert.equal(hasAccess({ ...base, role: "admin" }), true);
});

test("mobile identities normalize and password hashes reject the wrong password", async () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.throws(() => normalizePhone("12345"));
  assert.equal(phoneIdentity("+919876543210"), phoneIdentity("+919876543210"));
  const encoded = await hashPassword("correct-horse-battery");
  assert.equal(await verifyPassword("correct-horse-battery", encoded), true);
  assert.equal(await verifyPassword("wrong-password", encoded), false);
});

test("daily stock alert appears on its India date only", () => {
  const stock = dailyStockSchema.parse({ enabled: true, date: "2026-10-20", symbol: "nifty", title: "In focus", note: "Research note" });
  assert.equal(stock.symbol, "NIFTY");
  assert.equal(dailyStockVisible(stock, Date.parse("2026-10-19T18:29:00Z")), false);
  assert.equal(dailyStockVisible(stock, Date.parse("2026-10-19T18:31:00Z")), true);
  assert.equal(dailyStockVisible(stock, Date.parse("2026-10-20T18:31:00Z")), false);
});
