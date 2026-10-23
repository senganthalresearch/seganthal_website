import { z } from 'zod';
import { db } from '@/lib/db';
import { api, requireMember, checkOrigin, limited, HttpError } from '@/lib/http';
import { owners } from '@/lib/access';
import { memberSchema } from '@/lib/site-settings';
import { paymentMode } from '@/lib/billing-rules';
import type { Filter, Document } from 'mongodb';
export const GET = api(async request => {
 await requireMember(true);
 const params = new URL(request.url).searchParams, database = await db(), collection = database.collection('members');
 const mode = paymentMode() || 'live', until = `billing_${mode}_until`, now = Math.floor(Date.now()/1000);
 const projection = { _id:0,email:1,name:1,role:1,active:1,permissions:1,contactPhone:1,joinedAt:1,emailVerifiedAt:1,onboardedAt:1,reviewerAccessUntil:1,complimentaryAccessUntil:1,complimentaryReason:1,[until]:1 };
 const email = params.get('email');
 if (email) {
   const normalized = z.email().parse(email).toLowerCase();
   const account = await collection.findOne({email:normalized},{projection});
   if (!account) throw new HttpError(404,'Member not found.');
   const billing = await database.collection('billingAccounts').findOne({email:normalized,mode},{projection:{_id:0,status:1,paidUntil:1,cancelRequested:1,subscriptionId:1,periods:1}});
   const audit = await database.collection('audit').find({target:normalized},{projection:{_id:0,action:1,actor:1,createdAt:1}}).sort({createdAt:-1}).limit(15).toArray();
   return {member:account,billing,audit};
 }
 const page = z.coerce.number().int().min(1).max(100000).parse(params.get('page') || 1);
 const query = (params.get('q') || '').trim().slice(0,100);
 const role = z.enum(['all','admin','full','standard','member','viewer']).parse(params.get('role') || 'all');
 const status = z.enum(['all','paid','unpaid','expiring','suspended','reviewer','complimentary']).parse(params.get('status') || 'all');
 const base: Filter<Document> = {email:{$nin:owners()}};
 const filters: Filter<Document>[] = [base];
 if(query){const escaped=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filters.push({$or:['name','email','contactPhone'].map(key=>({[key]:{$regex:escaped,$options:'i'}}))});}
 if(role!=='all')filters.push({role:role==='standard'?{$in:['standard','member']}:role});
 const paid: Filter<Document> = {active:true,role:{$ne:'admin'},[until]:{$gt:now}};
 const reviewer: Filter<Document> = {active:true,role:{$ne:'admin'},emailVerifiedAt:{$exists:true},onboardedAt:{$exists:true},reviewerAccessUntil:{$gt:now}};
 const complimentary: Filter<Document> = {active:true,role:{$ne:'admin'},complimentaryAccessUntil:{$gt:now}};
 const unpaid: Filter<Document> = {active:true,role:{$ne:'admin'},$and:[{$or:[{[until]:{$exists:false}},{[until]:{$lte:now}}]},{$or:[{reviewerAccessUntil:{$exists:false}},{reviewerAccessUntil:{$lte:now}}]},{$or:[{complimentaryAccessUntil:{$exists:false}},{complimentaryAccessUntil:{$lte:now}}]}]};
 const expiring: Filter<Document> = {...paid,[until]:{$gt:now,$lte:now+30*86400}};
 if(status!=='all')filters.push(status==='paid'?paid:status==='unpaid'?unpaid:status==='expiring'?expiring:status==='reviewer'?reviewer:status==='complimentary'?complimentary:{active:false});
 const filter: Filter<Document> = {$and:filters};
 const [total,all,paidCount,unpaidCount,expiringCount,suspended] = await Promise.all([collection.countDocuments(filter),collection.countDocuments(base),collection.countDocuments({$and:[base,paid]}),collection.countDocuments({$and:[base,unpaid]}),collection.countDocuments({$and:[base,expiring]}),collection.countDocuments({...base,active:false})]);
 const pages=Math.max(1,Math.ceil(total/25)), current=Math.min(page,pages);
 const members=await collection.find(filter,{projection}).sort({email:1}).skip((current-1)*25).limit(25).toArray();
 return {members,owners:owners(),page:current,pages,total,mode,summary:{total:all,paid:paidCount,unpaid:unpaidCount,expiring:expiringCount,suspended}};
});
export const POST=api(async request=>{
 checkOrigin(request);const admin=await requireMember(true);await limited(admin,'members',30);
 const raw=await request.json();const inputs=raw.items?z.array(memberSchema).min(1).max(100).parse(raw.items):[memberSchema.parse(raw)];
 if(new Set(inputs.map(i=>i.email)).size!==inputs.length)throw new HttpError(400,'Duplicate email addresses in this import.');
 for(const input of inputs){if(owners().includes(input.email))throw new HttpError(400,'Owner access is managed in the deployment configuration.');if(input.email===admin.email)throw new HttpError(400,'Ask another administrator to change your own access.');}
 const database=await db();
 const now=Math.floor(Date.now()/1000);
 for(const input of inputs){
   if(input.complimentaryAccessUntil){
     const existing=await database.collection('members').findOne({email:input.email});
     if(input.role==='admin')throw new HttpError(400,'Administrators already have included access.');
     if(!input.complimentaryReason)throw new HttpError(400,'Enter a reason for complimentary access.');
     if(input.complimentaryAccessUntil!==existing?.complimentaryAccessUntil&&(input.complimentaryAccessUntil<=now||input.complimentaryAccessUntil>now+3*366*86400))throw new HttpError(400,'Choose a grant expiry within the next three years.');
     if(input.reviewerAccessUntil && input.reviewerAccessUntil>now)throw new HttpError(400,'Remove reviewer demo access before granting workspace access.');
   }
   if(input.reviewerAccessUntil){
     const existing=await database.collection('members').findOne({email:input.email});
     if(input.role==='admin'||!existing?.emailVerifiedAt||!existing?.onboardedAt)throw new HttpError(400,'Reviewer access requires an existing verified non-admin account.');
     if(input.reviewerAccessUntil!==existing.reviewerAccessUntil&&(input.reviewerAccessUntil<=now||input.reviewerAccessUntil>now+30*86400))throw new HttpError(400,'Choose a reviewer expiry within the next 30 days.');
   }
 }
 await database.collection('members').bulkWrite(inputs.map(input=>({updateOne:{filter:{email:input.email},update:{$set:{...input,updatedBy:admin.email,updatedAt:new Date().toISOString()},$setOnInsert:{joinedAt:new Date().toISOString()}},upsert:true}})));
 await database.collection('audit').insertMany(inputs.map(input=>({action:'member.update',actor:admin.email,target:input.email,role:input.role,active:input.active,permissions:input.permissions,reviewerAccessUntil:input.reviewerAccessUntil,complimentaryAccessUntil:input.complimentaryAccessUntil,complimentaryReason:input.complimentaryReason,createdAt:new Date()})));
 return {ok:true,count:inputs.length};
});
export const DELETE=api(async request=>{
 checkOrigin(request);const admin=await requireMember(true);await limited(admin,'members',30);
 const {email}=z.object({email:z.email().trim().toLowerCase()}).parse(await request.json());
 if(owners().includes(email))throw new HttpError(400,'Owner access is managed in the deployment configuration.');
 if(email===admin.email)throw new HttpError(400,'Ask another administrator to delete your own account.');
 const database=await db();
 const result=await database.collection('members').deleteOne({email});
 await database.collection('audit').insertOne({action:'member.delete',actor:admin.email,target:email,deletedCount:result.deletedCount,createdAt:new Date()});
 return {ok:true,deletedCount:result.deletedCount};
});
