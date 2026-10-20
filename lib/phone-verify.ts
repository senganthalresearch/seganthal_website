import { HttpError } from "./http";

function config() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) throw new HttpError(503, "Mobile verification is not configured yet.");
  return { account: TWILIO_ACCOUNT_SID, token: TWILIO_AUTH_TOKEN, service: TWILIO_VERIFY_SERVICE_SID };
}

async function verifyRequest(path: string, body: URLSearchParams) {
  const { account, token, service } = config();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(service)}/${path}`, {
    method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${account}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store"
  });
  if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502, "Mobile verification could not be completed. Please try later.");
  return await response.json() as { status?: string };
}

export async function sendPhoneOtp(phone: string) {
  await verifyRequest("Verifications", new URLSearchParams({ To: phone, Channel: "sms" }));
}

export async function checkPhoneOtp(phone: string, code: string) {
  const result = await verifyRequest("VerificationCheck", new URLSearchParams({ To: phone, Code: code }));
  if (result.status !== "approved") throw new HttpError(400, "The verification code is invalid or expired.");
}
