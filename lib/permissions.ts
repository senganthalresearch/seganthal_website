import type { Member } from './types';
export const roleNames = { admin: 'Admin', full: 'Full access user', standard: 'Standard', viewer: 'Viewer', member: 'Standard' } as const;
export const permissionNames = { analyze: 'Stock analysis', watchlist: 'Edit watchlist', chat: 'Post in team chat', reports: 'Company filings', swing: 'Swing trade', export: 'Print / export research', aboutEdit: 'Edit About Us' } as const;
export type Permission = keyof typeof permissionNames;
export function can(member: Member, permission: Permission) {
  if (!member.active) return false;
  if (member.role === 'admin') return true;
  if (member.permissions?.[permission] !== undefined) return member.permissions[permission] === true;
  const standard = ['analyze', 'watchlist', 'chat', 'reports', 'swing'];
  return member.role === 'full' ? permission !== 'aboutEdit' : member.role === 'viewer' ? false : standard.includes(permission);
}
