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
