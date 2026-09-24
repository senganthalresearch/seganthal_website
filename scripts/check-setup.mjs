import { MongoClient } from 'mongodb';

const required = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MONGODB_URI', 'ADMIN_EMAILS'];
let failed = false;
for (const key of required) {
  const present = Boolean(process.env[key]?.trim());
  console.log(`${present ? 'OK' : 'MISSING'} ${key}`);
  if (!present) failed = true;
}
console.log(process.env.ANTHROPIC_API_KEY?.trim() && process.env.ANTHROPIC_MODEL?.trim()
  ? 'OK PDF extraction configuration present (provider not contacted)'
  : 'OPTIONAL PDF extraction unavailable; manual filing entry is available');
if (process.env.NEXTAUTH_URL) {
  try {
    const url = new URL(process.env.NEXTAUTH_URL);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    console.log('OK Application URL format');
  } catch { console.log('INVALID NEXTAUTH_URL'); failed = true; }
}
if (process.argv.includes('--database') && process.env.MONGODB_URI) {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
  try {
    await client.connect();
    await client.db(process.env.MONGODB_DB || 'senganthal').command({ ping: 1 });
    console.log('OK MongoDB connection and ping');
  } catch (error) {
    console.log('FAILED MongoDB connection. Check credentials, network access, and database availability.');
    console.log('Diagnostic: ' + error.name + '; code: ' + (error.code || error.cause?.code || 'unavailable'));
    for (const server of error.reason?.servers?.values?.() || []) {
      const cause = server.error?.cause;
      if (cause?.code && /^[A-Z0-9_]+$/.test(String(cause.code))) console.log('Connection cause: ' + cause.code);
    }
    const message = String(error.message);
    if (/ENOTFOUND|querySrv|DNS/i.test(message)) console.log('DNS lookup failed: verify that the cluster still exists and the connection hostname is correct.');
    if (/auth|bad credentials/i.test(message)) console.log('Authentication failed: update the database username and password in .env.local.');
    if (/ECONNREFUSED/i.test(message)) console.log('Connection refused: verify the database service is running and reachable.');
    if (/TLS|SSL|certificate|tlsv1 alert internal error/i.test(message)) {
      console.log('TLS handshake failed: verify the Atlas Network Access IP allow-list, VPN/firewall/TLS inspection, cluster hostname, and system clock.');
    }
    failed = true;
  } finally { await client.close(); }
}
if (process.argv.includes('--market')) {
  try {
    const { default: YahooFinance } = await import('yahoo-finance2');
    const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    const quote = await yahoo.quote('TCS.NS');
    if (!Number.isFinite(quote.regularMarketPrice)) throw new Error('Missing quote');
    console.log('OK Live NSE quote provider');
  } catch { console.log('FAILED Live quote provider. Retry later or check provider connectivity.'); failed = true; }
  try {
    const response = await fetch('https://news.google.com/rss/search?q=India%20stock%20market&hl=en-IN&gl=IN&ceid=IN:en', { signal: AbortSignal.timeout(12000) });
    if (!response.ok || !(await response.text()).includes('<rss')) throw new Error('Invalid news feed');
    console.log('OK Market news feed');
  } catch { console.log('FAILED Market news feed. Retry later or check network connectivity.'); failed = true; }
}
console.log('Google sign-in must also be checked in the browser with an approved account.');
process.exitCode = failed ? 1 : 0;
