import type { Metadata } from 'next'
import { site } from '@/data/site'

/**
 * Metadata for a non-home apex page. A page-level openGraph replaces the
 * layout's object (standard D2), so every field is repeated here.
 */
/** Site-wide share card (app/opengraph-image.png). A page-level openGraph drops the layout's image, so it is set again here. */
const DEFAULT_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'Open Assets: App Store screenshots, icons and OG images rendered from HTML templates',
}

export function pageMetadata({
  path,
  title,
  description,
  index = true,
}: {
  path: string
  title: string
  description: string
  index?: boolean
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, siteName: site.name, title, description, images: [DEFAULT_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_IMAGE] },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
  }
}

/** Rendered by a family with no entries yet, because `output: 'export'` rejects an empty list. It 404s and is never linked. */
export const PLACEHOLDER_SLUG = '_none'

/** generateStaticParams for a family route: each entry's slug, or the placeholder while the family is empty. */
export function staticSlugs(entries: { slug: string }[]): { slug: string }[] {
  return entries.length > 0 ? entries.map((e) => ({ slug: e.slug })) : [{ slug: PLACEHOLDER_SLUG }]
}
