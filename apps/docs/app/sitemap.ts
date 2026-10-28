import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { pageLastModified } from '@/lib/lastModified';
import { getPageImageUrl, siteUrl } from '@/lib/shared';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: `${siteUrl}${page.url === '/' ? '' : page.url}`,
    lastModified: pageLastModified(page.path).toISOString().slice(0, 10),
    changeFrequency: 'monthly',
    priority: page.slugs.length === 0 ? 1 : 0.7,
    images: [`${siteUrl}${getPageImageUrl(page).url}`],
  }));
}
