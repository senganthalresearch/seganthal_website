import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { razorpay, validSignature } from "@/lib/billing";

type Subscription = { id?: string; plan_id?: string; status?: string; current_end?: number | null; paid_count?: number };
type Event = { event?: string; payload?: { subscription?: { entity?: Subscription }; payment?: { entity?: { id?: string; status?: string; amount?: number; currency?: string } } } };

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature") || "";
  const raw = await request.text();
  if (!secret || !validSignature(raw, signature, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let event: Event;
  try { event = JSON.parse(raw) as Event; } catch { return NextResponse.json({ error: "Invalid event" }, { status: 400 }); }
  const subscription = event.payload?.subscription?.entity;
  if (!subscription?.id) return NextResponse.json({ ok: true });
  const database = await db();
  const saved = await database.collection<{email:string;subscriptionId:string;planId:string;paidUntil?:string}>("subscriptions").findOne({ subscriptionId: subscription.id });
  if (!saved || subscription.plan_id !== saved.planId || subscription.plan_id !== process.env.RAZORPAY_PLAN_ID) return NextResponse.json({ error: "Unknown subscription" }, { status: 400 });
  const eventId = request.headers.get("x-razorpay-event-id") || "";
  if (eventId && await database.collection("paymentEvents").findOne({ eventId })) return NextResponse.json({ ok: true });
  const now = new Date().toISOString();
  if (event.event === "subscription.charged") {
    const payment = event.payload?.payment?.entity;
    const latest = await razorpay<Subscription>(`subscriptions/${encodeURIComponent(subscription.id)}`);
    const paidUntil = latest.current_end ? new Date(latest.current_end * 1000).toISOString() : "";
    if (latest.id !== subscription.id || latest.plan_id !== saved.planId || !latest.paid_count || !paidUntil || Date.parse(paidUntil) <= Date.now() || payment && (payment.status !== "captured" || payment.amount !== 60000 || payment.currency !== "INR")) {
      return NextResponse.json({ error: "Charge details are incomplete" }, { status: 400 });
    }
    const member = await database.collection<{paidUntil?:string}>("members").findOne({ email: saved.email });
    if (!member) return NextResponse.json({ error: "Member no longer exists" }, { status: 400 });
    if (!member.paidUntil || Date.parse(paidUntil) > Date.parse(member.paidUntil)) {
      await database.collection("members").updateOne({ email: saved.email }, { $set: { paidUntil, lastPaymentId: payment?.id || "", paymentUpdatedAt: now } });
    }
    await database.collection("subscriptions").updateOne({ subscriptionId: subscription.id }, { $set: { status: latest.status || "active", paidUntil, lastPaymentId: payment?.id || "", updatedAt: now } });
  } else if (event.event?.startsWith("subscription.")) {
    await database.collection("subscriptions").updateOne({ subscriptionId: subscription.id }, { $set: { status: subscription.status || "unknown", updatedAt: now } });
  }
  if (eventId) await database.collection("paymentEvents").updateOne({ eventId }, { $setOnInsert: { eventId, event: event.event, subscriptionId: subscription.id, createdAt: now } }, { upsert: true });
  return NextResponse.json({ ok: true });
}
