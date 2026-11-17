import type { RelatedLink } from '@/data/types'
import { site } from '@/data/site'
import { trackAttrs } from '@/lib/analytics'

/**
 * Cards linking to related pages. Links into the docs guides send
 * guide_cta_click; everything else sends related_click.
 */
export default function RelatedLinks({
  links,
  location,
  title = 'Related',
}: {
  links: RelatedLink[]
  /** Where the block sits, for the event's location param. */
  location: string
  title?: string
}) {
  if (links.length === 0) return null
  return (
    <section className="section related" data-section={`related_${location}`} aria-labelledby={`related-${location}`}>
      <div className="container">
        <h2 id={`related-${location}`}>{title}</h2>
        <ul className="related-grid">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="card related-card"
                {...trackAttrs(l.href.startsWith(`${site.docs}/guides`) ? 'guide_cta_click' : 'related_click', {
                  location,
                  label: l.label,
                })}
              >
                <span className="related-label">{l.label}</span>
                {l.description && <span className="muted">{l.description}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
