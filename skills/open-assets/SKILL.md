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
concurrently "npx @tailwindcss/cli -i src/styles.css -o dist/styles.css --watch" "open-assets dev"

# Headless render
open-assets render --collection screenshots --size iphone-6.9
open-assets render --collection icon --all
open-assets render --all
open-assets render --template 01-hero --all
open-assets render --platform "App Store"
open-assets render --force  # ignore cache, re-render everything
```

## Concepts

| Term | Definition |
|------|-----------|
| **Collection** | A named group of related assets sharing the same source size and export sizes. One tab in the dev UI. |
| **Template** | A single source file (HTML or SVG) that produces one image per export size. |
| **Export Size** | A named output dimension that templates are rendered at (e.g., "iPhone 6.9" → 1320×2868). |
| **Platform** | Optional grouping label for related export sizes (e.g., "App Store", "Play Store"). |
| **Source Size** | The dimensions the HTML template is authored at. Puppeteer scales from source → export size. |
| **Output** | An optional post-render action (e.g., write to Xcode `.appiconset`, copy SVG source). |

## manifest.json

The `manifest.json` at the project root defines all asset collections. All collections follow the same unified schema — no `type` field needed.

```json
{
  "version": 1,
  "name": "App Display Name",
  "publicDir": "public",
  "command": "npx open-assets render --all",
  "collections": [
    {
      "id": "unique-id",
      "label": "Tab Label",
      "sourceSize": { "width": 440, "height": 956 },
      "borderRadius": 4,
      "templates": [
        { "src": "src/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" }
      ],
      "exportSizes": [
        {
          "platform": "App Store",
          "sizes": [
            { "name": "iphone-6.9", "label": "iPhone 6.9\"", "width": 1320, "height": 2868 }
          ]
        }
      ],
      "outputs": [],
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
| `exportSizes` | array | Size groups: `{ platform?, sizes: [{ name, label, width, height }] }` |
| `outputs` | array | Post-render actions (optional) |
| `customExport` | object | Custom size defaults for UI (optional) |

### Output Types

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
    { "src": "src/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" },
    { "src": "src/screenshots/02-features.html", "name": "02-features", "label": "Features" }
  ],
  "exportSizes": [
    {
      "platform": "App Store",
      "sizes": [
        { "name": "iphone-6.9", "label": "iPhone 6.9\"", "width": 1320, "height": 2868 },
        { "name": "iphone-6.7", "label": "iPhone 6.7\"", "width": 1290, "height": 2796 }
      ]
    }
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
    { "src": "src/icon.html", "name": "icon", "label": "App Icon" }
  ],
  "exportSizes": [
    {
      "platform": "Apple",
      "sizes": [
        { "name": "1024", "label": "1024px", "width": 1024, "height": 1024 },
        { "name": "180", "label": "180px", "width": 180, "height": 180 }
      ]
    }
  ],
  "outputs": [{ "type": "xcode", "path": "../MyApp/Assets.xcassets/AppIcon.appiconset" }]
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
    { "src": "src/icons/concept-a.html", "name": "concept-a", "label": "Concept A" },
    { "src": "src/icons/concept-b.html", "name": "concept-b", "label": "Concept B" }
  ],
  "exportSizes": [
    { "sizes": [{ "name": "1024", "label": "1024px", "width": 1024, "height": 1024 }] }
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
    { "src": "src/logo.svg", "name": "logo", "label": "Logo" },
    { "src": "src/logo-dark.svg", "name": "logo-dark", "label": "Dark" }
  ],
  "exportSizes": [
    { "sizes": [
      { "name": "1024", "label": "1024px", "width": 1024, "height": 1024 },
      { "name": "512", "label": "512px", "width": 512, "height": 512 }
    ] }
  ],
  "outputs": [{ "type": "copy-source", "format": "svg" }]
}
```

**OG Images** (social cards):
```json
{
  "id": "og-images",
  "label": "Social Cards",
  "sourceSize": { "width": 1200, "height": 630 },
  "templates": [
    { "src": "src/og/default.html", "name": "default", "label": "Default OG" }
  ],
  "exportSizes": [
    { "sizes": [{ "name": "og", "label": "OG Image", "width": 1200, "height": 630 }] }
  ]
}
```

## CLI Reference

### render command flags

| Flag | Description |
|------|-------------|
| `--collection <id>` | Render only the collection with this ID |
| `--template <name>` | Render only the template with this name |
| `--size <name>` | Use a named export size from manifest |
| `--platform <name>` | Render only sizes for this platform |
| `--all` | Export at every size defined in the manifest |
| `--force` | Re-render all assets even if unchanged |
| `-o, --output <dir>` | Output directory (default: `./exports`) |
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress progress logs |

Flags compose naturally:
- `--collection screenshots --template 01-hero --size iphone-6.9` → single template, single size
- `--collection screenshots --template 01-hero --all` → one template, all sizes
- `--collection screenshots --size iphone-6.9` → all templates, one size
- `--collection screenshots --platform "App Store"` → all templates, all App Store sizes

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

Each screenshot is a standalone HTML file at fixed dimensions. Key rules:

1. Set `width` and `height` on the body to match `sourceSize` in the manifest
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

After creating the file, add it to the `templates` array in the relevant collection in `manifest.json`.

## Adding a New Collection

Add a new object to the `collections` array in `manifest.json`. Each collection needs a unique `id`, a `sourceSize`, `templates`, and `exportSizes`.

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

## Incremental Builds (manifest.lock)

The `render` command maintains a `manifest.lock` file with SHA256 checksums of source files. On subsequent renders, unchanged assets are skipped automatically. Use `--force` to re-render everything.

Note: only source HTML/SVG files are checksummed. Changes to referenced assets (images in publicDir, compiled CSS) will not trigger re-renders — use `--force` when those change.

## File Structure Convention

```
project/
  manifest.json
  manifest.lock          # Auto-generated, add to .gitignore
  public/                # Shared assets (images, logos, icons, photos)
    logo-round.png
    social/
      youtube.svg
    screenshots/         # Real app screenshots for use in templates
      01.png
  src/
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

**Adding a new platform:**
```
Add Play Store screenshot sizes to the manifest. Use 1080x2400 as the export size
under a "Play Store" platform group. The screenshots can share the same templates.
```
