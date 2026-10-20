import type { Quote } from './types';
import { numeric } from './data-utils';

export type TrendingQuote = Quote & { volume: number|null; averageVolume: number|null; volumeRatio: number|null; yearHigh: number|null; yearLow: number|null; dayHigh: number|null; dayLow: number|null; delivery: number|null; previousDelivery: number|null; previousHigh: number|null };
export type TradingReport = { date: string; rows: Record<string,string>[] };
export type HistoryRange = { symbol:string; high:number; low:number; highDate:string; lowDate:string; from:string; to:string; sessions:number };
export type Visit = {symbol:string;name:string;count:number;lastVisited:string};
export const visitKey = (account:string) => 'senganthal-visits:'+account;
export function readVisits(value:string|null):Visit[] {
  try {const data=JSON.parse(value||'[]');return Array.isArray(data)?data.filter(r=>r&&typeof r.symbol==='string'&&/^[A-Z0-9&^.-]{1,30}$/.test(r.symbol)&&typeof r.name==='string'&&Number.isSafeInteger(r.count)&&r.count>0&&Number.isFinite(Date.parse(r.lastVisited))).slice(0,100):[]}catch{return []}
}
export function addVisit(visits:Visit[],quote:Quote,now=new Date().toISOString()):Visit[]{const previous=visits.find(r=>r.symbol===quote.symbol);return [{symbol:quote.symbol,name:quote.name,count:Math.min(1000000,(previous?.count||0)+1),lastVisited:now},...visits.filter(r=>r.symbol!==quote.symbol)].slice(0,100)}
/** Previous five published sessions only; absence is never interpreted as zero volume. */
export function reportMetrics(reports:TradingReport[],symbol:string){
 reports=reports.filter((r,i,all)=>all.findIndex(other=>other.date===r.date)===i);
 const current=reports[0]?.rows.find(r=>r.SYMBOL===symbol),previous=reports.slice(1,6).map(report=>report.rows.find(r=>r.SYMBOL===symbol));
 const volumes=previous.map(r=>numeric(r?.TTL_TRD_QNTY));
 const averageVolume=volumes.length===5&&volumes.every(v=>v!==null&&v>=0)?volumes.reduce<number>((sum,v)=>sum+v!,0)/5:null;
 const volume=numeric(current?.TTL_TRD_QNTY);
 return {volume,averageVolume,volumeRatio:volume!==null&&averageVolume!==null&&averageVolume>0?volume/averageVolume:null,delivery:numeric(current?.DELIV_QTY),previousDelivery:numeric(previous[0]?.DELIV_QTY),previousHigh:numeric(previous[0]?.HIGH_PRICE)};
}
export function historyRange(symbol:string,rows:{date:string;high?:number;low?:number}[]):HistoryRange|null {
 const valid=rows.filter(r=>Number.isFinite(Date.parse(r.date))&&Number.isFinite(r.high)&&Number.isFinite(r.low)&&r.high!>0&&r.low!>0);
 if(!valid.length)return null;
 let highest=valid[0],lowest=valid[0];for(const r of valid){if(r.high!>highest.high!)highest=r;if(r.low!<lowest.low!)lowest=r}
 return {symbol,high:highest.high!,low:lowest.low!,highDate:highest.date,lowDate:lowest.date,from:valid[0].date,to:valid.at(-1)!.date,sessions:valid.length};
}
