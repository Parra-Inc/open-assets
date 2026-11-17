import type { Faq, PageSeo, RelatedLink } from './types'

/**
 * Size reference pages, one entry per /sizes/<slug> (plan section 6). The table
 * itself always comes from lib/sizes.mjs, so these pages match the CLI.
 */
export interface SizePageEntry extends PageSeo {
  name: string
  /** The direct answer, first sentence on the page, with the main size. */
  answer: string
  /** Size names from lib/sizes.mjs shown in the table, in order. */
  sizeNames: string[]
  /** ISO date the numbers were last checked against the store docs. */
  lastVerified: string
  /** Store documentation the sizes were checked against. */
  references: { label: string; url: string }[]
  /** Format, file size and platform rules, one per bullet. */
  notes: string[]
  guide?: RelatedLink
  faqs: Faq[]
  related: RelatedLink[]
}

export const sizePages: SizePageEntry[] = []
