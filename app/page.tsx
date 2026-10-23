import { LandingPage } from '@/components/landing-page';
import { publicMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = publicMetadata('/', 'Senganthal | Stock Research & Financial Data',
  'Explore Indian company financials, historical charts, screening tools and watchlists with Senganthal, a workspace for independent stock research.');
export default function Home() { return <LandingPage/>; }

