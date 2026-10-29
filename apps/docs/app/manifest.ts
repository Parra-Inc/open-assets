import type { MetadataRoute } from 'next';
import { appName } from '@/lib/shared';

export const dynamic = 'force-static';

// Same icon set as apps/web, generated from assets/icon.html.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appName} Docs`,
    short_name: 'OA Docs',
    description:
      'Documentation for Open Assets, the open source CLI that renders App Store screenshots, app icons, OG images and favicons from HTML templates.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b081c',
    theme_color: '#0b081c',
    categories: ['developer', 'design'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
