import { paymentMode, YEARLY_PRICE } from './billing-rules';

type Check = { name: string; status: string; detail: string; duration: number };

// Admin-only caller. Read one plan; never create subscriptions or return secrets.
export async function checkBillingSetup(env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch) {
  const checks: Check[] = [];
  const add = (name: string, status: string, detail: string, duration = 0) => checks.push({ name, status, detail, duration });
  const key = env.RAZORPAY_KEY_ID || '', secret = env.RAZORPAY_KEY_SECRET || '', plan = env.RAZORPAY_YEARLY_PLAN_ID || '';
  const keyMode = /^rzp_(live|test)_[a-zA-Z0-9]+$/.exec(key)?.[1];
  const mode = paymentMode(env);
  add('Checkout mode', mode ? 'configured' : 'closed', mode ? `${mode === 'live' ? 'Live' : 'Test'} mode selected. Configuration and checkout still need verification.` : 'Checkout is disabled. Saving credentials alone does not enable payments.');
  add('API credentials', keyMode && secret ? 'configured' : 'error', keyMode && secret ? `${keyMode === 'live' ? 'Live' : 'Test'} credentials saved; authentication checked below.` : 'Save a valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render.');
  if (mode && keyMode && keyMode !== mode) add('Key mode', 'error', 'RAZORPAY_MODE and the API key mode must match.');
  add('Webhook secret', env.RAZORPAY_WEBHOOK_SECRET ? 'configured' : 'error', env.RAZORPAY_WEBHOOK_SECRET ? 'Secret saved. Confirm the same secret in Razorpay; delivery has not been tested by this check.' : 'Save RAZORPAY_WEBHOOK_SECRET in Render and the matching secret in Razorpay.');
  if (!/^plan_[a-zA-Z0-9]+$/.test(plan)) add('Annual plan', 'error', 'Save RAZORPAY_YEARLY_PLAN_ID from the same Razorpay mode as your keys.');
  else if (keyMode && secret) {
    const start = Date.now();
    try {
      const response = await fetcher(`https://api.razorpay.com/v1/plans/${plan}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
        cache: 'no-store', signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) add('Annual plan / API authentication', 'error', `Razorpay returned HTTP ${response.status}. Confirm that the key pair and plan belong to the same account and mode.`, Date.now() - start);
      else {
        const value = await response.json();
        const valid = value?.id === plan && value.period === 'yearly' && value.interval === 1 && value.item?.amount === YEARLY_PRICE && value.item?.currency === 'INR';
        add('Annual plan / API authentication', valid ? 'ok' : 'error', valid ? `Verified ${keyMode} credentials and ₹599 INR billed every 1 year.` : 'Plan must charge exactly ₹599 INR every 1 year.', Date.now() - start);
      }
    } catch { add('Annual plan / API authentication', 'error', 'Could not verify with Razorpay. Retry shortly or check connectivity.', Date.now() - start); }
  }
  add('Checkout and webhook test', 'pending', 'Complete a test checkout and verify webhook delivery, cancellation and refunds before enabling customer payments. This check makes no payment.');
  return { checks };
}
