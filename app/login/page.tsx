import { LandingPage } from '@/components/landing-page';
import { privateRobots } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in | Senganthal', robots: privateRobots };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <LandingPage error={params.error}/>;
}