'use client';
import { ManualUpiPayment } from './manual-upi-payment';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { signOut } from 'next-auth/react';
import { request } from './ui';
import type { billingSummary } from '@/lib/billing';

type Summary = Awaited<ReturnType<typeof billingSummary>>;
type CheckoutResult = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; subscription_id: string; name: string; description: string; prefill: { email: string }; handler: (result: CheckoutResult) => void; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void; on: (event: string, callback: () => void) => void } } }
const date = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function BillingAccount() {
  const [manualPending,setManualPending]=useState(false);
  const [data, setData] = useState<Summary | null>(null), [busy, setBusy] = useState(false), [consent, setConsent] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [scriptReady, setScriptReady] = useState(false);
  useEffect(() => { let alive = true; request<Summary>('/api/billing').then(result => { if (alive) setData(result); }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, []);
  async function action(action: 'refresh' | 'cancel' | 'verify', extra: Record<string, unknown> = {}) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request<Summary>('/api/billing', { method: 'POST', body: JSON.stringify({ action, ...extra }) });
      setData(result); setMessage(action === 'cancel' ? 'Renewal cancelled. Any remaining paid access is shown below.' : result.active ? 'Payment verified. Your workspace is ready.' : 'No active paid period confirmed yet. If charged, check again shortly before attempting another payment.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function pay() {
    if (!consent || !window.Razorpay || !data) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request<{ keyId: string; subscriptionId: string; mode: string }>('/api/billing', { method: 'POST', body: JSON.stringify({ action: 'checkout', consent: true }) });
      const checkout = new window.Razorpay({ key: result.keyId, subscription_id: result.subscriptionId, name: 'Senganthal', description: 'Annual research tools · ₹599/year', prefill: { email: data.email },
        handler: response => { void action('verify', response); }, modal: { ondismiss: () => { setBusy(false); setMessage('Checkout closed. If you were charged, check payment status before retrying.'); } } });
      checkout.on('payment.failed', () => { setBusy(false); setError('Payment was not completed. Check status before trying again.'); });
      checkout.open();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <div className="billing-account">
    {data?.checkoutReady && <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} onError={() => setError('Checkout could not load. Please refresh or contact support.')} />}
    {error && <div className="alert error" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}
    {!data ? <p role="status">{error ? 'Billing could not be loaded. Refresh this page to retry.' : 'Loading your membership…'}</p> : <>
      {data.mode === 'test' && <div className="notice">Test checkout — no real money is collected. Test access is valid only on this test site.</div>}
      <div className="billing-overview"><div><span className="public-eyebrow">{data.admin ? 'Administrator' : data.active ? 'Membership active' : 'Membership required'}</span>
        <h2>{data.admin ? 'Your administrator access is included.' : data.active ? 'Your research tools are ready.' : 'Unlock your research workspace.'}</h2>
        <p>{data.email}</p>{data.paidUntil > 0 && <p>Paid access until <strong>{date(data.paidUntil)}</strong></p>}
        {data.complimentaryUntil > 0 && <p>Administrator-granted access until <strong>{date(data.complimentaryUntil)}</strong>. This grant does not charge you or cancel an existing subscription.</p>}
        {data.manualUntil > 0 && <p>UPI membership until <strong>{date(data.manualUntil)}</strong>. Renew manually when it expires.</p>}
        {data.cancelRequested && <p>Renewal cancellation requested. Your paid access remains available until its expiry.</p>}
        {!data.admin && <p className="small muted">Membership: {data.manualUntil > 0 ? 'Paid via UPI — manually verified' : data.status}{data.subscriptionId ? ` · ${data.subscriptionId}` : ''}</p>}
      </div><div className="membership-price"><strong>₹599 <small>/ year</small></strong>{data.active && <a className="button primary" href="/workspace">Open workspace</a>}</div></div>
      {!data.active && <section><h3>One membership. A year of research.</h3><p>Financial data, charts, screening, watchlists and portfolio tools. Classes are not included.</p>
        {!data.checkoutReady ? <div className="notice">Checkout is not open yet. Contact support for availability.</div> : <>
          <label className="billing-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>I agree to the <a href="/terms-and-conditions">Terms</a> and <a href="/refund-policy">Refund policy</a>, and authorize ₹599 now and yearly renewal at ₹599 until cancelled, for up to 10 annual payments. I can stop renewal from this page.</span></label>
          <button className="button primary" disabled={busy || manualPending || !consent || !scriptReady} onClick={() => void pay()}>{busy ? 'Please wait…' : data.mode === 'test' ? 'Try test checkout · ₹599/year' : 'Subscribe · ₹599/year'}</button>
        </>}
      </section>}
      {!data.admin && <div className="public-actions"><button className="button secondary" disabled={busy || !data.checkoutReady} onClick={() => void action('refresh')}>Check payment status</button>
        {data.subscriptionId && !data.cancelRequested && !['cancelled', 'completed', 'expired'].includes(data.status) && <button className="button secondary" disabled={busy} onClick={() => { if (window.confirm('Stop future annual renewals? Access remains until the paid period ends.')) void action('cancel'); }}>Cancel renewal</button>}</div>}
      <ManualUpiPayment onPendingChange={setManualPending} active={Boolean(data.active)} admin={data.admin} email={data.email} subscriptionOpen={Boolean(data.subscriptionId && !['cancelled','completed','expired'].includes(data.status))}/>
      <section><h3>Card payment history</h3>{data.payments.length ? <div className="table-wrap"><table><thead><tr><th>Payment</th><th>Amount</th><th>Access period</th><th>Status</th></tr></thead><tbody>{data.payments.map(p => <tr key={p.paymentId}><td>{p.paymentId}</td><td>₹{p.amount / 100}</td><td>{date(p.start)} – {date(p.end)}</td><td>{p.refunded ? 'Refunded' : 'Paid'}</td></tr>)}</tbody></table></div> : <p className="muted">No verified annual payments yet.</p>}</section>
      <p className="small">Full refund requests within 7 days of your first purchase: <a href="mailto:senganthalreserch@gmail.com">contact support</a>. Include your payment reference. <a href="/refund-policy">Refund details</a></p>
    </>}
    <div className="public-actions"><a href="/contact">Contact support</a><a href="/complete-account">Account setup</a><button className="text-button" onClick={() => void signOut({ callbackUrl: '/login' })}>Sign out</button></div>
  </div>;
}
