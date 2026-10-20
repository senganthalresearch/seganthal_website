import { rsi, swing } from "./analytics";
import type { Stock } from "./types";

export const scanFields = { rsi: "RSI (14)", volume: "Volume / 20-day average", pe: "P/E ratio", roe: "Return on equity (%)", de: "Debt / equity", score: "Research quality score", change: "Price change (%)", trend: "Above 50-day average (1 = yes)", breakout: "Above previous 20-session high (1 = yes)", low: "Below previous 20-session low (1 = yes)" };
export type ScanField = keyof typeof scanFields;
export type ScanRule = { field: ScanField; operator: "gt" | "lt"; value: number };
export function scanValue(stock: Stock, field: ScanField): number | null {
  const closes = stock.history.map(c=>c.close);
  if (field === "rsi") return rsi(closes);
  if (field === "volume") return swing(stock.history).volumeRatio;
  if (field === "score") return stock.score;
  if (field === "change") return stock.changePercent;
  if (field === "trend") return closes.length < 50 ? null : Number(closes.at(-1)! > closes.slice(-50).reduce((a,b)=>a+b,0)/50);
  if (field === "breakout" || field === "low") {
    const bars=stock.history.slice(-21,-1);
    if(bars.length<20||bars.some(c=>field==='breakout'?c.high===undefined:c.low===undefined))return null;
    return field==='breakout'?Number(closes.at(-1)!>Math.max(...bars.map(c=>c.high!))):Number(closes.at(-1)!<Math.min(...bars.map(c=>c.low!)));
  }
  return stock.metrics.find(m=>m.key===field)?.value ?? null;
}
export function matchesScan(stock: Stock, rules: ScanRule[]) {
  return rules.length > 0 && rules.every(rule=>{const value=scanValue(stock,rule.field);return value!==null && Number.isFinite(value) && (rule.operator==="gt"?value>rule.value:value<rule.value)});
}
export const scanPresets: { name:string; description:string; rules:ScanRule[] }[] = [
  {name:"RSI below 30",description:"Daily RSI in the oversold range",rules:[{field:"rsi",operator:"lt",value:30}]},
  {name:"RSI above 70",description:"Daily RSI in the overbought range",rules:[{field:"rsi",operator:"gt",value:70}]},
  {name:"Unusual volume",description:"Volume above 1.5× its 20-day average",rules:[{field:"volume",operator:"gt",value:1.5}]},
  {name:"Above the 50-day average",description:"Closing price above its simple moving average",rules:[{field:"trend",operator:"gt",value:0}]},
  {name:"High return on equity",description:"Reported ROE greater than 15%",rules:[{field:"roe",operator:"gt",value:15}]},
  {name:"Low debt, strong profitability",description:"Debt / equity below 0.5 and ROE above 15%",rules:[{field:"de",operator:"lt",value:.5},{field:"roe",operator:"gt",value:15}]},
  {name:"Quality and momentum",description:"Research score above 70 with RSI between 45 and 70",rules:[{field:"score",operator:"gt",value:70},{field:"rsi",operator:"gt",value:45},{field:"rsi",operator:"lt",value:70}]},
  {name:"20-session high breakout",description:"Close above all reported highs of the previous 20 sessions",rules:[{field:"breakout",operator:"gt",value:0}]},
  {name:"20-session low breakdown",description:"Close below all reported lows of the previous 20 sessions",rules:[{field:"low",operator:"gt",value:0}]},
];

export type PatternMatch={name:string;kind:number;date:string;level:number;description:string};
/** Conservative, explainable observations from daily closes; not a proprietary signal feed. */
export function detectPatterns(history:Stock['history']):PatternMatch[] {
  const rows=history.slice(-120);if(rows.length<30)return [];
  const close=rows.map(r=>r.close),last=close.at(-1)!;
  if(close.some(v=>!Number.isFinite(v)||v<=0))return [];
  const peaks:number[]=[],troughs:number[]=[];
  for(let i=3;i<close.length-3;i++){
    const neighbours=close.slice(i-3,i+4).filter((_,j)=>j!==3);
    if(neighbours.every(v=>v<close[i]))peaks.push(i);
    if(neighbours.every(v=>v>close[i]))troughs.push(i);
  }
  const results:PatternMatch[]=[];
  const top=peaks.slice(-2);
  if(top.length===2&&top[1]-top[0]>=5&&rows.length-1-top[1]<=30){
    const [a,b]=top,level=Math.min(...close.slice(a+1,b));
    if(Math.abs(close[a]/close[b]-1)<=.025&&level<Math.min(close[a],close[b])*.97&&last<level)
      results.push({name:'Double top · neckline broken',kind:2,date:rows.at(-1)!.date,level,description:'Two closing-price peaks within 2.5%, at least five sessions apart, with a trough more than 3% below both peaks and the latest close below that trough.'});
  }
  const bottom=troughs.slice(-3);
  if(bottom.length===3&&bottom[1]-bottom[0]>=5&&bottom[2]-bottom[1]>=5&&rows.length-1-bottom[2]<=30){
    const values=bottom.map(i=>close[i]),neckline=Math.max(...close.slice(bottom[0]+1,bottom[2]));
    if(Math.max(...values)/Math.min(...values)-1<=.025&&neckline>Math.max(...values)*1.03&&last>neckline)
      results.push({name:'Triple bottom · neckline broken',kind:3,date:rows.at(-1)!.date,level:neckline,description:'Three closing-price troughs within 2.5%, separated by at least five sessions, with the latest close above the intervening highs.'});
  }
  const recent=close.slice(-30),mean=recent.reduce((a,b)=>a+b,0)/recent.length;
  const covariance=recent.reduce((sum,y,i)=>sum+(i-14.5)*(y-mean),0),variance=recent.reduce((sum,_,i)=>sum+(i-14.5)**2,0),slope=covariance/variance;
  const total=recent.reduce((sum,y)=>sum+(y-mean)**2,0),residual=recent.reduce((sum,y,i)=>sum+(y-(mean+slope*(i-14.5)))**2,0);
  if(total>0&&slope/mean<-.001&&1-residual/total>.75)results.push({name:'Persistent descending trend',kind:1,date:rows.at(-1)!.date,level:last,description:'30-session closing-price regression slopes down more than 0.1% of the mean per session with R² above 0.75. This does not confirm a bounded price channel.'});
  return results;
}
export function portfolioTotals(rows:{quantity:number;averageCost:number;price:number|null}[]) {
  const cost=rows.reduce((s,r)=>s+r.quantity*r.averageCost,0);
  const priced=rows.filter(r=>r.price!==null);
  const valuedCost=priced.reduce((s,r)=>s+r.quantity*r.averageCost,0);
  const value=priced.reduce((s,r)=>s+r.quantity*r.price!,0);
  return {cost,value:priced.length?value:null,gain:priced.length?value-valuedCost:null,coverage:priced.length,total:rows.length};
}
