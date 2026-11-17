import { notFound } from 'next/navigation'
import CompareTable from '@/components/CompareTable'
import Faq from '@/components/Faq'
import PageShell from '@/components/PageShell'
import RelatedLinks from '@/components/RelatedLinks'
import { competitors } from '@/data/competitors'
import { hubs } from '@/data/pages'
import { site } from '@/data/site'
import { trackAttrs } from '@/lib/analytics'
import { pageMetadata, staticSlugs } from '@/lib/pageMeta'

export const dynamicParams = false

export function generateStaticParams() {
  return staticSlugs(competitors)
}

function find(slug: string) {
  return competitors.find((c) => c.slug === slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = find((await params).slug)
  if (!c) return { robots: { index: false, follow: false } }
  return pageMetadata({ path: `/alternatives/${c.slug}`, title: c.title, description: c.description })
}

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = find((await params).slug)
  if (!c) notFound()
  const hub = hubs.alternatives
  const vendors = c.vendors ?? [{ name: c.name, url: c.vendorUrl }]
  return (
    <PageShell
      crumbs={[{ name: hub.label, path: hub.path }, { name: c.name, path: `${hub.path}/${c.slug}` }]}
      h1={c.h1}
      eyebrow={c.framing === 'alternative' ? 'Alternative' : 'Comparison'}
      lede={c.intro.map((p) => <p key={p}>{p}</p>)}
    >
      <section className="section" data-section="compare_table">
        <div className="container">
          <div className="cta-row">
            <a href={`${site.docs}/quick-start`} className="btn btn-primary" {...trackAttrs('alternative_cta', { competitor: c.slug, location: 'top', label: 'quick_start' })}>
              Try Open Assets free
            </a>
            {vendors.map((v) => (
              <a
                key={v.url}
                href={v.url}
                className="btn btn-ghost"
                rel="nofollow noopener"
                {...trackAttrs('outbound_click', { location: 'alternative_top', label: c.slug, link_url: v.url })}
              >
                Visit {v.name}
              </a>
            ))}
          </div>
          <CompareTable competitor={c.slug} names={vendors.map((v) => v.name)} rows={c.rows} />
          <p className="muted">
            Vendor details come from each vendor&apos;s own page as of {c.asOf}:{' '}
            {vendors.map((v, i) => (
              <span key={v.url}>
                {i > 0 && ', '}
                <a href={v.url} rel="nofollow noopener" {...trackAttrs('outbound_click', { location: 'alternative_source', label: c.slug, link_url: v.url })}>
                  {v.name}
                </a>
              </span>
            ))}
            . &quot;Not mentioned&quot; means the vendor page did not say, not that the feature is missing.
            {c.price && (
              <>
                {' '}Pricing: {c.price.text} (
                <a href={c.price.source} rel="nofollow noopener" {...trackAttrs('outbound_click', { location: 'alternative_price', label: c.slug, link_url: c.price.source })}>
                  source
                </a>
                ), their published rate as of {c.asOf}; confirm the current price on their site before buying.
              </>
            )}
          </p>
          <div className="page-block split">
            <div>
              <h2>When to choose {c.vendors ? 'each skill' : c.name}</h2>
              <ul className="page-list">{c.chooseThem.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h2>When to choose Open Assets</h2>
              <ul className="page-list">{c.chooseUs.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
          {c.guide && (
            <p className="page-block">
              <a href={c.guide.href} className="btn btn-ghost" {...trackAttrs('guide_cta_click', { location: 'alternative', label: c.guide.label })}>
                {c.guide.label}
              </a>
            </p>
          )}
          <p className="page-block">
            <a href={`${site.docs}/quick-start`} className="btn btn-primary" {...trackAttrs('alternative_cta', { competitor: c.slug, location: 'bottom', label: 'quick_start' })}>
              Get started with Open Assets
            </a>
          </p>
        </div>
      </section>
      <Faq items={c.faqs} />
      <RelatedLinks links={c.related} location="alternative" />
    </PageShell>
  )
}
