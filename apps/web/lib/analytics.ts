/**
 * The one way the marketing site sends GA4 events (fleet standard K2: a single
 * track() wrapper and a fixed event list). The tag itself is components/GoogleTag.tsx.
 *
 * Events, and the params each one carries:
 *
 *   cta_click            location, label            buttons in the hero and final CTA
 *   nav_click            location, label            header and footer links
 *   outbound_click       location, label, link_url  GitHub, npm, docs, example apps
 *   sponsor_click        app                        Sponsored by strip (app_store_click fires too)
 *   copy_command         location, command          every Copy button
 *   tab_select           group, label               example apps and package manager tabs
 *   faq_open             question                   FAQ item expanded
 *   section_view         section                    a section scrolled into view, once per page load
 *   app_store_click      store, link_url, link_text sent by GoogleTag on any store link (key event)
 *
 * Multi-page families (/templates, /sizes, /alternatives) and shared components:
 *
 *   template_view_variant  template, variant           variant picker on a template page
 *   template_copy_prompt   template                    "Copy prompt" on a template page (key event)
 *   template_copy_config   template                    "Copy assets.json" on a template page
 *   size_copy              size_name, location         SizeTable row copy, exports snippet, anchored pixel copy
 *   size_row_click         size_name, location, link_url  a SizeTable row linking to its size page
 *   alternative_cta        competitor, location, label CTA on an alternatives page (key event)
 *   alternative_compare_toggle  competitor, state      "Only differences" toggle on the feature table
 *   guide_cta_click        location, label, link_url  link into a docs guide
 *   related_click          location, label, link_url  RelatedLinks card
 *   toc_click              label, link_url            "On this page" link
 *   scroll_depth           percent (25/50/75/100)     once each per page view
 *   outbound_click         location, label, link_url  also sent automatically for any external
 *                                                     link without its own data-track
 *
 * Every hit also carries content_group, page_type and site_host, set by GoogleTag.
 * The full tracking plan, with the custom dimension for each param, is
 * docs/analytics/events.md at the repo root.
 *
 * Event-scoped custom dimensions for these params are registered on the GA4
 * property, so they show up in reports, not just in DebugView.
 */

export type AnalyticsEvent =
  | 'cta_click'
  | 'nav_click'
  | 'outbound_click'
  | 'sponsor_click'
  | 'copy_command'
  | 'tab_select'
  | 'faq_open'
  | 'section_view'
  | 'template_view_variant'
  | 'template_copy_prompt'
  | 'template_copy_config'
  | 'size_copy'
  | 'size_row_click'
  | 'alternative_cta'
  | 'alternative_compare_toggle'
  | 'guide_cta_click'
  | 'related_click'
  | 'toc_click'
  | 'scroll_depth'

type Params = Record<string, string | number | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function track(event: AnalyticsEvent, params: Params = {}): void {
  try {
    window.gtag?.('event', event, params)
  } catch {
    // Analytics must never break the page.
  }
}

/**
 * Attributes for a link or button that the delegated listener tracks on click:
 * `<a {...trackAttrs('cta_click', { location: 'hero', label: 'get_started' })}>`.
 */
export function trackAttrs(event: AnalyticsEvent, params: Params): Record<string, string> {
  const attrs: Record<string, string> = { 'data-track': event }
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) attrs[`data-track-${key.replace(/_/g, '-')}`] = String(value)
  }
  return attrs
}

export type PageType = 'home' | 'hub' | 'template' | 'size' | 'alternative' | 'other'

/**
 * The page group for a path on open-assets.dev. GoogleTag.tsx inlines the same
 * rule (it runs before React); keep the two in step.
 */
export function pageGroup(pathname: string): { content_group: string; page_type: PageType } {
  const [, section = '', rest = ''] = pathname.split('/')
  const family: Record<string, PageType> = { templates: 'template', sizes: 'size', alternatives: 'alternative' }
  if (!section) return { content_group: 'home', page_type: 'home' }
  const f = family[section]
  return { content_group: section, page_type: f ? (rest ? f : 'hub') : 'other' }
}
