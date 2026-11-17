import type { MetadataRoute } from 'next'
import { registeredPages } from '@/data/pages'
import { site } from '@/data/site'
import { contentLastModified } from '@/lib/lastModified'

export const dynamic = 'force-static'

/** Every registered page (data/pages.ts), so a new family entry is listed with no edit here. */
export default function sitemap(): MetadataRoute.Sitemap {
  return registeredPages().map((p) => ({
    url: p.path === '/' ? site.url : `${site.url}${p.path}`,
    lastModified: contentLastModified(p.sources),
    changeFrequency: 'monthly',
    priority: p.kind === 'home' ? 1 : p.kind === 'hub' ? 0.8 : 0.6,
    ...(p.kind === 'home' ? { images: [`${site.url}/opengraph-image.png`] } : {}),
  }))
}
