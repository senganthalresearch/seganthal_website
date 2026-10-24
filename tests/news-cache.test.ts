import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsFallback } from '../lib/news-cache';
test('news fallback is bounded, query-specific and expires',async()=>{
  const read=createNewsFallback(1,10);
  const fail=async()=>{throw new Error('offline')};
  assert.deepEqual(await read('a',async()=>['a']),{data:['a'],stale:false});
  assert.deepEqual(await read('a',fail),{data:['a'],stale:true});
  await assert.rejects(read('b',fail));
  await read('b',async()=>['b']);await assert.rejects(read('a',fail));
  await new Promise(resolve=>setTimeout(resolve,20));await assert.rejects(read('b',fail));
});
