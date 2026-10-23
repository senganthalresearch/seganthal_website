import { redirect } from 'next/navigation';
import { currentMember } from '@/lib/auth';
import { PublicPage } from '@/components/public-page';
import { BillingAccount } from '@/components/billing-account';
import { privateRobots } from '@/lib/seo';
export const metadata = { title: 'Account & billing | Senganthal', robots: privateRobots };
export const dynamic = 'force-dynamic';
export default async function Account() {
  const member = await currentMember();
  if (!member) redirect('/login#workspace-access');
  if (member.reviewDemo) redirect('/workspace');
  if (member.role !== 'admin' && (!member.emailVerifiedAt || !member.onboardedAt)) redirect('/complete-account');
  return <PublicPage title="Account & billing" intro="Manage your membership, payments and annual renewal."><BillingAccount/></PublicPage>;
}
