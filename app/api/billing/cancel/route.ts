import { currentAccount } from "@/lib/auth";
import { razorpay } from "@/lib/billing";
import { db } from "@/lib/db";
import { api, checkOrigin, HttpError } from "@/lib/http";

export const POST = api(async request => {
  checkOrigin(request);
  const account = await currentAccount();
  if (!account) throw new HttpError(401, "Sign in first.");
  const database = await db();
  const latest = await database.collection<{email:string;subscriptionId:string;status:string}>("subscriptions").find({ email: account.email }).sort({ createdAt: -1 }).limit(1).toArray();
  const subscription = latest[0];
  if (!subscription || !["active", "authenticated", "created", "pending", "halted"].includes(subscription.status)) throw new HttpError(400, "There is no active renewal to cancel.");
  const cancelled = await razorpay<{id:string;status:string}>(`subscriptions/${encodeURIComponent(subscription.subscriptionId)}/cancel`, { method: "POST", body: JSON.stringify({ cancel_at_cycle_end: 1 }) });
  if (cancelled.id !== subscription.subscriptionId) throw new HttpError(502, "Could not confirm cancellation.");
  await database.collection("subscriptions").updateOne({ subscriptionId: subscription.subscriptionId }, { $set: { cancelAtCycleEnd: true, status: cancelled.status, updatedAt: new Date().toISOString() } });
  await database.collection("audit").insertOne({ action: "subscription.cancel", actor: account.email, target: subscription.subscriptionId, createdAt: new Date() });
  return { ok: true };
});
