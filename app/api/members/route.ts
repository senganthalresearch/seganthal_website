import { z } from 'zod';
import { db } from '@/lib/db';
import { api, requireMember, checkOrigin, limited, HttpError } from '@/lib/http';
import { owners } from '@/lib/access';
import { memberSchema } from '@/lib/site-settings';
export const GET = api(async () => {
 await requireMember(true);const members=await(await db()).collection('members').find({},{projection:{_id:0}}).sort({email:1}).toArray();return {members,owners:owners()};
});
export const POST=api(async request=>{
 checkOrigin(request);const admin=await requireMember(true);await limited(admin,'members',30);
 const raw=await request.json();const inputs=raw.items?z.array(memberSchema).min(1).max(100).parse(raw.items):[memberSchema.parse(raw)];
 if(new Set(inputs.map(i=>i.email)).size!==inputs.length)throw new HttpError(400,'Duplicate email addresses in this import.');
 for(const input of inputs){if(owners().includes(input.email))throw new HttpError(400,'Owner access is managed in the deployment configuration.');if(input.email===admin.email)throw new HttpError(400,'Ask another administrator to change your own access.');}
 const database=await db();
 await database.collection('members').bulkWrite(inputs.map(input=>({updateOne:{filter:{email:input.email},update:{$set:{...input,updatedBy:admin.email,updatedAt:new Date().toISOString()},$setOnInsert:{joinedAt:new Date().toISOString()}},upsert:true}})));
 await database.collection('audit').insertMany(inputs.map(input=>({action:'member.update',actor:admin.email,target:input.email,role:input.role,active:input.active,permissions:input.permissions,createdAt:new Date()})));
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
