import { z } from 'zod';
import { api, checkOrigin, requireAccount, limited, HttpError } from '@/lib/http';
import { billingConfig, billingRecord, billingSummary, cancelRenewal, createCheckout, refreshBilling, switchToManualUpi } from '@/lib/billing';
import { validSignature } from '@/lib/billing-rules';

export const GET = api(async () => billingSummary(await requireAccount()));
export const POST = api(async request => {
  checkOrigin(request);
  const member = await requireAccount();
  await limited(member, 'billing', 10);
  const input = z.discriminatedUnion('action', [
    z.object({ action: z.literal('checkout'), consent: z.literal(true) }),
    z.object({ action: z.literal('refresh') }),
    z.object({ action: z.literal('cancel') }),
    z.object({ action: z.literal('switchToUpi') }),
    z.object({ action: z.literal('verify'), razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
      razorpay_subscription_id: z.string().regex(/^sub_[a-zA-Z0-9]+$/), razorpay_signature: z.string().length(64) })
  ]).parse(await request.json());
  if (input.action === 'checkout') return createCheckout(member);
  if (input.action === 'verify') {
    const record = await billingRecord(member.email), c = billingConfig();
    if (!c || !record?.subscriptionId || record.subscriptionId !== input.razorpay_subscription_id ||
      !validSignature(`${input.razorpay_payment_id}|${record.subscriptionId}`, input.razorpay_signature, c.secret))
      throw new HttpError(400, 'Payment verification failed. Check status or contact support.');
  }
  if (input.action === 'switchToUpi') await switchToManualUpi(member.email);
  else if (input.action === 'cancel') await cancelRenewal(member.email);
  else await refreshBilling(member.email);
  return billingSummary(member);
});
