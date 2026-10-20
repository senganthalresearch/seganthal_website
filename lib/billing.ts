import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";
import { annualPricePaise } from "./membership";

export function billingConfigured() {
  return ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_PLAN_ID", "RAZORPAY_WEBHOOK_SECRET"].every(key => Boolean(process.env[key]));
}

export function validSignature(payload: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("hex"), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export async function razorpay<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new HttpError(503, "Payment setup is not complete.");
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  if (!response.ok) throw new HttpError(502, "The payment provider is temporarily unavailable.");
  return await response.json() as T;
}

export async function verifyAnnualPlan() {
  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!billingConfigured() || !planId) throw new HttpError(503, "Yearly subscriptions are awaiting payment gateway setup.");
  const plan = await razorpay<{id:string;period:string;interval:number;item?:{amount:number;currency:string}}>(`plans/${encodeURIComponent(planId)}`);
  if (plan.id !== planId || plan.period !== "yearly" || plan.interval !== 1 || plan.item?.amount !== annualPricePaise || plan.item?.currency !== "INR") {
    throw new HttpError(503, "The payment plan must be ₹600 INR billed yearly.");
  }
  return planId;
}
