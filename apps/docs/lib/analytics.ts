/**
 * The one way docs.open-assets.dev sends GA4 events (fleet standard K2: a
 * single track() wrapper and a fixed event list). The tag is
 * components/GoogleTag.tsx, which also sets content_group (the docs section:
 * guides, reference, agents, migrate, compare, ...), page_type and site_host
 * on every hit. components/DocsAnalytics.tsx sends the events below from one
 * delegated listener, so MDX content never needs tracking code.
 *
 *   copy_code         language, page             copy button on a code block (key event)
 *   copy_page         page                       "Copy Markdown" button at the top of a page
 *   guide_cta_click   location, label, link_url  link into a guide from another page
 *   related_click     location, label, link_url  cards and the previous / next page links
 *   apex_cta_click    location, label            "Open Assets home" CTA back to open-assets.dev
 *   outbound_click    location, label, link_url  any external link
 *   toc_click         label                      "On this page" link
 *   scroll_depth      percent (25/50/75/100)     once each per page view
 *   app_store_click   store, link_url, link_text sent by GoogleTag (key event)
 *
 * The full plan is docs/analytics/events.md at the repo root.
 */

export type DocsEvent =
  | 'copy_code'
  | 'copy_page'
  | 'guide_cta_click'
  | 'related_click'
  | 'apex_cta_click'
  | 'outbound_click'
  | 'toc_click'
  | 'scroll_depth';

type Params = Record<string, string | number | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: DocsEvent, params: Params = {}): void {
  try {
    window.gtag?.('event', event, params);
  } catch {
    // Analytics must never break the page.
  }
}

/** Attributes for an element the delegated listener tracks on click. */
export function trackAttrs(event: DocsEvent, params: Params): Record<string, string> {
  const attrs: Record<string, string> = { 'data-track': event };
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) attrs[`data-track-${key.replace(/_/g, '-')}`] = String(value);
  }
  return attrs;
}
