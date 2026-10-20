import assert from 'node:assert/strict';
import test from 'node:test';
import {reportMetrics,historyRange,readVisits,addVisit,type TradingReport} from '../lib/trending';
import {demoBasket} from '../lib/demo';
test('volume comparisons use exactly the previous five sessions and preserve missing data',()=>{
 const reports:TradingReport[]=Array.from({length:6},(_,i)=>({date:`2026-09-${21-i}`,rows:[{SYMBOL:'TCS',TTL_TRD_QNTY:String(i?100:1000),DELIV_QTY:'70',HIGH_PRICE:'110'}]}));
 assert.equal(reportMetrics(reports,'TCS').averageVolume,100);
 assert.equal(reportMetrics(reports,'TCS').volumeRatio,10);
 assert.equal(reportMetrics(reports.slice(0,5),'TCS').averageVolume,null);
 assert.equal(reportMetrics([reports[0],...reports.slice(0,5)],'TCS').averageVolume,null);
 assert.equal(reportMetrics(reports,'MISSING').volumeRatio,null);
 reports[2].rows=[];assert.equal(reportMetrics(reports,'TCS').volumeRatio,null);
});
test('available historical extremes use reported highs and lows and retain coverage',()=>{
 const range=historyRange('TCS',[{date:'2020-01-01',high:100,low:80},{date:'2020-01-02',high:120,low:90}]);
 assert.equal(range?.high,120);assert.equal(range?.low,80);assert.equal(range?.highDate,'2020-01-02');assert.equal(range?.from,'2020-01-01');assert.equal(range?.sessions,2);
 assert.equal(historyRange('TCS',[{date:'2020-01-01'}]),null);
});
test('company visit counts validate browser data and accumulate only the opened company',()=>{
 assert.deepEqual(readVisits('{bad'),[]);assert.deepEqual(readVisits('[{"symbol":"TCS","count":-1}]'),[]);
 const first=addVisit([],demoBasket[0],'2026-09-21T10:00:00Z');const twice=addVisit(first,demoBasket[0],'2026-09-22T10:00:00Z');
 assert.equal(twice.length,1);assert.equal(twice[0].count,2);assert.equal(readVisits(JSON.stringify(twice))[0].symbol,'TCS');
});
