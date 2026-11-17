import { entriesFor, hubs, type Family } from '@/data/pages'
import { trackAttrs } from '@/lib/analytics'
import PageShell from './PageShell'
import RelatedLinks from './RelatedLinks'
import SizeTable from './SizeTable'
import { docsGuides } from '@/data/content'

/** The /templates, /sizes and /alternatives hub, rendered from the family's data module. */
export default function HubPage({ family }: { family: Family }) {
  const hub = hubs[family]
  const entries = entriesFor(family)
  return (
    <PageShell crumbs={[{ name: hub.label, path: hub.path }]} h1={hub.h1} lede={<p>{hub.intro}</p>}>
      <section className="section" data-section={`${family}_list`}>
        <div className="container">
          {entries.length === 0 ? (
            <p className="muted">Pages are on the way. The docs guides below cover every asset today.</p>
          ) : (
            <ul className="related-grid">
              {entries.map((e) => (
                <li key={e.slug}>
                  <a
                    href={`${hub.path}/${e.slug}`}
                    className="card related-card"
                    {...trackAttrs('related_click', { location: `${family}_hub`, label: e.slug })}
                  >
                    <span className="related-label">{e.h1}</span>
                    <span className="muted">{e.summary}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {family === 'sizes' && (
            <div className="page-block">
              <h2>Every size the CLI knows</h2>
              <SizeTable location="sizes_hub" caption="Export sizes from lib/sizes.mjs" />
            </div>
          )}
        </div>
      </section>
      <RelatedLinks
        location={`${family}_hub`}
        title="Guides"
        links={docsGuides.map((g) => ({ href: g.href, label: g.title, description: g.body }))}
      />
    </PageShell>
  )
}
