import { competitors } from './competitors'
import { site } from './site'
import { sizePages } from './size-pages'
import { templates } from './templates'
import type { PageSeo } from './types'

/**
 * The apex page registry. Sitemap, llms.txt, llms-full.txt, the footer and the
 * post-build SEO gate all read from here, so a page cannot ship unlisted.
 * Family streams add entries to templates.ts, size-pages.ts or competitors.ts;
 * nothing in this file needs editing for a new page.
 */

export type Family = 'templates' | 'sizes' | 'alternatives'

export interface Hub {
  family: Family
  path: string
  title: string
  description: string
  h1: string
  intro: string
  /** Short footer and breadcrumb label. */
  label: string
}

export const hubs: Record<Family, Hub> = {
  templates: {
    family: 'templates',
    path: '/templates',
    label: 'Templates',
    title: 'App Store screenshot and icon templates | Open Assets',
    description:
      'Free HTML templates for App Store screenshots, app icons and OG images. Copy the prompt or the assets.json config and render every size with Open Assets.',
    h1: 'App Store screenshot, icon and OG image templates',
    intro:
      'Each template is plain HTML and CSS that Open Assets renders at every store size. Copy the agent prompt or the assets.json collection to start from one.',
  },
  sizes: {
    family: 'sizes',
    path: '/sizes',
    label: 'Sizes',
    title: 'App Store, Google Play and OG image sizes | Open Assets',
    description:
      'Every App Store, Google Play and web image size in pixels, checked against the store docs, with the assets.json entry to render each one with Open Assets.',
    h1: 'App Store, Google Play and web image sizes',
    intro:
      'Pixel sizes for store screenshots, app icons, feature graphics, OG images and favicons, generated from the same list the Open Assets CLI uses.',
  },
  alternatives: {
    family: 'alternatives',
    path: '/alternatives',
    label: 'Alternatives',
    title: 'App Store screenshot tool alternatives | Open Assets',
    description:
      'How Open Assets compares with App Store screenshot builders, icon generators and OG image tools, with sourced feature tables and when to pick each one.',
    h1: 'Open Assets alternatives and comparisons',
    intro:
      'Honest comparisons with hosted screenshot builders, CLI tools and agent skills. Vendor details are taken from each vendor page on the date shown.',
  },
}

export interface RegisteredPage {
  path: string
  title: string
  description: string
  family: Family | 'home'
  /** Hub or entry. */
  kind: 'home' | 'hub' | 'entry'
  summary: string
  /** Paths relative to apps/web whose last commit is the sitemap lastmod. */
  sources: string[]
}

const familyEntries: Record<Family, PageSeo[]> = {
  templates,
  sizes: sizePages,
  alternatives: competitors,
}

const familySources: Record<Family, string> = {
  templates: 'data/templates.ts',
  sizes: 'data/size-pages.ts',
  alternatives: 'data/competitors.ts',
}

/** Families with at least one entry. An empty family's hub stays out of the sitemap and is noindex. */
export function liveFamilies(): Family[] {
  return (Object.keys(familyEntries) as Family[]).filter((f) => familyEntries[f].length > 0)
}

export function entriesFor(family: Family): PageSeo[] {
  return familyEntries[family]
}

export function registeredPages(): RegisteredPage[] {
  const pages: RegisteredPage[] = [
    {
      path: '/',
      title: site.title,
      description: site.description,
      family: 'home',
      kind: 'home',
      summary: 'what it is, examples and getting started',
      sources: ['app/page.tsx', 'data/content.ts', 'components'],
    },
  ]
  for (const family of liveFamilies()) {
    const hub = hubs[family]
    pages.push({
      path: hub.path,
      title: hub.title,
      description: hub.description,
      family,
      kind: 'hub',
      summary: hub.intro,
      sources: [familySources[family], `app/${family}`],
    })
    for (const entry of familyEntries[family]) {
      pages.push({
        path: `${hub.path}/${entry.slug}`,
        title: entry.title,
        description: entry.description,
        family,
        kind: 'entry',
        summary: entry.summary,
        sources: entry.sources ?? [familySources[family], `app/${family}`],
      })
    }
  }
  return pages
}
