---
title: Open Assets error audit
date: 2026-11-16
window: 2026-11-13T17:57:29Z to 2026-11-16T17:57:29Z (3d)
workers: open-assets-web-production, open-assets-docs-production
layers: invocations, logs, zone, grafana
layers_failed: none
layer2_warnings: none
logs_truncated: false
data: ./2026-11-16/
---

# Open Assets error audit

**Verdict.** Production is clean. No layer 1 errors across either deployed Worker (0 of 3,626 invocations), no error-level log events at layer 2 (unsampled, exact, no `!!!` warning), 0 edge 5xx on open-assets.dev, and 0 Grafana alerts firing for this app. The only non-zero number is the client `fetch` error rate in traces (1,231 of 1,711, 71.95%), and every one of the 636 sampled error spans is a 404 or 405 for a scanner probe path (`/app/.env`, `/.htpasswd`, `/terraform.tfstate`, `/graphql`, and the like). That is the static-assets Worker correctly refusing paths that do not exist. Nothing to fix.

## Numbers

| | This run | Last run (2026-11-12) |
| --- | --- | --- |
| Worker errors (layer 1, deployed versions) | 0 | 0 |
| Error rate (deployed versions) | 0% of 3,626 (web 1,701 + docs 1,925) | 0% (count not printed) |
| Versionless failures (local dev, excluded) | 0 | 0 |
| Distinct error groups (layer 2) | 0 | 0 |
| Log events (layer 2) | 0 error-level (exact, unsampled) | 0 error-level |
| Edge 5xx (layer 3, whole UTC days) | 0 of 9,376 on open-assets.dev | see zone.json |
| Grafana alerts firing / pending (G1) | 0 firing / 1 pending (fleet-wide, not this app) | 0 / 0 |
| Grafana 5xx by path (G2) | 0 of 1,709 requests (web) | 0 of 133 |
| Error spans (G3 spanmetrics) | 1,231 of 1,711 client `fetch` (71.95%), all 404/405 scanner probes | 81 of 138 (58.70%) scanner probes |
| GA `exception` events | not collected (web only, no GA tag) | not collected |
| Crashlytics / ASC TF crashes | not applicable (web only) | not applicable |

Both Workers ran a single deployed version through the whole window:
open-assets-web-production `d3454148-d62f-4c95-9168-e9e88fbcc649`,
open-assets-docs-production `0e853839-38ff-47ff-a782-49eee1836571`. The last
repo change was #26 (Cloudflare config alignment) on 2026-11-11 and release
v0.6.6 on 2026-11-08, both before the window opened. No deploy landed inside
the window and no error aligns to a version boundary, because there are no
errors.

## Fix now

Nothing. No layer shows a user-facing or server-side failure.

## Batch

Nothing.

## Deliberately skipped

- **1,231 client `fetch` error spans (71.95%), status 404/405** on
  open-assets-web-production. 636 distinct error-span rows were sampled (633 at
  404, 3 at 405), 1,228 spans total, approximate per the TraceQL caveat; quote
  the 71.95% spanmetrics rate for magnitude. Every path is a vulnerability
  scanner sweeping for secrets and config: `/app/.env` and ~90 other
  `*/.env` variants, `/.htpasswd`, `/.svn/entries`, `/.hg/requires`,
  `/terraform.tfstate`, `/.ssh/id_rsa`, `/.aws/credentials`, `/wp-config.txt`,
  `/actuator/env`, `/graphql`, and the rest. The 3 405s are POST to `/`,
  `/graphql` and `/v1/graphql` (method not allowed on static assets). The
  Worker is a static Next.js export: `apps/web/custom-worker.ts` forwards every
  request to `env.ASSETS.fetch(request)`, which returns 404 for a path with no
  asset and 405 for a disallowed method. That `env.ASSETS.fetch` subrequest is
  the client `fetch` span, and any 4xx on a client span is classed "error" in
  spanmetrics even though the Worker never threw. The server GET (1,699), POST
  (6) and HEAD (5) spans all have 0 errors, which confirms it. This is correct
  behaviour, no file is defective, and `located:false`. The 71.95% rate is
  high only because real traffic is tiny. If this noise is ever worth cutting,
  the fleet edge scanner-block / WAF rule is the place, not app code; the edge
  already 403'd 2,255 of these on open-assets.dev this window.
- **clientDisconnected**: none reported for either Worker.
- **Versionless (local `wrangler dev`) layer 1 failures**: 0. Both Workers show
  `versionless.requests: 0` and `onlyTraffic: false`.

## Blind spots

What this audit could not see:
- **Workers with observability disabled**: none. Both Workers have
  `observability.enabled: true` at layer 2.
- **Layer 2 warnings**: none. The collector's coverage probe printed no `!!!`
  line (`logs.json` → `warnings: []`), the result is `exact: true` with
  `querySampled: 0` / `storedSampled: 0`, so layer 2 is clean for both Workers,
  not unknown. No manual query (`logs-manual.json`) was needed.
- **Layer 2 counts marked `~`**: none; nothing was sampled or estimated.
- **Layer 2 truncation**: none; the 3-day window is well inside 7-day retention.
- **open-assets-docs-production does not export to Grafana** (`grafana.json` →
  `coverage.notExported`), so it is invisible to G1 to G3. Its Cloudflare layer 1
  (0 of 1,925) and layer 2 (0 groups) were both clean.
- **Grafana history start**: open-assets-web-production Loki/Tempo data begins
  2026-11-13T16:00:00Z, about 2 hours before the window opened, so the window
  is fully covered this run (unlike 2026-11-12, when history started mid-window).
- **1 pending Grafana alert**: "Fleet: Domain expiry lookup failing"
  (`project: fleet`, `severity: info`, the obs-collector RDAP expiry lookup).
  It is fleet-wide, pending not firing, and not attributable to open-assets;
  there is no Open Assets alert folder or rule. Not a finding for this app.
- **Layer 3 whole UTC days**: zone.json daily rollups run 2026-11-13 to
  2026-11-16, so coverage is 2026-11-13T00:00:00Z onward, 17.8 hours before the
  window opened and 0 after (`zone.coverage`). A 5xx dated on the first day
  could fall before the window; there were 0 5xx on any day, so this does not
  matter here.
- **Build and deploy failures**: not covered (cloudflare-builds MCP needs OAuth).
- **Per-path 5xx detail**: unavailable in the daily rollup (there were no 5xx to
  drill into).
- **GA exceptions and Crashlytics**: not collected for this app (web only, no GA
  tag that captures JS exceptions).
- **Collector note**: `grafana-errors.mjs` lacks the execute bit (exit 126) and
  was run via `node <script>`, same args.

## Outcome

Nothing to fix; no Phase 5.
