import { db } from "./db";
import { HttpError } from "./http";

type OtpSession = { _id: string; sessionId: string; expiresAt: Date };
type ProviderResult = { Status: string; Details?: string };

function apiKey() {
  const key = process.env.TWOFACTOR_API_KEY?.trim();
  if (!key) throw new HttpError(503, "Mobile verification is not configured yet.");
  return key;
}

async function providerRequest(path: string): Promise<ProviderResult> {
  const key = apiKey();
  let response: Response;
  try {
    response = await fetch(`https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/${path}`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new HttpError(502, "Mobile verification is temporarily unavailable. Please try again.");
  }
  if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502, "Mobile verification is temporarily unavailable. Please try again.");
  const result = await response.json().catch(() => null) as ProviderResult | null;
  if (!result || typeof result.Status !== "string") throw new HttpError(502, "Mobile verification returned an unexpected response.");
  return result;
}

export async function sendPhoneOtp(phone: string) {
  // 2Factor's V1 API uses the key in its URL. Never expose or log that URL.
  const number = phone.replace(/^\+/, "");
  const template = process.env.TWOFACTOR_TEMPLATE_NAME?.trim();
  const path = `${number}/AUTOGEN${template ? `/${encodeURIComponent(template)}` : ""}`;
  const result = await providerRequest(path);
  if (result.Status.toLowerCase() !== "success" || !result.Details) throw new HttpError(502, "A verification code could not be sent. Please try again.");
  await (await db()).collection<OtpSession>("phoneOtpSessions").updateOne(
    { _id: phone }, { $set: { sessionId: result.Details, expiresAt: new Date(Date.now() + 10 * 60000) } }, { upsert: true }
  );
}

export async function checkPhoneOtp(phone: string, code: string) {
  const collection = (await db()).collection<OtpSession>("phoneOtpSessions");
  const session = await collection.findOne({ _id: phone, expiresAt: { $gt: new Date() } });
  if (!session) throw new HttpError(400, "Send a new verification code and try again.");
  const result = await providerRequest(`VERIFY/${encodeURIComponent(session.sessionId)}/${encodeURIComponent(code)}`);
  if (result.Status.toLowerCase() !== "success") throw new HttpError(400, "The verification code is invalid or expired.");
  const consumed = await collection.deleteOne({ _id: phone, sessionId: session.sessionId });
  if (!consumed.deletedCount) throw new HttpError(400, "The verification code has already been used.");
}
