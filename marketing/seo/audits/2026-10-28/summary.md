# SEO audit: open-assets.dev
2026-10-28 · unranked (not in indexnow-seo) · 0/1 pages crawled · no GSC window (no property)

Audited live at `https://open-assets-web-production.ian-b42.workers.dev` (deployed
the same day). The canonical origin `https://open-assets.dev` is not purchased yet.

## Verdict
The site went live today, so there is no search data and the crawler has never
seen it. The audit is a foundation check, and the foundation is now in good
shape. Seven standard gaps and a slow mobile LCP were fixed and verified live:
the standard went from 9 to 16 passes and mobile Lighthouse from 91 to 100 (LCP
3.44s to 1.10s). Every App Store link now carries `pt` plus an `oa_h_*` campaign
token. Six of the remaining ten fails can't be fixed until `open-assets.dev` is
bought and moved to Cloudflare.

## Numbers
| | Value | vs last audit |
| --- | --- | --- |
| Standard (pass / partial / fail), before fixes | 9 / 4 / 15 | |
| Standard (pass / partial / fail), after fixes | 16 / 2 / 10 | |
| Mobile Lighthouse score (median of 3) | 91 to 100 | |
| Mobile LCP (median of 3) | 3.44s to 1.10s, / | |
| CLS / TBT | 0.000 / 0.04s | |
| App Store links with `pt` + `ct` | 3/8 to 8/8 | |
| Clicks (28d) | no data: no GSC property | |

First run, so "vs last audit" is blank.

## Standard
| Section | Result | Gaps |
| --- | --- | --- |
| A. Site foundation | fail | A3 fail (canonical points at open-assets.dev, not live yet). A4 fixed (214 to 156 chars) |
| B. Crawl and index | fail | B3 fail (sitemap URL on open-assets.dev); B9, B11 fail (IndexNow, needs domain); B4 partial (one URL, one date); B8, B5 manual. B1, B6, B7 fixed |
| C. Structured data | pass | C2 fixed (Organization + WebSite added) |
| D. Social cards | fail | D1 fail: card is now a 1200x630 file-convention image, but its absolute URL is on open-assets.dev, which doesn't resolve yet |
| E. Page families | n/a | single page |
| F. i18n | pass | |
| G. Internal linking | n/a | single page |
| H. Content and trust | manual | H3, H4 judged not applicable (see skipped) |
| I. Performance | pass | I2 fixed (`_headers`: immutable hashed assets, security headers) |
| J. Search visit to install | fail | J4 fixed (8/8 links carry pt + ct). J1, J6 fail but don't apply: this site has no iOS app of its own |
| K. Measurement | fail | K1: no GA4 |
| L. Build checks | manual | L1: no prebuild gate |
| M. Operating loop | fail | M1, M2 fail (no growth plan, no page plans); M4 partial until this directory is committed |

## All findings
| Finding | Pages | Sources | Verified live | Bucket |
| --- | --- | --- | --- | --- |
| App Store links missing `pt`/`ct` (5 showcase links bare; 3 dev-app links with a site-wide `ct`) | 1 | standard J4 | yes, curl of live hrefs | Fixed |
| Mobile LCP 3.44s (web fonts 87 KB, 86 KB logo at 28px, render-blocking CSS) | 1 | Lighthouse | yes, 3 runs | Fixed |
| Meta description 214 chars | 1 | standard A4 | yes | Fixed |
| robots.txt lists 0/25 fleet AI crawlers | 1 | standard B1 | yes | Fixed |
| llms-full.txt 404; llms.txt a static file | 1 | standard B6, B7 | yes | Fixed |
| No Organization / WebSite JSON-LD | 1 | standard C2 | yes | Fixed |
| No cache or security headers | 1 | standard I2 | yes, curl -I | Fixed |
| Root layout set the canonical (404 page inherited it) | 1 | standard A2 rule, live 404 HTML | yes | Fixed |
| Showcase images without width/height | 1 | Lighthouse unsized-images | yes | Fixed |
| Canonical, sitemap and og:image on open-assets.dev, which doesn't resolve | 1 | standard A3, B3, D1 | yes | Blocked on domain |
| Not registered in indexnow-sync, no IndexNow key, no submit on deploy | site | standard B8, B9, B11 | yes | Blocked on domain |
| Not in GSC or Bing | site | sites_list, get_sites | yes | Blocked on domain |
| No GA4 | 1 | standard K1 | yes | Batch |
| No growth plan or page plans | site | standard M1, M2 | yes | Batch |
| No Smart App Banner, no AASA | 1 | standard J1, J6 | yes | Skipped |

## Fix now (done, verified on the live deploy)
1. **App Store campaign tokens** (8 links): installs from this site were invisible in App Analytics.
   - Repo: `apps/web/lib/campaign.ts`, `apps/web/app/page.tsx`, `apps/web/lib/llms.ts`
   - Fix: every App Store link is `pt=128415653&ct=oa_h_{placement}&mt=8` plus UTM. Placements: `oa_h_showcase` (Examples), `oa_h_dev_apps` (developer app cards), `oa_h_llms` (llms-full.txt). The `oa_` prefix keeps these from reading as Tax Days' or Skimmer's own homepage (`w_h_*`). All 8 apps are Parra LLC (artistId 1865552317), so one provider token covers them.
   - Evidence: `verify.json` → J4 partial to pass, "8/8 App Store links carry ct"
2. **Mobile LCP**: 3.44s to 1.10s.
   - Repo: `apps/web/app/layout.tsx` (web fonts removed), `apps/web/app/globals.css` (system font stack), `apps/web/next.config.ts` (`inlineCss`), `apps/web/app/page.tsx` (64px logo, lazy below-fold icons, sized images)
   - Evidence: `verify.json` → pagespeed before/after
3. **A4, B1, B6, B7, C2, I2**: one edit each.
   - Repo: `apps/web/data/site.ts`, `apps/web/app/robots.ts`, `apps/web/app/llms.txt/route.ts`, `apps/web/app/llms-full.txt/route.ts`, `apps/web/app/page.tsx`, `apps/web/public/_headers`

## Blocked on buying open-assets.dev
1. Buy the domain and add the zone to Cloudflare. Then uncomment the routes in `apps/web/wrangler.jsonc`, set `workers_dev: false`, and deploy. That clears A3, B3, D1.
2. Register in `indexnow-sync/indexnow.config.json` and commit the key to `apps/web/public/<32-hex>.txt` (B8, B11); add a post-deploy submit (B9).
3. Add `sc-domain:open-assets.dev` in Search Console and the site in Bing, and submit the sitemap to both (B12).
4. Re-run `/audit seo open-assets` after the first crawl, so layers 1 and 2 have data.

## Batch
- **GA4 (K1)**: needed to count clicks on the developer app cards on the web side (App Analytics counts the installs). Needs a new GA4 property; standard says inject at the edge with Consent Mode, which on this static site means adding a worker script. Repo: `apps/web/wrangler.jsonc` + a new worker entry.
- **Growth plan and page plans (M1, M2)**: `docs/seo/growth-plan.md`. The obvious next pages are "App Store screenshot sizes" reference and "vs" pages (Fastlane frameit, AppLaunchpad, Screenshots.pro). Content work, so not started.
- **Description length gate (L1)**: a prebuild check that `site.description` is 150 to 160 chars. Repo: `apps/web/package.json` + a script.

## Deliberately skipped
- **J1 Smart App Banner, J6 AASA**: Open Assets is an npm package, not an iOS app. The App Store links on the page cross-promote other Parra apps, and a banner would advertise one of them on every visit. Not applicable.
- **B4 one lastmod date**: the sitemap has one URL, so one date is correct. It comes from git (`lib/lastModified.ts`), not the build time.
- **B5 HTML sitemap, H3 author pages, H4 trust pages**: a one-page open source tool page. The GitHub repo is the trust signal.
- **Lighthouse "reduce unused JavaScript" (450ms)**: Next App Router runtime, with TBT at 0.04s. Not the constraint at LCP 1.10s.

## Coverage gaps
- Layer 1 (indexnow-seo crawl): no data. The site isn't registered and can't be until the domain exists.
- Layer 2 (Search Console) and 2b (Bing Webmaster): no property for the domain. No impressions, queries, sitemap status or crawl issues.
- Page speed is local lab only. No PSI/CrUX call: a same-day site has no field data.
- og:image loading (D1) could not be checked end to end, because the absolute URL is on the unpurchased domain. The file itself serves 200 at `/opengraph-image.png` on workers.dev.

## Outcome
Verified on the live deploy (version `57dce14e`) by re-running `seo-standard.mjs` and
`lighthouse.mjs`: standard 9/4/15 to 16/2/10, mobile LCP 3.44s to 1.10s, App Store
links with campaign tokens 3/8 to 8/8. Raw before/after in `verify.json`.
