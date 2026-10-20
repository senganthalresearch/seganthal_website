import { z } from "zod";
import { db } from "@/lib/db";
import { api, checkOrigin, requireMember, requirePermission, limited } from "@/lib/http";
import { symbolSchema } from "@/lib/validation";
const holdingSchema=z.object({symbol:symbolSchema,quantity:z.number().finite().positive().max(1e9),averageCost:z.number().finite().nonnegative().max(1e9)});
export const GET=api(async()=>{const member=await requireMember();return {items:await (await db()).collection('portfolio').find({owner:member.email},{projection:{_id:0,owner:0}}).sort({symbol:1}).limit(500).toArray()}});
export const POST=api(async request=>{checkOrigin(request);const member=await requirePermission('watchlist');await limited(member,'portfolio',30);const row=holdingSchema.parse(await request.json());await (await db()).collection('portfolio').updateOne({owner:member.email,symbol:row.symbol},{$set:{...row,updatedAt:new Date().toISOString()}},{upsert:true});return {ok:true}});
export const DELETE=api(async request=>{checkOrigin(request);const member=await requirePermission('watchlist');const {symbol}=z.object({symbol:symbolSchema}).parse(await request.json());await (await db()).collection('portfolio').deleteOne({owner:member.email,symbol});return {ok:true}});
