import { notFound } from 'next/navigation'
import Faq from '@/components/Faq'
import PageShell from '@/components/PageShell'
import RelatedLinks from '@/components/RelatedLinks'
import SizeTable from '@/components/SizeTable'
import { hubs } from '@/data/pages'
import { sizePages } from '@/data/size-pages'
import { templates } from '@/data/templates'
import { trackAttrs } from '@/lib/analytics'
import { pageMetadata, staticSlugs } from '@/lib/pageMeta'
import { exportEntry, sizeByName } from '@/lib/sizes'
import CopyButton from '@/components/CopyButton'

export const dynamicParams = false

export function generateStaticParams() {
  return staticSlugs(sizePages)
}

function find(slug: string) {
  return sizePages.find((p) => p.slug === slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = find((await params).slug)
  if (!p) return { robots: { index: false, follow: false } }
  return pageMetadata({ path: `/sizes/${p.slug}`, title: p.title, description: p.description })
}

export default async function SizePage({ params }: { params: Promise<{ slug: string }> }) {
  const p = find((await params).slug)
  if (!p) notFound()
  const hub = hubs.sizes
  const snippet = `"exports": [\n  ${p.sizeNames.map((n) => exportEntry(sizeByName(n))).join(',\n  ')}\n]`
  return (
    <PageShell
      crumbs={[{ name: hub.label, path: hub.path }, { name: p.name, path: `${hub.path}/${p.slug}` }]}
      h1={p.h1}
      lede={<p>{p.answer}</p>}
    >
      <section className="section" data-section="size_table">
        <div className="container">
          <SizeTable names={p.sizeNames} location={`size_${p.slug}`} />
          <p className="muted">
            Last verified {p.lastVerified} against{' '}
            {p.references.map((r, i) => (
              <span key={r.url}>
                {i > 0 && ', '}
                <a href={r.url}>{r.label}</a>
              </span>
            ))}
            .
          </p>
          {p.anchors?.map((a) => {
            const s = sizeByName(a.sizeName)
            const px = `${s.width}×${s.height}`
            return (
              <div className="page-block" id={a.id} key={a.id}>
                <h2>
                  {a.heading}: {px}
                </h2>
                <p>{a.body}</p>
                <CopyButton
                  text={px}
                  event="size_copy"
                  params={{ size_name: s.name, location: `anchor_${p.slug}` }}
                  label={`Copy ${px}`}
                  className="btn btn-ghost btn-sm"
                />
              </div>
            )
          })}
          {p.notes.length > 0 && (
            <div className="page-block">
              <h2>Rules to know</h2>
              <ul className="page-list">
                {p.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          )}
          <div className="page-block">
            <h2>Render every size with Open Assets</h2>
            <pre className="code-block"><code>{snippet}</code></pre>
            <CopyButton text={snippet} event="size_copy" params={{ size_name: p.slug, location: `snippet_${p.slug}` }} label="Copy exports" className="btn btn-ghost btn-sm" />
          </div>
          {p.guide && (
            <p className="page-block">
              <a href={p.guide.href} className="btn btn-primary" {...trackAttrs('guide_cta_click', { location: 'size', label: p.guide.label })}>
                {p.guide.label}
              </a>
            </p>
          )}
          {p.template && (
            <p className="page-block">
              {templates.some((t) => t.slug === p.template!.slug) ? (
                <a
                  href={`/templates/${p.template.slug}`}
                  className="btn btn-ghost"
                  {...trackAttrs('related_click', { location: 'size_template', label: p.template.label })}
                >
                  {p.template.label}
                </a>
              ) : (
                <a
                  href={p.template.fallback.href}
                  className="btn btn-ghost"
                  {...trackAttrs('related_click', { location: 'size_template', label: p.template.fallback.label })}
                >
                  {p.template.fallback.label}
                </a>
              )}
            </p>
          )}
        </div>
      </section>
      <Faq items={p.faqs} />
      <RelatedLinks links={p.related} location="size" />
    </PageShell>
  )
}
