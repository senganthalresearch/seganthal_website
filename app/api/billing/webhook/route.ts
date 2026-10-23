import { z } from 'zod';
import { api, HttpError } from '@/lib/http';
import { db } from '@/lib/db';
import { billingConfig, razorpay, refreshBilling, type BillingRecord } from '@/lib/billing';
import { validSignature } from '@/lib/billing-rules';

export const POST = api(async request => {
  const c = billingConfig();
  if (!c) throw new HttpError(503, 'Billing is not configured.');
  if (Number(request.headers.get('content-length')) > 200000) throw new HttpError(413, 'Payload too large.');
  const raw = await request.text();
  if (raw.length > 200000) throw new HttpError(413, 'Payload too large.');
  if (!validSignature(raw, request.headers.get('x-razorpay-signature') || '', c.webhookSecret))
    throw new HttpError(400, 'Invalid webhook signature.');
  const eventId = request.headers.get('x-razorpay-event-id');
  if (!eventId || eventId.length > 200) throw new HttpError(400, 'Missing event identifier.');
  const event = z.object({ event: z.string(), payload: z.record(z.string(), z.object({ entity: z.record(z.string(), z.unknown()) })) }).parse(JSON.parse(raw));
  const database = await db(), events = database.collection<{_id:string;processed:boolean;event:string;subscriptionId:string;processedAt:Date}>('billingEvents');
  const id = `${c.mode}:${eventId}`;
  if (await events.findOne({ _id: id, processed: true })) return { ok: true, duplicate: true };
  const entity = event.payload;
  let subscriptionId = entity.subscription?.entity.id || entity.invoice?.entity.subscription_id;
  // Refund events have only a payment ID; resolve the original invoice server-side.
  if (!subscriptionId) {
    const paymentId = entity.payment?.entity.id || entity.refund?.entity.payment_id;
    if (typeof paymentId === 'string' && /^pay_[a-zA-Z0-9]+$/.test(paymentId)) {
      const payment = await razorpay<{ invoice_id?: string }>(`payments/${paymentId}`);
      if (payment.invoice_id && /^inv_[a-zA-Z0-9]+$/.test(payment.invoice_id)) {
        const invoice = await razorpay<{ subscription_id?: string }>(`invoices/${payment.invoice_id}`);
        subscriptionId = invoice.subscription_id;
      }
    }
  }
  if (typeof subscriptionId !== 'string' || !/^sub_[a-zA-Z0-9]+$/.test(subscriptionId)) return { ok: true, ignored: true };
  const record = await database.collection<BillingRecord>('billingAccounts').findOne({ mode: c.mode, subscriptionId });
  if (!record) return { ok: true, ignored: true };
  await refreshBilling(record.email);
  // Mark processed only after reconciliation succeeds. A failed request is retryable.
  await events.updateOne({ _id: id }, { $set: { processed: true, event: event.event, subscriptionId, processedAt: new Date() } }, { upsert: true });
  return { ok: true };
});
