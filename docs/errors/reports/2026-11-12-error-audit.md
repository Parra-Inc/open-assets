---
title: Open Assets error audit
date: 2026-11-12
window: 2026-11-11T03:22:17Z to 2026-11-13T03:22:17Z (approx., per zone.json coverage)
workers: open-assets-web-production, open-assets-docs-production
layers: invocations, logs, zone, grafana
layers_failed: none
layer2_warnings: none
logs_truncated: false
data: ./2026-11-12/
---

# Open Assets error audit

**Verdict.** Production is clean: no layer 1 errors in any deployed version, no error-level log events, 0 Grafana alerts and 0 5xx in Loki. The only non-zero number is 81 client `fetch` error spans (58.7%) on open-assets-web-production, and every sampled one is a 404 for a scanner probe path (`/.ssh/id_rsa`, `/.ENV`, `/.claude.json` and similar), which is correct behaviour. Nothing to fix.

## Numbers

| | This run | Last run |
| --- | --- | --- |
| Worker errors (layer 1, deployed versions) | 0 | |
| Error rate (deployed versions) | 0% (request count not printed) | |
| Versionless failures (local dev, excluded) | 0 | |
| Distinct error groups (layer 2) | 0 | |
| Log events (layer 2) | 0 error-level | |
| Edge 5xx (layer 3, whole UTC days) | see account zone.json, zone open-assets.dev | |
| Grafana alerts firing / pending (G1) | 0 / 0 | |
| Grafana 5xx by path (G2) | 0 of 133 requests (web) | |
| Error spans (G3 spanmetrics) | 81 of 138 client fetch (58.70%), all 404 scanner probes | |
| GA `exception` events | not collected | |
| Crashlytics / ASC TF crashes | not applicable (web only) | |

## Deliberately skipped

- **81 client `fetch` error spans, status 404** on open-assets-web-production (76 spans sampled, one event each). Paths are credential and dotfile probes: `/.ENV`, `/.bundle/config`, `/.chef/knife.rb`, `/.claude.json`, `/.codex/auth.json`, `/.composer/auth.json`, `/.firebaserc`, `/.gemini/settings.json`, `/.htpasswd`, `/.msmtprc`, `/.my.cnf`, `/.mysql_history`, `/.now.json`, `/.openai/config`, `/.pgpass`, `/.ssh/config`, `/.ssh/id_ed25519`, `/.ssh/id_rsa`, `/.streamlit/config.toml`, `/.terraformrc`. These are the Worker's internal static-asset fetch missing a file that does not exist; returning 404 is correct and nothing leaked. Not located to a repo file because there is no defect. The 58.7% rate is high only because real traffic is tiny (133 requests). If this noise matters, the fleet edge scanner-block rule is the place, not app code.
- clientDisconnected: none reported.
- Versionless (local dev) layer 1 failures: 0.

## Blind spots

- open-assets-docs-production does not export to Grafana and is invisible to G1 to G3 (Cloudflare layers 1 and 2 were clean for it).
- Grafana history for open-assets-web-production starts mid-window at 2026-11-12T16:00:00Z; earlier is unknown, not clean.
- Layer 1 request count and rate were not printed by the collector, so the error rate denominator is unknown (numerator is 0).
- Layer 3 whole UTC days: coverage 2026-11-11T00:00:00Z to 2026-11-13T03:22:17Z, i.e. 3.4 hours before the window and 0 after.
- Build and deploy failures: not covered (cloudflare-builds MCP needs OAuth).
- Per-path 5xx detail unavailable in the weekly rollup.
- GA exceptions and Crashlytics not collected for this app.
- Collector note: `grafana-errors.mjs` lacks the execute bit (exit 126), run via `node`.

## Outcome

Nothing to fix; no Phase 5.
