import {z} from 'zod';
import {api,requireMember,checkOrigin,limited,HttpError} from '@/lib/http';
import {db} from '@/lib/db';
const keySchema=z.string().min(1).max(160).regex(/^(note:|scan:|alerts$|scan-history$|research-cases$|fund-favourites$)/);
export const GET=api(async request=>{const member=await requireMember();const key=keySchema.parse(new URL(request.url).searchParams.get('key'));const row=await(await db()).collection('preferences').findOne({owner:member.email,key},{projection:{_id:0,owner:0}});return {value:row?.value??null,updatedAt:row?.updatedAt??null}});
export const PUT=api(async request=>{checkOrigin(request);const member=await requireMember();await limited(member,'preferences',100);if(Number(request.headers.get('content-length'))>100000)throw new HttpError(413,'Saved research is too large.');const body=await request.text();if(body.length>100000)throw new HttpError(413,'Saved research is too large.');const {key,value}=z.object({key:keySchema,value:z.unknown()}).parse(JSON.parse(body));await(await db()).collection('preferences').updateOne({owner:member.email,key},{$set:{value,updatedAt:new Date().toISOString()}},{upsert:true});return {ok:true}});
