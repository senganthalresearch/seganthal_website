import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { accessUntil, paidPeriod, paymentMode, validSignature, type Invoice, type Payment } from '../lib/billing-rules';
import type { BillingRecord } from '../lib/billing';

const now = Math.floor(Date.now()/1000);
const invoice: Invoice = { id:'inv_test1', subscription_id:'sub_test1', payment_id:'pay_test1', status:'paid', amount:59900, amount_paid:59900, currency:'INR', billing_start:now-100, billing_end:now-100+365*86400 };
const payment: Payment = { id:'pay_test1', invoice_id:'inv_test1', status:'captured', amount:59900, currency:'INR', amount_refunded:0 };

test('annual access requires a captured matching invoice, exact price and a valid annual period',()=>{
  const period=paidPeriod(invoice,payment,'sub_test1');assert.ok(period);assert.equal(accessUntil([period],now),invoice.billing_end);
  for(const patch of [{status:'authorized'},{amount:100},{currency:'USD'},{invoice_id:'inv_other'}])assert.equal(paidPeriod(invoice,{...payment,...patch},'sub_test1'),null);
  for(const patch of [{status:'issued'},{amount_paid:100},{subscription_id:'sub_other'},{billing_end:now+86400},{billing_start:0},{payment_id:'pay_other'}])assert.equal(paidPeriod({...invoice,...patch},payment,'sub_test1'),null);
  assert.equal(accessUntil([period],period.end),0);
  assert.equal(accessUntil([{...period,start:now+100}],now),0);
});
test('full refunds revoke their period; partial refunds do not erase the paid year',()=>{
  assert.equal(accessUntil([paidPeriod(invoice,{...payment,amount_refunded:59900},'sub_test1')!],now),0);
  assert.ok(accessUntil([paidPeriod(invoice,{...payment,amount_refunded:100},'sub_test1')!],now)>now);
});
test('signature validation rejects altered bodies, bad encoding and missing secrets',()=>{
  const secret='fixture-only-secret',body='pay_test1|sub_test1';
  const signature=createHmac('sha256',secret).update(body).digest('hex');
  assert.equal(validSignature(body,signature,secret),true);
  assert.equal(validSignature(body+'x',signature,secret),false);
  assert.equal(validSignature(body,'bad',secret),false);
  assert.equal(validSignature(body,signature,''),false);
});
test('test billing cannot be enabled on the production domain',()=>{
  assert.equal(paymentMode({RAZORPAY_MODE:'test',NEXTAUTH_URL:'https://www.senganthal.co.in',BILLING_TEST_ORIGIN:'https://www.senganthal.co.in'}),null);
  assert.equal(paymentMode({RAZORPAY_MODE:'test',NEXTAUTH_URL:'http://localhost:3000'}),'test');
  assert.equal(paymentMode({RAZORPAY_MODE:'test',NEXTAUTH_URL:'https://staging.example.com'}),null);
  assert.equal(paymentMode({RAZORPAY_MODE:'test',NEXTAUTH_URL:'https://staging.example.com',BILLING_TEST_ORIGIN:'https://staging.example.com'}),'test');
  assert.equal(paymentMode({RAZORPAY_MODE:'disabled',NEXTAUTH_URL:'http://localhost:3000'}),null);
});

// Injectable in-memory database and fake provider: no network, credentials,
// emails, card charges or changes to the user's local account database.
test('checkout, replay, renewal, cancellation, refund and access checks',async()=>{
  const env={...process.env}, originalFetch=global.fetch;
  const dbModule=require('../lib/db'), originalDb=dbModule.db;
  const stores=new Map<string,Record<string,any>[]>();
  const match=(doc:Record<string,any>,q:Record<string,any>)=>Object.entries(q).every(([k,v])=>v&&typeof v==='object'&&'$lt'in v?doc[k]<v.$lt:doc[k]===v);
  const collection=(name:string)=>{
    if(!stores.has(name))stores.set(name,[]);const rows=stores.get(name)!;
    const update=(q:Record<string,any>,u:Record<string,any>,o?:{upsert?:boolean})=>{let row=rows.find(d=>match(d,q));const insert=!row;if(!row&&o?.upsert){row={...q};rows.push(row)}if(row){if(insert)Object.assign(row,u.$setOnInsert);Object.assign(row,u.$set)}return row;};
    return {findOne:async(q:Record<string,any>)=>structuredClone(rows.find(d=>match(d,q))||null),updateOne:async(q:Record<string,any>,u:Record<string,any>,o?:{upsert?:boolean})=>{update(q,u,o);return{}},findOneAndUpdate:async(q:Record<string,any>,u:Record<string,any>,o?:{upsert?:boolean})=>structuredClone(update(q,u,o)||null),insertOne:async(d:Record<string,any>)=>{rows.push(d);return{}},find:(q:Record<string,any>)=>({toArray:async()=>structuredClone(rows.filter(d=>match(d,q)))})};
  };
  dbModule.db=async()=>({collection});
  Object.assign(process.env,{NEXTAUTH_URL:'http://localhost:3000',RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_test_fixture',RAZORPAY_KEY_SECRET:'fixture',RAZORPAY_YEARLY_PLAN_ID:'plan_fixture',RAZORPAY_WEBHOOK_SECRET:'fixture-webhook'});
  let creates=0,cancels=0,price=59900,providerStatus='created',providerInvoices:Invoice[]=[],providerPayment={...payment};
  global.fetch=(async(url:unknown,options?:RequestInit)=>{
    const path=String(url).split('/v1/')[1];let value:unknown;
    if(path==='plans/plan_fixture')value={id:'plan_fixture',period:'yearly',interval:1,item:{amount:price,currency:'INR'}};
    else if(path==='subscriptions'&&options?.method==='POST'){creates++;value={id:'sub_test1',status:'created'};}
    else if(path==='subscriptions/sub_test1')value={id:'sub_test1',plan_id:'plan_fixture',quantity:1,status:providerStatus};
    else if(path?.startsWith('invoices?'))value={items:providerInvoices};
    else if(path==='payments/pay_test1')value=providerPayment;
    else if(path==='subscriptions/sub_test1/cancel'){cancels++;providerStatus='cancelled';value={id:'sub_test1',status:'cancelled'};}
    else throw new Error(`Unexpected fake request: ${path}`);
    return new Response(JSON.stringify(value),{status:200});
  }) as typeof fetch;
  try{
    const billing=require('../lib/billing') as typeof import('../lib/billing');
    const member={email:'member@example.test',role:'full' as const,active:true,emailVerifiedAt:'yes',onboardedAt:'yes'};
    assert.equal(await billing.hasPaidAccess(member),false,'Full role must not bypass payment');
    assert.equal(await billing.hasPaidAccess({...member,role:'admin'}),true);
    assert.equal(await billing.hasPaidAccess({...member,role:'admin',active:false}),false);
    const invited={...member,complimentaryAccessUntil:now+86400};
    assert.equal(await billing.hasPaidAccess(invited),true,'An explicit admin grant unlocks a verified member');
    assert.equal((await billing.billingSummary(invited)).complimentaryUntil,invited.complimentaryAccessUntil);
    await assert.rejects(billing.createCheckout(invited),/already included/);
    assert.equal(await billing.hasPaidAccess({...invited,complimentaryAccessUntil:now-1}),false);
    assert.equal(await billing.hasPaidAccess({...invited,active:false}),false);
    assert.equal(await billing.hasPaidAccess({...invited,onboardedAt:undefined}),false);
    price=60000;await assert.rejects(billing.createCheckout(member),/not configured correctly/);assert.equal(creates,0);price=59900;
    await billing.createCheckout(member);await billing.createCheckout(member);assert.equal(creates,1,'Repeated checkout reuses the existing subscription');
    providerStatus='authenticated';await billing.refreshBilling(member.email);assert.equal(await billing.hasPaidAccess(member),false,'Mandate authentication is not payment');
    providerStatus='active';providerInvoices=[invoice];await billing.refreshBilling(member.email);assert.equal(await billing.hasPaidAccess(member),true);
    await billing.refreshBilling(member.email);let record=await billing.billingRecord(member.email);assert.equal(record?.periods.length,1);assert.equal(record?.paidUntil,invoice.billing_end,'Replay does not extend access');
    await assert.rejects(billing.createCheckout(member),/already active/);assert.equal(creates,1);
    await billing.cancelRenewal(member.email);assert.equal(cancels,1);assert.equal(await billing.hasPaidAccess(member),true,'Cancellation retains paid access');
    await billing.cancelRenewal(member.email);assert.equal(cancels,1,'Cancellation is idempotent');
    providerStatus='active';providerPayment={...payment,amount_refunded:59900};await billing.refreshBilling(member.email);assert.equal(await billing.hasPaidAccess(member),false);assert.equal(cancels,2,'Full refund cancels future renewal');
    providerStatus='pending';await billing.refreshBilling(member.email);assert.equal(await billing.hasPaidAccess(member),false,'Delayed notification cannot restore refunded access');
    providerPayment={...payment};providerStatus='active';providerInvoices=[{...invoice,billing_start:now-366*86400,billing_end:now-86400}];await billing.refreshBilling(member.email);assert.equal(await billing.hasPaidAccess(member),false,'Expired periods do not grant access');
    providerInvoices=[{...invoice,billing_start:now-100,billing_end:now+365*86400-100}];await billing.refreshBilling(member.email);assert.equal(await billing.hasPaidAccess(member),true,'A renewed paid period restores access');
    process.env.RAZORPAY_MODE='live';process.env.RAZORPAY_KEY_ID='rzp_live_fixture';assert.equal(await billing.hasPaidAccess(member),false,'Test records cannot unlock live access');
    process.env.RAZORPAY_MODE='test';process.env.RAZORPAY_KEY_ID='rzp_test_fixture';
    // Switching must reconcile provider state and confirm closure, not merely
    // delete a local subscription ID or trust the caller's unpaid claim.
    const switchEmail='switch@example.test';
    const seedSwitch=()=>{const rows=stores.get('billingAccounts')!;const old=rows.findIndex(r=>r.email===switchEmail);if(old>=0)rows.splice(old,1);rows.push({_id:'test:'+switchEmail,mode:'test',email:switchEmail,subscriptionId:'sub_test1',status:'created',periods:[],paidUntil:0,attempt:'switch-fixture',createdAt:Date.now()});};
    providerInvoices=[];providerStatus='created';seedSwitch();
    let before=cancels;
    assert.equal((await billing.switchToManualUpi(switchEmail))?.status,'cancelled');
    assert.equal(cancels,before+1);
    assert.equal((await billing.billingRecord(switchEmail))?.status,'cancelled');
    await billing.switchToManualUpi(switchEmail);assert.equal(cancels,before+1,'Repeated switching does not cancel again');
    providerStatus='authenticated';seedSwitch();before=cancels;
    await assert.rejects(billing.switchToManualUpi(switchEmail),/already in progress/);assert.equal(cancels,before);
    providerStatus='active';providerInvoices=[invoice];seedSwitch();
    assert.equal((await billing.switchToManualUpi(switchEmail))?.paidUntil,invoice.billing_end);assert.equal(cancels,before,'A just-paid subscription is preserved');
    providerInvoices=[];providerStatus='expired';seedSwitch();
    assert.equal((await billing.switchToManualUpi(switchEmail))?.status,'expired');assert.equal(cancels,before,'Stale local created status is refreshed without cancellation');
    const workingFetch=global.fetch;global.fetch=(async()=>{throw new Error('Provider unavailable');}) as typeof fetch;
    seedSwitch();await assert.rejects(billing.switchToManualUpi(switchEmail),/could not be reached/);
    assert.equal((await billing.billingRecord(switchEmail))?.status,'created','An outage never unblocks another payment');global.fetch=workingFetch;
    const auth=require('../lib/auth'),originalMember=auth.currentMember;
    try{
      auth.currentMember=async()=>({...member,email:'unpaid@example.test'});
      const http=require('../lib/http') as typeof import('../lib/http');await assert.rejects(http.requireMember(),(e:any)=>e.status===402);assert.equal((await http.requireAccount()).email,'unpaid@example.test');
      auth.currentMember=async()=>({...member,role:'admin'});assert.equal((await http.requireMember(true)).role,'admin');
      auth.currentMember=async()=>({...member,reviewDemo:true});await assert.rejects(http.requireAccount(),(e:any)=>e.status===403);
    }finally{auth.currentMember=originalMember;}
  }finally{global.fetch=originalFetch;dbModule.db=originalDb;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);}
});
