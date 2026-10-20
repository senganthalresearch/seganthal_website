import assert from 'node:assert/strict';
import test from 'node:test';
import {detectPatterns,matchesScan,portfolioTotals,scanValue} from '../lib/research-scans';
import {demoStock} from '../lib/demo';

test('scan requires every condition and excludes missing financial metrics',()=>{
 const s=demoStock();
 assert.equal(matchesScan(s,[{field:'roe',operator:'gt',value:15},{field:'de',operator:'lt',value:.5}]),true);
 assert.equal(matchesScan({...s,metrics:[]},[{field:'roe',operator:'gt',value:15}]),false);
 assert.equal(matchesScan(s,[{field:'roe',operator:'lt',value:15}]),false);
 assert.equal(matchesScan(s,[]),false);
});
test('technical scans leave insufficient history unavailable',()=>{
 const s={...demoStock(),history:[]};
 assert.equal(scanValue(s,'rsi'),null);
 assert.equal(scanValue(s,'trend'),null);
 assert.equal(scanValue(s,'volume'),null);
 assert.equal(matchesScan(s,[{field:'rsi',operator:'lt',value:30}]),false);
});
test('portfolio returns never treat a missing quote as a zero price',()=>{
 assert.deepEqual(portfolioTotals([{quantity:10,averageCost:100,price:120},{quantity:5,averageCost:200,price:null}]),{cost:2000,value:1200,gain:200,coverage:1,total:2});
 assert.deepEqual(portfolioTotals([{quantity:5,averageCost:200,price:null}]),{cost:1000,value:null,gain:null,coverage:0,total:1});
});

test('breakout rules require actual highs and exclude the current candle from the threshold',()=>{
 const s=demoStock();
 assert.equal(scanValue(s,'breakout'),null);
 const history=Array.from({length:21},(_,i)=>({date:String(i),close:i===20?103:99,high:i===20?106:102,low:97,volume:100}));
 assert.equal(scanValue({...s,history},'breakout'),1);
 assert.equal(scanValue({...s,history:history.map(r=>({...r,close:102}))},'breakout'),0);
});
test('pattern observations require sufficient non-flat history and expose their rule',()=>{
 const s=demoStock();
 assert.deepEqual(detectPatterns([]),[]);
 assert.deepEqual(detectPatterns(s.history.map(r=>({...r,close:100}))),[]);
 const falling=s.history.slice(0,45).map((r,i)=>({...r,close:150-i}));
 const results=detectPatterns(falling);
 assert.equal(results.length,1);
 assert.equal(results[0].name,'Persistent descending trend');
 assert.ok(results[0].description.includes('R²'));
 assert.deepEqual(detectPatterns(falling.map(r=>({...r,close:-1}))),[]);
});
