import type { Metadata } from 'next'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import UnsubscribeConfirm from './UnsubscribeConfirm'

// Linked from every newsletter email. Not in the sitemap, and noindex.
export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Stop receiving the Open Assets newsletter.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/newsletter/unsubscribe' },
}

export default function UnsubscribePage() {
  return (
    <>
      <SiteHeader />
      <main className="container unsubscribe-page">
        <UnsubscribeConfirm />
      </main>
      <SiteFooter />
    </>
  )
}
