# open-assets

Dev server and export tool for app screenshots, icons, and logos. Like Storybook, but for marketing assets.

Design your App Store screenshots, app icons, and logos in HTML/CSS, preview them live in the browser, and export pixel-perfect PNGs at any size — including directly into your Xcode project.

## Quick Start

```bash
# Install
npm install --save-dev open-assets

# Scaffold a new project
npx open-assets init

# Start the dev server
npx open-assets dev
```

## Installation

```bash
# Per-project (recommended)
npm install --save-dev open-assets

# Global
npm install -g open-assets

# One-off with npx
npx open-assets dev
```

## End-to-End Screenshot Pipeline

open-assets supports a full pipeline from design to App Store, automated with Claude Code.

### 1. Initialize

```bash
npx open-assets init
```

Creates a `manifest.json`, sample HTML templates, and a `public/` directory for shared assets.

### 2. Design with Claude Code

Install the open-assets Claude skill, then prompt:

```
Now we want to make beautiful screenshots for this app. Install the open-assets
skill from https://github.com/ianmaccallum/open-assets. Look at the marketing
doc and demographics. Design 8 high-converting App Store screenshots that catch
your eye as you scroll. Use bold headlines with highlighted keywords, phone
mockups with real app screenshots, and close with reviews + a CTA.
```

Claude reads your `manifest.json` and `publicDir` to understand the project structure, then creates screenshot HTML files using the design patterns in the skill.

### 3. Preview

```bash
# With Tailwind
concurrently "npx @tailwindcss/cli -i src/styles.css -o dist/styles.css --watch" "npx open-assets dev"

# Without Tailwind
npx open-assets dev
```

Opens a live preview UI at `http://localhost:3200` with zoom/pan controls and export buttons.

### 4. Export

```bash
npx open-assets render --all-presets
```

Exports every screenshot at every configured device size into `./exports/`, organized by variant subdirectories (e.g. `exports/appstore-6.7/01-hero.png`).

### 5. Upload to App Store Connect / Google Play

Upload the exported PNGs to App Store Connect or Google Play Console. Each variant subdirectory maps to a device size required by the store.

## Generating Screenshots from UI Tests

Capture real app screenshots via Playwright or XCTest, then use them inside your marketing screenshot templates:

```bash
# 1. Run UI tests to capture app screenshots into public/screenshots/
npx playwright test --project=screenshots

# 2. Export marketing screenshots with those captures embedded
npx open-assets render --all-presets
```

Reference captured screenshots in your HTML templates:
```html
<img src="../../public/screenshots/01-home.png" style="width: 100%; height: 100%; object-fit: cover;" />
```

The `manifest.json` `command` field stores the export command so automation tools know what to run:
```json
{
  "command": "npx open-assets render --all-presets"
}
```

## CLI Commands

### `open-assets dev [dir]`

Start the dev server with a live preview UI and export controls.

```bash
open-assets dev                        # Use current directory
open-assets dev ./screenshots          # Use a specific directory
open-assets dev --port 4000            # Custom port (default: 3200)
open-assets dev --host 0.0.0.0         # Bind to all interfaces (network access)
open-assets dev --no-open              # Don't auto-open browser
open-assets dev --quiet                # Suppress server logs
open-assets dev --ci                   # CI mode (quiet + no browser)
open-assets dev --static-dir ./shared  # Serve additional static directories
open-assets dev --manifest config.json # Use a custom manifest filename
```

Options:
| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `-p, --port <port>` | `OPEN_ASSETS_PORT` | `3200` | Port to listen on |
| `-H, --host <host>` | `OPEN_ASSETS_HOST` | `localhost` | Host to bind to |
| `--no-open` | `OPEN_ASSETS_NO_OPEN` | — | Don't auto-open the browser |
| `-q, --quiet` | `OPEN_ASSETS_QUIET` | `false` | Suppress server logs |
| `--ci` | `CI` | `false` | CI mode: quiet + no browser |
| `--manifest <path>` | `OPEN_ASSETS_MANIFEST` | `manifest.json` | Path to manifest file |
| `--static-dir <dirs...>` | — | — | Additional static directories to serve |
| `--render-timeout <ms>` | `OPEN_ASSETS_RENDER_TIMEOUT` | `30000` | Puppeteer render timeout |

The dev server:
- Serves the visual preview UI at `http://localhost:3200`
- Serves your HTML/CSS/SVG asset files from the project directory
- Auto-serves the `publicDir` defined in your manifest (no `--static-dir` needed)
- Runs a Puppeteer-based render server for PNG exports
- Provides export controls for all configured presets
- Shows a clear error if the port is already in use

### `open-assets render [dir]`

Render assets headlessly via the command line, without opening a browser.

```bash
open-assets render                          # Render all tabs at their default sizes
open-assets render --tab icon               # Render a specific tab
open-assets render --tab screenshots --width 1320 --height 2868
open-assets render --preset "iPhone 6.7\""  # Use a named export preset
open-assets render --variant appstore-6.7   # Same as --preset, using variant terminology
open-assets render --item 01-hero           # Render a single item
open-assets render --all-presets            # Export at EVERY preset size (like the UI)
open-assets render --force                  # Re-render everything, ignore cache
open-assets render -o ./build               # Custom output directory
open-assets render --json                   # Output results as JSON (for CI)
open-assets render --quiet                  # Suppress progress logs
```

Options:
| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `--tab <id>` | — | all tabs | Render only the tab with this ID |
| `--item <name>` | — | all items | Render only the item with this name (by `name` or `label`) |
| `--preset <name>` | — | — | Use a named export preset (by label or zipName) |
| `--variant <name>` | — | — | Alias for `--preset` — export a specific variant |
| `--all-presets` | — | — | Export at every preset size defined in the manifest |
| `--force` | — | — | Re-render all assets even if unchanged (ignore manifest.lock) |
| `-o, --output <dir>` | `OPEN_ASSETS_OUTPUT` | `./exports` | Output directory |
| `--manifest <path>` | `OPEN_ASSETS_MANIFEST` | `manifest.json` | Path to manifest file |
| `--parallel <count>` | `OPEN_ASSETS_PARALLEL` | `1` | Number of parallel renders |
| `--render-timeout <ms>` | `OPEN_ASSETS_RENDER_TIMEOUT` | `30000` | Puppeteer render timeout |
| `--json` | — | — | Output results as JSON |
| `-q, --quiet` | `OPEN_ASSETS_QUIET` | `false` | Suppress progress logs |

**Selective export** — flags compose naturally:
```bash
# Single item at a single device size
open-assets render --tab screenshots --item 01-hero --variant appstore-6.7

# One item at all device sizes
open-assets render --tab screenshots --item 01-hero --all-presets

# All items at one device size
open-assets render --tab screenshots --variant appstore-6.7
```

What each tab type exports:

- **icon** — PNG at the requested size (or source size). If `xcodeOutputDir` is configured, also writes `AppIcon.png` to your Xcode project.
- **iframe-gallery** — PNG for each item. With `--all-presets`, exports at every preset size into subdirectories (e.g. `exports/appstore-6.7/01-hero.png`).
- **logo** — SVG (copied from source) + PNG at 512, 1024, and 2048 (or a custom `--width`).

### `open-assets list [dir]`

List all tabs and assets defined in the manifest.

```bash
open-assets list              # Pretty-print asset tree
open-assets list --json       # Output as JSON
```

### `open-assets validate [dir]`

Validate the manifest and check that all referenced source files exist.

```bash
open-assets validate          # Check current directory
open-assets validate ./assets # Check specific directory
```

Returns exit code 1 if any errors are found — useful in CI pipelines.

### `open-assets init [dir]`

Scaffold a new project with a `manifest.json`, sample HTML templates, and a `public/` directory.

```bash
open-assets init              # Current directory
open-assets init ./my-assets  # Specific directory
```

Creates:
- `manifest.json` — asset configuration with `publicDir` and `command`
- `public/` — directory for shared assets (images, logos, icons)
- `src/screenshots/01-hero.html` — sample screenshot template
- `src/icon.html` — sample app icon template
- `.gitignore` — ignores `dist/`, `exports/`, `manifest.lock`, `node_modules/`

## Manifest Format

Your project needs a `manifest.json` at its root. This file defines the tabs shown in the viewer and all export options.

```json
{
  "version": 1,
  "name": "My App",
  "publicDir": "public",
  "command": "npx open-assets render --all-presets",
  "tabs": [ ... ]
}
```

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | yes | Manifest schema version (currently `1`) |
| `name` | string | yes | App display name |
| `publicDir` | string | no | Directory for shared assets (auto-served by dev server) |
| `command` | string | no | Export command for automation tools and CI |
| `tabs` | array | yes | Asset tab definitions |

### Tab Types

#### `iframe-gallery` — Screenshots & Marketing Images

For App Store screenshots, Product Hunt images, social cards, etc.

```json
{
  "id": "screenshots",
  "label": "Screenshots",
  "type": "iframe-gallery",
  "sourceWidth": 440,
  "sourceHeight": 956,
  "borderRadius": 4,
  "items": [
    { "src": "src/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" },
    { "src": "src/screenshots/02-features.html", "name": "02-features", "label": "Features" }
  ],
  "exportPresets": [
    {
      "section": "App Store",
      "presets": [
        { "label": "iPhone 6.9\"", "width": 1320, "height": 2868, "zipName": "appstore-6.9" },
        { "label": "iPhone 6.7\"", "width": 1290, "height": 2796, "zipName": "appstore-6.7" },
        { "label": "iPhone 6.5\"", "width": 1284, "height": 2778, "zipName": "appstore-6.5" }
      ]
    },
    {
      "section": "Play Store",
      "presets": [
        { "label": "Phone", "width": 1080, "height": 1920, "zipName": "playstore-phone" }
      ]
    }
  ],
  "customExport": {
    "defaultWidth": 1320,
    "defaultHeight": 2868
  }
}
```

Each preset in `exportPresets` is a **variant** — a device size the screenshots get exported at. The `zipName` serves as the variant identifier, used as the output subdirectory name and for selective export with `--variant`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique tab identifier (used in URLs and CLI `--tab`) |
| `label` | string | Display name in the tab bar |
| `type` | `"iframe-gallery"` | Tab type |
| `sourceWidth` | number | Width of the HTML source files in pixels |
| `sourceHeight` | number | Height of the HTML source files in pixels |
| `borderRadius` | number | Border radius for preview frames (px) |
| `items` | array | List of HTML files to display |
| `items[].src` | string | Path to the HTML file (relative to project root) |
| `items[].name` | string | Filename for exports (used by `--item` flag) |
| `items[].label` | string | Display label (also usable with `--item`) |
| `exportPresets` | array | Grouped export size presets (variants) |
| `exportPresets[].section` | string | Group name (e.g. "App Store") |
| `exportPresets[].presets[]` | object | Variant definition |
| `exportPresets[].presets[].label` | string | Display label |
| `exportPresets[].presets[].width` | number | Export width in pixels |
| `exportPresets[].presets[].height` | number | Export height in pixels |
| `exportPresets[].presets[].zipName` | string | Variant ID / subdirectory name |

#### `icon` — App Icon

```json
{
  "id": "icon",
  "label": "App Icon",
  "type": "icon",
  "sourceFile": "src/icon.html",
  "sourceWidth": 1024,
  "sourceHeight": 1024,
  "borderRadius": 180,
  "xcodeOutputDir": "../MyApp/Assets.xcassets/AppIcon.appiconset"
}
```

#### `logo` — Vector Logo

```json
{
  "id": "logo",
  "label": "Logo",
  "type": "logo",
  "sourceFile": "src/logo.svg",
  "displayWidth": 940,
  "displayHeight": 940,
  "downloadPrefix": "myapp-logo"
}
```

## Incremental Builds with manifest.lock

The `render` command maintains a `manifest.lock` file that stores SHA256 checksums of each source HTML/SVG file. On subsequent renders, unchanged assets are skipped automatically:

```
$ open-assets render --all-presets
  Skipping 01-hero at 1320x2868 (unchanged)
  Skipping 02-features at 1320x2868 (unchanged)
  Rendering 03-new-screen at 1320x2868...
    → exports/appstore-6.9/03-new-screen.png

Done. 1 asset(s) rendered, 2 skipped (unchanged) in 1.2s.
```

Use `--force` to re-render everything regardless of the cache.

**Limitation**: Only source HTML/SVG files are checksummed. Changes to referenced assets (images in `publicDir`, compiled Tailwind CSS) won't trigger re-renders — use `--force` when those change.

Add `manifest.lock` to your `.gitignore` (done automatically by `open-assets init`).

## CI/CD with GitHub Actions

Automatically export screenshots on push:

```yaml
name: Export Marketing Assets
on:
  push:
    paths:
      - 'marketing/screenshots/**'
      - 'marketing/screenshots/manifest.json'
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx open-assets validate
      - run: npx open-assets render --all-presets --json --quiet
      - uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: exports/
```

Environment variables for CI:
```yaml
env:
  CI: true                    # Enables CI mode
  OPEN_ASSETS_QUIET: true     # Suppress logs
  OPEN_ASSETS_OUTPUT: ./dist  # Custom output dir
```

## Real-World Examples

### Only Recipes — iOS + Android Screenshots

8 iOS screenshots (440x956) + 8 Android screenshots (440x978) with variants for iPhone 6.9", 6.7", 6.5", 6.1" and Android 1080x2400.

**Design patterns used:**
- **Hero** (screenshot 1): 86px `font-black` headline "Got Recipes?" with colored background on keyword, app logo + star rating, large food illustration bleeding off bottom-right edge
- **Dual-phone comparison** (screenshot 2): messy website vs clean recipe side-by-side with arrow between
- **Orbital integrations** (screenshot 3): "Save recipes from anywhere" with YouTube, Instagram, TikTok, Pinterest logos on concentric orbital rings around the app icon
- **Feature showcases** (screenshots 4-7): bold headline with highlighted keyword + phone mockup showing the actual app screen
- **CTA with reviews** (screenshot 8): "Time to cook, chef" headline with decorative arrow, staggered review cards with 5-star ratings, glass-morphism badge pills ("No Ads", "No Popups", "No Life Stories"), lifestyle kitchen photo fading at bottom

**Manifest structure:**
```json
{
  "version": 1,
  "name": "Only Recipes",
  "publicDir": "public",
  "command": "npx open-assets render --all-presets",
  "tabs": [
    {
      "id": "screenshots-ios",
      "type": "iframe-gallery",
      "sourceWidth": 440,
      "sourceHeight": 956,
      "items": [
        { "src": "src/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" },
        { "src": "src/screenshots/02-import.html", "name": "02-import", "label": "Import" },
        { "src": "src/screenshots/03-save-from-anywhere.html", "name": "03-save", "label": "Save" }
      ],
      "exportPresets": [
        {
          "section": "App Store",
          "presets": [
            { "label": "iPhone 6.9\"", "width": 1320, "height": 2868, "zipName": "appstore-6.9" },
            { "label": "iPhone 6.7\"", "width": 1290, "height": 2796, "zipName": "appstore-6.7" },
            { "label": "iPhone 6.5\"", "width": 1284, "height": 2778, "zipName": "appstore-6.5" },
            { "label": "iPhone 6.1\"", "width": 1179, "height": 2556, "zipName": "appstore-6.1" }
          ]
        }
      ]
    },
    {
      "id": "screenshots-android",
      "type": "iframe-gallery",
      "sourceWidth": 440,
      "sourceHeight": 978,
      "items": [ "..." ],
      "exportPresets": [
        {
          "section": "Play Store",
          "presets": [
            { "label": "Phone", "width": 1080, "height": 2400, "zipName": "playstore-phone" }
          ]
        }
      ]
    }
  ]
}
```

### Thoughtful — App Store Listing + Icon Concepts

6 screenshot frames with captions, 10+ icon concept SVGs, and a comprehensive brand guide with color tokens. Target demographic: gift-givers aged 25-45.

**Screenshot frames:**
1. Gift suggestion with occasion context
2. Contact integration showing relationship details
3. Gift tracking calendar view
4. Budget management
5. Wish list collaboration
6. CTA with app rating

## Common Export Preset Sizes

| Platform | Label | Width | Height |
|----------|-------|-------|--------|
| App Store | iPhone 6.9" | 1320 | 2868 |
| App Store | iPhone 6.7" | 1290 | 2796 |
| App Store | iPhone 6.5" | 1284 | 2778 |
| App Store | iPhone 6.1" | 1179 | 2556 |
| App Store | iPad 12.9" | 2048 | 2732 |
| Play Store | Phone | 1080 | 1920 |
| Play Store | Phone (tall) | 1080 | 2400 |
| Product Hunt | Gallery | 1270 | 760 |

## File Structure Convention

```
project/
  manifest.json
  manifest.lock              # Auto-generated cache (gitignored)
  public/                    # Shared assets (configured via publicDir)
    logo-round.png
    rating.svg
    arrow.svg
    kitchen-light.jpg
    social/
      youtube.svg
      instagram.svg
    screenshots/             # Real app screenshots from UI tests
      01-home.png
      02-detail.png
  src/
    styles.css               # Tailwind input
    icon.html                # App icon
    logo.svg                 # Vector logo
    screenshots/
      01-hero.html
      02-features.html
      03-save-from-anywhere.html
    screenshots-android/     # Separate set for Android dimensions
      01-hero.html
  dist/
    styles.css               # Compiled Tailwind
  exports/                   # Rendered output (gitignored)
    appstore-6.9/
      01-hero.png
      02-features.png
    appstore-6.7/
    playstore-phone/
```

## License

MIT
