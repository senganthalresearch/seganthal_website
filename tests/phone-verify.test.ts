import assert from "node:assert/strict";
import test from "node:test";
import { checkPhoneOtp, sendPhoneOtp } from "../lib/phone-verify";

test("2Factor OTP flow uses documented GET endpoints and consumes a verified session", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.TWOFACTOR_API_KEY;
  const requested: Array<{ url: string; method?: string }> = [];
  process.env.TWOFACTOR_API_KEY = "test-only-key";
  globalThis.fetch = async (input, init) => {
    requested.push({ url: String(input), method: init?.method });
    return Response.json({ Status: "Success", Details: requested.length === 1 ? "test-session" : "OTP Matched" });
  };
  try {
    await sendPhoneOtp("+919876543210");
    await checkPhoneOtp("+919876543210", "123456");
    assert.deepEqual(requested.map(item => item.method), ["GET", "GET"]);
    assert.ok(requested[0].url.endsWith("/SMS/+919876543210/AUTOGEN"));
    assert.ok(requested[1].url.endsWith("/SMS/VERIFY/test-session/123456"));
    await assert.rejects(checkPhoneOtp("+919876543210", "123456"), /Send a new verification code/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TWOFACTOR_API_KEY;
    else process.env.TWOFACTOR_API_KEY = originalKey;
  }
});
