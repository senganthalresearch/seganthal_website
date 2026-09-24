import test from 'node:test';
import assert from 'node:assert/strict';
import {can} from '../lib/permissions';
import {bannerSchema,bannerVisible,defaultSettings,memberSchema} from '../lib/site-settings';
import {parseCsv,numeric,quarterReturns} from '../lib/data-utils';
import type {Member} from '../lib/types';
const member:Member={email:'member@example.com',role:'standard',active:true};
test('roles, individual overrides and revocation are enforced',()=>{
 assert.equal(can(member,'analyze'),true);assert.equal(can(member,'reports'),true);assert.equal(can(member,'swing'),true);
 assert.equal(can({...member,role:'viewer'},'analyze'),false);
 assert.equal(can({...member,permissions:{reports:true}},'reports'),true);
 assert.equal(can({...member,role:'full',permissions:{swing:false}},'swing'),false);
 assert.equal(can({...member,permissions:{reports:false}},'reports'),false);
 assert.equal(can({...member,role:'admin'},'aboutEdit'),true);
 assert.equal(can({...member,role:'admin',active:false},'analyze'),false);
});
test('member validation normalizes email and rejects invalid roles',()=>{
 assert.equal(memberSchema.parse({...member,email:' Member@Example.COM '}).email,'member@example.com');
 assert.equal(memberSchema.safeParse({...member,role:'owner'}).success,false);
});
test('scheduled banner respects exact start/end and disabled state',()=>{
 const b={...defaultSettings.banner,startsAt:'2026-09-23T00:00:00Z',endsAt:'2026-09-24T00:00:00Z'};
 assert.equal(bannerVisible(b,Date.parse(b.startsAt)-1),false);
 assert.equal(bannerVisible(b,Date.parse(b.startsAt)),true);
 assert.equal(bannerVisible(b,Date.parse(b.endsAt)),false);
 assert.equal(bannerVisible({...b,enabled:false},Date.parse(b.startsAt)),false);
 assert.equal(bannerSchema.safeParse({...b,endsAt:b.startsAt}).success,false);
});
test('CSV supports commas, escaped quotes, BOM and embedded newlines',()=>{
 assert.deepEqual(parseCsv('\uFEFFemail,name\r\na@b.com,"A, ""B""\nC"'),[{email:'a@b.com',name:'A, "B"\nC'}]);
 assert.throws(()=>parseCsv('name\n"unterminated'));
 assert.equal(numeric(''),null);assert.equal(numeric('-'),null);assert.equal(numeric('1,200.5'),1200.5);
});
test('quarter returns exclude incomplete quarter and require baseline',()=>{
 const r=quarterReturns([{date:'2025-12-31',close:100},{date:'2026-03-31',close:110},{date:'2026-06-30',close:99},{date:'2026-09-10',close:900}],new Date('2026-09-23'));
 assert.equal(r.length,8);assert.equal(r.at(-1)?.quarter,'2026 Q2');
 assert.ok(Math.abs(r.at(-1)!.value!+10)<0.00001);
 assert.ok(Math.abs(r.at(-2)!.value!-10)<0.00001);
 assert.equal(r.at(-3)?.value,null);
});
