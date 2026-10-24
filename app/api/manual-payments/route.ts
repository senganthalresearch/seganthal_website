import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { api, checkOrigin, requireAccount, limited, HttpError } from '@/lib/http';
import { mongoDb as db } from '@/lib/db';
import { billingRecord, hasPaidAccess, locked } from '@/lib/billing';
import { manualPaymentSettings, notifyManualPayment } from '@/lib/manual-payments';
import { annualEnd, MANUAL_PRICE, normalizeUtr, validProof, type ManualPayment } from '@/lib/manual-payment-rules';
import type { Member } from '@/lib/types';

export const runtime = 'nodejs';
const inputSchema = z.discriminatedUnion('action', [
  z.object({action:z.literal('record'),email:z.email().trim().toLowerCase(),utr:z.string().transform(normalizeUtr).pipe(z.string().regex(/^\d{12}$/)),amount:z.literal(MANUAL_PRICE),end:z.number().int().positive(),note:z.string().trim().min(5).max(500),verified:z.literal(true)}),
  z.object({action:z.literal('submit'),utr:z.string().transform(normalizeUtr).pipe(z.string().regex(/^\d{12}$/)),payerName:z.string().trim().min(2).max(100),paidAt:z.iso.datetime(),screenshot:z.string().max(2800000).refine(validProof),consent:z.literal(true)}),
  z.object({action:z.literal('configure'),enabled:z.boolean(),confirmed:z.literal(true)}),
  z.object({action:z.enum(['approve','reject','revoke','retryEmail']),id:z.string().uuid(),note:z.string().trim().min(5).max(500),verified:z.literal(true)})
]);
async function boundedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400,'Missing request.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {done,value} = await reader.read(); if(done) break; size += value.length; if(size>2900000) {await reader.cancel();throw new HttpError(413,'Screenshot must be at most 2 MB.');} chunks.push(value); } }
  finally {reader.releaseLock();}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {throw new HttpError(400,'Invalid request.');}
}
export const GET = api(async request => {
  const member = await requireAccount(), params = new URL(request.url).searchParams;
  const admin = member.role === 'admin', database = await db(), collection = database.collection<ManualPayment>('manualPayments');
  if (params.has('proof')) {
    const id = z.string().uuid().parse(params.get('proof'));
    const row = await collection.findOne({_id:id,...(!admin?{email:member.email,accountId:member.accountId}: {})});
    if (!row) throw new HttpError(404,'Payment request not found.');
    return {screenshot:row.screenshot};
  }
  const status = z.enum(['all','pending','approved','rejected','revoked']).parse(params.get('status')||'all');
  const page = z.coerce.number().int().min(1).max(100000).parse(params.get('page')||1);
  const email = (params.get('email')||'').trim().toLowerCase();
  const filter = {...(!admin?{email:member.email,accountId:member.accountId}:email?{email:z.email().parse(email)}:{}),...(status!=='all'?{status}:{})};
  const total = await collection.countDocuments(filter), pages = Math.max(1,Math.ceil(total/20)), current = Math.min(page,pages);
  return {settings:await manualPaymentSettings(),rows:await collection.find(filter,{projection:{screenshot:0}}).sort({createdAt:-1}).skip((current-1)*20).limit(20).toArray(),page:current,pages,total};
});
export const POST = api(async request => {
  checkOrigin(request); const member = await requireAccount(); await limited(member,'manual-payment',10);
  const input = inputSchema.parse(await boundedJson(request)), database = await db(), collection = database.collection<ManualPayment>('manualPayments');
  if (input.action === 'submit') {
    if (!(await manualPaymentSettings()).enabled) throw new HttpError(409,'UPI submissions are currently closed. Contact support if you have already paid.');
    if (!member.accountId || member.role==='admin') throw new HttpError(400,'This account does not need a membership payment.');
    const time = Date.parse(input.paidAt);
    if (time>Date.now()+300000 || time<Date.now()-30*86400000) throw new HttpError(400,'Choose the actual payment time within the last 30 days. For older payments contact support.');
    return locked(`manual:${member.accountId}`,async()=>{
      if(await hasPaidAccess(member)) throw new HttpError(409,'You already have access. Contact support if you paid twice.');
      const billing = await billingRecord(member.email);
      if(billing && (!billing.subscriptionId || !['cancelled','expired','completed'].includes(billing.status))) throw new HttpError(409,'Close the unused card checkout using Switch to UPI on Account & billing, or contact support before paying again.');
      const row: ManualPayment = {_id:randomUUID(),email:member.email,accountId:member.accountId!,payerName:input.payerName,utr:input.utr,paidAt:input.paidAt,amount:MANUAL_PRICE,consentAt:new Date().toISOString(),termsVersion:'manual-upi-599-v1',screenshot:input.screenshot,status:'pending',createdAt:new Date().toISOString()};
      try {await collection.insertOne(row);} catch(error) {if((error as {code?:number}).code===11000)throw new HttpError(409,'This reference was already submitted, or you have a request awaiting review. Contact support for corrections.');throw error;}
      const emailSent = await notifyManualPayment(row,'submitted');
      return {ok:true,emailSent};
    });
  }
  if(member.role!=='admin') throw new HttpError(403,'Administrator access required.');
  if(input.action==='record') {
    if(input.email===member.email)throw new HttpError(403,'You cannot record your own payment.');
    const account=await database.collection('members').findOne({email:input.email});
    const now=Math.floor(Date.now()/1000);
    if(!account||!account.active||account.role==='admin'||!account.emailVerifiedAt||!account.onboardedAt||(account.reviewerAccessUntil||0)>now)throw new HttpError(409,'Choose an active member who has completed email and password setup.');
    if(input.end<=now||input.end>annualEnd(now))throw new HttpError(400,'Expiry must be in the future and no later than one year from today.');
    const accountId=String(account._id);
    return locked(`manual:${accountId}`,async()=>{
      if(await hasPaidAccess({...account,accountId} as unknown as Member))throw new HttpError(409,'This member already has access. Review duplicate payments before recording another membership.');
      if(await collection.findOne({accountId,status:'pending'}))throw new HttpError(409,'Review the existing pending payment request first.');
      const billing=await billingRecord(input.email);
      if(billing&&(!billing.subscriptionId||!['cancelled','expired','completed'].includes(billing.status)))throw new HttpError(409,'Review or close the existing card subscription first to prevent duplicate billing.');
      const at=new Date().toISOString();
      const row:ManualPayment={_id:randomUUID(),accountId,email:input.email,payerName:String(account.name||input.email),utr:input.utr,amount:input.amount,paidAt:at,createdAt:at,screenshot:'',status:'approved',start:now,end:input.end,note:input.note,reviewedBy:member.email,reviewedAt:at,source:'admin-record',history:[{action:'record',actor:member.email,note:input.note,at}]};
      try{await collection.insertOne(row);}catch(error){if((error as {code?:number}).code===11000)throw new HttpError(409,'This payment reference has already been used.');throw error;}
      await database.collection('members').updateOne({_id:account._id},{$set:{manualPaidUntil:input.end}});
      await database.collection('audit').insertOne({action:'manual-payment.record',actor:member.email,target:input.email,reference:input.utr,amount:input.amount,end:input.end,note:input.note,createdAt:new Date()});
      return {ok:true,emailSent:await notifyManualPayment(row,'reviewed')};
    });
  }
  if(input.action==='configure') {
    await database.collection('settings').updateOne({key:'manualUpi'},{$set:{enabled:input.enabled,confirmedBy:member.email,confirmedAt:new Date().toISOString()}},{upsert:true});
    await database.collection('audit').insertOne({action:'manual-payment.configure',actor:member.email,enabled:input.enabled,createdAt:new Date()});
    return {ok:true};
  }
  const original = await collection.findOne({_id:input.id});
  if(!original)throw new HttpError(404,'Payment request not found.');
  if(original.email===member.email)throw new HttpError(403,'You cannot review your own payment.');
  if(input.action==='retryEmail') return {ok:true,emailSent:await notifyManualPayment(original,original.status==='pending'?'submitted':'reviewed')};
  return locked(`manual:${original.accountId}`,async()=>{
    const expected = input.action==='revoke'?'approved':'pending';
    const row = await collection.findOne({_id:input.id,status:expected});
    if(!row)throw new HttpError(409,'This request has already been reviewed. Refresh the list.');
    const account = await database.collection('members').findOne({email:row.email});
    const sameAccount = account && String(account._id)===row.accountId;
    const now = Math.floor(Date.now()/1000);
    if(input.action==='approve') {
      if(!sameAccount||!account.active||account.role==='admin'||!account.emailVerifiedAt||!account.onboardedAt||(account.reviewerAccessUntil||0)>now) throw new HttpError(409,'The original account must be active, verified and fully set up.');
      if(await hasPaidAccess({...account,accountId:row.accountId} as unknown as Member))throw new HttpError(409,'This member already has access. Review a possible duplicate payment before proceeding.');
    }
    const next: ManualPayment = {...row,status:input.action==='approve'?'approved':input.action==='reject'?'rejected':'revoked',note:input.note,reviewedBy:member.email,reviewedAt:new Date().toISOString(),...(input.action==='approve'?{start:now,end:annualEnd(now)}:{})};
    const saved = await collection.updateOne({_id:row._id,status:expected},{$set:{status:next.status,note:next.note,reviewedBy:next.reviewedBy,reviewedAt:next.reviewedAt,...(input.action==='approve'?{start:next.start,end:next.end}:{})},$push:{history:{action:input.action,actor:member.email,note:input.note,at:next.reviewedAt!}}});
    if(!saved.modifiedCount)throw new HttpError(409,'Another administrator reviewed this request. Refresh the list.');
    // Access reads the payment itself; this field is only an admin-directory summary.
    if(sameAccount) await database.collection('members').updateOne({_id:account._id},{$set:{manualPaidUntil:input.action==='approve'?next.end:input.action==='revoke'?0:account.manualPaidUntil||0}});
    const emailSent = await notifyManualPayment(next,'reviewed');
    return {ok:true,emailSent};
  });
});
