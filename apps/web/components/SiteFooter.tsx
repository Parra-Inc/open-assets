import { docsGuides } from '@/data/content'
import { hubs, liveFamilies } from '@/data/pages'
import { site } from '@/data/site'
import { trackAttrs } from '@/lib/analytics'
import NewsletterForm, { NEWSLETTER_DESCRIPTION, NEWSLETTER_TITLE } from '@/components/NewsletterForm'

/** Footer for every apex page. Hub links appear as soon as a family has an entry. */
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a href="/" className="brand" {...trackAttrs('nav_click', { location: 'footer', label: 'logo' })}>
            <img src="/logo-64.png" alt="" width={22} height={22} loading="lazy" />
            Open Assets
          </a>
          <div className="footer-newsletter">
            <p className="footer-newsletter-title">{NEWSLETTER_TITLE}</p>
            <p className="muted">{NEWSLETTER_DESCRIPTION}</p>
            <NewsletterForm source="footer" size="sm" />
          </div>
        </div>
        <nav aria-label="Footer" className="footer-links">
          {liveFamilies().map((f) => (
            <a key={f} href={hubs[f].path} {...trackAttrs('nav_click', { location: 'footer', label: f })}>
              {hubs[f].label}
            </a>
          ))}
          <a {...trackAttrs('outbound_click', { location: 'footer', label: 'docs' })} href={site.docs}>Docs</a>
          {docsGuides.slice(0, 3).map((g) => (
            <a key={g.href} href={g.href} {...trackAttrs('guide_cta_click', { location: 'footer', label: g.key })}>
              {g.short}
            </a>
          ))}
          <a {...trackAttrs('outbound_click', { location: 'footer', label: 'github' })} href={site.github}>GitHub</a>
          <a {...trackAttrs('outbound_click', { location: 'footer', label: 'npm' })} href={site.npm}>npm</a>
          <a {...trackAttrs('nav_click', { location: 'footer', label: 'llms_txt' })} href="/llms.txt">llms.txt</a>
        </nav>
        <p className="muted">MIT License · <a {...trackAttrs('outbound_click', { location: 'footer', label: 'parra' })} href="https://parra.io">A Parra product</a></p>
      </div>
    </footer>
  )
}
