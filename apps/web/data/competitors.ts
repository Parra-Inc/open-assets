import type { Faq, PageSeo, RelatedLink } from './types'

/**
 * Alternatives and comparisons, one entry per /alternatives/<slug> (plan
 * section 6). Never invent prices or features: every claim about a vendor
 * comes from its own page, fetched on `asOf`. Leave `price` out when unclear.
 */
export interface CompetitorRow {
  feature: string
  us: string
  them: string
}

export interface CompetitorEntry extends PageSeo {
  name: string
  /** "alternative" for true substitutes, "vs" for tools Open Assets does not replace. */
  framing: 'alternative' | 'vs'
  vendorUrl: string
  /** ISO date the vendor pages were fetched. */
  asOf: string
  price?: { text: string; source: string }
  intro: string[]
  rows: CompetitorRow[]
  chooseThem: string[]
  chooseUs: string[]
  guide?: RelatedLink
  faqs: Faq[]
  related: RelatedLink[]
}

export const competitors: CompetitorEntry[] = []
