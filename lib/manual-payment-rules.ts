export const MANUAL_PRICE = 59900;
export type ManualPayment = {
  _id: string; accountId: string; email: string; payerName: string; utr: string;
  amount: number; consentAt?: string; termsVersion?: string; paidAt: string; createdAt: string; status: 'pending'|'approved'|'rejected'|'revoked';
  screenshot: string; reviewedBy?: string; reviewedAt?: string; note?: string;
  start?: number; end?: number; notification?: 'sent'|'failed';
  source?: 'admin-record'; history?: {action:string;actor:string;note:string;at:string}[];
};
export function normalizeUtr(value: string) { return value.trim().toUpperCase(); }
export function manualAccessEnd(rows: Pick<ManualPayment, 'status'|'accountId'|'amount'|'end'>[], accountId: string, now = Math.floor(Date.now()/1000)) {
  return rows.reduce((end, row) => row.status === 'approved' && row.accountId === accountId && row.amount === MANUAL_PRICE && Number.isSafeInteger(row.end) && row.end! > now ? Math.max(end, row.end!) : end, 0);
}
export function annualEnd(start: number) {
  const date = new Date(start * 1000), month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return Math.floor(date.getTime()/1000);
}
// Accept raster images only, never HTML, SVG or a user-controlled URL.
export function validProof(value: string) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 12 || bytes.length > 2 * 1024 * 1024) return false;
  return match[1] === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
    bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
}
