import type { Metadata, Viewport } from 'next';
import { GoogleTag } from '@/components/GoogleTag';
import { Provider } from '@/components/provider';
import { appName, siteUrl } from '@/lib/shared';
import './global.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // No canonical here (fleet standard A2): pages set their own.
  title: { default: 'Open Assets Docs', template: '%s | Open Assets Docs' },
  description:
    'Documentation for Open Assets, the open source CLI that renders App Store screenshots, app icons, OG images and favicons from HTML templates at every size.',
  applicationName: appName,
  icons: { icon: '/icon.png', apple: '/apple-touch-icon.png' },
  openGraph: { type: 'website', siteName: 'Open Assets Docs' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b081c' },
    { media: '(prefers-color-scheme: light)', color: '#fbfaff' },
  ],
};

// System fonts, as on open-assets.dev: no web font on the LCP path.
export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleTag />
      </head>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
