# open-assets

Screenshots, icons, and marketing assets, made a breeze in your git repo.

## Before you push

Run `npm run check`. It runs, in the order CI runs them: build (no-op, no build
step defined), the Jest test suite, and the README/docs sync check
(`scripts/docs-sync.mjs --check`). Takes about 5 seconds. Assumes deps are
already installed (`npm install`).

If you change what CI runs, update check to match.

## Docs and README stay in sync

The README is a complete, standalone guide; docs.open-assets.dev (`apps/docs`,
Fumadocs) goes deeper. Both must agree.

- **Generated, never hand-edited**: the CLI option tables, the export sizes
  table and the examples data. `npm run docs:sync` rebuilds the README's
  `<!-- docs-sync:* -->` blocks and `apps/docs/generated/*.json` from
  `open-assets <cmd> --help`, `lib/sizes.mjs` and `examples/*/assets.json`.
  `npm run check` fails if they are stale. To change an option description,
  edit the `.option()` text in `bin/open-assets.mjs`; to change a size, edit
  `lib/sizes.mjs`. Then run `npm run docs:sync`.
- **Hand-written in both places**: when you change behavior or a README
  section, update the matching docs page in the same PR:

| README section | Docs page (`apps/docs/content/docs/`) |
| --- | --- |
| Why Open Assets, Examples | `index.mdx`, `examples/` |
| Installation, Quick Start, Shell Alias | `install.mdx`, `quick-start.mdx`, `setup.mdx` |
| Concepts | `concepts/*.mdx` |
| End-to-End Screenshot Pipeline | `tutorial.mdx`, `guides/app-store-*.mdx`, `agents/claude-code.mdx` |
| Generating Screenshots from UI Tests | `guides/ui-test-screenshots.mdx` |
| Localization | `localization/*.mdx` |
| CLI Commands | `reference/cli/*.mdx` |
| Manifest Format, Output Types | `reference/manifest.mdx`, `reference/outputs.mdx` |
| Incremental Builds with assets.lock | `concepts/lockfile.mdx` |
| CI/CD with GitHub Actions | `ci/github-actions.mdx` |
| Common Export Sizes | `reference/sizes.mdx` (generated table) |
| File Structure Convention | `structure.mdx` |

Docs pages are checked by `apps/docs/scripts/check-content.mjs` (150 to 160
character descriptions, no em dashes, no broken internal links). Deploy with
`pnpm run deploy` in `apps/docs`.
