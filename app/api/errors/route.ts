import {api,requireMember,checkOrigin,limited} from '@/lib/http';
import {db} from '@/lib/db';
import {z} from 'zod';
export const POST=api(async request=>{checkOrigin(request);const member=await requireMember();await limited(member,'client-errors',10);const value=z.object({page:z.enum(['Dashboard','Stock Analyzer','Watchlist','News','Team Chat','PDF Upload','Swing Trade','Admin','About Us','Application']),kind:z.enum(['RenderError','RequestError','UnhandledError'])}).parse(await request.json());await(await db()).collection('errors').insertOne({...value,createdAt:new Date(),message:'A client error occurred. No private form values were recorded.'});return {ok:true}});
