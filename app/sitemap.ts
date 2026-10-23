import type { MetadataRoute } from 'next';
import { canonicalUrl, publicPagePaths } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  // Only canonical public pages. Do not invent lastModified timestamps.
  return publicPagePaths.map(path => ({ url: canonicalUrl(path) }));
}
