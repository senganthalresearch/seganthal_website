export type Transaction={id:string;symbol:string;type:'buy'|'sell'|'dividend'|'opening';date:string;quantity:number;price:number;fees:number};
export function ledgerSnapshot(transactions:Transaction[]){
 const positions=new Map<string,{symbol:string;quantity:number;cost:number;realised:number;dividends:number}>();let fees=0,cashInvested=0;
 for(const t of [...transactions].sort((a,b)=>a.date.localeCompare(b.date))){
  const p=positions.get(t.symbol)||{symbol:t.symbol,quantity:0,cost:0,realised:0,dividends:0};
  if(![t.price,t.quantity,t.fees].every(Number.isFinite)||t.price<0||t.quantity<0||t.fees<0)throw new Error('Transactions must contain valid non-negative amounts.');
  if(t.type==='dividend'){p.dividends+=t.price-t.fees;cashInvested-=t.price-t.fees}
  else if(t.type==='buy'||t.type==='opening'){p.quantity+=t.quantity;p.cost+=t.quantity*t.price+t.fees;cashInvested+=t.quantity*t.price+t.fees}
  else {if(t.quantity>p.quantity+1e-8)throw new Error(`Cannot sell more ${t.symbol} shares than held on ${t.date}.`);const basis=p.quantity?p.cost/p.quantity*t.quantity:0;p.quantity-=t.quantity;p.cost-=basis;p.realised+=t.quantity*t.price-t.fees-basis;cashInvested-=t.quantity*t.price-t.fees;if(Math.abs(p.quantity)<1e-8){p.quantity=0;p.cost=0}}
  fees+=t.fees;positions.set(t.symbol,p);
 }
 const rows=[...positions.values()];return {positions:rows,fees,cashInvested,realised:rows.reduce((s,p)=>s+p.realised,0),dividends:rows.reduce((s,p)=>s+p.dividends,0),cost:rows.reduce((s,p)=>s+p.cost,0)};
}
export function portfolioTimeline(transactions:Transaction[],histories:Record<string,{date:string;close:number}[]>){
 const dates=[...new Set(Object.values(histories).flatMap(rows=>rows.map(r=>r.date.slice(0,10))))].sort().slice(-252),first=transactions.map(t=>t.date).sort()[0];
 return dates.filter(date=>date>=first).map(date=>{const snapshot=ledgerSnapshot(transactions.filter(t=>t.date<=date));let complete=true,value=0;for(const p of snapshot.positions){if(p.quantity<=0)continue;const price=histories[p.symbol]?.filter(r=>r.date.slice(0,10)<=date).at(-1)?.close;if(price===undefined){complete=false;break}value+=p.quantity*price}return {date,value:complete?value:null,netInvested:snapshot.cashInvested,gain:complete?value-snapshot.cashInvested:null}});
}
