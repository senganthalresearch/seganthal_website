import test from 'node:test';
import assert from 'node:assert/strict';
import type { ManualPayment } from '../lib/manual-payment-rules';
import type { Member } from '../lib/types';

// Execute the real route against an isolated in-memory merchant ledger and
// authenticated identities. No bank, production database or email is contacted.
test('manual payment route protects proof, rejects duplicate credits and makes review idempotent',async()=>{
  const Module = require('node:module');
  const originalLoad = Module._load;
  const rows: ManualPayment[] = [];
  const member: Member = {accountId:'account-1',email:'member@example.com',role:'standard',active:true,emailVerifiedAt:'verified',onboardedAt:'done'};
  let identity:Member|null=member, enabled=true, active=false, originalAccount=true;
  const accounts:Record<string,unknown>={_id:'account-1',...member};
  class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
  const matches=(row:Record<string,unknown>,filter:Record<string,unknown>)=>Object.entries(filter).every(([k,v])=>row[k]===v);
  const collection={
    async findOne(filter:Record<string,unknown>){return rows.find(r=>matches(r,filter))||null;},
    async insertOne(row:ManualPayment){if(rows.some(r=>r.utr===row.utr||(r.accountId===row.accountId&&r.status==='pending')))throw Object.assign(new Error('duplicate'),{code:11000});rows.push(row);},
    async updateOne(filter:Record<string,unknown>,update:{$set:Partial<ManualPayment>}){const row=rows.find(r=>matches(r,filter));if(!row)return {modifiedCount:0};Object.assign(row,update.$set);return {modifiedCount:1};}
  };
  const database={collection(name:string){return name==='manualPayments'?collection:name==='members'?{findOne:async()=>originalAccount?accounts:{...accounts,_id:'replacement'},updateOne:async()=>({modifiedCount:1})}:{updateOne:async()=>({}),insertOne:async()=>({})};}};
  const queue = new Map<string,Promise<unknown>>();
  const stubs:Record<string,unknown>={
    '@/lib/http':{HttpError,checkOrigin:(r:Request)=>{if(r.headers.get('origin')!=='https://example.com')throw new HttpError(403,'Origin');},requireAccount:async()=>{if(!identity)throw new HttpError(401,'Login');return identity;},limited:async()=>{},api:(fn:(r:Request)=>Promise<unknown>)=>async(r:Request)=>{try{return Response.json(await fn(r));}catch(e){return Response.json({error:(e as Error).message},{status:e instanceof HttpError?e.status:(e as Error).name==='ZodError'?400:503});}}},
    '@/lib/db':{mongoDb:async()=>database},
    '@/lib/billing':{billingRecord:async()=>null,hasPaidAccess:async()=>active,locked:async(key:string,fn:()=>Promise<unknown>)=>{const previous=queue.get(key)||Promise.resolve();const next=previous.catch(()=>{}).then(fn);queue.set(key,next);return next;}},
    '@/lib/manual-payments':{manualPaymentSettings:async()=>({enabled}),notifyManualPayment:async()=>false},
    '@/lib/manual-payment-rules':require('../lib/manual-payment-rules')
  };
  Module._load=function(name:string,...args:unknown[]){return name in stubs?stubs[name]:originalLoad.call(this,name,...args);};
  let route:{GET:(r:Request)=>Promise<Response>;POST:(r:Request)=>Promise<Response>};
  try{route=require('../app/api/manual-payments/route');}finally{Module._load=originalLoad;}
  const post=(body:unknown,origin='https://example.com')=>route.POST(new Request('https://example.com/api/manual-payments',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  const proof='data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(10)]).toString('base64');
  const submit={action:'submit',utr:'123456789012',payerName:'Member',paidAt:new Date().toISOString(),screenshot:proof,consent:true,email:'attacker@example.com'};
  identity=null;assert.equal((await post(submit)).status,401);identity=member;
  assert.equal((await post(submit,'https://evil.example')).status,403);
  enabled=false;assert.equal((await post(submit)).status,409);enabled=true;
  active=true;assert.equal((await post(submit)).status,409);active=false;
  const saved=await post(submit);assert.equal(saved.status,200);assert.equal((await saved.json()).emailSent,false);assert.equal(rows[0].email,member.email);assert.equal(rows[0].status,'pending');
  assert.equal((await post({...submit,utr:'223456789012'})).status,409);
  const id=rows[0]._id;
  const review={action:'approve',id,note:'Matched successful merchant credit',verified:true};
  assert.equal((await post(review)).status,403);
  identity={...member,email:'other@example.com',accountId:'other'};
  assert.equal((await route.GET(new Request('https://example.com/api/manual-payments?proof='+id))).status,404);
  assert.equal((await post(submit)).status,409);
  identity={email:'admin@example.com',role:'admin',active:true};
  originalAccount=false;assert.equal((await post(review)).status,409);originalAccount=true;
  assert.equal((await post({...review,verified:false})).status,400);
  const outcomes=await Promise.all([post(review),post(review)]);assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);assert.equal(rows[0].status,'approved');assert.ok(rows[0].end!>Date.now()/1000);
  assert.equal((await post({...review,action:'revoke',note:'Refund processed separately; reference recorded'})).status,200);assert.equal(rows[0].status,'revoked');
  assert.equal((await post(review)).status,409);
  identity=member;assert.equal((await post(submit)).status,409);
});
