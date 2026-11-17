/** Shared shapes for the multi-page families. Each family module exports a typed array. */

export interface Faq {
  q: string
  a: string
}

export interface RelatedLink {
  /** A site path (/sizes/og-image) or a full URL (docs guides). */
  href: string
  label: string
  description?: string
}

/** Fields every registered page needs, checked by scripts/seo-gate.mjs after build. */
export interface PageSeo {
  slug: string
  /** Under 60 characters, ends with "| Open Assets". */
  title: string
  /** 150 to 160 characters (fleet standard A4). */
  description: string
  h1: string
  /** One or two sentences used by llms.txt and the hub card. */
  summary: string
  /** Files whose last commit date is this page's sitemap lastmod (paths relative to apps/web). */
  sources?: string[]
}
