---
name: open-assets
description: Generate and manage app marketing assets (screenshots, icons, logos) using HTML/Tailwind with open-assets
user-invocable: true
---

## open-assets

open-assets is a dev server and export tool for app marketing assets — screenshots, icons, logos, OG images, favicons, and more — designed as HTML/CSS/SVG files rendered to PNG via Puppeteer. Think Storybook, but for marketing assets.

## Running

```bash
# Start dev server (preview + export UI)
open-assets dev

# Or with Tailwind
concurrently "npx @tailwindcss/cli -i assets/styles.css -o dist/styles.css --watch" "open-assets dev"

# Headless render
open-assets render --collection screenshots --size iphone-6.9
open-assets render --collection icon --force
open-assets render --force
open-assets render --template 01-hero --force
```

## Concepts

| Term | Definition |
|------|-----------|
| **Collection** | A named group of related assets sharing the same source size and export sizes. One tab in the dev UI. |
| **Template** | A single source file (HTML or SVG) that produces one image per export size. |
| **Export Size** | A named output dimension that templates are rendered at (e.g., "iPhone 6.9" → 1320×2868). |
| **Source Size** | The dimensions the HTML template is authored at. Puppeteer scales from source → export size. |
| **Output** | An optional post-render action (e.g., write to Xcode `.appiconset`, copy SVG source). |

## assets.json

The `assets.json` at the project root defines all asset collections. All collections follow the same unified schema — no `type` field needed.

```json
{
  "version": 1,
  "name": "App Display Name",
  "publicDir": "public",
  "command": "npx open-assets render --force",
  "collections": [
    {
      "id": "unique-id",
      "label": "Tab Label",
      "sourceSize": { "width": 440, "height": 956 },
      "borderRadius": 4,
      "templates": [
        { "src": "assets/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" }
      ],
      "export": [
        { "name": "iphone-6.9", "label": "iPhone 6.9\"", "size": { "width": 1320, "height": 2868 } }
      ],
      "customExport": { "defaultWidth": 1320, "defaultHeight": 2868 }
    }
  ]
}
```

### Collection Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (used in CLI `--collection`) |
| `label` | string | Display name in UI |
| `sourceSize` | object | `{ width, height }` — dimensions templates are authored at |
| `borderRadius` | number | Border radius for preview frames (px) |
| `templates` | array | Source files: `{ src, name, label }` |
| `export` | array | Export sizes and output actions. Entries with a `type` field are post-render actions |
| `customExport` | object | Custom size defaults for UI (optional) |

### Output Types

Export entries with a `type` field are post-render actions (run with `--force`):

| Type | Config | Description |
|------|--------|-------------|
| `xcode` | `{ "type": "xcode", "path": "..." }` | Render icon and write to Xcode asset catalog |
| `copy-source` | `{ "type": "copy-source", "format": "svg" }` | Copy source files to export directory |

### Example Collections

**Screenshots** (many templates × many device sizes):
```json
{
  "id": "screenshots",
  "label": "App Store Screenshots",
  "sourceSize": { "width": 440, "height": 956 },
  "borderRadius": 4,
  "templates": [
    { "src": "assets/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" },
    { "src": "assets/screenshots/02-features.html", "name": "02-features", "label": "Features" }
  ],
  "export": [
    { "name": "iphone-6.9", "label": "iPhone 6.9\"", "size": { "width": 1320, "height": 2868 } },
    { "name": "iphone-6.7", "label": "iPhone 6.7\"", "size": { "width": 1290, "height": 2796 } }
  ]
}
```

**App Icon** (1 template × many sizes + Xcode):
```json
{
  "id": "icon",
  "label": "App Icon",
  "sourceSize": { "width": 1024, "height": 1024 },
  "borderRadius": 224,
  "templates": [
    { "src": "assets/icon.html", "name": "icon", "label": "App Icon" }
  ],
  "export": [
    { "name": "1024", "label": "1024px", "size": { "width": 1024, "height": 1024 } },
    { "name": "180", "label": "180px", "size": { "width": 180, "height": 180 } },
    { "type": "xcode", "path": "../MyApp/Assets.xcassets/AppIcon.appiconset" }
  ]
}
```

**Icon Explorations** (multiple concept variants):
```json
{
  "id": "icon-explorations",
  "label": "Icon Explorations",
  "sourceSize": { "width": 1024, "height": 1024 },
  "borderRadius": 224,
  "templates": [
    { "src": "assets/icons/concept-a.html", "name": "concept-a", "label": "Concept A" },
    { "src": "assets/icons/concept-b.html", "name": "concept-b", "label": "Concept B" }
  ],
  "export": [
    { "name": "1024", "label": "1024px", "size": { "width": 1024, "height": 1024 } }
  ]
}
```

**Logo** (SVG variants + source copy):
```json
{
  "id": "logo",
  "label": "Logo",
  "sourceSize": { "width": 940, "height": 940 },
  "templates": [
    { "src": "assets/logo.svg", "name": "logo", "label": "Logo" },
    { "src": "assets/logo-dark.svg", "name": "logo-dark", "label": "Dark" }
  ],
  "export": [
    { "name": "1024", "label": "1024px", "size": { "width": 1024, "height": 1024 } },
    { "name": "512", "label": "512px", "size": { "width": 512, "height": 512 } },
    { "type": "copy-source", "format": "svg" }
  ]
}
```

**OG Images** (social cards):
```json
{
  "id": "og-images",
  "label": "Social Cards",
  "sourceSize": { "width": 1200, "height": 630 },
  "templates": [
    { "src": "assets/og/default.html", "name": "default", "label": "Default OG" }
  ],
  "export": [
    { "name": "og", "label": "OG Image", "size": { "width": 1200, "height": 630 } }
  ]
}
```

## CLI Reference

### All commands

| Command | Description |
|---------|-------------|
| `open-assets dev [dir]` | Start dev server with live preview and export UI |
| `open-assets render [dir]` | Render assets headlessly via CLI |
| `open-assets list [dir]` | List all collections and templates in the config |
| `open-assets validate [dir]` | Validate assets.json and check referenced files exist. Use `--fix` to interactively remove missing templates |
| `open-assets init [dir]` | Scaffold a new assets.json and example assets |
| `open-assets add collection [dir]` | Add a new collection (from presets or custom) |
| `open-assets add template [dir]` | Add a new template to an existing collection |
| `open-assets add size [dir]` | Add an export size to a collection |
| `open-assets skills [dir]` | Install Claude Code skills into a project |

### render command flags

| Flag | Description |
|------|-------------|
| `--collection <id>` | Render only the collection with this ID |
| `--template <name>` | Render only the template with this name |
| `--size <name>` | Use a named export size from config |
| `--locale <code>` | Render only this locale (e.g. `en`, `ar`, `ja`) |
| `-f, --force` | Export at every size and re-render all (ignores cache) |
| `-o, --output <dir>` | Output directory (default: `./exports`) |
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress progress logs |

Flags compose naturally:
- `--collection screenshots --template 01-hero --size iphone-6.9` → single template, single size
- `--collection screenshots --template 01-hero --force` → one template, all sizes
- `--collection screenshots --size iphone-6.9` → all templates, one size

### add commands

Interactive commands for managing the config without editing JSON by hand. All support `--config <path>` for custom config filenames.

#### `open-assets add collection`

Add a new asset collection. Choose from presets or configure custom dimensions and format.

**Presets:**
| Preset | Source Size | Format |
|--------|-----------|--------|
| App Store Screenshots | 440x956 | HTML |
| App Icon | 1024x1024 | HTML |
| Logo | 800x800 | SVG |
| Wordmark | 1200x400 | SVG |
| Feature Graphic (Google Play) | 1024x500 | HTML |
| OG Image / Social | 1200x630 | HTML |
| Custom | user-defined | HTML or SVG |

Creates a starter template file and adds the collection to `assets.json` with appropriate export sizes.

```bash
open-assets add collection              # interactive preset picker
open-assets add collection ./my-assets  # in a specific directory
```

#### `open-assets add template`

Add a new template (HTML or SVG) to an existing collection. Prompts for which collection, template name/label, and format. Creates the source file in the same directory as the collection's existing templates.

```bash
open-assets add template                # interactive
```

#### `open-assets add size`

Add an export size to a collection. Choose from common device/platform presets or enter custom dimensions.

**Size presets include:**
- iPhone 6.9", 6.7", 6.5", 6.1"
- iPad 13", 12.9"
- Google Play Phone, 7" Tablet
- Mac App Store Retina
- OG Image, Twitter Card, Product Hunt Gallery
- Custom dimensions

```bash
open-assets add size                    # interactive
```

### Output structure

`exports/{collection}/{size}/{template}.png`

```
exports/
  screenshots/
    iphone-6.9/
      01-hero.png
      02-features.png
    iphone-6.7/
      01-hero.png
  icon/
    1024/
      icon.png
  logo/
    svg/
      logo.svg
    1024/
      logo.png
```

## Creating New Screenshot HTML Files

Each screenshot is a standalone HTML file at fixed dimensions. You can create them manually or use `open-assets add template` to scaffold one.

Key rules:

1. Set `width` and `height` on the body to match `sourceSize` in the config
2. Set `overflow: hidden` on the body
3. Reference compiled Tailwind CSS via `<link rel="stylesheet" href="../dist/styles.css" />`
4. All paths are relative to the project root
5. Put shared assets (images, logos, icons) in `publicDir` (default: `public/`)

Example template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=440" />
  <link rel="stylesheet" href="../dist/styles.css" />
</head>
<body class="m-0 p-0">
  <div class="screenshot bg-white flex flex-col items-center">
    <!-- Your screenshot content here -->
  </div>
</body>
</html>
```

After creating the file manually, add it to the `templates` array in the relevant collection in `assets.json`. Or use `open-assets add template` to do both steps at once.

## Adding a New Collection

Use `open-assets add collection` to interactively add a collection from presets or with custom dimensions and format (HTML/SVG). This creates the starter template file and updates `assets.json` automatically.

Alternatively, add a new object to the `collections` array in `assets.json` manually. Each collection needs a unique `id`, a `sourceSize`, `templates`, and `export`.

## Common Export Sizes

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
| Web | OG Image | 1200 | 630 |
| Mac App Store | Retina | 2880 | 1800 |

## Incremental Builds (assets.lock)

The `render` command maintains a `assets.lock` file with SHA256 checksums of source files. On subsequent renders, unchanged assets are skipped automatically. Use `--force` to re-render everything.

Note: only source HTML/SVG files are checksummed. Changes to referenced assets (images in publicDir, compiled CSS) will not trigger re-renders — use `--force` when those change.

## Localization (i18n)

Collections can be localized so that templates render in multiple languages. When localizations are configured, each template is rendered once per locale, producing locale-specific exports with proper text direction (LTR/RTL).

### Localizations file

Create a JSON file (iOS `.xcstrings`-inspired format) that maps string keys to per-locale values:

```json
{
  "sourceLanguage": "en",
  "strings": {
    "hero_title": {
      "localizations": {
        "en": { "value": "Track your tax days" },
        "ar": { "value": "تتبع أيام الضرائب الخاصة بك" },
        "ja": { "value": "税金の日を追跡する" },
        "de": { "value": "Verfolge deine Steuertage" }
      }
    },
    "day_count_label": {
      "localizations": {
        "en": { "value": "You have {{n:183}} days remaining" },
        "ar": { "value": "لديك {{n:183}} يوم متبقي" },
        "de": { "value": "Sie haben {{n:183}} Tage übrig" }
      }
    }
  }
}
```

**Number formatting:** Use `{{n:NUMBER}}` inside localized values for locale-aware number formatting (e.g., `1,234` in English, `1.234` in German). Numbers are formatted using `Intl.NumberFormat` for the target locale.

### Wiring localizations to a collection

Add `localizations` (path to the JSON file) and optionally `locales` (filter to specific locales) to a collection in `assets.json`:

```json
{
  "id": "screenshots",
  "label": "App Store Screenshots",
  "sourceSize": { "width": 440, "height": 956 },
  "localizations": "localizations.json",
  "locales": ["en", "ar", "ja", "de"],
  "templates": [
    { "src": "assets/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" }
  ],
  "export": [
    { "name": "iphone-6.9", "label": "iPhone 6.9\"", "size": { "width": 1320, "height": 2868 } }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `localizations` | string | Path to the localizations JSON file (relative to project root) |
| `locales` | string[] | Optional filter — render only these locales. Omit to render all locales in the file. |

### Using placeholders in templates

Templates use `{{key}}` mustache-style placeholders that get replaced with localized values before rendering:

```html
<h1>{{hero_title}}</h1>
<p>{{day_count_label}}</p>
```

The source language values serve as the default/fallback content visible during development. At render time, placeholders are substituted with the localized value for each target locale.

### RTL support

Right-to-left locales (Arabic, Hebrew, Persian, Urdu, etc.) are automatically detected. For RTL locales, the renderer sets `dir="rtl"` and `lang` on the `<html>` element before taking the screenshot.

**Design templates with RTL in mind:**
- Use `logical` CSS properties (`margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`)
- Use flexbox `gap` instead of directional margins between items
- Avoid hardcoded `text-align: left` — use `text-align: start` instead
- For layouts that must flip in RTL, use `[dir="rtl"]` CSS selectors:
  ```css
  .arrow { transform: rotate(0deg); }
  [dir="rtl"] .arrow { transform: rotate(180deg); }
  ```

### Output structure with locales

When localizations are active, locale codes are inserted into the output path:

```
exports/
  screenshots/
    en/
      iphone-6.9/
        01-hero.png
    ar/
      iphone-6.9/
        01-hero.png
    ja/
      iphone-6.9/
        01-hero.png
```

With `outFile`, use the `{locale}` template variable:
```json
{ "outFile": "output/{locale}/{template}.png" }
```

### CLI

```bash
# Render all locales for a collection
open-assets render --collection screenshots --force

# Render only Arabic
open-assets render --collection screenshots --force --locale ar

# Render a single template in Japanese
open-assets render --collection screenshots --template 01-hero --locale ja --force
```

### Locale fallback order

When resolving a string for a locale:
1. Exact match (e.g., `es-419`)
2. Base language (e.g., `es`)
3. Source language (e.g., `en`)

## File Structure Convention

```
project/
  assets.json
  assets.lock          # Auto-generated cache (commit this)
  public/                # Shared assets (images, logos, icons, photos)
    logo-round.png
    social/
      youtube.svg
    screenshots/         # Real app screenshots for use in templates
      01.png
  assets/
    styles.css           # Tailwind input
    icon.html            # App icon template
    icons/               # Icon concept explorations
      concept-a.html
      concept-b.html
    logo.svg             # Vector logo template
    screenshots/
      01-hero.html
      02-features.html
    og/                  # OG image templates
      default.html
  dist/
    styles.css           # Compiled Tailwind
  exports/               # Rendered output (add to .gitignore)
```

---

## Screenshot Design Best Practices

These guidelines are distilled from high-converting App Store listings. Follow them when creating screenshot HTML files.

### Copywriting

- **Headlines: 3-6 words max**, large and bold. Every word must earn its place.
- **Lead with the benefit**, not the feature name. "Got Recipes?" not "Recipe Import Feature". "Save from anywhere" not "Multi-platform Import Support".
- **Use action words**: Save, Track, Cook, Get, Try, Discover, Create, Find.
- **First screenshot** = elevator pitch headline. This is the only one most users see.
- **Last screenshot** = CTA with social proof (reviews, ratings, badges).
- **Highlight the key word** in each headline with a colored background or different color.

### Visual Hierarchy

First 1-2 screenshots should use large hero graphics with oversized headlines. The goal is to stop the scroll in the App Store.

**Oversized headline pattern** (44-86px):
```html
<div class="text-[86px] font-black leading-[0.9] tracking-[-0.04em]">Got</div>
<div class="inline-block bg-brand-black text-white text-[86px] font-black px-[16px] pt-[6px] pb-[12px] rounded-[16px] mt-[4px]">Recipes?</div>
```

**Highlighted keyword pattern** — wrap key words with a colored background pill:
```html
<h1 class="text-[44px] font-extrabold leading-[1.18] tracking-[-0.03em]">
  Save recipes from <span class="inline-block bg-brand-green text-white px-[10px] pt-[3px] pb-[5px] rounded-[10px]">anywhere</span>
</h1>
```

### Layout Patterns

Use a mix of these layouts across your 6-10 screenshots. Variety keeps users scrolling.

#### 1. Hero (Screenshot 1)
Oversized headline + logo + large background graphic bleeding off the edges.
```html
<!-- Headline at top -->
<div class="relative z-10 pt-[28px] px-[24px]">
  <div class="text-[86px] font-black">Got</div>
  <div class="inline-block bg-brand-black text-white text-[86px] font-black px-[16px] rounded-[16px]">Recipes?</div>
</div>
<!-- Logo and rating centered -->
<div class="relative z-10 mt-[44px] flex flex-col items-center">
  <img src="../../public/logo-round.png" width="64" height="64" />
  <img src="../../public/rating.svg" width="365" height="191" class="mt-[8px]" />
</div>
<!-- Large image bleeding off bottom-right edge -->
<div class="absolute z-0" style="bottom: -350px; right: -176px; width: 792px; height: 792px;">
  <img src="../../public/meal.svg" class="w-full h-full object-contain" />
</div>
```

#### 2. Dual-Phone (Before/After or Feature Comparison)
Two phone mockups side by side with an arrow or VS indicator between them. Great for showing "messy website → clean recipe" transformations.

#### 3. Orbital (Integrations / Multi-Platform)
Center your app icon with platform logos on concentric orbital rings:
```html
<div class="orbital-container" style="position: relative; width: 380px; height: 380px;">
  <!-- Concentric ring borders -->
  <div style="position: absolute; border-radius: 50%; border: 1px solid rgba(128,128,128,0.13); width: 240px; height: 240px; top: 70px; left: 70px;"></div>
  <div style="position: absolute; border-radius: 50%; border: 1px solid rgba(128,128,128,0.13); width: 340px; height: 340px; top: 20px; left: 20px;"></div>
  <!-- Center app icon -->
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    <img src="../../public/logo-round.png" width="104" height="104" style="border-radius: 50%; box-shadow: 0 6px 20px rgba(0,0,0,0.18);" />
  </div>
  <!-- Platform icons at various positions on rings -->
  <div style="position: absolute; top: 52px; left: 216px; opacity: 0.85;">
    <img src="../../public/social/youtube.svg" width="68" height="68" style="border-radius: 50%;" />
  </div>
</div>
```

#### 4. Feature Showcase
Headline + phone mockup showing a real app screenshot.
```html
<h1 class="text-[44px] font-extrabold tracking-[-0.03em] text-center">
  Just the <span class="inline-block bg-brand-green text-white px-[10px] rounded-[10px]">recipe</span>
</h1>
<div class="phone phone-340">
  <div class="phone-screen">
    <img src="../../public/screenshots/05.png" style="width: 100%; height: 100%; object-fit: cover;" />
  </div>
</div>
```

#### 5. Review Carousel (Social Proof)
Staggered review cards with alternating left/right offset:
```html
<div class="pl-5 pr-12">
  <div style="background: white; border-radius: 18px; padding: 14px 18px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <p style="font-size: 16px; font-weight: 800;">Username</p>
      <div style="display: flex; gap: 1px;">
        <svg viewBox="0 0 24 24" fill="#F2C94C" width="16" height="16"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>
    </div>
    <p style="font-size: 16px; color: #4B5563;">"Their actual review text here."</p>
  </div>
</div>
```

#### 6. CTA (Final Screenshot)
Social proof badges + lifestyle photo fading at bottom:
```html
<h1 class="text-[42px] font-extrabold tracking-[-0.03em]">
  Time to cook, <span class="inline-block bg-brand-green text-white px-[10px] rounded-[10px]">chef</span>
</h1>
<!-- Badge pills -->
<div class="flex flex-wrap gap-2.5 justify-center">
  <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border: 1.5px solid rgba(0,0,0,0.06); border-radius: 100px; padding: 10px 20px 10px 14px;">
    <span style="font-size: 16px; font-weight: 700;">No Ads</span>
  </div>
</div>
<!-- Lifestyle photo with gradient fade -->
<div style="position: absolute; bottom: -80px; left: 0; right: 0; height: 320px;">
  <div style="position: absolute; top: 0; left: 0; right: 0; height: 180px; background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0) 100%); z-index: 1;"></div>
  <img src="../../public/kitchen-light.jpg" style="width: 100%; height: 100%; object-fit: cover;" />
</div>
```

### Typography

**Google Fonts** — add to the `<head>` of each HTML file:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

**Recommended pairings:**
- **Inter** (body) + **Fraunces** (display) — modern + editorial
- **DM Sans** (body) + **DM Serif Display** (headlines) — clean + elegant
- **Plus Jakarta Sans** (body) + **Playfair Display** (headlines) — geometric + classic
- **Outfit** (body) + **Cal Sans** (display) — startup-y + bold

**iOS-native feel** — use the system font stack:
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
```

### Icon and Asset Resources

| Source | URL | Use For |
|--------|-----|---------|
| **Lucide Icons** | https://lucide.dev | Clean UI icons (MIT licensed) |
| **Heroicons** | https://heroicons.com | UI icons by Tailwind team (MIT) |
| **Simple Icons** | https://simpleicons.org | Brand/platform logos (YouTube, Instagram, etc.) |
| **SVG Repo** | https://www.svgrepo.com | Decorative elements, arrows, squiggles |
| **Unsplash** | https://unsplash.com | Lifestyle photography for backgrounds |
| **Pexels** | https://www.pexels.com | Free stock photography |

### Example Prompts

**Full screenshot set:**
```
Now we want to make beautiful screenshots for this app. Install the open-assets skill
from https://github.com/parra-inc/open-assets. Look at the marketing doc and
demographics. Design 8 high-converting App Store screenshots that catch your eye as
you scroll. Use bold headlines with highlighted keywords, phone mockups with real app
screenshots, and close with reviews + a CTA. Export for iPhone 6.7" and 6.9".
```

**Single screenshot iteration:**
```
Update the hero screenshot (01-hero.html) to use a bigger headline at 86px with a
colored background on the key word. Add the app rating below the logo. Make the
background food photo bleed off the bottom-right edge for visual impact.
```

**Adding a new export size:**
```
Add Play Store screenshot sizes to the config. Use 1080x2400 as the export size.
The screenshots can share the same templates.
```
