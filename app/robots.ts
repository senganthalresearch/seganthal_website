import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  // Allow crawlers to read noindex on auth/private HTML pages. Authentication
  // protects private data; robots.txt is not a security control.
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: `${SITE_URL}/sitemap.xml` };
}
