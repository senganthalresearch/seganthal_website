"use client";
import {useCallback,useEffect,useState} from 'react';
import {ArrowUpRight,Download,FileSpreadsheet,RefreshCw,Search,Play,Pause} from 'lucide-react';
import type {Quote,Stock,WatchItem} from '@/lib/types';
import {demoBasket,demoQuotes} from '@/lib/demo';
import {csvCell} from '@/lib/analytics';
import {Change,Empty,Loading,Notice,number,request} from './ui';
type Snapshot=Awaited<ReturnType<typeof import('@/lib/dashboard-data').snapshot>>;
type Movers=Awaited<ReturnType<typeof import('@/lib/dashboard-data').endOfDay>>;
type Flows=Awaited<ReturnType<typeof import('@/lib/dashboard-data').flows>>;
type Deals=Awaited<ReturnType<typeof import('@/lib/dashboard-data').deals>>;
type Rotation=Awaited<ReturnType<typeof import('@/lib/dashboard-data').rotation>>;
type Migrations=Awaited<ReturnType<typeof import('@/lib/dashboard-data').migrations>>;
type Stake=Awaited<ReturnType<typeof import('@/lib/dashboard-data').stake>>;
type Scan={symbols:string[];cursor:number;status:'running'|'paused'|'complete';results:(Stake|{symbol:string;error:string})[];updatedAt:string};
const indexNames=['NIFTY 50','SENSEX','NIFTY BANK','NIFTY IT','NIFTY AUTO','NIFTY PHARMA','NIFTY FMCG','NIFTY METAL','NIFTY NEXT 50','NIFTY 100','NIFTY MIDCAP 100','NIFTY SMALLCAP 100'];
const sampleSnapshot:Snapshot={quotes:indexNames.map((name,i)=>({...demoQuotes[i%4],name,symbol:name,price:i<4?demoQuotes[i].price:24000+i*1320})),source:'Illustrative sample',fetchedAt:''};
const sampleMovers={gainers:demoBasket.filter(q=>(q.changePercent||0)>0),losers:demoBasket.filter(q=>(q.changePercent||0)<0),coverage:demoBasket.length,asOf:null,source:'Illustrative sample',sourceUrl:'',reportDate:'Sample'};
const sampleFlows:Flows={rows:[{category:'DII',date:'Sample',buy:14098.64,sell:11301.37,net:2797.27},{category:'FII / FPI',date:'Sample',buy:10637.2,sell:11213.4,net:-576.2}],source:'Illustrative sample • INR crore',fetchedAt:''};
const sampleBulkSymbols = ['TCS','RELIANCE','HDFCBANK','INFY','ICICIBANK','SBIN','BHARTIARTL','ITC','KOTAKBANK','LT','AXISBANK','HINDUNILVR','BAJFINANCE','MARUTI','SUNPHARMA','TITAN','TATAMOTORS','NTPC','POWERGRID','TATASTEEL','WIPRO','COALINDIA','ADANIENT','ASIANPAINT','BAJAJFINSV'];
const sampleDeals:Deals={
  bulk:sampleBulkSymbols.map((sym,i)=>({
    symbol:sym,
    client:['Morgan Stanley Asia','Vanguard Funds','Societe Generale','Nomura Singapore','Goldman Sachs Inv','Citigroup Global','Nippon India MF','ICICI Prudential MF','HDFC Mutual Fund','SBI Mutual Fund'][i%10],
    side:(i%3===0?'SELL':'BUY') as 'BUY'|'SELL',
    quantity:150000+i*27500,
    price:+(500+((i*187)%3200)).toFixed(2),
    date:'Today, 15:30 IST'
  })),
  block:sampleBulkSymbols.slice(0,23).map((sym,i)=>({
    symbol:sym,
    client:['Promoter Group Trust','Capital Group International','Fidelity Investment Trust','BlackRock Global Funds','Mirae Asset Large Cap'][i%5],
    side:(i%2===0?'BUY':'SELL') as 'BUY'|'SELL',
    quantity:300000+i*45000,
    price:+(750+((i*215)%2900)).toFixed(2),
    date:'Today, 15:30 IST'
  })),
  source:'Illustrative sample • NSE live feed preview',
  fetchedAt:''
};
const sampleRotation:Rotation={rows:['NIFTY PHARMA','NIFTY IT','NIFTY METAL','NIFTY REALTY','NIFTY AUTO','NIFTY BANK','NIFTY PSU BANK','NIFTY FIN SERVICE','NIFTY ENERGY','NIFTY FMCG'].map((name,i)=>({name:name as Rotation['rows'][number]['name'],error:'',returns:Array.from({length:8},(_,j)=>({quarter:`${2024+Math.floor((j+2)/4)} Q${(j+2)%4+1}`,value:Math.round(Math.sin(i*2+j)*190)/10}))})),source:'Illustrative sample • completed quarters',fetchedAt:''};
const sampleMigration:Migrations={rows:[],source:'Sample workspace',fetchedAt:''};
function useFeed<T>(section:string,preview:boolean,sample:T,interval=0){
 const [data,setData]=useState<T|null>(preview?sample:null),[busy,setBusy]=useState(!preview),[error,setError]=useState('');
 const load=useCallback(async()=>{if(preview){setData(sample);setBusy(false);return}setBusy(true);setError('');try{setData(await request<T>('/api/dashboard?section='+section))}catch(e){setError((e as Error).message)}finally{setBusy(false)}},[section,preview,sample]);
 useEffect(()=>{void load();if(!interval||preview)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},interval);return()=>clearInterval(timer)},[load,interval,preview]);
 return {data,busy,error,load};
}
type Feed<T>={data:T|null;busy:boolean;error:string;load:()=>Promise<void>};
function Section({title,subtitle,feed,children}:{title:string;subtitle?:string;feed?:{busy:boolean;error:string;load:()=>Promise<void>};children:React.ReactNode}){return <section className="panel dashboard-section"><div className="section-title"><div><h2>{title}</h2>{subtitle&&<span>{subtitle}</span>}</div>{feed&&<button className="section-refresh" disabled={feed.busy} aria-label={'Refresh '+title} onClick={()=>void feed.load()}><RefreshCw size={16} className={feed.busy?'spin':''}/></button>}</div>{feed?.error&&<div className="alert error" role="alert">{feed.error} {feed.busy?'Retrying…':'Use refresh to try again.'}</div>}{children}</section>}
function exportRows(name:string,rows:unknown[][]){const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function xml(value:unknown){let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function sheetName(name:string){return name.replace(/[\[\]:*?/\\]/g,' ').slice(0,31)||'Sheet'}
function exportWorkbook(name:string,sheets:{name:string;rows:unknown[][]}[]){
 const body=sheets.map(sheet=>`<Worksheet ss:Name="${xml(sheetName(sheet.name))}"><Table>${sheet.rows.map(row=>`<Row>${row.map(cell=>typeof cell==='number'&&Number.isFinite(cell)?`<Cell><Data ss:Type="Number">${cell}</Data></Cell>`:`<Cell><Data ss:Type="String">${xml(cell)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet>`).join('');
 const workbook=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="header"><Font ss:Bold="1"/></Style></Styles>${body}</Workbook>`;
 const url=URL.createObjectURL(new Blob([workbook],{type:'application/vnd.ms-excel;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function quoteSheet(name:string,rows:Quote[]){return {name,rows:[['Symbol','Name','Price','Change','Percent change','As of','Currency'],...rows.map(q=>[q.symbol,q.name,q.price,q.change,q.changePercent,q.asOf,q.currency])]}}
function pct(value:number|null|undefined){return value==null?'--':(value>0?'+':'')+number(value)+'%'}
function MoverBars({rows,tone,onAnalyze,exportAllowed}:{rows:Quote[];tone:'gain'|'loss';onAnalyze?:(symbol:string)=>void;exportAllowed:boolean}){const visible=rows.slice(0,5),max=Math.max(1,...visible.map(q=>Math.abs(q.changePercent||0)));return <><div className={'mover-bars '+tone}>{visible.map(q=><button type="button" className="mover-row" key={q.symbol} onClick={()=>onAnalyze?.(q.symbol)} disabled={!onAnalyze}><span>{q.symbol}</span><i><b style={{width:Math.max(8,Math.abs(q.changePercent||0)/max*100)+'%'}}/></i><strong>{pct(q.changePercent)}</strong></button>)}{!visible.length&&<p className="empty-inline">No matching stocks reported.</p>}</div>{exportAllowed&&rows.length>0&&<button className="text-button table-export" onClick={()=>exportRows('market-movers.csv',[['Symbol','Price','Change','Percent change','As of'],...rows.map(q=>[q.symbol,q.price,q.change,q.changePercent,q.asOf])])}><Download size={13}/>Export CSV</button>}</>}
function CompactMovers({nifty,total,eod,onAnalyze,exportAllowed}:{nifty:Feed<Movers>;total:Feed<Movers>;eod:Feed<Movers>;onAnalyze?:(s:string)=>void;exportAllowed:boolean}){
 const [scope,setScope]=useState<'nifty'|'total'|'eod'>('nifty');
 const feed=scope==='nifty'?nifty:scope==='total'?total:eod;
 const label=scope==='nifty'?'Nifty 50':scope==='total'?'All NSE':'End of Day';
 return <Section title={`Market Movers — Today High & Low (${label})`} subtitle={feed.data?.source} feed={feed}>
  <div className="compact-movers-header">
   <div className="compact-scope-tabs">
    <button type="button" className={scope==='nifty'?'active':''} onClick={()=>setScope('nifty')}>Nifty 50</button>
    <button type="button" className={scope==='total'?'active':''} onClick={()=>setScope('total')}>All Market</button>
    <button type="button" className={scope==='eod'?'active':''} onClick={()=>setScope('eod')}>End of Day</button>
   </div>
   <div className="section-meta"><span>{feed.data?.coverage||0} stocks</span><span>{feed.data?.reportDate||stamp(feed.data?.asOf)}</span></div>
  </div>
  {feed.busy&&!feed.data?<Loading/>:<div className="fixed-movers-row">
   <div className="mover-side gain-side">
    <div className="mover-side-title"><span className="dot gain-dot"/><h3>Today High (Top Gainers)</h3></div>
    <MoverBars rows={feed.data?.gainers||[]} tone="gain" onAnalyze={onAnalyze} exportAllowed={exportAllowed}/>
   </div>
   <div className="mover-side loss-side">
    <div className="mover-side-title"><span className="dot loss-dot"/><h3>Today Low (Top Losers)</h3></div>
    <MoverBars rows={feed.data?.losers||[]} tone="loss" onAnalyze={onAnalyze} exportAllowed={exportAllowed}/>
   </div>
  </div>}
  {feed.data?.sourceUrl&&<a className="text-button" href={feed.data.sourceUrl} target="_blank" rel="noreferrer">Download official daily report <ArrowUpRight size={14}/></a>}
 </Section>;
}
function SnapshotTape({quotes,preview}:{quotes:Quote[];preview:boolean}){const fallback=sampleSnapshot.quotes.map(q=>({...q,price:null,change:null,changePercent:null,asOf:null}));const items=(quotes.length?quotes:fallback);const primary=items.find(q=>q.name.toUpperCase().includes('NIFTY 50'))||items[0];const rest=items.filter(q=>q!==primary).slice(0,8);return <div className="snapshot-board"><article className={'snapshot-feature '+(primary.changePercent===null?'unavailable':primary.changePercent>=0?'up':'down')}><div><h3>{primary.name}</h3><time>{preview?'Sample data':stamp(primary.asOf)}</time></div><strong>{number(primary.price)}</strong><span><Change value={primary.changePercent}/><small>{number(primary.change)}</small></span></article><div className="snapshot-strip">{rest.map(q=><article className={'snapshot-mini '+(q.changePercent===null?'unavailable':q.changePercent>=0?'up':'down')} key={q.symbol}><div><h3>{q.name}</h3><time>{preview?'Sample':stamp(q.asOf)}</time></div><strong>{number(q.price)}</strong><Change value={q.changePercent}/></article>)}</div></div>}
function FlowCompact({rows}:{rows:Flows['rows']}){return <div className="flow-compact">{rows.map((r,i)=><article key={i}><span>{r.category.replace(' / FPI','')}</span><strong className={r.net!==null&&r.net>=0?'positive':'negative'}>{number(r.net)} Cr</strong><small>{r.date}</small></article>)}{!rows.length&&<p className="empty-inline">No institutional activity available.</p>}</div>}
function SectorHeatmap({rotation}:{rotation:Rotation|null}){const rows=rotation?.rows||[];const quarters=[...new Set(rows.flatMap(row=>row.returns.map(item=>item.quarter)))].sort();return <div className="sector-rotation-table"><div className="table-wrap no-scroll-table"><table><thead><tr><th>Sector</th>{quarters.map(quarter=><th key={quarter}>{quarter}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.name}><td><strong>{row.name}</strong>{row.error&&<small>{row.error}</small>}</td>{quarters.map(quarter=>{const value=row.returns.find(item=>item.quarter===quarter)?.value??null;const tone=value==null?'flat':value>=12?'strong-gain':value>=0?'gain':value<=-12?'strong-loss':'loss';return <td key={quarter}><span className={`heat-rect ${tone}`}>{value==null?'—':`${value>0?'+':''}${number(value,1)}%`}</span></td>})}</tr>)}</tbody></table>{!rows.length&&<p className="empty-inline">No sector history available.</p>}</div></div>}
function PaginatedDealsSection({title,rows}:{title:string;rows:Deals['bulk']}){
  const [limit,setLimit]=useState(20);
  const displayed=rows.slice(0,limit);
  const hasMore=rows.length>limit;
  return <section key={title} className="deal-report-block">
    <div className="deal-report-heading">
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <h3>{title}</h3>
        {rows.length>0&&<span className="count-badge" style={{fontSize:11,background:'rgba(0, 229, 153, 0.12)',color:'#00e599',border:'1px solid rgba(0, 229, 153, 0.28)'}}>{displayed.length} of {rows.length} trades</span>}
      </div>
      <span>{rows[0]?.date||'No report date'}</span>
    </div>
    <div className="table-wrap no-scroll-table deals-one-view">
      <table>
        <thead><tr><th>Symbol</th><th>Client</th><th>B/S</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>
          {displayed.map((r,index)=><tr key={`${title}-${r.symbol}-${r.client}-${index}`}>
            <td><strong style={{color:'#ffffff'}}>{r.symbol}</strong></td>
            <td className="deal-client" style={{color:'#e2ecf2'}}>{r.client}</td>
            <td className={r.side==='BUY'?'positive':'negative'}>{r.side}</td>
            <td style={{color:'#e2ecf2',fontVariantNumeric:'tabular-nums'}}>{number(r.quantity,0)}</td>
            <td style={{color:'#e2ecf2',fontVariantNumeric:'tabular-nums'}}>{number(r.price)}</td>
          </tr>)}
        </tbody>
      </table>
      {!rows.length&&<p className="empty-inline">No {title.toLowerCase()} reported.</p>}
    </div>
    {rows.length>20&&(
      <div style={{display:'flex',justifyContent:'center',gap:10,padding:'12px 0'}}>
        {hasMore?(
          <button type="button" className="button secondary" style={{fontSize:12,padding:'6px 18px',minHeight:32,borderColor:'rgba(0, 229, 153, 0.35)',color:'#00e599'}} onClick={()=>setLimit(prev=>Math.min(rows.length,prev+20))}>
            ▾ View More ({rows.length-limit} more trades)
          </button>
        ):(
          <button type="button" className="button secondary" style={{fontSize:12,padding:'6px 18px',minHeight:32}} onClick={()=>setLimit(20)}>
            ▴ Show Less (first 20)
          </button>
        )}
      </div>
    )}
  </section>;
}
function DealsTable({deals}:{deals:Deals}){
  return <div className="deals-stacked-one-view">
    <PaginatedDealsSection title="Bulk deals" rows={deals.bulk}/>
    <PaginatedDealsSection title="Block deals" rows={deals.block}/>
  </div>;
}
function stamp(date?:string|null){return date?new Date(date).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' IST':'Timestamp unavailable'}
export function Dashboard({preview,watchlist,analyzed,onAnalyze,exportAllowed,analysisAllowed,canScan}:{preview:boolean;watchlist:WatchItem[];analyzed:Stock[];onAnalyze:(symbol:string)=>void;exportAllowed:boolean;analysisAllowed:boolean;canScan?:boolean}){
 const snapshot=useFeed('snapshot',preview,sampleSnapshot,30000),flow=useFeed('flows',preview,sampleFlows,600000),nifty=useFeed<Movers>('nifty',preview,sampleMovers,60000),total=useFeed<Movers>('total',preview,sampleMovers,60000),eod=useFeed<Movers>('eod',preview,sampleMovers),deal=useFeed('deals',preview,sampleDeals,600000),rotation=useFeed('rotation',preview,sampleRotation);
 const [dashTab,setDashTab]=useState<'pulse'|'deals'|'stakes'|'all'>('pulse');
 const [days,setDays]=useState(180),[all,setAll]=useState(false),[migration,setMigration]=useState<Migrations|null>(preview?sampleMigration:null),[migrationBusy,setMigrationBusy]=useState(false),[migrationError,setMigrationError]=useState('');
 async function fetchMigrations(){if(preview){setMigration(sampleMigration);return}setMigrationBusy(true);setMigrationError('');try{setMigration(await request('/api/dashboard?section=migrations&days='+days+'&all='+all))}catch(e){setMigrationError((e as Error).message)}finally{setMigrationBusy(false)}}
 const scores=analyzed.filter(s=>watchlist.some(w=>w.symbol===s.symbol)&&s.score!==null).map(s=>s.score!);
 function downloadDashboardWorkbook(){
  const flows=flow.data?.rows||[],deals=deal.data||sampleDeals,rotationRows=rotation.data?.rows||[],migrationRows=migration?.rows||[];
  const moverSheets=(label:string,data:Movers|null)=>[quoteSheet(label+' gainers',data?.gainers||[]),quoteSheet(label+' losers',data?.losers||[])];
  exportWorkbook('senganthal-dashboard.xls',[
   quoteSheet('Market snapshot',snapshot.data?.quotes||[]),
   {name:'FII DII activity',rows:[['Date','Category','Buy Cr','Sell Cr','Net Cr'],...flows.map(r=>[r.date,r.category,r.buy,r.sell,r.net])]},
   ...moverSheets('Nifty 50',nifty.data),
   ...moverSheets('Overall market',total.data),
   ...moverSheets('End of day',eod.data),
   {name:'Bulk deals',rows:[['Symbol','Client','Side','Quantity','Price','Date'],...deals.bulk.map(r=>[r.symbol,r.client,r.side,r.quantity,r.price,r.date])]},
   {name:'Block deals',rows:[['Symbol','Client','Side','Quantity','Price','Date'],...deals.block.map(r=>[r.symbol,r.client,r.side,r.quantity,r.price,r.date])]},
   {name:'Migrations',rows:[['Date','Listing notice','Reference','URL'],...migrationRows.map(r=>[r.date,r.subject,r.reference,r.url])]},
   {name:'Sector rotation',rows:[['Sector','Note',...(rotationRows[0]?.returns.map(q=>q.quarter)||[])],...rotationRows.map(r=>[r.name,r.error,...r.returns.map(q=>q.value)])]},
   {name:'Session activity',rows:[['Metric','Value'],['Stocks analysed',analyzed.length],['Watchlist size',watchlist.length],['Average watchlist score',scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):'']]},
   {name:'Analysed stocks',rows:[['Symbol','Company','Score'],...analyzed.map(s=>[s.symbol,s.name,s.score])]}
  ]);
 }
 return <div className="dashboard-stack">
  <div className="dash-view-selector">
   <button type="button" className={dashTab==='pulse'?'active':''} onClick={()=>setDashTab('pulse')}>⚡ Market Pulse</button>
   <button type="button" className={dashTab==='deals'?'active':''} onClick={()=>setDashTab('deals')}>🏛️ Deals & Migrations</button>
   <button type="button" className={dashTab==='stakes'?'active':''} onClick={()=>setDashTab('stakes')}>📊 Shareholding & Scans</button>
   <button type="button" className={dashTab==='all'?'active':''} onClick={()=>setDashTab('all')}>All Sections</button>
  </div>
  {(dashTab==='pulse'||dashTab==='all')&&<>
   <div className="market-command-strip"><article><span>Watchlist</span><strong>{watchlist.length}</strong></article><article><span>Analysed</span><strong>{analyzed.length}</strong></article><article><span>Avg score</span><strong>{scores.length?number(scores.reduce((a,b)=>a+b,0)/scores.length,0):'--'}</strong></article>{exportAllowed&&<button className="button primary" onClick={downloadDashboardWorkbook}><FileSpreadsheet size={16}/>Download Excel</button>}</div>
   <Section title="Market snapshot" subtitle="NIFTY 50 priority view with compact index tape" feed={snapshot}>{snapshot.busy&&!snapshot.data?<Loading text="Loading market indices..."/>:<SnapshotTape quotes={snapshot.data?.quotes||[]} preview={preview}/>}<p className="small muted">Prices may be delayed. Each quote retains its provider timestamp.</p></Section>
   <CompactMovers nifty={nifty} total={total} eod={eod} onAnalyze={analysisAllowed?onAnalyze:undefined} exportAllowed={exportAllowed}/>
   <div className="compact-side-grid">
    <Section title="FII / DII daily activity" subtitle={flow.data?.source} feed={flow}>{flow.busy&&!flow.data?<Loading/>:<FlowCompact rows={flow.data?.rows||[]}/>}</Section>
    <Section title="Sector rotation - two-year quarterly comparison" subtitle={rotation.data?.source} feed={rotation}>{rotation.busy&&!rotation.data?<Loading text="Comparing sector history..."/>:<SectorHeatmap rotation={rotation.data}/>}<details className="admin-details"><summary>How to read this heatmap</summary><div className="heatmap-legend"><span><i className="heat-rect strong-gain"/>Strong gain</span><span><i className="heat-rect gain"/>Gain</span><span><i className="heat-rect flat"/>No data</span><span><i className="heat-rect loss"/>Loss</span><span><i className="heat-rect strong-loss"/>Strong loss</span></div><p className="small muted">Each rectangle shows the completed quarterly return for that sector. Deeper green means stronger positive performance; deeper red means weaker performance.</p></details></Section>
   </div>
  </>}
  {(dashTab==='deals'||dashTab==='all')&&<>
   <Section title="Bulk & block deals" subtitle="Large trades reported to NSE" feed={deal}>{deal.busy&&!deal.data?<Loading/>:<DealsTable deals={deal.data||sampleDeals}/>}<p className="small muted">Bulk and block reports can cover different trading dates. Check each date before comparing activity.</p></Section>
   <Section title="SME to Mainboard migration watch" subtitle="NSE listing circulars"><p className="small muted">Find migration-related circulars and open the exchange notice to verify the approval and effective date.</p><label className="checkbox-label"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/>Search available history (up to eight years)</label><label>Look back {days} days<input type="range" min={30} max={730} step={30} disabled={all} value={days} onChange={e=>setDays(Number(e.target.value))}/></label><button className="button secondary" disabled={migrationBusy} onClick={()=>void fetchMigrations()}><Search size={16}/>{migrationBusy?'Fetching...':'Fetch migrations'}</button>{migrationError&&<div className="alert error">{migrationError}</div>}{migration&&<div className="table-wrap compact-table"><table><thead><tr><th>Date</th><th>Listing notice</th><th>Reference</th></tr></thead><tbody>{migration.rows.map((r,i)=><tr key={i}><td>{r.date}</td><td>{r.url?<a href={r.url} target="_blank" rel="noreferrer">{r.subject} {'->'}</a>:r.subject}</td><td>{r.url?<a href={r.url} target="_blank" rel="noreferrer" className="attachment-badge" title="Open official NSE circular attachment">📎 {r.reference}</a>:(r.reference||'—')}</td></tr>)}</tbody></table>{!migration.rows.length&&<p className="empty-inline">{preview?'Sample preview. Sign in to search official circulars.':'No migration circulars matched the selected period.'}</p>}</div>}</Section>
  </>}
  {(dashTab==='stakes'||dashTab==='all')&&<>
   <Section title="Your activity"><div className="activity-grid compact-activity"><div><strong>{analyzed.length}</strong><span>Stocks analysed</span></div><div><strong>{watchlist.length}</strong><span>Watchlist size</span></div><div><strong>{scores.length?number(scores.reduce((a,b)=>a+b,0)/scores.length,0):'--'}</strong><span>Average score</span></div></div>{analyzed.length?<div className="recent-research">{analyzed.slice().reverse().slice(0,8).map(s=><button className="button secondary" key={s.symbol} onClick={()=>onAnalyze(s.symbol)}>{s.symbol} - {s.score??'--'}/100</button>)}</div>:<Empty title="Your research starts here" text="Analyse a company to see your recent research in this session."/>}</Section>
   {analysisAllowed?<StakePanels preview={preview} exportAllowed={exportAllowed} canScan={Boolean(canScan)}/>:<Notice>Shareholding analysis is available when an administrator enables Stock analysis for your account.</Notice>}
  </>}
 </div>;
}
function StakePanels({preview,exportAllowed,canScan}:{preview:boolean;exportAllowed:boolean;canScan:boolean}){
 const [symbol,setSymbol]=useState('RELIANCE'),[single,setSingle]=useState<Stake|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[scan,setScan]=useState<Scan|null>(null),[category,setCategory]=useState<'FII'|'DII'|'HNI'>('FII'),[direction,setDirection]=useState('all'),[query,setQuery]=useState(''),[scanBusy,setScanBusy]=useState(false),[scanError,setScanError]=useState('');
 useEffect(()=>{if(preview)return;let cancelled=false;request<{scan:Scan|null}>('/api/stakes').then(r=>{if(!cancelled)setScan(r.scan)}).catch(e=>{if(!cancelled)setScanError(e.message)});return()=>{cancelled=true}},[preview]);
 useEffect(()=>{if(preview||scan?.status!=='running'||scanError||!canScan)return;let cancelled=false;const timer=setTimeout(async()=>{setScanBusy(true);try{const result=await request<{scan:Scan}>('/api/stakes',{method:'POST',body:JSON.stringify({action:'step'})});if(!cancelled)setScan(result.scan)}catch(e){if(!cancelled)setScanError((e as Error).message)}finally{if(!cancelled)setScanBusy(false)}},1600);return()=>{cancelled=true;clearTimeout(timer)}},[preview,scan?.status,scan?.cursor,scanError,canScan]);
 async function fetchOne(e:React.FormEvent){e.preventDefault();if(preview){setError('Sign in to retrieve actual quarterly filings.');return}setBusy(true);setError('');try{setSingle(await request<Stake>('/api/stakes?symbol='+encodeURIComponent(symbol.trim().toUpperCase())))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function control(action:string){if(preview){setScanError('Sign in to run a saved market scan.');return}if(!canScan){setScanError('Market scan execution is restricted to administrators.');return}if(action==='start'&&scan&&scan.cursor&&!window.confirm('Start a new scan and replace your previous scan results?'))return;setScanBusy(true);setScanError('');try{setScan((await request<{scan:Scan}>('/api/stakes',{method:'POST',body:JSON.stringify({action})})).scan)}catch(e){setScanError((e as Error).message)}finally{setScanBusy(false)}}
 const rows=(scan?.results||[]).filter((r):r is Stake=>!('error'in r)).filter(r=>r.symbol.toLowerCase().includes(query.toLowerCase())).map(r=>({...r,delta:r.previous?.[category]!==null&&r.previous?.[category]!==undefined&&r.current[category]!==null?r.current[category]!-r.previous[category]!:null})).filter(r=>direction==='all'||(r.delta!==null&&(direction==='increased'?r.delta>0:r.delta<0))).sort((a,b)=>{
  if(direction==='decreased'){
   return (a.delta??0)-(b.delta??0); // Sort largest decrease to lowest decrease (e.g. -5.2% before -0.5%)
  }
  return (b.delta??-Infinity)-(a.delta??-Infinity);
 });
 return <><Section title="FII / DII / HNI shareholding — single-stock check"><p className="small muted">Compare the two latest available quarter-end filings. FII represents reported foreign portfolio investor categories; DII is the domestic institutions subtotal; HNI represents individuals with nominal share capital above Rs 2 lakh. Missing categories stay blank.</p><form className="search-form standalone" onSubmit={fetchOne}><input aria-label="Shareholding stock symbol" value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} maxLength={24} required/><button className="button primary" disabled={busy}>{busy?'Fetching…':'Fetch & parse'}</button></form>{error&&<div className="alert error">{error}</div>}{single&&<><p className="small muted">{single.symbol} · {single.previous?.period||'No previous quarter'} to {single.current.period}</p><div className="table-wrap"><table><thead><tr><th>Category</th><th>Previous %</th><th>Current %</th><th>Change (pp)</th></tr></thead><tbody>{(['FII','DII','HNI'] as const).map(k=><tr key={k}><td>{k}</td><td>{number(single.previous?.[k])}</td><td>{number(single.current[k])}</td><td>{single.current[k]!==null&&single.previous?.[k]!==null&&single.previous?.[k]!==undefined?number(single.current[k]!-single.previous[k]!):'—'}</td></tr>)}</tbody></table></div><a className="text-button" href={single.sourceUrl} target="_blank" rel="noreferrer">Verify official shareholding filings</a></>}</Section><Section title="FII / DII / HNI stake changes — full market scan"><Notice>Quarterly filings, not live trading flows. The scan uses current Nifty Total Market constituents, processes two stocks per batch, and saves progress after each batch. Keep this page open while running; resume here later if you leave.</Notice><div className="scan-controls">{canScan?<><button className="button primary" disabled={scanBusy||scan?.status==='running'} onClick={()=>void control('start')}><Play size={15}/>Start new scan</button>{scan&&scan.status!=='complete'&&<button className="button secondary" disabled={scanBusy} onClick={()=>void control(scan.status==='running'&&!scanError?'pause':'resume')}>{scan.status==='running'&&!scanError?<><Pause size={15}/>Pause scan</>:<><Play size={15}/>Resume scan</>}</button>}</>:<p className="small muted scan-admin-badge">🛡️ Market-wide scanning is controlled by administrators to prevent exchange rate-limiting. You can search, filter, and review the team scan results below.</p>}</div>{scan&&<><label className="small">{scan.cursor} / {scan.symbols.length} stocks · {scan.status}<progress max={scan.symbols.length} value={scan.cursor}/></label><p className="small muted">Saved: {stamp(scan.updatedAt)} · {scan.results.filter(r=>'error'in r).length} unavailable</p></>}{scanError&&<div className="alert error">{scanError}</div>}<div className="toolbar"><div className="tabs">{(['FII','DII','HNI'] as const).map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><select aria-label="Filter stake changes" value={direction} onChange={e=>setDirection(e.target.value)}><option value="all">All changes</option><option value="increased">Increased stakes</option><option value="decreased">Decreased stakes (High to low)</option></select><input aria-label="Search scan symbols" placeholder="Find symbol…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="table-wrap scroll-table"><table><thead><tr><th>Symbol</th><th>Previous quarter</th><th>Prior %</th><th>Current quarter</th><th>Current %</th><th>Change (pp)</th></tr></thead><tbody>{rows.map(r=><tr key={r.symbol}><td><a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.symbol}</a></td><td>{r.previous?.period||'—'}</td><td>{number(r.previous?.[category])}</td><td>{r.current.period}</td><td>{number(r.current[category])}</td><td className={r.delta!==null&&r.delta>=0?'positive':'negative'}>{number(r.delta)}</td></tr>)}</tbody></table>{!rows.length&&<p className="empty-inline">No matching results yet. Start a scan to compare reported stakes.</p>}</div>{exportAllowed&&rows.length>0&&<button className="text-button" onClick={()=>exportRows('stake-changes.csv',[['Symbol','Category','Previous quarter','Prior %','Current quarter','Current %','Change pp'],...rows.map(r=>[r.symbol,category,r.previous?.period,r.previous?.[category],r.current.period,r.current[category],r.delta])])}>Export filtered results</button>}{scan?.results.some(r=>'error'in r)&&<details className="admin-details"><summary>Stocks with unavailable filings</summary><p className="small">{scan.results.filter(r=>'error'in r).map(r=>r.symbol).join(', ')}</p></details>}</Section></>;
}
