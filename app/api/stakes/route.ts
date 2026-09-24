import {api,checkOrigin,requirePermission,limited,HttpError} from '@/lib/http';
import {db} from '@/lib/db';
import {stake,indexConstituents} from '@/lib/dashboard-data';
import {symbolSchema} from '@/lib/validation';
import {z} from 'zod';
export const maxDuration=60;
type Scan={owner:string;symbols:string[];cursor:number;status:'running'|'paused'|'complete';results:unknown[];startedAt:string;updatedAt:string;lockedUntil:Date};
export const GET=api(async request=>{
 const member=await requirePermission('analyze');await limited(member,'stakes-read',40);
 const params=new URL(request.url).searchParams;
 if(params.has('symbol'))return stake(symbolSchema.parse(params.get('symbol')));
 const collection=(await db()).collection<Scan>('stakeScans');
 const userScan=await collection.findOne({owner:member.email},{projection:{_id:0,owner:0}});
 if(userScan)return {scan:userScan};
 const latestScan=await collection.findOne({},{sort:{updatedAt:-1},projection:{_id:0,owner:0}});
 return {scan:latestScan};
});
export const POST=api(async request=>{
 checkOrigin(request);const member=await requirePermission('analyze');
 if(member.role!=='admin')throw new HttpError(403,'Market-wide scanning is restricted to administrators to avoid NSE rate-limiting.');
 await limited(member,'stakes-scan',40);
 const {action}=z.object({action:z.enum(['start','step','pause','resume'])}).parse(await request.json());const collection=(await db()).collection<Scan>('stakeScans');const now=new Date();
 if(action==='start'){
  const existing=await collection.findOne({owner:member.email});if(existing&&existing.lockedUntil>now)throw new HttpError(409,'A batch is still processing. Please wait.');
  const symbols=(await indexConstituents()).map(q=>q.symbol);const scan:Scan={owner:member.email,symbols,cursor:0,status:'running',results:[],startedAt:now.toISOString(),updatedAt:now.toISOString(),lockedUntil:new Date(0)};await collection.updateOne({owner:member.email},{$set:scan},{upsert:true});
 }else if(action==='pause'||action==='resume'){
  await collection.updateOne({owner:member.email,status:{$ne:'complete'}},{$set:{status:action==='pause'?'paused':'running',updatedAt:now.toISOString()}});
 }else{
  const scan=await collection.findOneAndUpdate({owner:member.email,status:'running',lockedUntil:{$lte:now}},{$set:{lockedUntil:new Date(Date.now()+90000)}},{returnDocument:'after'});
  if(!scan)throw new HttpError(409,'The scan is paused, complete, or a batch is already running.');
  const batch=scan.symbols.slice(scan.cursor,scan.cursor+2);
  const results=await Promise.all(batch.map(async symbol=>{try{return await stake(symbol)}catch{return {symbol,error:'Quarterly filings unavailable'}}}));
  const cursor=scan.cursor+batch.length;
  await collection.updateOne({owner:member.email,startedAt:scan.startedAt},{$push:{results:{$each:results}},$set:{cursor,lockedUntil:new Date(0),updatedAt:new Date().toISOString(),...(cursor>=scan.symbols.length?{status:'complete' as const}:{})}});
 }
 return {scan:await collection.findOne({owner:member.email},{projection:{_id:0,owner:0}})};
});
