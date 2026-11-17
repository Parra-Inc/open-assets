# Analytics tracking plan

Both sites send to GA4 property 561276147 (stream `G-W128DQBYJL`): open-assets.dev (`apps/web`) and docs.open-assets.dev (`apps/docs`). Each app has one `track()` wrapper (`apps/web/lib/analytics.ts`, `apps/docs/lib/analytics.ts`) and one delegated click listener (`apps/web/components/AnalyticsListeners.tsx`, `apps/docs/components/DocsAnalytics.tsx`), so pages tag elements with `data-track` attributes instead of wiring handlers.

## Page grouping (every hit)

Set by `components/GoogleTag.tsx` in both apps with `gtag('set', ...)` before `config`, and re-set on `pushState` / `popstate`, so `page_view` and every event carry them.

| Param | Values | Dimension |
|---|---|---|
| `content_group` | apex: `home`, `templates`, `sizes`, `alternatives`; docs: the first path segment (`guides`, `reference`, `agents`, `migrate`, `compare`, `ci`, ...) or `home` | built-in Content group |
| `page_type` | `home`, `hub`, `template`, `size`, `alternative`, `other` (apex); `docs_home`, `docs` (docs) | Page type (event) |
| `site_host` | `open-assets.dev`, `docs.open-assets.dev` | Site host (event); the built-in Hostname dimension also works |

## open-assets.dev events

| Event | Params | Fires | Key event |
|---|---|---|---|
| `page_view` | content_group, page_type, site_host | every page load (gtag config) | |
| `cta_click` | location, label | hero and final CTA buttons | |
| `nav_click` | location, label | header, footer, breadcrumb links | |
| `outbound_click` | location, label, link_url | tagged external links, and automatically any external link without its own tag | |
| `sponsor_click` | app | Sponsored by strip | |
| `copy_command` | location, command | install command copy buttons | |
| `tab_select` | group, label | example apps and package manager tabs | |
| `faq_open` | question | any FAQ item opened (home and every family page) | |
| `section_view` | section | each `[data-section]` scrolled into view, once | |
| `scroll_depth` | percent (25, 50, 75, 100) | once each per page view | |
| `guide_cta_click` | location, label | homepage guides grid, footer guide links, guide buttons on family pages, RelatedLinks cards pointing at docs guides | |
| `related_click` | location, label | RelatedLinks cards, hub cards, the template link on `/sizes/<slug>` (location `size_template`) | |
| `toc_click` | label | "On this page" links (template pages) | |
| `template_view_variant` | template, variant | variant picker on `/templates/<slug>` | |
| `template_copy_prompt` | template | "Copy prompt" on `/templates/<slug>` | yes |
| `template_copy_config` | template | "Copy assets.json" on `/templates/<slug>` | |
| `size_copy` | size_name, location | SizeTable row copy button (location `size_<slug>` or `sizes_hub`), exports snippet (`snippet_<slug>`, size_name is the page slug), per-size pixel copy on anchored sections such as `/sizes/iphone#iphone-6-9` (`anchor_<slug>`) | |
| `size_row_click` | size_name, location | SizeTable row linking to its size page | |
| `alternative_cta` | competitor, location, label | "Try Open Assets" buttons on `/alternatives/<slug>` | yes |
| `alternative_compare_toggle` | competitor, state | "Only show differences" toggle | |
| `app_store_click` | store, link_url, link_text | any App Store or Google Play link (GoogleTag) | yes |

There is no site search on the apex, so no `search_open`.

## docs.open-assets.dev events

| Event | Params | Fires | Key event |
|---|---|---|---|
| `page_view` | content_group, page_type, site_host | every page, including client-side navigations (GA history events) | |
| `copy_code` | language, page | copy button on any code block | yes |
| `copy_page` | page | "Copy Markdown" button | |
| `guide_cta_click` | location, label, link_url | in-body link into `/guides/*` from another page | |
| `related_click` | location, label, link_url | cards and footer previous / next links | |
| `apex_cta_click` | location, label | "open-assets.dev" CTA at the end of every page | |
| `outbound_click` | location, label, link_url | any external link | |
| `toc_click` | label | "On this page" links (desktop and popover) | |
| `scroll_depth` | percent | once each per page view, reset on navigation | |
| `app_store_click` | store, link_url, link_text | App Store or Google Play links (GoogleTag) | yes |

The docs have no feedback widget, so there is no `feedback` event.

## Custom dimensions on property 561276147 (event scope)

Existing before 2026-11-17: `command`, `question`, `location`, `group`, `store`, `app`, `section`, `label`.

Added 2026-11-17 via the Admin API: `page_type`, `site_host`, `template`, `variant`, `size_name`, `competitor`, `state`, `percent`, `language`, `page`, `link_url`.

Key events: `purchase`, `app_store_click` (existing); `template_copy_prompt`, `copy_code`, `alternative_cta` (added 2026-11-17).

## Adding an event

1. Add it to the `AnalyticsEvent` (or `DocsEvent`) union and the header comment of that app's `lib/analytics.ts`.
2. Tag the element with `trackAttrs(event, params)`, or call `track()` from a client component.
3. Register any new param as an event-scoped custom dimension, and add a row here.
