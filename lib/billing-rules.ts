import { createHmac, timingSafeEqual } from 'node:crypto';

export const YEARLY_PRICE = 59900;
export type BillingMode = 'test' | 'live';
export type Invoice = { id: string; subscription_id: string; payment_id?: string; status: string; amount: number; amount_paid: number; currency: string; billing_start?: number; billing_end?: number };
export type Payment = { id: string; invoice_id?: string; status: string; amount: number; currency: string; amount_refunded?: number; captured?: boolean };
export type PaidPeriod = { paymentId: string; invoiceId: string; start: number; end: number; amount: number; refunded: boolean };

export function validSignature(body: string, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha256', secret).update(body).digest());
}

// Only a paid annual invoice tied to its captured payment can grant access.
// Subscription authentication alone (including a small mandate charge) cannot.
export function paidPeriod(invoice: Invoice, payment: Payment, subscriptionId: string): PaidPeriod | null {
  const start = invoice.billing_start || 0, end = invoice.billing_end || 0;
  if (invoice.subscription_id !== subscriptionId || invoice.payment_id !== payment.id || payment.invoice_id !== invoice.id ||
      invoice.status !== 'paid' || invoice.currency !== 'INR' || payment.currency !== 'INR' ||
      invoice.amount !== YEARLY_PRICE || invoice.amount_paid !== YEARLY_PRICE || payment.amount !== YEARLY_PRICE ||
      !['captured', 'refunded'].includes(payment.status) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start <= 0 || end - start < 364 * 86400 || end - start > 367 * 86400) return null;
  return { paymentId: payment.id, invoiceId: invoice.id, start, end, amount: payment.amount,
    refunded: payment.status === 'refunded' || (payment.amount_refunded || 0) >= payment.amount };
}

export function accessUntil(periods: PaidPeriod[], now = Math.floor(Date.now() / 1000)) {
  return Math.max(0, ...periods.filter(p => !p.refunded && p.start <= now && p.end > now).map(p => p.end));
}

export function paymentMode(env: Record<string, string | undefined> = process.env): BillingMode | null {
  const mode = env.RAZORPAY_MODE;
  if (mode !== 'test' && mode !== 'live') return null;
  let origin: URL;
  try { origin = new URL(env.NEXTAUTH_URL || ''); } catch { return null; }
  if (mode === 'test') {
    if (origin.hostname === 'senganthal.co.in' || origin.hostname.endsWith('.senganthal.co.in')) return null;
    if (!['localhost', '127.0.0.1'].includes(origin.hostname) && env.BILLING_TEST_ORIGIN !== origin.origin) return null;
  }
  return mode;
}
