import { z } from "zod";
import { api, requireMember, requirePermission, limited, HttpError } from "@/lib/http";
import { cached, history, quotes, analyze, availableHistoryRange } from "@/lib/market";
import { trendingQuotes, volumeQuotes } from '@/lib/trending-data';
import { indexConstituents, nseJson, nseTime } from "@/lib/dashboard-data";
import { numeric } from "@/lib/data-utils";
import { symbolSchema } from "@/lib/validation";
export const maxDuration = 60;
type Row = Record<string,unknown>;
async function fundData(path:string) {
  return cached('mf:'+path,async()=>{
    const r=await fetch('https://api.mfapi.in/mf'+path,{signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new HttpError(503,'The public mutual fund feed is unavailable. Please retry.');
    return r.json();
  },3600000);
}
export const GET=api(async request=>{
  const member=await requireMember();await limited(member,'explore',40);
  const p=new URL(request.url).searchParams;
  switch(p.get('section')) {
    case 'trending': return {quotes:await trendingQuotes(p.get('scope')||'nifty'),source:'NSE constituent quotes · delayed'};
    case 'volume': return volumeQuotes(p.get('scope')||'nifty');
    case 'historical-ranges': {
      await limited(member,'historical-ranges',12);
      const symbols=z.array(symbolSchema).min(1).max(3).parse((p.get('symbols')||'').split(','));
      const results=await Promise.allSettled(symbols.map(availableHistoryRange));
      return {ranges:results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]),unavailable:results.flatMap((r,i)=>r.status==='rejected'?[symbols[i]]:[]),source:'Yahoo Finance · full available daily history; listing-to-date completeness is not guaranteed'};
    }
    case 'history': return {history:await history(symbolSchema.parse(p.get('symbol'))),source:'Yahoo Finance · daily closing prices'};
    case 'quotes': return {quotes:await quotes(z.array(symbolSchema).min(1).max(50).parse((p.get('symbols')||'').split(',')))};
    case 'universe': return {quotes:await indexConstituents(p.get('index')==='nifty50'?'NIFTY 50':'NIFTY TOTAL MKT'),source:'NSE constituents'};
    case 'research': {
      await requirePermission('analyze');await limited(member,'research-batch',12);
      const symbols=z.array(symbolSchema).min(1).max(3).parse((p.get('symbols')||'').split(','));
      const results=await Promise.allSettled(symbols.map(analyze));
      return {stocks:results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]),unavailable:results.flatMap((r,i)=>r.status==='rejected'?[symbols[i]]:[])};
    }
    case 'ipo': {
      const rows=await nseJson<Row[]>('/api/ipo-current-issue');
      if(!Array.isArray(rows)) throw new Error('Unexpected IPO feed');
      return {rows:rows.map(r=>({symbol:String(r.symbol||''),name:String(r.companyName||''),start:String(r.issueStartDate||''),end:String(r.issueEndDate||''),price:String(r.issuePrice||'Not reported'),series:String(r.series||''),status:String(r.status||''),subscription:numeric(r.noOfTime)})),source:'NSE current public issues',fetchedAt:new Date().toISOString()};
    }
    case 'sme': {
      const data=await nseJson<{data:Row[];timestamp?:string}>('/api/live-analysis-emerge');
      if(!Array.isArray(data.data)) throw new Error('Unexpected SME feed');
      return {quotes:data.data.map(r=>({symbol:String(r.symbol),name:String(r.symbol),price:numeric(r.lastPrice),change:numeric(r.change),changePercent:numeric(r.pChange),currency:'INR',asOf:nseTime(data.timestamp)})),source:'NSE Emerge · SME market'};
    }
    case 'funds': {
      const query=z.string().trim().min(2).max(100).parse(p.get('q'));
      const rows=await fundData('/search?q='+encodeURIComponent(query));
      if(!Array.isArray(rows)) throw new Error('Unexpected fund search');
      return {rows:rows.slice(0,100).map((r:{schemeCode:number;schemeName:string})=>({code:r.schemeCode,name:r.schemeName})),source:'MFapi.in public scheme directory'};
    }
    case 'fund': {
      const code=z.string().regex(/^\d{1,8}$/).parse(p.get('code'));
      const r=await fundData('/'+code);
      if(r.status!=='SUCCESS'||!Array.isArray(r.data)) throw new Error('NAV unavailable');
      return {meta:r.meta,history:r.data.slice(0,750).map((d:{date:string;nav:string})=>{const [day,month,year]=d.date.split('-');return {date:`${year}-${month}-${day}`,close:numeric(d.nav),volume:0}}).filter((d:{close:number|null})=>d.close!==null).reverse(),source:'MFapi.in · published NAV history'};
    }
    case 'options': {
      const symbol=z.enum(['NIFTY','BANKNIFTY']).parse(p.get('symbol')||'NIFTY');
      const contracts=await nseJson<{expiryDates:string[]}>('/api/option-chain-contract-info?symbol='+symbol);
      const expiry=p.get('expiry')||contracts.expiryDates?.[0];
      if(!expiry||!contracts.expiryDates.includes(expiry)) throw new HttpError(400,'Choose an available option expiry.');
      const data=await nseJson<{records?:{data:Row[];expiryDates:string[];timestamp:string;underlyingValue:number}}>('/api/option-chain-v3?type=Indices&symbol='+symbol+'&expiry='+encodeURIComponent(expiry));
      if(!data.records?.data) throw new HttpError(503,'The public option chain is unavailable. Open the NSE source below to inspect the current chain.');
      const leg=(value:unknown)=>{const row=value as Row|undefined;return row?.identifier?{openInterest:numeric(row.openInterest),lastPrice:numeric(row.lastPrice),impliedVolatility:numeric(row.impliedVolatility)}:undefined};
      return {...data.records,expiryDates:contracts.expiryDates,data:data.records.data.map(r=>({strikePrice:numeric(r.strikePrice),expiryDate:String(r.expiryDates||expiry),CE:leg(r.CE),PE:leg(r.PE)})),source:'NSE public option chain'};
    }
    default:throw new HttpError(400,'Choose a valid research section.');
  }
});
