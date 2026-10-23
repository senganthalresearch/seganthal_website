import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBillingSetup } from '../lib/billing-diagnostics';

const env = { RAZORPAY_MODE:'disabled', RAZORPAY_KEY_ID:'rzp_live_fixture', RAZORPAY_KEY_SECRET:'private-fixture-secret', RAZORPAY_YEARLY_PLAN_ID:'plan_fixture', RAZORPAY_WEBHOOK_SECRET:'private-webhook-secret', NEXTAUTH_URL:'https://www.senganthal.co.in' };
test('disabled checkout can verify a plan with a read-only call without disclosing credentials', async () => {
  let calls=0;
  const result=await checkBillingSetup(env,(async(url, options)=>{
    calls++;assert.equal(String(url),'https://api.razorpay.com/v1/plans/plan_fixture');assert.equal(options?.method,undefined);
    return Response.json({id:'plan_fixture',period:'yearly',interval:1,item:{amount:59900,currency:'INR'}});
  }) as typeof fetch);
  assert.equal(calls,1);assert.ok(result.checks.some(c=>c.status==='ok'));assert.equal(result.checks[0].status,'closed');
  const text=JSON.stringify(result);for(const secret of [env.RAZORPAY_KEY_ID,env.RAZORPAY_KEY_SECRET,env.RAZORPAY_WEBHOOK_SECRET])assert.equal(text.includes(secret),false);
});
test('diagnostics fail safely for missing keys, wrong price and rejected provider credentials', async () => {
  let calls=0;
  await checkBillingSetup({},(async()=>{calls++;throw Error('must not fetch')}) as typeof fetch);assert.equal(calls,0);
  for(const response of [Response.json({id:'plan_fixture',period:'yearly',interval:1,item:{amount:60000,currency:'INR'}}),new Response('private provider details',{status:401})]) {
    const result=await checkBillingSetup(env,(async()=>response) as typeof fetch);
    assert.equal(result.checks.some(c=>c.status==='ok'),false);assert.ok(result.checks.some(c=>c.name.includes('Annual plan')&&c.status==='error'));
    assert.equal(JSON.stringify(result).includes('private provider details'),false);
  }
});
