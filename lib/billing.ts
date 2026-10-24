import { manualPaidUntil } from './manual-payments';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { accessUntil, paidPeriod, paymentMode, YEARLY_PRICE, type BillingMode, type Invoice, type Payment, type PaidPeriod } from './billing-rules';
import { hasComplimentaryAccess } from './member-access';
import type { Member } from './types';

export class BillingError extends Error { constructor(public status: number, message: string) { super(message); } }
type Subscription = { id: string; plan_id: string; status: string; quantity: number; notes?: Record<string, string>; current_end?: number; has_scheduled_changes?: boolean; remaining_count?: number };
export type BillingRecord = { _id: string; mode: BillingMode; email: string; subscriptionId?: string; attempt: string; createdAt: number; status: string; paidUntil: number; periods: PaidPeriod[]; cancelRequested?: boolean; updatedAt?: number };

export function billingConfig() {
  const mode = paymentMode();
  const keyId = process.env.RAZORPAY_KEY_ID || '', secret = process.env.RAZORPAY_KEY_SECRET || '';
  const planId = process.env.RAZORPAY_YEARLY_PLAN_ID || '', webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!mode || !keyId.startsWith(`rzp_${mode}_`) || !secret || !/^plan_[a-zA-Z0-9]+$/.test(planId) || !webhookSecret) return null;
  return { mode, keyId, secret, planId, webhookSecret };
}
function config() {
  const value = billingConfig();
  if (!value) throw new BillingError(503, 'Checkout is not open yet. Please contact support.');
  return value;
}
export async function razorpay<T>(path: string, body?: unknown): Promise<T> {
  const c = config();
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, { method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { Authorization: `Basic ${Buffer.from(`${c.keyId}:${c.secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  } catch { throw new BillingError(503, 'Payment provider could not be reached. Check payment status before trying again.'); }
  if (!response.ok) throw new BillingError(503, 'Payment provider could not complete this request. Contact support if this continues.');
  return await response.json() as T;
}
export async function billingRecord(email: string) {
  const mode = paymentMode();
  if (!mode) return null;
  return (await db()).collection<BillingRecord>('billingAccounts').findOne({ _id: `${mode}:${email}` });
}
export async function hasPaidAccess(member: Member) {
  if (!member.active || member.reviewDemo) return false;
  if (member.role === 'admin' || hasComplimentaryAccess(member) || await manualPaidUntil(member)) return true;
  const record = await billingRecord(member.email);
  return Boolean(record && accessUntil(record.periods) > 0);
}

// A database lease serialises refreshes/cancellation across instances. Always
// fetch current provider state, so replayed/out-of-order events cannot add years.
export async function locked<T>(key: string, action: () => Promise<T>): Promise<T> {
  const collection = (await db()).collection<{ _id: string; token: string; until: number }>('billingLocks');
  const token = randomUUID(), now = Date.now();
  try { await collection.updateOne({ _id: key }, { $setOnInsert: { token: '', until: 0 } }, { upsert: true }); }
  catch (error) { if ((error as {code?: number}).code !== 11000) throw error; }
  const lease = await collection.findOneAndUpdate({ _id: key, until: { $lt: now } }, { $set: { token, until: now + 300000 } }, { returnDocument: 'after' });
  if (!lease) throw new BillingError(409, 'Payment verification is already running. Please check again shortly.');
  try { return await action(); }
  finally { await collection.updateOne({ _id: key, token }, { $set: { until: 0 } }); }
}

async function reconcile(record: BillingRecord) {
  if (!record.subscriptionId) return record;
  let subscription = await razorpay<Subscription>(`subscriptions/${record.subscriptionId}`);
  if (subscription.id !== record.subscriptionId || subscription.plan_id !== config().planId || subscription.quantity !== 1)
    throw new BillingError(409, 'Subscription details need support review.');
  const invoices = await razorpay<{ items: Invoice[] }>(`invoices?subscription_id=${subscription.id}&count=100`);
  if (!Array.isArray(invoices.items) || invoices.items.length >= 100) throw new BillingError(503, 'Billing history needs support review.');
  const periods: PaidPeriod[] = [];
  // Maximum ten annual charges are created. Reject unexpected volumes rather
  // than running an unbounded provider request loop.
  const paid = invoices.items.filter(i => i.status === 'paid' && i.payment_id);
  if (paid.length > 12) throw new BillingError(503, 'Billing history needs support review.');
  for (const invoice of paid) {
    if (!/^pay_[a-zA-Z0-9]+$/.test(invoice.payment_id!)) continue;
    const payment = await razorpay<Payment>(`payments/${invoice.payment_id}`);
    const period = paidPeriod(invoice, payment, subscription.id);
    if (period) periods.push(period);
  }
  const next = { ...record, status: subscription.status, periods, paidUntil: accessUntil(periods), updatedAt: Date.now() };
  const database = await db();
  await database.collection<BillingRecord>('billingAccounts').updateOne({ _id: record._id, subscriptionId: record.subscriptionId }, { $set: next });
  // This searchable summary is for admin display; access uses verified periods.
  await database.collection('members').updateOne({ email: record.email }, { $set: {
    [`billing_${record.mode}_until`]: next.paidUntil, [`billing_${record.mode}_status`]: next.status
  } });
  // Revoke the refunded period before attempting provider cancellation, so a
  // provider outage cannot leave refunded access enabled. Failed events retry.
  if (periods.some(p => p.refunded) && !['cancelled', 'completed', 'expired'].includes(subscription.status)) {
    subscription = await razorpay<Subscription>(`subscriptions/${record.subscriptionId}/cancel`, { cancel_at_cycle_end: 0 });
    next.status = subscription.status;
    next.cancelRequested = true;
    await database.collection<BillingRecord>('billingAccounts').updateOne({ _id: record._id }, { $set: { status: next.status, cancelRequested: true } });
  }
  return next;
}

export async function refreshBilling(email: string) {
  const mode = config().mode;
  return locked(`${mode}:${email}`, async () => {
    const record = await billingRecord(email);
    return record ? reconcile(record) : null;
  });
}

export async function createCheckout(member: Member) {
  const c = config();
  if (member.accountId && await (await db()).collection('manualPayments').findOne({accountId:member.accountId,status:'pending'})) throw new BillingError(409, 'Your UPI submission is awaiting review. Contact support before making another payment.');
  if (member.role === 'admin' || hasComplimentaryAccess(member) || await manualPaidUntil(member)) throw new BillingError(400, 'Your access is already included. Open your workspace.');
  const plan = await razorpay<{ id: string; period: string; interval: number; item: { amount: number; currency: string } }>(`plans/${c.planId}`);
  if (plan.id !== c.planId || plan.period !== 'yearly' || plan.interval !== 1 || plan.item.amount !== YEARLY_PRICE || plan.item.currency !== 'INR')
    throw new BillingError(503, 'The annual payment plan is not configured correctly. Contact support.');
  return locked(`${c.mode}:${member.email}`, async () => {
    const database = await db(), collection = database.collection<BillingRecord>('billingAccounts');
    let existing = await billingRecord(member.email);
    if (existing?.subscriptionId) {
      existing = await reconcile(existing);
      if (accessUntil(existing.periods)) throw new BillingError(409, 'Your access is already active. Open your workspace.');
      if (['created', 'authenticated'].includes(existing.status)) return { keyId: c.keyId, subscriptionId: existing.subscriptionId, mode: c.mode };
      if (!['cancelled', 'completed', 'expired'].includes(existing.status))
        throw new BillingError(409, 'An existing subscription needs attention. Check status or cancel it before starting another.');
      const { _id: oldId, ...archived } = existing;
      await database.collection<Omit<BillingRecord, '_id'> & {_id:string}>('billingArchive').updateOne({ _id: `${c.mode}:${existing.subscriptionId}` }, { $set: archived }, { upsert: true });
    } else if (existing) {
      // The create request may have succeeded before a network/process failure.
      // Recover by the server-generated attempt ID, never create blindly again.
      const found = await razorpay<{items: Subscription[]}>(`subscriptions?count=100&from=${Math.floor(existing.createdAt / 1000) - 60}`);
      const recovered = found.items.find(s => s.notes?.attempt === existing!.attempt);
      if (!recovered) throw new BillingError(409, 'An earlier checkout is being reconciled. Contact support; do not make another payment.');
      await collection.updateOne({ _id: existing._id }, { $set: { subscriptionId: recovered.id, status: recovered.status } });
      return { keyId: c.keyId, subscriptionId: recovered.id, mode: c.mode };
    }
    const record: BillingRecord = { _id: `${c.mode}:${member.email}`, mode: c.mode, email: member.email, attempt: randomUUID(), createdAt: Date.now(), status: 'creating', paidUntil: 0, periods: [] };
    await collection.updateOne({ _id: record._id }, { $set: record }, { upsert: true });
    const created = await razorpay<Subscription>('subscriptions', { plan_id: c.planId, total_count: 10, quantity: 1, customer_notify: true,
      expire_by: Math.floor(Date.now() / 1000) + 86400, notes: { attempt: record.attempt } });
    await collection.updateOne({ _id: record._id, attempt: record.attempt }, { $set: { subscriptionId: created.id, status: created.status, consentAt: new Date().toISOString(), termsVersion: 'annual-599-v1' } });
    return { keyId: c.keyId, subscriptionId: created.id, mode: c.mode };
  });
}

export async function cancelRenewal(email: string) {
  const mode = config().mode;
  return locked(`${mode}:${email}`, async () => {
    const record = await billingRecord(email);
    if (!record?.subscriptionId) throw new BillingError(400, 'No subscription to cancel.');
    const current = await reconcile(record);
    if (!['cancelled', 'completed', 'expired'].includes(current.status) && !current.cancelRequested) {
      await razorpay(`subscriptions/${record.subscriptionId}/cancel`, { cancel_at_cycle_end: accessUntil(current.periods) && current.status === 'active' ? 1 : 0 });
      await (await db()).collection<BillingRecord>('billingAccounts').updateOne({ _id: record._id }, { $set: { cancelRequested: true } });
    }
    await (await db()).collection('audit').insertOne({ action: 'subscription.cancel', actor: email, target: record.subscriptionId, createdAt: new Date() });
    return reconcile({ ...current, cancelRequested: true });
  });
}

export async function billingSummary(member: Member) {
  const manualUntil = await manualPaidUntil(member);
  const record = await billingRecord(member.email);
  return { manualUntil, mode: paymentMode(), checkoutReady: Boolean(billingConfig()), admin: member.role === 'admin', email: member.email,
    complimentaryUntil: hasComplimentaryAccess(member) ? member.complimentaryAccessUntil! : 0,
    active: member.active && (member.role === 'admin' || hasComplimentaryAccess(member) || manualUntil > 0 || Boolean(record && accessUntil(record.periods))), paidUntil: record ? accessUntil(record.periods) : 0,
    status: record?.status || 'unpaid', cancelRequested: record?.cancelRequested || false,
    subscriptionId: record?.subscriptionId || null, payments: record?.periods || [] };
}
