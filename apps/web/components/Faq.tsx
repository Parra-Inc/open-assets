import type { Faq as FaqItem } from '@/data/types'
import JsonLd from './JsonLd'

/**
 * FAQ list as native details/summary plus FAQPage JSON-LD from the same array,
 * so the two never drift. faq_open is sent by AnalyticsListeners on toggle.
 */
export default function Faq({
  items,
  title = 'Frequently asked questions',
  section = 'faq',
}: {
  items: FaqItem[]
  title?: string
  section?: string
}) {
  if (items.length === 0) return null
  return (
    <section className="section" data-section={section} aria-labelledby={`${section}-title`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <div className="container faq">
        <div className="section-head">
          <p className="eyebrow">FAQ</p>
          <h2 id={`${section}-title`}>{title}</h2>
        </div>
        <div className="faq-list">
          {items.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
