import {z} from 'zod';
import {api,requireMember,checkOrigin,limited} from '@/lib/http';
import {db} from '@/lib/db';
import {symbolSchema} from '@/lib/validation';
export const GET=api(async()=>{const member=await requireMember();return {visits:await(await db()).collection('visits').find({owner:member.email},{projection:{_id:0,owner:0}}).sort({count:-1,lastVisited:-1}).limit(100).toArray()}});
export const POST=api(async request=>{checkOrigin(request);const member=await requireMember();await limited(member,'visits',60);const {symbol,name}=z.object({symbol:symbolSchema,name:z.string().min(1).max(200)}).parse(await request.json());await(await db()).collection('visits').updateOne({owner:member.email,symbol},{$inc:{count:1},$set:{name,lastVisited:new Date().toISOString()}},{upsert:true});return {ok:true}});
