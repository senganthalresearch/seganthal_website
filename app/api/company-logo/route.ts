import {NextResponse} from 'next/server';
import {requireMember,limited,HttpError} from '@/lib/http';
import {symbolSchema} from '@/lib/validation';
import {companyWebsite} from '@/lib/market';
import {companyDomains} from '@/lib/company-logos';
export async function GET(request:Request){
 try {
   const member=await requireMember();await limited(member,'company-logo',150);
   const parsed=symbolSchema.safeParse(new URL(request.url).searchParams.get('symbol'));if(!parsed.success)return new NextResponse(null,{status:400});
   const domain=companyDomains[parsed.data.replace(/\.NS$/,'')]||await companyWebsite(parsed.data);if(!domain)return new NextResponse(null,{status:404});
   const response=await fetch('https://www.google.com/s2/favicons?sz=128&domain='+encodeURIComponent(domain),{signal:AbortSignal.timeout(8000)});
   const type=response.headers.get('content-type')||'';if(!response.ok||!/^image\/(png|jpeg|webp|x-icon|vnd.microsoft.icon)/.test(type))return new NextResponse(null,{status:404});
   const body=await response.arrayBuffer();if(body.byteLength>512000)return new NextResponse(null,{status:404});
   return new NextResponse(body,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
 }catch(error){return new NextResponse(null,{status:error instanceof HttpError?error.status:404})}
}
