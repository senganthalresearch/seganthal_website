import test from 'node:test';
import assert from 'node:assert/strict';
import { annualEnd, manualAccessEnd, normalizeUtr, validProof } from '../lib/manual-payment-rules';

test('manual access requires approval, correct account, full price and unexpired year',()=>{
  const row = {status:'approved' as const,accountId:'original-account',amount:59900,end:2000};
  assert.equal(manualAccessEnd([row],'original-account',1000),2000);
  assert.equal(manualAccessEnd([row],'recreated-account',1000),0);
  for(const status of ['pending','rejected','revoked'] as const)assert.equal(manualAccessEnd([{...row,status}],'original-account',1000),0);
  assert.equal(manualAccessEnd([{...row,amount:100}],'original-account',1000),0);
  assert.equal(manualAccessEnd([row],'original-account',2000),0);
});
test('annual UPI period handles leap days without adding an extra month',()=>{
  assert.equal(new Date(annualEnd(Date.parse('2024-02-29T12:00:00Z')/1000)*1000).toISOString(),'2025-02-28T12:00:00.000Z');
  assert.equal(new Date(annualEnd(Date.parse('2026-10-24T12:00:00Z')/1000)*1000).toISOString(),'2027-10-24T12:00:00.000Z');
});
test('proof validation rejects URLs, SVG, MIME spoofing and oversized uploads',()=>{
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(10)]).toString('base64');
  assert.equal(validProof('data:image/png;base64,'+png),true);
  for(const value of ['https://example.com/proof.png','data:image/svg+xml;base64,PHN2Zy8+','data:image/jpeg;base64,'+png,'data:image/png;base64,'+Buffer.alloc(3*1024*1024).toString('base64')])assert.equal(validProof(value),false);
  assert.equal(normalizeUtr(' 123456789012 '),'123456789012');
});
