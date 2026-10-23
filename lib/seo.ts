import type { Metadata } from 'next';

// Canonicals must not depend on a caller's Host header or a local auth origin.
export const SITE_URL = 'https://www.senganthal.co.in';
export const publicPagePaths = [
  '/', '/about', '/contact', '/pricing', '/privacy-policy',
  '/terms-and-conditions', '/refund-policy', '/cancellation-policy',
  '/risk-disclosure', '/grievance'
] as const;
export const privateRobots: Metadata['robots'] = { index: false, follow: false };
export const canonicalUrl = (path: typeof publicPagePaths[number]) => path === '/' ? SITE_URL : new URL(path, SITE_URL).href;
export function publicMetadata(path: typeof publicPagePaths[number], title: string, description: string): Metadata {
  return { title, description, alternates: { canonical: canonicalUrl(path) },
    robots: { index: true, follow: true },
    openGraph: { type: 'website', siteName: 'Senganthal', title, description, url: canonicalUrl(path) } };
}
