import type { ReactNode } from 'react'
import Breadcrumbs, { type Crumb } from './Breadcrumbs'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

/** Header, breadcrumbs, a page head (H1 and lede) and the footer for every non-home apex page. */
export default function PageShell({
  crumbs,
  h1,
  lede,
  eyebrow,
  children,
}: {
  crumbs: Crumb[]
  h1: string
  lede?: ReactNode
  eyebrow?: string
  children: ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <div className="container page-head" data-section="page_head">
          <Breadcrumbs items={crumbs} />
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{h1}</h1>
          {lede && <div className="lede">{lede}</div>}
        </div>
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
