export function returnOnCapitalEmployed(ebit:number|null,assets:number|null,currentLiabilities:number|null){
 if(ebit===null||assets===null||currentLiabilities===null||![ebit,assets,currentLiabilities].every(Number.isFinite)||assets-currentLiabilities<=0)return null;
 return ebit/(assets-currentLiabilities)*100;
}
export function annualGrowth(current:number|null,start:number|null,years:number){return current!==null&&start!==null&&current>0&&start>0&&Number.isFinite(years)&&years>0?(Math.pow(current/start,1/years)-1)*100:null}
export function margin(profit:number|null,revenue:number|null){return profit!==null&&revenue!==null&&Number.isFinite(profit)&&Number.isFinite(revenue)&&revenue>0?profit/revenue*100:null}
