import test from 'node:test';
import assert from 'node:assert/strict';
import { hasComplimentaryAccess, sessionMatchesAccount, sessionSurvivesReset } from '../lib/member-access';
import type { Member } from '../lib/types';

const member: Member = { email:'invited@example.test', accountId:'account-1', role:'standard', active:true, emailVerifiedAt:'yes', onboardedAt:'yes', complimentaryAccessUntil:2000 };

test('password resets revoke old and legacy sessions but allow a fresh sign-in',()=>{
  const reset={...member,sessionsValidAfter:2000};
  for(const time of [undefined,1000,2000,NaN,Infinity])assert.equal(sessionSurvivesReset(reset,time),false);
  assert.equal(sessionSurvivesReset(reset,2001),true);
  assert.equal(sessionSurvivesReset(member,undefined),true);
});

test('complimentary access expires and never skips verification or suspension', () => {
  assert.equal(hasComplimentaryAccess(member,1999),true);
  assert.equal(hasComplimentaryAccess(member,2000),false);
  for(const patch of [{active:false},{reviewDemo:true},{emailVerifiedAt:undefined},{onboardedAt:undefined},{complimentaryAccessUntil:0},{complimentaryAccessUntil:Infinity},{role:'admin' as const}]) {
    assert.equal(hasComplimentaryAccess({...member,...patch},1000),false);
  }
});

test('a deleted account session cannot authenticate a new account at the same email', () => {
  assert.equal(sessionMatchesAccount(member,'account-1'),true);
  assert.equal(sessionMatchesAccount({...member,accountId:'account-2'},'account-1'),false);
  assert.equal(sessionMatchesAccount(member,undefined),false);
  assert.equal(sessionMatchesAccount({...member,active:false},'account-1'),false);
  assert.equal(sessionMatchesAccount({...member,role:'admin'},undefined),true);
});
