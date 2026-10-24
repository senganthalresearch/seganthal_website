import type { Member } from './types';

// A complimentary grant is separate from role permissions and payment history.
export function hasComplimentaryAccess(member: Member, now = Math.floor(Date.now() / 1000)) {
  return member.active && !member.reviewDemo && member.role !== 'admin' &&
    Boolean(member.emailVerifiedAt && member.onboardedAt) &&
    Number.isSafeInteger(member.complimentaryAccessUntil) && (member.complimentaryAccessUntil || 0) > now;
}

// Bind sessions to a particular account, not just an email that can be reused.
export function sessionMatchesAccount(member: Member, accountId: unknown) {
  return member.active && (member.role === 'admin' ||
    (typeof accountId === 'string' && Boolean(accountId) && accountId === member.accountId));
}

export function sessionSurvivesReset(member: Member, startedAt: unknown) {
  return !member.sessionsValidAfter || (typeof startedAt==='number' && Number.isFinite(startedAt) && startedAt>member.sessionsValidAfter);
}
