import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "../lib/passwords";
import { reviewerConfig, reviewerPasswordMatches, validReviewerSession } from "../lib/reviewer-access";

test("reviewer access requires explicit enablement, a valid hash, expiry and a non-owner identity", async () => {
  const now = Date.parse("2026-10-22T00:00:00Z");
  const hash = await hashPassword("Test-only-password-4481!");
  const env = { REVIEWER_LOGIN_ENABLED: "true", REVIEWER_LOGIN_EMAIL: "review@example.test", REVIEWER_PASSWORD_HASH: hash, REVIEWER_ACCESS_EXPIRES_AT: "2026-10-23T00:00:00Z", ADMIN_EMAILS: "owner@example.test" };
  const config = reviewerConfig(env, now);
  assert.ok(config);
  assert.equal(await reviewerPasswordMatches("Test-only-password-4481!", config), true);
  assert.equal(await reviewerPasswordMatches("Wrong-password-4481!", config), false);
  assert.equal(reviewerConfig({ ...env, REVIEWER_LOGIN_ENABLED: "false" }, now), null);
  assert.equal(reviewerConfig({ ...env, REVIEWER_PASSWORD_HASH: "plaintext" }, now), null);
  assert.equal(reviewerConfig({ ...env, ADMIN_EMAILS: "REVIEW@example.test" }, now), null);
  assert.equal(reviewerConfig({ ...env, REVIEWER_ACCESS_EXPIRES_AT: "2026-10-21" }, now), null);
  assert.equal(validReviewerSession(config.email, config.fingerprint, env, now), true);
  assert.equal(validReviewerSession("someone@example.test", config.fingerprint, env, now), false);
  assert.equal(validReviewerSession(config.email, "forged", env, now), false);
  assert.equal(validReviewerSession(config.email, config.fingerprint, { ...env, REVIEWER_LOGIN_ENABLED: "false" }, now), false);
  assert.equal(validReviewerSession(config.email, config.fingerprint, { ...env, REVIEWER_ACCESS_EXPIRES_AT: "2026-10-24" }, now), false);
  assert.equal(validReviewerSession(config.email, config.fingerprint, env, now + 86400000), false);
});
