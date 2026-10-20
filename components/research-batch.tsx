"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Stock, WatchItem } from "@/lib/types";
import { demoBasket, demoStock } from "@/lib/demo";
import { request } from "./ui";

export function ResearchBatch({preview,watchlist,allowed,onStocks}:{preview:boolean;watchlist:WatchItem[];allowed:boolean;onStocks:(stocks:Stock[])=>void}) {
 const [scope,setScope]=useState('basket'),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const stop=useRef(false);
 useEffect(()=>()=>{stop.current=true},[]);
 async function run(){setBusy(true);setError('');stop.current=false;const all:Stock[]=[];let missed=0;try{
   const symbols=scope==='watchlist'?watchlist.map(r=>r.symbol):preview?demoBasket.map(r=>r.symbol):['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','ITC','LT','SBIN','BHARTIARTL','HINDUNILVR','AXISBANK','KOTAKBANK','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','ASIANPAINT','HCLTECH','WIPRO','TATASTEEL'];
   if(!symbols.length){setStatus('Your watchlist is empty. Add companies first.');return}
   for(let i=0;i<symbols.length&&!stop.current;i+=3){const batch=symbols.slice(i,i+3);setStatus(`Researching ${Math.min(i+3,symbols.length)} of ${symbols.length} companies…`);const result=preview?{stocks:batch.map(demoStock),unavailable:[]}:await request<{stocks:Stock[];unavailable:string[]}>('/api/explore?section=research&symbols='+batch.map(encodeURIComponent).join(','));if(stop.current)break;all.push(...result.stocks);missed+=result.unavailable.length;onStocks([...all]);if(!preview&&i+3<symbols.length)await new Promise(resolve=>setTimeout(resolve,5200))}
   setStatus(`${stop.current?'Stopped. ':''}${all.length} researched · ${missed} unavailable`);
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="research-batch"><div className="research-table-controls"><select aria-label="Research universe" disabled={busy} value={scope} onChange={e=>setScope(e.target.value)}><option value="basket">20-stock research basket</option><option value="watchlist">My watchlist</option></select><button className="button secondary" disabled={busy||!allowed} onClick={()=>void run()}><Play size={14}/>{busy?'Researching…':'Load company research'}</button>{busy&&<button className="text-button" onClick={()=>{stop.current=true;setStatus('Stopping after the current request…')}}><Square size={13}/>Stop</button>}</div><p className="research-source" role="status">{status||'Load company data to compare scores and technical observations. Preview uses illustrative companies.'}</p>{error&&<div className="alert error" role="alert">{error}</div>}</div>;
}
