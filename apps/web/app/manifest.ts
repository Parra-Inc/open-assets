import type { MetadataRoute } from 'next'
import { site } from '@/data/site'

export const dynamic = 'force-static'

// Icons are generated from assets/icon.html (rendered at 1024 by the CLI) with
// the seo skill's generate-web-icons.sh, the same set as every fleet site.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0b081c',
    theme_color: '#0b081c',
    categories: ['developer', 'design', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/opengraph-image.png', sizes: '1200x630', type: 'image/png', form_factor: 'wide' },
    ],
  }
}
