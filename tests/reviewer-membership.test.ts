import test from 'node:test';
import assert from 'node:assert/strict';
import { hasReviewerAccess } from '../lib/reviewer-membership';
import { hashPassword } from '../lib/passwords';
import type { Member } from '../lib/types';

test('reviewer expiry never grants access to suspended, admin, incomplete or ordinary members', () => {
  const member: Member = { email:'review@example.test',role:'full',active:true,emailVerifiedAt:'verified',onboardedAt:'complete',reviewerAccessUntil:2000 };
  assert.equal(hasReviewerAccess(member,1999),true);
  assert.equal(hasReviewerAccess(member,2000),false);
  for(const patch of [{active:false},{role:'admin' as const},{emailVerifiedAt:undefined},{onboardedAt:undefined},{reviewerAccessUntil:0},{reviewerAccessUntil:undefined},{reviewerAccessUntil:Infinity}]) {
    assert.equal(hasReviewerAccess({...member,...patch},1000),false);
  }
});

test('existing reviewer password is retained; demo API isolation ends with revocation or expiry', async () => {
  const dbModule=require('../lib/db'),originalDb=dbModule.db,originalMongo=dbModule.mongoDb;
  const auth=require('../lib/auth'),originalCurrent=auth.currentMember;
  const env={...process.env};
  const password='Fixture-existing-password-8391!';
  const hash=await hashPassword(password);
  let row:Member={email:'review@example.test',role:'full',active:true,emailVerifiedAt:'yes',onboardedAt:'yes',reviewerAccessUntil:Math.floor(Date.now()/1000)+3600};
  let credentialReads=0;
  dbModule.db=async()=>({collection:(name:string)=>({
    findOne:async(q:any)=> {
      if(name==='emailCredentials'){credentialReads++;return q.email===row.email?{email:row.email,passwordHash:hash}:null;}
      return name==='members'&&q.email===row.email&&(q.active===undefined||q.active===row.active)?structuredClone(row):null;
    },
    find:()=>({toArray:async()=>[]}),
    findOneAndUpdate:async()=>({count:1})
  })});
  dbModule.mongoDb=dbModule.db;
  Object.assign(process.env,{ADMIN_EMAILS:'owner@example.test',REVIEWER_LOGIN_EMAIL:'',RAZORPAY_MODE:'disabled'});
  try {
    const provider=auth.authOptions.providers.find((p:any)=>p.options?.id==='email-password');
    assert.ok(provider);
    assert.equal((await provider.options.authorize({email:row.email,password})).email,row.email);
    assert.equal(await provider.options.authorize({email:row.email,password:'wrong'}),null);
    assert.equal(credentialReads,2,'Existing stored password is verified; no separate reviewer password is needed');
    let member=await auth.memberFor(row.email);
    assert.equal(member.reviewDemo,true);
    assert.equal(member.role,'full','Reviewer must not become an administrator');
    auth.currentMember=async()=>auth.memberFor(row.email);
    const http=require('../lib/http');
    await assert.rejects(http.requireMember(),(e:any)=>e.status===403);
    await assert.rejects(http.requireMember(true),(e:any)=>e.status===403);
    row={...row,reviewerAccessUntil:0};
    assert.equal((await auth.memberFor(row.email)).reviewDemo,false);
    await assert.rejects(http.requireMember(),(e:any)=>e.status===402,'Revocation restores the unpaid gate immediately');
    row={...row,reviewerAccessUntil:Math.floor(Date.now()/1000)-1};
    assert.equal((await auth.memberFor(row.email)).reviewDemo,false);
    row={...row,active:false,reviewerAccessUntil:Math.floor(Date.now()/1000)+3600};
    assert.equal(await auth.memberFor(row.email),null);
  } finally {
    dbModule.db=originalDb;dbModule.mongoDb=originalMongo;auth.currentMember=originalCurrent;
    for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];
    Object.assign(process.env,env);
  }
});
