---
title: Open Assets error audit
date: 2026-11-20
window: 2026-11-18T03:04:00Z to 2026-11-21T03:04:00Z (3d)
workers: open-assets-web-production, open-assets-docs-production
layers: invocations, logs, zone, grafana
layers_failed: none
layer2_warnings: none
logs_truncated: false
branch: chore/git-clean-2026-11-17 (NOT main)
data: ./2026-11-20/
---

# Open Assets error audit

**Verdict.** Production is clean. Both deployed Workers took 0 layer 1 errors (0 of
~2,775 invocations), there were 0 error-level log events at layer 2 (exact,
unsampled, no `!!!` warning), 0 edge 5xx on open-assets.dev, and 0 Grafana alerts
firing for this app. The only non-zero number is the client `fetch` error rate in
traces (web 807 of 1,386 = 58.23%, docs 444 of 1,202 = 36.94%), and every sampled
error span is a 404 (a few 405s) for a path that does not exist, overwhelmingly
vulnerability-scanner and crawler probes (`/app/.env`, `/.htpasswd`,
`/actuator/env`, `/wp-config.txt`, and ~300 more). That is the static-assets
Worker correctly refusing paths with no asset, counted as a client-span "error"
by spanmetrics even though nothing threw and the user got the right status.
Nothing to fix. (Audited on branch `chore/git-clean-2026-11-17`, not main.)

## Numbers

| | This run | Last run (2026-11-16) |
| --- | --- | --- |
| Worker errors (layer 1, deployed versions) | 0 | 0 |
| Error rate (deployed versions) | 0% of ~2,775 (web GET 1,375 + docs GET 1,194 + HEAD/POST) | 0% of 3,626 |
| Versionless failures (local dev, excluded) | 0 | 0 |
| Distinct error groups (layer 2) | 0 | 0 |
| Log events (layer 2) | 0 error-level (exact, unsampled; web 1,391 + docs 1,207 lines, all info) | 0 error-level |
| Edge 5xx (layer 3, whole UTC days) | 0 of 6,652 on open-assets.dev | 0 of 9,376 |
| Grafana alerts firing / pending (G1) | 0 firing / 0 pending / 0 unhealthy | 0 / 1 pending (fleet-wide) |
| Grafana 5xx by path (G2) | 0 of 2,585 requests (web 1,391 + docs 1,207 via Loki) | 0 of 1,709 |
| Error spans (G3 spanmetrics) | web 807 of 1,386 (58.23%) + docs 444 of 1,202 (36.94%) client `fetch`, all 404/405 scanner/crawler probes | 1,231 of 1,711 (71.95%) scanner probes |
| GA `exception` events | not collected by these layers | not collected |
| Crashlytics / ASC TF crashes | not applicable (web only) | not applicable |

Deployed versions this window: open-assets-web at `f433e6d` (#33, "pad related
and template cards"), open-assets-docs at `01cc183` (#32, "templates gallery,
sizes and alternatives pages"), per `.last-deploy-sha` and `apps/docs/.last-deploy-sha`.
Both SHAs are ancestors of the audited HEAD (`249b5e2`), so the running code
matches the repo; no deploy landed inside the window and no error aligns to a
version boundary, because there are no errors. Grafana `coverage.notExported` is
empty: both Workers export traces for the whole window.

## Fix now

Nothing. No layer shows a user-facing or server-side failure. Every server span
(web GET 1,375 / POST 9 / HEAD 4, docs GET 1,194 / HEAD 8) has 0 errors.

## Batch

Nothing urgent. One cosmetic, low-confidence item worth a glance when docs are
next touched:

- **Doc example asset paths 404 (docs, 1-2 events each).** Paths like
  `/public/screenshots/01-home.png`, `/public/screenshots/en/01_home.png`,
  `/logo.svg`, `/images/logo.png`, `/web/public/favicon.png`,
  `/public/logo.png` map to illustrative relative `<img src="../../public/...">`
  and inline-code references inside the docs MDX (`apps/docs/content/docs/guides/*.mdx`,
  `concepts/public-dir.mdx`, `tutorial.mdx`, `ui-test-screenshots.mdx`,
  `reference/manifest.mdx`), which teach users how to reference files in their
  own projects. These are example paths, not real site assets, so they 404.
  Almost certainly crawler extraction of `src=` attributes from the rendered doc
  pages; it was not confirmed whether any render as a live broken `<img>` on a
  docs page (that needs the live page). Volume is 1-2 events over 72h. Cosmetic
  at most; no fix recommended without reproducing a live broken image.

## Deliberately skipped

- **~1,251 client `fetch` error spans (web 58.23%, docs 36.94%), status 404/405.**
  566 distinct error-span rows were sampled (web 377: 371 at 404 + 6 at 405; docs
  189 at 404), ~1,282 events, approximate per the TraceQL caveat; quote the
  spanmetrics rates for magnitude. The overwhelming majority are vulnerability
  scanners sweeping for secrets and config: `/app/.env` and ~250 other `*/.env`
  variants, `/.htpasswd`, `/.htaccess`, `/.svn/entries`, `/.hg/requires`,
  `/terraform.tfstate(.backup)`, `/.aws`-style creds (`/.s3cfg`, `/.boto`,
  `/.pgpass`, `/.npmrc`, `/.pypirc`, `/.netrc`), AI-agent config probes
  (`/.claude/settings.json`, `/.cursor/mcp.json`, `/.codex/auth.json`,
  `/CLAUDE.md`, `/AGENTS.md`), Spring Boot `/actuator/{env,beans,heapdump}`,
  Docker registry `/v2/_catalog`, WordPress `/wp-config.txt` and `/wp-content/*`,
  and `/phpinfo` / `/_profiler/phpinfo`. The 405s are POST/other methods to `/`,
  `/api`, `/webhook`, `/soap`, `/og`, `/xml` (method not allowed on static
  assets). **Cause:** both Workers are static Next.js exports;
  `apps/web/custom-worker.ts:20` and `apps/docs/custom-worker.ts:20` forward
  every request to `env.ASSETS.fetch(request)`, which returns 404 for a path with
  no asset (405 for a disallowed method). That `env.ASSETS.fetch` subrequest IS
  the client `fetch` span, and any 4xx on a client span is classed "error" in
  spanmetrics even though the Worker never threw and the caller (a scanner) got
  the correct status. The 0-error server spans confirm it. This is correct
  behaviour, `located:true` to the ASSETS forward, nothing defective. If this
  noise is ever worth cutting it belongs in the fleet edge WAF / scanner-block,
  not app code: the edge already 403'd 2,336 such requests on open-assets.dev
  this window.
- **New-page crawler guesses, status 404 (web, 2-5 events each).**
  `/sizes/ipad-13`, `/sizes/product-hunt-gallery`, `/sizes/google-play-screenshots`,
  `/sizes/google-play-feature-graphic`, `/templates/social-header`,
  `/templates/app-logo`, plus backslash-mangled real routes
  (`/templates/og-image%5C`, `/guides/xcode-app-icon%5C`, `/examples/tax-days%5C`,
  etc.). These hit the new templates-gallery and sizes pages shipped in #32. They
  are NOT valid slugs (`generateStaticParams` + `dynamicParams = false` in
  `apps/web/app/sizes/[slug]/page.tsx` and `.../templates/[slug]/page.tsx` 404
  anything off-list), and `grep` found **no internal link** to any of them in
  `apps/web` or `apps/docs`. So they are external crawlers guessing
  `/sizes/<template-name>` or `/templates/<image-key>` and appending `\` to real
  URLs, not broken internal links. Correct 404s, no fix.
- **`/static/chunks/*.js` 404s.** The same short base-36 hash list
  (`3d2xcop5vkcp5.js`, `2wct4zvmv1379.js`, ...) appears identically on both web
  and docs and under `/templates/static/chunks/...`. Next.js serves chunks from
  `/_next/static/chunks/`, not `/static/chunks/`, and identical hashes across two
  independent builds cannot be real artifacts, so these are crawler/scanner
  probes, not stale-chunk errors from real users.
- **clientDisconnected**: none reported for either Worker.
- **Versionless (local `wrangler dev`) layer 1 failures**: 0.

## Blind spots

What this audit could not see:
- **Branch**: audited on `chore/git-clean-2026-11-17` (HEAD `249b5e2`), not main.
  The deployed SHAs (`f433e6d`, `01cc183`) are ancestors of this HEAD, so the
  comparison holds, but main was not directly inspected.
- **Workers with observability disabled**: none. Grafana `coverage.exporting`
  lists both Workers; `notExported` is empty.
- **Layer 2 warnings**: none. CF `logs.json` and Grafana `grafana.json` both have
  `warnings: []`; Loki result is exact/unsampled.
- **Layer 3 whole UTC days**: the edge zone rollup (`zone.json`) covers
  2026-11-18 00:00Z onward with ~3.1h before the window and 0h after; per-path
  5xx detail is unavailable in the weekly rollup (serverErrors was 0 regardless).
- **Error spans are TraceQL-metric approximate** (the collector's own caveat);
  spanmetrics call/error counts are the authoritative magnitudes.
- **Whether any docs example `<img>` renders as a live broken image** vs. being
  crawler-extracted from doc code examples was not reproduced against the live
  docs site (see Batch).
- **GA / Crashlytics**: not collected by these layers; web-only app, no native
  crash surface.
- **Build and deploy failures**: not covered (cloudflare-builds MCP needs OAuth).

## Outcome

Not applicable: no fix to deploy. This run confirms the 2026-11-12 and 2026-11-16
findings a third time: the client `fetch` error rate is scanner/crawler noise
against a correctly-behaving static-assets Worker, not a defect.
