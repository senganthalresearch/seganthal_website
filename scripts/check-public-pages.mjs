import assert from 'node:assert/strict';

const origin = process.env.CHECK_ORIGIN || 'http://localhost:3100';
const paths = ['/login','/about','/contact','/pricing','/privacy-policy','/terms-and-conditions','/refund-policy','/cancellation-policy','/risk-disclosure','/grievance','/subscription-success','/subscription-failed'];
const pages = new Map();

for (const path of paths) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${path} must be public and return 200`);
  const html = await response.text();
  assert.match(html, /<main\b/, `${path} must render main content`);
  pages.set(path, html);
  process.stdout.write(`PASS ${path}\n`);
}

for (const path of paths.filter(path => !path.startsWith('/subscription-'))) {
  for (const target of ['/about','/contact','/pricing','/privacy-policy','/terms-and-conditions','/refund-policy','/cancellation-policy','/risk-disclosure','/grievance']) {
    assert.match(pages.get(path), new RegExp(`href="${target}"`), `${path} must link to ${target}`);
  }
}
assert.doesNotMatch(pages.get('/login'), /Always Free|No subscription or upgrades|Celebrating our 1st Anniversary/);
assert.match(pages.get('/pricing'), /₹600 per year/);
assert.match(pages.get('/subscription-success'), /cannot confirm a payment/);
process.stdout.write('PASS public navigation, pricing and no client-side payment confirmation\n');
