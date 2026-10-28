import type { MetadataRoute } from 'next'
import { site } from '@/data/site'
import { contentLastModified } from '@/lib/lastModified'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: contentLastModified(['app/page.tsx', 'data', 'components']),
      changeFrequency: 'monthly',
      priority: 1,
      images: [`${site.url}/opengraph-image.png`],
    },
  ]
}
