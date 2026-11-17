import type { Faq, PageSeo, RelatedLink } from './types'

/**
 * Template gallery, one entry per /templates/<slug> page (plan section 5).
 * Add an entry plus its images under public/img/templates/<slug>/; the hub,
 * sitemap, llms files, footer and SEO gate pick it up with no other edits.
 */
export interface TemplateVariant {
  key: string
  label: string
  /** Path under public/, for example /img/templates/<slug>/dark.webp. */
  image: string
  width: number
  height: number
  alt: string
}

export interface TemplateEntry extends PageSeo {
  /** Short display name, for cards and breadcrumbs. */
  name: string
  category: 'screenshots' | 'icons' | 'og-images' | 'banners'
  /** Intro paragraphs under the H1. */
  intro: string[]
  /** Size names from lib/sizes.mjs this template renders at. */
  sizes: string[]
  variants: TemplateVariant[]
  /** A prompt for a coding agent that recreates this template. */
  prompt: string
  /** The assets.json collection for this template, as pretty-printed JSON. */
  config: string
  /** Docs guide this template belongs to. */
  guide?: RelatedLink
  faqs: Faq[]
  related: RelatedLink[]
}

export const templates: TemplateEntry[] = []
