import { mongoDb as db } from './db';
import { owners } from './access';
import { manualAccessEnd, type ManualPayment } from './manual-payment-rules';
import type { Member } from './types';

export async function manualPaidUntil(member: Member) {
  if (!member.accountId) return 0;
  const rows = await (await db()).collection<ManualPayment>('manualPayments').find({email:member.email,accountId:member.accountId,status:'approved',end:{$gt:Math.floor(Date.now()/1000)}},{projection:{screenshot:0}}).toArray();
  return manualAccessEnd(rows, member.accountId);
}
export async function manualPaymentSettings() {
  const setting = await (await db()).collection('settings').findOne({key:'manualUpi'});
  return { enabled:setting?.enabled === true, recipient:'MR SURIYA V', qr:'/payments/bharatpe-qr.jpeg' };
}
export async function notifyManualPayment(row: ManualPayment, event: 'submitted'|'reviewed') {
  let sent = false;
  try {
    const to = event === 'submitted' ? owners() : [row.email];
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_OTP_FROM || !to.length) throw new Error('Email unavailable');
    const url = new URL(event === 'submitted' ? '/workspace#Admin' : '/account', process.env.NEXTAUTH_URL || 'https://www.senganthal.co.in').href;
    const text = event === 'submitted' ? `A UPI payment is awaiting verification.\nAccount: ${row.email}\nAmount: ₹599\nReference: ${row.utr}\nReview privately: ${url}\nCheck successful receipt in your merchant account before approving. A screenshot does not verify payment.` :
      `Your UPI payment request ${row.utr} is ${row.status}.\n${row.status === 'approved' ? 'Your membership is active until '+new Date(row.end!*1000).toLocaleDateString('en-IN')+'. Renewal is manual.' : row.note || ''}\nView your account: ${url}`;
    const response = await fetch('https://api.resend.com/emails', {method:'POST', headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`manual-${row._id}-${event}-${row.status}`}, body:JSON.stringify({from:process.env.EMAIL_OTP_FROM,to,subject:event==='submitted'?'Senganthal: UPI payment awaiting review':`Senganthal: payment ${row.status}`,text}),signal:AbortSignal.timeout(10000)});
    sent = response.ok;
  } catch { /* The saved request and access decision remain valid if email fails. */ }
  try { await (await db()).collection<ManualPayment>('manualPayments').updateOne({_id:row._id,status:row.status},{$set:{notification:sent?'sent':'failed'}}); } catch { /* Notification metadata must not undo a saved payment decision. */ }
  return sent;
}
