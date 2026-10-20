import {cached} from './market';
import {nseJson,nseTime} from './dashboard-data';
import {numeric,parseCsv} from './data-utils';
import {reportMetrics,type TradingReport,type TrendingQuote} from './trending';
type Row=Record<string,unknown>;
export async function trendingQuotes(scope:string):Promise<TrendingQuote[]> {
 const data=await nseJson<{data:{data:Row[]}}>('/api/NextApi/apiClient/marketWatchApi?functionName=getIndicesData&symbol='+encodeURIComponent(scope==='all'?'NIFTY TOTAL MKT':'NIFTY 50'));
 if(!Array.isArray(data.data?.data))throw new Error('Constituents unavailable');
 return data.data.data.filter(r=>r.priority!==1&&r.series==='EQ').map(r=>({symbol:String(r.symbol),name:String(r.companyName||r.symbol),price:numeric(r.lastPrice),change:numeric(r.change),changePercent:numeric(r.pChange),currency:'INR',asOf:nseTime(r.lastUpdateTime),volume:numeric(r.totalTradedVolume),averageVolume:null,volumeRatio:null,yearHigh:numeric(r.yearHigh),yearLow:numeric(r.yearLow),dayHigh:numeric(r.dayHigh),dayLow:numeric(r.dayLow),delivery:null,previousDelivery:null,previousHigh:null}));
}
export async function tradingReports():Promise<TradingReport[]> {
 return cached('trending:daily-reports',async()=>{
   const today=new Date(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})+'T00:00:00Z'),reports:TradingReport[]=[];
   for(let back=0;back<22&&reports.length<6;back++){
     const date=new Date(today);date.setUTCDate(date.getUTCDate()-back);if([0,6].includes(date.getUTCDay()))continue;
     const stamp=String(date.getUTCDate()).padStart(2,'0')+String(date.getUTCMonth()+1).padStart(2,'0')+date.getUTCFullYear();
     const response=await fetch('https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_'+stamp+'.csv',{signal:AbortSignal.timeout(6500)});
     if(response.status===404)continue;if(!response.ok)throw new Error('Daily volume report unavailable');
     const csv=await response.text();if(!csv.replace(/^\uFEFF/,'').startsWith('SYMBOL,'))throw new Error('Invalid daily volume report');
     const rows=parseCsv(csv).filter(r=>r.SERIES==='EQ');
     const reportedDate=nseTime(rows[0]?.DATE1);
     // Holiday archive URLs can serve the previous session's report. Trust the file's date.
     if(rows.length&&reportedDate&&!reports.some(r=>r.date===reportedDate))reports.push({date:reportedDate,rows});
   }
   if(reports.length<6)throw new Error('Six published sessions are required for volume comparison');
   return reports;
 },3600000);
}
export async function volumeQuotes(scope:string){
 const [quotes,reports]=await Promise.all([trendingQuotes(scope),tradingReports()]);
 const current=new Map(reports[0].rows.map(r=>[r.SYMBOL,r]));
 const rows=quotes.flatMap(q=>{const row=current.get(q.symbol);if(!row)return [];const price=numeric(row.CLOSE_PRICE),previous=numeric(row.PREV_CLOSE);return [{...q,...reportMetrics(reports,q.symbol),price,change:price!==null&&previous!==null?price-previous:null,changePercent:price!==null&&previous!==null&&previous>0?(price/previous-1)*100:null,asOf:reports[0].date,dayHigh:numeric(row.HIGH_PRICE),dayLow:numeric(row.LOW_PRICE)}]});
 return {quotes:rows,source:'NSE daily security reports · EQ series',asOf:reports[0].date,comparisonDates:reports.slice(1).map(r=>r.date)};
}
