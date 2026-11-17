import { site } from '@/data/site'
import { trackAttrs } from '@/lib/analytics'
import JsonLd from './JsonLd'

export interface Crumb {
  name: string
  /** Site path. The last crumb is the current page and is not linked. */
  path: string
}

/** Visible breadcrumb trail plus its BreadcrumbList JSON-LD (standard C7), from one array. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail = [{ name: 'Home', path: '/' }, ...items]
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: trail.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: `${site.url}${c.path === '/' ? '' : c.path}`,
          })),
        }}
      />
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <ol>
          {trail.map((c, i) =>
            i === trail.length - 1 ? (
              <li key={c.path} aria-current="page">{c.name}</li>
            ) : (
              <li key={c.path}>
                <a href={c.path} {...trackAttrs('nav_click', { location: 'breadcrumb', label: c.name })}>{c.name}</a>
              </li>
            ),
          )}
        </ol>
      </nav>
    </>
  )
}
