import type { Member } from './types';

// A temporary, sample-only review session. It never grants paid or admin access.
export function hasReviewerAccess(member: Member, now = Math.floor(Date.now() / 1000)) {
  return member.active && member.role !== 'admin' && Boolean(member.emailVerifiedAt && member.onboardedAt) &&
    Number.isSafeInteger(member.reviewerAccessUntil) && (member.reviewerAccessUntil || 0) > now;
}
