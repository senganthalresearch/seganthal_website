import { api, checkOrigin, requireMember, limited, HttpError } from '@/lib/http';
import { db } from '@/lib/db';
import { aboutSchema, bannerSchema, defaultSettings } from '@/lib/site-settings';
import { can } from '@/lib/permissions';
import { z } from 'zod';
export const GET=api(async()=>{await requireMember();const saved=await(await db()).collection('settings').findOne({key:'site'},{projection:{_id:0}});return {about:saved?.about||defaultSettings.about,banner:saved?.banner||defaultSettings.banner,updatedAt:saved?.updatedAt};});
export const POST=api(async request=>{
 checkOrigin(request);const member=await requireMember();await limited(member,'settings',15);
 const body=z.discriminatedUnion('section',[z.object({section:z.literal('about'),value:aboutSchema}),z.object({section:z.literal('banner'),value:bannerSchema})]).parse(await request.json());
 if(body.section==='banner'?member.role!=='admin':!can(member,'aboutEdit'))throw new HttpError(403,'You do not have permission to edit this content.');
 const database=await db();const updatedAt=new Date().toISOString();
 await database.collection('settings').updateOne({key:'site'},{$set:{[body.section]:body.value,updatedAt,updatedBy:member.email}},{upsert:true});
 await database.collection('audit').insertOne({action:'settings.'+body.section,actor:member.email,createdAt:new Date()});
 return {ok:true,updatedAt};
});
