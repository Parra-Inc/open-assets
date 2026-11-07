## Verdict
docs.open-assets.dev is technically clean. The crawler found 0 errors and 0 warnings, all 59 titles and descriptions are in range, mobile LCP is 1.7s, and llms.txt and JSON-LD are both in place. The real gap is visibility: the site has no Google Search Console access and isn't registered in Bing, so we can't measure traffic at all.

## Numbers
| Metric | Value |
|---|---|
| Pages crawled | 59/59 |
| Crawl errors / warnings | 0 / 0 |
| Title/desc out of range (rendered) | 0 of 59 |
| GSC clicks 28d (2026-10-07..11-03) | unavailable (permission denied) |
| Striking distance | unavailable |
| Bing | site not registered |
| Mobile perf / LCP / CLS / TBT | 96 / 1.7s / 0 / 38ms (lab) |
| Standard | 30 pass, 0 partial, 4 fail, 7 n/a, 5 manual |

## Standard
| Section | Result | Non-pass rows |
|---|---|---|
| A | pass | A10 manual: no indexable staging host; confirm workers_dev/preview noindex by hand |
| B | fail | B4 FAIL: 1 lastmod date (2026-10-28) on 100% of URLs. B9 FAIL: no IndexNow step in publish.yml. B5 manual: n/a for docs (the sidebar links all pages) |
| C-G | pass | - |
| H | manual | H3/H4: no author or trust pages; n/a for a docs site |
| I | pass | - |
| J | n/a | doesn't market its own app; J4 pass (App Store link carries ct) |
| K | pass | GA4 on 16/16, consent default set |
| L | manual | L1: no prebuild SEO gate (graded partial) |
| M | fail | M1 FAIL: no growth plan. M2 FAIL: 0 page plans. M4 pass |
| N | pass | - |

AEO: llms.txt and llms-full.txt both return 200 and contain useful per-page summaries. TechArticle, BreadcrumbList, SoftwareApplication and Organization schema appear on every page family. robots.txt allows every AI agent, including training bots (ai-train=yes), which goes against the fleet block-training policy.

## All findings
| Finding | Pages | Sources | Verified live | Bucket |
|---|---|---|---|---|
| No GSC access, not in Bing | site | search-console, bing | yes (API errors) | Fix now |
| Sitemap lastmod is one date | 59 | standard B4 | yes | Fix now |
| No IndexNow after deploy | site | standard B9 | repo | Fix now |
| Training bots allowed | site | AEO, live robots.txt | yes | Batch |
| No growth plan or page plans | n/a | standard M1/M2 | repo | Batch |

## Fix now
1. **Search Console and Bing access** (unlocated, account config): grant the service account access to sc-domain:docs.open-assets.dev and add the site in Bing Webmaster. Evidence: search-console.json, bing.json.
2. **apps/docs/app/sitemap.ts**: set a per-page lastModified from git history. Evidence: standard.json B4.
3. **.github/workflows/publish.yml**: add a post-deploy IndexNow submit step. Evidence: standard.json B9.

## Batch
- **apps/docs/app/robots.txt/route.ts**: set ai-train=no and Disallow the training crawlers, keeping the citation and user bots allowed.
- **docs/seo/growth-plan.md** and **docs/seo/page-plans/**: write them.

## Deliberately skipped
- H3/H4 author and trust pages: not relevant to a technical docs site.
- B5 HTML sitemap: the docs sidebar already links all 59 pages.
- Section J smart banner and AASA: the site doesn't market its own iOS app.
- Speed: lab metrics are all well under threshold, so speed is not the constraint.
- The remaining GSC calls (health, sitemaps, eight seo_audit types, inspection): skipped because they would hit the same permission error.

## Coverage gaps
- No Google data: permission denied for both the sc-domain and the URL-prefix property.
- No Bing data: the site is missing from get_sites, so the empty crawl-issue and feed results don't show it is healthy. get_rank_and_traffic_stats failed with a validation error.
- No CrUX field data.
- audit_report was read right after the 59-page recheck was queued.
- The search-console-mcp server is v2.0.2; v2.1.4 is available.
