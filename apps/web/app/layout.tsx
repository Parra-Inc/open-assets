import type { Metadata, Viewport } from 'next'
import { GoogleTag } from '@/components/GoogleTag'
import { site } from '@/data/site'
import './globals.css'


export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  applicationName: site.name,
  // No canonical here (standard A2): the 404 page would inherit it. The card
  // images come from app/opengraph-image.png and app/twitter-image.png, and the
  // icon links from app/favicon.ico, icon.png and apple-icon.png (no `icons`
  // key, it would replace those file-convention links).
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { themeColor: '#0b081c', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <GoogleTag />
      </head>
      <body>{children}</body>
    </html>
  )
}
