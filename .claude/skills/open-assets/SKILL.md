---
name: open-assets
description: Generate and manage app marketing assets (screenshots, icons, logos) using HTML/Tailwind with open-assets
user-invocable: true
---

## open-assets

open-assets is a dev server and export tool for app marketing assets — screenshots, icons, and logos — designed as HTML/CSS files rendered to PNG via Puppeteer. Think Storybook, but for marketing assets.

## Running

```bash
# Start dev server (preview + export UI)
open-assets dev

# Or with Tailwind
concurrently "npx @tailwindcss/cli -i src/styles.css -o dist/styles.css --watch" "open-assets dev"

# Headless render
open-assets render --tab icon
open-assets render --tab screenshots --width 1320 --height 2868 -o ./exports
open-assets render --all-presets
open-assets render --item 01-hero --variant appstore-6.7
open-assets render --force  # ignore cache, re-render everything
```

## manifest.json

The `manifest.json` at the project root defines all asset tabs. Here is the full schema:

```json
{
  "version": 1,
  "name": "App Display Name",
  "publicDir": "public",
  "command": "npx open-assets render --all-presets",
  "tabs": [
    {
      "id": "unique-id",
      "label": "Tab Label",
      "type": "iframe-gallery | icon | logo",
      ...type-specific fields
    }
  ]
}
```

### Root Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Manifest schema version (currently `1`) |
| `name` | string | App display name |
| `publicDir` | string | Directory for shared assets (images, logos, icons). Auto-served by dev server. |
| `command` | string | Export command hint for automation (e.g. `"npx open-assets render --all-presets"`) |
| `tabs` | array | Asset tab definitions |

### iframe-gallery (screenshots)

```json
{
  "id": "screenshots",
  "label": "Screenshots",
  "type": "iframe-gallery",
  "sourceWidth": 440,
  "sourceHeight": 956,
  "borderRadius": 4,
  "items": [
    { "src": "src/screenshots/01-hero.html", "name": "01-hero", "label": "Hero" }
  ],
  "exportPresets": [
    {
      "section": "App Store",
      "presets": [
        { "label": "iPhone 6.7\"", "width": 1320, "height": 2868, "zipName": "appstore-6.7" }
      ]
    }
  ],
  "customExport": { "defaultWidth": 1320, "defaultHeight": 2868 }
}
```

Each preset in `exportPresets` is a **variant** — a device size the screenshots get exported at. The `zipName` serves as the variant identifier and becomes the output subdirectory name.

### icon

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

### logo

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

## CLI Reference

### render command flags

| Flag | Description |
|------|-------------|
| `--tab <id>` | Render only the tab with this ID |
| `--item <name>` | Render only the item with this name (by `name` or `label`) |
| `--preset <name>` | Use a named export preset (by `label` or `zipName`) |
| `--variant <name>` | Alias for `--preset` — export a specific variant |
| `--all-presets` | Export at every preset size defined in the manifest |
| `--force` | Re-render all assets even if unchanged (ignore manifest.lock cache) |
| `-o, --output <dir>` | Output directory (default: `./exports`) |
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress progress logs |

Flags compose naturally:
- `--tab screenshots --item 01-hero --variant appstore-6.7` → single item, single size
- `--tab screenshots --item 01-hero --all-presets` → one item, all sizes
- `--tab screenshots --variant appstore-6.7` → all items, one size

## Creating New Screenshot HTML Files

Each screenshot is a standalone HTML file at fixed dimensions. Key rules:

1. Set `width` and `height` on the body to match `sourceWidth`/`sourceHeight` in the manifest
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

After creating the file, add it to the `items` array in the relevant tab in `manifest.json`.

## Adding a New Tab

Add a new object to the `tabs` array in `manifest.json`. Each tab needs a unique `id`. Supported types: `iframe-gallery`, `icon`, `logo`.

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
      instagram.svg
    screenshots/         # Real app screenshots for use in templates
      01.png
  src/
    styles.css           # Tailwind input
    icon.html            # App icon
    logo.svg             # Vector logo
    screenshots/
      01-hero.html
      02-features.html
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
  <!-- Platform icons at various positions on rings, with decreasing opacity for depth -->
  <div style="position: absolute; top: 52px; left: 216px; opacity: 0.85;">
    <img src="../../public/social/youtube.svg" width="68" height="68" style="border-radius: 50%;" />
  </div>
  <!-- ... more icons -->
</div>
```

#### 4. Feature Showcase
Headline + phone mockup showing a real app screenshot. Use the `phone` CSS class for a device frame.
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
<!-- Review card with glass-morphism shadow -->
<div class="pl-5 pr-12">
  <div style="background: white; border-radius: 18px; padding: 14px 18px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);">
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <p style="font-size: 16px; font-weight: 800;">Username</p>
      <div style="display: flex; gap: 1px;">
        <!-- 5 star SVGs -->
        <svg viewBox="0 0 24 24" fill="#F2C94C" width="16" height="16"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <!-- repeat 4 more -->
      </div>
    </div>
    <p style="font-size: 16px; color: #4B5563; line-height: 1.5;">"Their actual review text here."</p>
  </div>
</div>
<!-- Next card offset right -->
<div class="pl-12 pr-5 mt-2.5">
  <!-- Same card structure -->
</div>
```

#### 6. CTA (Final Screenshot)
Social proof badges + lifestyle photo fading at bottom:
```html
<h1 class="text-[42px] font-extrabold tracking-[-0.03em]">
  Time to cook, <span class="inline-block bg-brand-green text-white px-[10px] rounded-[10px]">chef</span>
</h1>
<!-- Decorative arrow -->
<img src="../../public/arrow.svg" style="position: absolute; right: -2px; top: -18px; width: 100px; transform: scaleY(-1) rotate(8deg); opacity: 0.9;" />
<!-- Badge pills -->
<div class="flex flex-wrap gap-2.5 justify-center">
  <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border: 1.5px solid rgba(0,0,0,0.06); border-radius: 100px; padding: 10px 20px 10px 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #D1FAE5, #A7F3D0); display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <span style="font-size: 16px; font-weight: 700;">No Ads</span>
  </div>
</div>
<!-- Lifestyle photo at bottom with gradient fade -->
<div style="position: absolute; bottom: -80px; left: 0; right: 0; height: 320px;">
  <div style="position: absolute; top: 0; left: 0; right: 0; height: 180px; background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 100%); z-index: 1;"></div>
  <img src="../../public/kitchen-light.jpg" style="width: 100%; height: 100%; object-fit: cover;" />
</div>
```

### Graphics Spanning Multiple Screenshots

Create visual continuity when screenshots are viewed side-by-side in the App Store:
- Use `position: absolute` with negative offsets to bleed elements off the edge
- A phone mockup partially off the right edge of screenshot 2 continues into screenshot 3
- Background gradients or patterns that flow across boundaries

```html
<!-- Element bleeding off right edge -->
<div class="absolute" style="right: -120px; bottom: 40px;">
  <div class="phone phone-280">
    <div class="phone-screen">
      <img src="../../public/screenshots/03.png" />
    </div>
  </div>
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

**Emphasis techniques:**
- Colored background pills on key words (see examples above)
- Different colored words within a headline
- `font-black` (weight 900) at 44-86px for maximum impact
- Tight letter-spacing: `tracking-[-0.03em]` to `tracking-[-0.04em]`
- Tight line-height: `leading-[0.9]` to `leading-[1.18]`

### Decorative Elements

**Arrows and squiggles** — position absolutely with organic rotation:
```html
<img src="../../public/arrow.svg" style="position: absolute; transform: scaleY(-1) rotate(8deg); opacity: 0.9;" />
```

**Badge pills** — glass-morphism style for social proof:
```css
background: rgba(255,255,255,0.85);
backdrop-filter: blur(12px);
border: 1.5px solid rgba(0,0,0,0.06);
border-radius: 100px;
box-shadow: 0 2px 12px rgba(0,0,0,0.06);
```

**Star ratings** — inline SVG with gold fill:
```html
<svg viewBox="0 0 24 24" fill="#F2C94C" width="16" height="16">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
</svg>
```

**Gradient icon circles**:
```css
background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
```

### Icon and Asset Resources

Download free, high-quality icons and graphics from these sources:

| Source | URL | Use For |
|--------|-----|---------|
| **Lucide Icons** | https://lucide.dev | Clean UI icons (MIT licensed) |
| **Heroicons** | https://heroicons.com | UI icons by Tailwind team (MIT) |
| **Simple Icons** | https://simpleicons.org | Brand/platform logos (YouTube, Instagram, etc.) |
| **SVG Repo** | https://www.svgrepo.com | Decorative elements, arrows, squiggles |
| **Unsplash** | https://unsplash.com | Lifestyle photography for backgrounds |
| **Pexels** | https://www.pexels.com | Free stock photography |

Use inline SVG when possible for crisp rendering at any export size.

### Social Proof Patterns

- **Review cards**: Author name + 5-star rating + quoted review text, staggered layout
- **Badge pills**: "No Ads" / "No Popups" / "No Tracking" with checkmark icons
- **App rating badge**: Star count + app logo
- **User count**: "Loved by 50,000+ home chefs" subtitle
- **Awards**: "App Store Editor's Choice" or similar laurels

### Example Prompts

Use these as starting points when asking Claude to create screenshots:

**Full screenshot set:**
```
Now we want to make beautiful screenshots for this app. Install the open-assets skill
from https://github.com/ianmaccallum/open-assets. Look at the marketing doc and
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
Add Android screenshot variants to the manifest. Use 1080x2400 as the export size.
The Android screenshots should have the same content as iOS but with 440x978
source dimensions.
```
