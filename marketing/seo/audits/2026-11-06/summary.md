## Verdict
open-assets.dev is a single page that is technically clean: titles are within length, OG and JSON-LD are present, and PageSpeed scores 100. No sitemap has been submitted to Google Search Console or Bing, though. Search demand is tiny: 3 clicks in 28 days, and the non-brand queries sit around position 68. The work now is getting the site discovered and building content, not fixing technical problems.

## Numbers
| Metric | Value |
|---|---|
| Pages crawled | 1/1 |
| Crawler errors / warnings | 0 / 1 (page.orphan, false positive) |
| GSC 28d (2026-10-06 to 11-02) | 3 clicks, 71 impr, CTR 4.2%, pos 16.7 |
| GSC 7d | 3 clicks, 78 impr, pos 17.0 |
| Brand vs non-brand | brand 0 impr; non-brand 9 impr, pos 68.6 |
| Striking distance | 1 (docs /reference/cli/add, 1 impr) |
| Lost queries | none (empty set) |
| Sitemaps submitted | Google 0, Bing 0 |
| Mobile LCP / CLS / TBT (lab) | 0.97s / 0 / 12.5ms |
| Standard | 25 pass, 1 partial, 3 fail, 12 n/a, 5 manual |

## Standard
| Section | Result | Non-pass ids + evidence |
|---|---|---|
| A | pass | A10 manual: confirm workers_dev=false / preview hosts noindex |
| B | partial/fail | B4 partial: one lastmod date (it comes from contentLastModified, so this is correct for one page). B5 manual: no HTML sitemap (n/a for one page). B9 fail: no IndexNow step in the deploy workflow |
| C | pass | none |
| D | pass | none |
| E | n/a | none |
| F | pass | none |
| G | n/a | none |
| H | manual | H3 n/a (no articles). H4 partial: no /about page |
| I | pass | none |
| J | n/a | not an app site; App Store links carry ct |
| K | pass | none |
| L | manual | L1: no prebuild SEO gates |
| M | fail | M1: no docs/seo/growth-plan. M2: 0 page plans. M4 pass |
| N | pass/n-a | none |

AEO: llms.txt and llms-full.txt both return 200 (llms-full is 5KB). robots.txt allows every AI bot with ai-train=yes, which was set on purpose in PR #14. JSON-LD has Organization, WebSite, SoftwareApplication and FAQPage (6 Q&As). One gap: the llms.txt Documentation link points at the GitHub README instead of docs.open-assets.dev.

## All findings
| Finding | Pages | Sources | Verified live | Bucket |
|---|---|---|---|---|
| No sitemap submitted to GSC or Bing | site | GSC health, sitemaps_list, Bing get_feeds | yes | Fix now |
| llms.txt doc link goes to GitHub, not the docs site | 1 | AEO check | yes (curl) | Fix now |
| No IndexNow on deploy | site | standard B9 | repo | Batch |
| No growth plan or page plans | site | standard M1/M2, GSC non-brand pos 68 | repo | Batch |
| page.orphan on homepage | 1 | crawler | n/a | Skipped |
| B4 single lastmod | 1 | standard | repo | Skipped |

## Fix now
1. Submit sitemaps (repo file /Users/ianmaccallum/Developer/Repos/open-assets/apps/web/app/sitemap.ts is already correct). In GSC, submit https://open-assets.dev/sitemap.xml and the docs sitemap, and add the same in Bing. Evidence: search-console.json site_health sitemaps.total=0; bing.json get_feeds [].
2. /Users/ianmaccallum/Developer/Repos/open-assets/apps/web/app/llms.txt: point Documentation at https://docs.open-assets.dev and list the key doc pages. Evidence: standard.json notes.

## Batch
- /Users/ianmaccallum/Developer/Repos/open-assets/.github/workflows: add an IndexNow submit step after deploy (B9).
- /Users/ianmaccallum/Developer/Repos/open-assets/docs/seo/growth-plan.md plus page-plans/: plan non-brand landing pages (M1/M2).

## Deliberately skipped
- page.orphan on https://open-assets.dev/: the homepage of a one-page site can't be linked from another page, so this is a false positive.
- B4 lastmod: sitemap.ts already uses contentLastModified, and one date for one URL is correct.
- AI training allowed (ai-train=yes): the user chose this in PR #14, so I didn't re-propose it.
- Speed: LCP is 0.97s and CLS is 0, so speed is not the constraint.
- Punted AEO items (multi-engine measurement, listing claims, name disambiguation): not re-proposed.

## Coverage gaps
- The GSC seo_audit types quick_wins, low_hanging_fruit, low_ctr and cannibalization were not run. The bing crawl_issues health check and inspection_inspect were not run either.
- Bing get_crawl_stats, get_blocked_urls, get_query_parameters, get_page_stats and get_link_counts were not run.
- get_rank_and_traffic_stats failed on MCP output validation. The rows it returned showed 0 impressions.
- Bing calls through search-console-mcp fail with InvalidUrl because the MCP passes sc-domain: to Bing. Direct bing-webmaster calls work.
- There is no CrUX field data, only lab numbers.
- docs.open-assets.dev was not crawled, but its GSC data is mixed into the domain property.
- I read the crawl before the fresh recheck finished.

