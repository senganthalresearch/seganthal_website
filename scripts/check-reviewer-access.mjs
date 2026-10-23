import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { encode } = require('next-auth/jwt');
const port = 3199;
const origin = `http://localhost:${port}`;
const secret = randomBytes(32).toString('hex');
const email = 'review@example.test';
const salt = randomBytes(16).toString('hex');
const hash = `scrypt:${salt}:${scryptSync(randomBytes(24), salt, 64).toString('hex')}`;
const expires = new Date(Date.now() + 86400000).toISOString();
const fingerprint = createHash('sha256').update(`${email}:${hash}:${Date.parse(expires)}`).digest('hex');
// All provider and database configuration is overridden. This test never uses live credentials.
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  env: { ...process.env, NODE_ENV: 'production', NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: 'test-only', GOOGLE_CLIENT_SECRET: 'test-only', ADMIN_EMAILS: 'owner@example.test',
    MONGODB_URI: 'invalid-test-uri', MONGODB_LOCAL_FALLBACK: 'false', SHARE_DEMO: 'false',
    RESEND_API_KEY: '', EMAIL_OTP_FROM: '', ANTHROPIC_API_KEY: '',
    REVIEWER_LOGIN_ENABLED: 'true', REVIEWER_LOGIN_EMAIL: email, REVIEWER_PASSWORD_HASH: hash, REVIEWER_ACCESS_EXPIRES_AT: expires }
});
server.stdout.on('data', () => {});
server.stderr.on('data', () => {});
async function request(path, token, method = 'GET', body) {
  return fetch(origin + path, { method, redirect: 'manual', signal: AbortSignal.timeout(10000),
    headers: { ...(token ? { cookie: `next-auth.session-token=${token}` } : {}), origin, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Local test server stopped before readiness.');
    try { ready = (await request('/api/health')).status === 200; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Local test server must start');
  const anonymous = await request('/api/me');
  assert.equal(anonymous.status, 401);
  const token = await encode({ secret, token: { email, name: 'Review fixture', reviewDemo: true, reviewFingerprint: fingerprint, role: 'admin' }, maxAge: 300 });
  const home = await request('/workspace', token);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /DEMO WORKSPACE/);
  for (const path of ['/api/me','/api/members','/api/admin','/api/chat','/api/chat/image','/api/portfolio','/api/ledger','/api/watchlist','/api/settings','/api/reports','/api/stocks','/api/market','/api/news','/api/dashboard','/api/swing','/api/analytics','/api/preferences','/api/visits']) {
    assert.equal((await request(path, token)).status, 403, `Reviewer must not read ${path}`);
  }
  for (const path of ['/api/chat','/api/members','/api/portfolio','/api/settings']) {
    assert.equal((await request(path, token, 'POST', {})).status, 403, `Reviewer must not write ${path}`);
  }
  assert.equal((await request('/api/email-auth', token, 'POST', { action: 'send' })).status, 401, 'Reviewer cannot start member onboarding');
  const forged = await encode({ secret, token: { email, reviewDemo: true, reviewFingerprint: 'wrong' }, maxAge: 300 });
  assert.equal((await request('/api/me', forged)).status, 401);
  const invalid = await request('/workspace', forged);
  assert.equal(invalid.status, 307);
  assert.match(invalid.headers.get('location'), /\/login/);
  process.stdout.write('PASS sample dashboard, anonymous denial, 18 API read denials, 4 write denials and invalid reviewer-session rejection\n');
  const publicCheck = spawn(process.execPath, ['scripts/check-public-pages.mjs'], { stdio: 'inherit', windowsHide: true, env: { ...process.env, CHECK_ORIGIN: origin } });
  assert.equal(await new Promise(resolve => publicCheck.on('exit', resolve)), 0, 'Public pages must pass');
} finally {
  server.kill();
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
}
