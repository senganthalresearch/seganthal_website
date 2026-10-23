import { redirect } from 'next/navigation';
import { currentMember } from '@/lib/auth';
import { hasPaidAccess } from '@/lib/billing';
import { privateRobots } from '@/lib/seo';
import Terminal from '@/components/terminal';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Member workspace | Senganthal', robots: privateRobots };
export default async function Workspace() {
  let member;
  try { member = await currentMember(); } catch { redirect('/login?error=ServiceUnavailable'); }
  if (!member) redirect('/login');
  if (member.reviewDemo) return <Terminal preview member={member}/>;
  if (member.role !== 'admin' && (!member.emailVerifiedAt || !member.onboardedAt)) redirect('/complete-account');
  if (!await hasPaidAccess(member)) redirect('/account');
  return <Terminal member={member}/>;
}
