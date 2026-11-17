import { site } from '@/data/site'
import { trackAttrs } from '@/lib/analytics'
import { GitHubIcon } from './Icons'

/** Top nav. On the homepage the section links are in-page anchors; elsewhere they go back home. */
export default function SiteHeader({ home = false }: { home?: boolean }) {
  const base = home ? '' : '/'
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a href="/" className="brand" {...trackAttrs('nav_click', { location: 'header', label: 'logo' })}>
          <img src="/logo-64.png" alt="" width={28} height={28} />
          Open Assets
        </a>
        <nav aria-label="Primary" className="nav-links">
          <a href={`${base}#features`} {...trackAttrs('nav_click', { location: 'header', label: 'features' })}>Features</a>
          <a href={`${base}#examples`} {...trackAttrs('nav_click', { location: 'header', label: 'examples' })}>Examples</a>
          <a href={`${base}#get-started`} {...trackAttrs('nav_click', { location: 'header', label: 'get_started' })}>Get started</a>
          <a href={site.docs} {...trackAttrs('outbound_click', { location: 'header', label: 'docs' })}>Docs</a>
          <a href={site.github} className="btn btn-ghost btn-sm" {...trackAttrs('outbound_click', { location: 'header', label: 'github' })}>
            <GitHubIcon />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}
