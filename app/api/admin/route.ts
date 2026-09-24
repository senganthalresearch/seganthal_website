import {api,requireMember,checkOrigin,limited} from '@/lib/http';
import {db} from '@/lib/db';
import {analyze,history,quotes} from '@/lib/market';
import {flows} from '@/lib/dashboard-data';
import {z} from 'zod';
export const maxDuration=60;
async function check(name:string,fn:()=>Promise<unknown>){const start=Date.now();try{await fn();return {name,status:'ok',detail:'Reachable',duration:Date.now()-start}}catch{return {name,status:'error',detail:'Unavailable; retry or review the service configuration.',duration:Date.now()-start}}}
async function bseQuoteCheck(){
 const response=await fetch('https://api.bseindia.com/BseIndiaAPI/api/GetStkCurrMain/w?flag=Equity&scripcode=500325',{headers:{Accept:'application/json,text/plain,*/*',Referer:'https://www.bseindia.com/','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('BSE quote API unavailable');
 const body=await response.text();
 if(!/TCS|Tata|500325|CurrRate/i.test(body))throw new Error('Unexpected BSE quote response');
}
export const GET=api(async()=>{await requireMember(true);return {errors:await(await db()).collection('errors').find({},{projection:{_id:0}}).sort({createdAt:-1}).limit(50).toArray()}});
export const POST=api(async request=>{
 checkOrigin(request);const member=await requireMember(true);await limited(member,'admin-tools',8);
 const {action}=z.object({action:z.enum(['health','smoke','cleanup','clearErrors'])}).parse(await request.json());
 const database=await db();
 if(action==='health')return {checks:await Promise.all([check('MongoDB',()=>database.command({ping:1})),check('NSE',flows),check('Yahoo Finance',()=>quotes(['TCS'])),check('BSE quote API',bseQuoteCheck),Promise.resolve({name:'PDF extraction',status:process.env.ANTHROPIC_API_KEY&&process.env.ANTHROPIC_MODEL?'configured':'not configured',detail:'Configuration check only; no document sent or paid extraction performed.',duration:0})])};
 if(action==='smoke')return {checks:await Promise.all([check('RELIANCE quote',()=>quotes(['RELIANCE'])),check('RELIANCE history',()=>history('RELIANCE')),check('RELIANCE fundamentals',async()=>{const s=await analyze('RELIANCE');if(!s.coverage)throw new Error()}),check('Institutional activity',flows),check('Database records',()=>database.collection('members').countDocuments())])};
 const result=action==='cleanup'?await database.collection('newsCache').deleteMany({fetchedAt:{$lt:new Date(Date.now()-90*86400000)}}):await database.collection('errors').deleteMany({});
 await database.collection('audit').insertOne({action:'admin.'+action,actor:member.email,deletedCount:result.deletedCount,createdAt:new Date()});
 return {ok:true,deletedCount:result.deletedCount};
});
