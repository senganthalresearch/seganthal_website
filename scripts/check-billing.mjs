// Read-only provider check. Prints no keys, secrets or customer data.
const keys=['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_YEARLY_PLAN_ID','RAZORPAY_WEBHOOK_SECRET'];
let missing=false;
for(const key of keys){const present=Boolean(process.env[key]?.trim());console.log(`${present?'SET':'MISSING'} ${key}`);missing ||= !present;}
console.log(`Checkout mode: ${['test','live'].includes(process.env.RAZORPAY_MODE)?process.env.RAZORPAY_MODE:'disabled'}`);
if(missing)process.exitCode=1;
else {
  const {RAZORPAY_KEY_ID:key,RAZORPAY_KEY_SECRET:secret,RAZORPAY_YEARLY_PLAN_ID:plan}=process.env;
  if(!/^rzp_(test|live)_/.test(key)||!/^plan_[a-zA-Z0-9]+$/.test(plan)){
    console.error('Invalid key or plan format.');process.exitCode=1;
  }else try{
    const response=await fetch(`https://api.razorpay.com/v1/plans/${plan}`,{headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`},signal:AbortSignal.timeout(15000)});
    if(!response.ok){console.error(`Provider check failed (HTTP ${response.status}). Verify the keys and plan belong to the same mode.`);process.exitCode=1;}
    else {
      const result=await response.json();
      const valid=result.id===plan&&result.period==='yearly'&&result.interval===1&&result.item?.amount===59900&&result.item?.currency==='INR';
      console.log(valid?'PASS: API authentication and INR 599 yearly plan.':'FAIL: Plan must be INR 599 every 1 year.');
      if(!valid)process.exitCode=1;
      console.log('Webhook delivery, checkout, cancellation and refund behaviour still require an end-to-end test.');
    }
  }catch{console.error('Provider unreachable. No payment or subscription was created.');process.exitCode=1;}
}
