import { currentAccount } from "@/lib/auth";
import { billingConfigured, razorpay, verifyAnnualPlan } from "@/lib/billing";
import { db } from "@/lib/db";
import { api, checkOrigin, HttpError } from "@/lib/http";
import { annualPricePaise, hasAccess } from "@/lib/membership";

export const GET = api(async () => {
  const account = await currentAccount();
  if (!account) throw new HttpError(401, "Sign in to view your subscription.");
  const subscriptions = await (await db()).collection("subscriptions").find({ email: account.email }, { projection: { _id: 0, subscriptionId: 1, status: 1, paidUntil: 1, cancelAtCycleEnd: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray();
  return { account: { email: account.email, username: account.username, phone: account.phone, paidUntil: account.paidUntil, adminGrantUntil: account.adminGrantUntil, role: account.role, active: account.active }, hasAccess: hasAccess(account), pricePaise: annualPricePaise, currency: "INR", billingConfigured: billingConfigured(), subscriptions };
});

export const POST = api(async request => {
  checkOrigin(request);
  const account = await currentAccount();
  if (!account) throw new HttpError(401, "Sign in to start a subscription.");
  if (account.role === "admin") throw new HttpError(400, "Administrators already have access.");
  const planId = await verifyAnnualPlan();
  const database = await db();
  const existing = await database.collection<{email:string;subscriptionId:string;status:string}>("subscriptions").find({ email: account.email }).sort({ createdAt: -1 }).limit(1).toArray();
  if (existing[0] && ["created", "authenticated", "active", "pending", "halted"].includes(existing[0].status)) {
    if (existing[0].status === "active" || existing[0].status === "authenticated") throw new HttpError(409, "A subscription is already set up. Refresh your access status or contact support.");
    if (existing[0].status === "created") return { subscriptionId: existing[0].subscriptionId, keyId: process.env.RAZORPAY_KEY_ID, amount: annualPricePaise, currency: "INR" };
  }
  const created = await razorpay<{id:string;status:string;plan_id:string}>("subscriptions", { method: "POST", body: JSON.stringify({ plan_id: planId, total_count: 30, quantity: 1, customer_notify: 1, notes: { member: account.email } }) });
  if (!/^sub_[a-zA-Z0-9]+$/.test(created.id) || created.plan_id !== planId) throw new HttpError(502, "The payment provider returned an invalid subscription.");
  await database.collection("subscriptions").insertOne({ email: account.email, subscriptionId: created.id, status: created.status, planId, amountPaise: annualPricePaise, currency: "INR", createdAt: new Date().toISOString() });
  return { subscriptionId: created.id, keyId: process.env.RAZORPAY_KEY_ID, amount: annualPricePaise, currency: "INR" };
});
