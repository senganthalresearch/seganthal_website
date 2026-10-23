import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const { encode } = require('next-auth/jwt');
const origin = process.env.CHECK_ORIGIN || 'http://localhost:3198';
const canonicalOrigin = 'https://www.senganthal.co.in';
const canonical = path => path === '/' ? canonicalOrigin : new URL(path, canonicalOrigin).href;
const publicPaths = ['/', '/about', '/contact', '/pricing', '/privacy-policy', '/terms-and-conditions', '/refund-policy', '/cancellation-policy', '/risk-disclosure', '/grievance'];
const secret = randomBytes(32).toString('hex');
const owner = 'seo-owner@example.test';
const server = process.env.CHECK_ORIGIN ? null : spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3198'], {
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  // Completely isolated credentials. Public rendering must also survive DB failure.
  env: { ...process.env, NODE_ENV: 'production', NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: 'test-only', GOOGLE_CLIENT_SECRET: 'test-only', ADMIN_EMAILS: owner,
    MONGODB_URI: 'invalid-test-uri', MONGODB_LOCAL_FALLBACK: 'false', SHARE_DEMO: 'false',
    RESEND_API_KEY: '', EMAIL_OTP_FROM: '', ANTHROPIC_API_KEY: '', REVIEWER_LOGIN_ENABLED: 'false',
    RAZORPAY_MODE: 'disabled', RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '', RAZORPAY_WEBHOOK_SECRET: '' }
});
let startupLog = '';
server?.stdout.on('data', chunk => { startupLog = (startupLog + chunk).slice(-2000); });
server?.stderr.on('data', chunk => { startupLog = (startupLog + chunk).slice(-2000); });
const userAgents = ['Mozilla/5.0', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'];
const report = [];
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
}
function metadata(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attributes(m[0])).filter(a => /^(robots|googlebot|bingbot)$/i.test(a.name || ''));
}
async function request(path, agent = userAgents[0], cookie) {
  return fetch(origin + path, { redirect: 'manual', headers: { 'user-agent': agent, ...(cookie ? { cookie } : {}) }, signal: AbortSignal.timeout(15000) });
}
try {
  if (server) {
    let ready = false;
    for (let i=0; i<60; i++) {
      if (server.exitCode !== null) throw new Error(`SEO test server stopped: ${startupLog}`);
      try { ready = (await request('/api/health')).status === 200; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Production test server must start');
  }
  for (const path of publicPaths) {
    for (const agent of userAgents) {
      const response = await request(path, agent), html = await response.text(), tags = metadata(html);
      assert.equal(response.status, 200, `${path} must be public without cookies`);
      assert.equal(response.headers.get('location'), null, `${path} must not redirect to login`);
      assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex|none/i, `${path}: conflicting header`);
      assert.ok(tags.length, `${path}: expected explicit robots metadata`);
      for (const tag of tags) assert.doesNotMatch(tag.content || '', /noindex|nofollow|\bnone\b/i, `${path}: conflicting ${tag.name}`);
      assert.ok(tags.some(tag => /\bindex\b/i.test(tag.content)), `${path}: missing index directive`);
      const canonicals = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => attributes(m[0])).filter(a => a.rel === 'canonical');
      assert.deepEqual(canonicals.map(a => a.href), [canonical(path)], `${path}: exactly one correct canonical`);
      assert.match(html, /<h1\b/, `${path}: public content missing`);
      report.push({ path, agent: agent.includes('Googlebot') ? 'Googlebot' : 'browser', status: response.status, robots: tags, canonical: canonicals[0].href });
    }
    process.stdout.write(`PASS public HTML + headers + canonical: ${path}\n`);
  }
  const queryHome = await request('/?utm_source=seo-check');
  assert.match(await queryHome.text(), /rel="canonical" href="https:\/\/www\.senganthal\.co\.in"/);
  for (const path of ['/login', '/subscription-success', '/subscription-failed']) {
    const response = await request(path), html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(metadata(html).some(a => /noindex/i.test(a.content)), `${path}: private metadata missing`);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  for (const path of ['/workspace', '/complete-account', '/account']) {
    const response = await request(path);
    assert.equal(response.status, 307, `${path}: authentication required`);
    assert.match(response.headers.get('location') || '', /^\/login/);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  for (const path of ['/preview', '/signup', '/signin', '/dashboard', '/admin']) {
    const response = await request(path);
    assert.equal(response.status, 404, `${path}: must not expose a public workspace`);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  const api = await request('/api/me');
  assert.equal(api.status, 401);assert.match(api.headers.get('x-robots-tag') || '', /noindex/);
  // Local fixture only: the real authenticated page also remains noindex.
  if (server) {
    const token = await encode({ secret, token: { email: owner, name: 'SEO test owner' }, maxAge: 300 });
    const response = await request('/workspace', userAgents[1], `next-auth.session-token=${token}`);
    assert.equal(response.status, 200);
    assert.ok(metadata(await response.text()).some(a => /noindex/i.test(a.content)));
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  }
  const sitemap = await request('/sitemap.xml'), xml = await sitemap.text();
  assert.equal(sitemap.status, 200);assert.match(sitemap.headers.get('content-type') || '', /xml/);
  assert.equal(XMLValidator.validate(xml), true);
  const urls = new XMLParser().parse(xml).urlset.url.map(row => row.loc);
  assert.deepEqual(urls.sort(), publicPaths.map(canonical).sort());
  const robots = await request('/robots.txt'), text = await robots.text();
  assert.equal(robots.status, 200);assert.match(robots.headers.get('content-type') || '', /text\/plain/);
  assert.match(text, /User-Agent: \*/i);assert.match(text, /^Allow: \/$/m);
  assert.match(text, /Sitemap: https:\/\/www\.senganthal\.co\.in\/sitemap\.xml/);
  assert.doesNotMatch(text, /^Disallow: \/$/m);
  assert.doesNotMatch(text, /^Disallow: \/(?:login|workspace|account|complete-account)/m, 'Allow noindex HTML to be crawled');
  await mkdir('output', { recursive: true });
  await writeFile('output/seo-verification.json', JSON.stringify({ checkedOrigin:origin, results:report, sitemap:urls, robots:text }, null, 2));
  process.stdout.write('PASS private noindex, auth guards, query canonical, sitemap XML and robots.txt\n');
} finally {
  if (server) { server.kill(); await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); }); }
}
