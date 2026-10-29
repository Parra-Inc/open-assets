# SEO audit: open-assets.dev + docs.open-assets.dev
2026-10-29 · rank 19 / 20 · first crawl: 1/1 and 59/59 pages · GSC window 2026-10-01 to 2026-10-28 (no data yet)

## Verdict
Both sites are a day old, so nothing ranks yet and Google has indexed 0 of 60
submitted URLs. The foundation is in good shape, with one fleet-standard gap
that matters: the icon set. Both sites shipped a 32x32 `icon.png` and a 404 at
`/favicon.ico`, with no manifest. Google ignores any site icon under 48px, so
search results would have shown a generic globe. Fixed on both sites with the
fleet set (favicon.ico 16/32/48, icon 512, apple-icon 180, manifest with 192,
512 and maskable 512), rendered from `assets/icon.html` with the CLI itself.

## Numbers
| | Value | vs last audit |
| --- | --- | --- |
| Crawl errors / warnings (web) | 0 / 2 | first crawl |
| Crawl errors / warnings / notices (docs) | 0 / 0 / 24 | first crawl |
| Standard web (pass / partial / fail) | 23 / 1 / 5 | 16 / 2 / 10 (pre-domain) |
| Standard docs (pass / partial / fail) | 27 / 1 / 6 | first run |
| Clicks (28d, Google) | 0, no impressions | no property before |
| GSC sitemaps indexed | 0/1 web, 0/59 docs, 0 errors | |
| Worst LCP (mobile, median of 3) | 5.0s docs /examples | web 1.10s (10-28) |

## Standard
| Section | web | docs | Gaps |
| --- | --- | --- | --- |
| A. Site foundation | pass | pass | |
| B. Crawl and index | partial | fail | B4 one lastmod date (true: repo is 1 day old, dates are git-derived); B9 no IndexNow step after deploy |
| C. Structured data | pass | partial | docs C3 app entity without Offer, **fixed** |
| D. Open Graph | pass | pass | docs has per-page `/og/<slug>/image.png` |
| F. i18n | pass | pass | |
| H. Trust | manual | manual | no /about, /methodology (Parra org page covers it) |
| I. Speed headers | pass | pass | |
| J. App | fail | fail | J1 Smart App Banner, J6 AASA: n/a, Open Assets is not an app; App Store links are cross-promo |
| K. Analytics | pass | pass | |
| M. Plans | fail | fail | M1 growth plan, M2 page plans not written |
| Icons (web-icons.md, not graded by the script) | fail | fail | **fixed**, see below |

## All findings
| Finding | Pages | Sources | Verified live | Bucket |
| --- | --- | --- | --- | --- |
| `/favicon.ico` 404, largest icon 32px, no manifest | both sites | live curl + magick, web-icons.md | yes | Fix now |
| Homepage title 67 chars | 1 | crawl title.too.long | yes | Fix now |
| Docs JSON-LD app entity has no Offer | 59 | standard C3 | yes | Fix now |
| Docs /examples mobile LCP 5.0s | 1 | lighthouse x3 | yes | Fix now (partial) |
| Docs gallery `<img>` without dimensions | 8 | crawl notice | yes | Fix now (same edit) |
| No IndexNow submit after deploy | both | standard B9 | yes | Skipped |
| Not in Bing Webmaster Tools | both | bing get_sites | yes | Manual (dashboard) |
| Growth plan and page plans | both | standard M1/M2 | yes | Propose |
| Description too long | 3 | crawl notice | no, 156 to 157 rendered | Skipped |
| h1 then h3 in Steps | 3 | crawl notice | yes | Skipped |
| Homepage orphan | 1 | crawl page.orphan | n/a, one-page site | Skipped |
| Smart App Banner / AASA | both | standard J1/J6 | n/a | Skipped |

## Fix now (branch fix/seo-icons-manifest)
1. **Fleet icon set** on both sites.
   - Repo: `apps/{web,docs}/app/favicon.ico`, `icon.png`, `apple-icon.png`, `manifest.ts`; `apps/{web,docs}/public/icon-{192,512,maskable-512}.png`; `metadata.icons` removed from both `layout.tsx` (it overrode the file-convention links); old `public/apple-touch-icon.png` deleted.
   - Source: `assets/icon.html` rendered at 1024 via `open-assets render --width 1024`, then `generate-web-icons.sh` with `#0b081c`.
2. **Title under 60**: `apps/web/data/site.ts` to "Open Assets: App Store screenshots and app icons as code" (56).
3. **Docs Offer**: `apps/docs/app/(docs)/[[...slug]]/page.tsx` `about` SoftwareApplication gains `offers`, `operatingSystem`, `url`.
4. **Docs /examples LCP**: the LCP element is the first gallery card, a 2400px strip rendered at 378x144 and `loading="lazy"`. Now uses 800px `-card.webp` files (22 to 45 KB, from 111 to 268 KB) committed in `apps/web/public/img/examples`, first row eager with `fetchpriority="high"`, all with width/height. Local median 6.9s to 3.9s. The rest is render delay from about 650 KB of JS on simulated slow 4G (164 KB is gtag): an image LCP can't reach 2.5s without deferring GA, which is a fleet decision.

## Deliberately skipped
- `description.too.long` (3): crawler counts encoded entities; rendered lengths 157, 156, 156, and `check-content.mjs` already gates 150 to 160.
- `heading.skip` (3): Fumadocs `<Steps>` uses `###` under the page h1; notice-level, zero traffic.
- `page.orphan` on the homepage of a one-page site.
- J1/J6: Open Assets is not an App Store app.
- B4: lastmod is already git-derived per page (`lib/lastModified`); one date because every file landed 2026-10-28.
- B9: deploys are local `pnpm run deploy`; the nightly indexnow-sync sweep covers 60 static pages.

## Coverage gaps
- Bing: neither site is in Bing Webmaster Tools, so no Bing data. Import from GSC in the dashboard.
- GSC: zero impressions, so no insight types were run. Re-audit in 4 to 6 weeks.
- No CrUX field data; lab only.
- Web page speed not re-run today (1.10s on 2026-10-28, no layout change since).
