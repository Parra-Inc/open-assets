# PH Gallery

Dogfooded: every frame is an Open Assets HTML template in `screenshots/`, rendered by
the CLI itself. Upload the 2x exports from `exports/gallery/ph-2x/`. The three rows in
`02-examples` are the full screenshot sets from `public/img/examples/` (Tax Days,
Only Recipes, Skimmer) — the same banner strips used in the README — resized to
1000px wide and copied into `public/examples/` so this gallery has its own small
copies.

## Order and captions

Slot 0 (before the images, if you record it): 15-30s screen recording of
`npx open-assets dev` hot-reloading a screenshot template and clicking Export. This is
the strongest possible thumbnail; `01-hero` is the fallback.

| Slot | File | Caption |
|------|------|---------|
| 1 | `ph-2x/01-hero.png` | One source of truth for your app's screenshots, icons, and favicons. Design in HTML with your LLM, render at every size, export everywhere. |
| 2 | `ph-2x/02-examples.png` | Design beautiful App Store screenshots. Real templates, rendered for real shipped apps, no Figma or screenshot tool required. |
| 3 | `ph-2x/03-fan-out.png` | Change one template and every destination updates: store screenshots, the Xcode asset catalog, your web app's public folder, social cards. |
| 4 | `ph-2x/04-localization.png` | Localization built in: one template renders per language, with Intl number formatting and automatic RTL layout. |
| 5 | `ph-2x/05-agent-ci.png` | Agent-native and CI-friendly: ships a Claude Code skill, and checksummed renders keep pipelines fast. |
| 6 | `ph-2x/06-dev-server.png` | A Storybook-style dev server with hot reload, zoom and pan, and one-click exports. |
| 7 | `ph-2x/07-install.png` | Completely free, completely open source. MIT licensed, no account, runs entirely on your machine. |

## Re-rendering after edits

From the repo root:

```bash
node bin/open-assets.mjs render marketing/launches/product-hunt \
  --output marketing/launches/product-hunt/exports --force
```

(`--force` because the frames share no lockfile with the main project; a plain render
also works once `assets.lock` exists here.)

A `--template <name>` bug that misplaced single-template renders (writing
`exports/gallery/ph-1x.png` instead of `exports/gallery/ph-1x/<name>.png`) was found
while producing these frames and has been fixed in `lib/render.mjs`, so scoped
re-renders are safe: it makes a good "found while dogfooding the launch assets" line
for the comment threads.
