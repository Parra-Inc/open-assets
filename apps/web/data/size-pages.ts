import { site } from './site'
import type { Faq, PageSeo, RelatedLink } from './types'

/**
 * Size reference pages, one entry per /sizes/<slug> (plan section 6). The table
 * itself always comes from lib/sizes.mjs, so these pages match the CLI.
 */
export interface SizePageEntry extends PageSeo {
  name: string
  /** The direct answer, first sentence on the page, with the main size. */
  answer: string
  /** Size names from lib/sizes.mjs shown in the table, in order. */
  sizeNames: string[]
  /** ISO date the numbers were last checked against the store docs. */
  lastVerified: string
  /** Store documentation the sizes were checked against. */
  references: { label: string; url: string }[]
  /** Format, file size and platform rules, one per bullet. */
  notes: string[]
  /** Sections with an id, for anchor links such as /sizes/iphone#iphone-6-9. */
  anchors?: { id: string; heading: string; sizeName: string; body: string }[]
  guide?: RelatedLink
  /**
   * The matching template. Links to /templates/<slug> once that page exists in
   * data/templates.ts, and to `fallback` (a working example) until then.
   */
  template?: { slug: string; label: string; fallback: RelatedLink }
  faqs: Faq[]
  related: RelatedLink[]
}

const VERIFIED = '2026-11-17'
const SOURCES = ['data/size-pages.ts', '../../lib/sizes.mjs']

const apple = {
  label: 'Apple screenshot specifications',
  url: 'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications',
}
const appleIcons = { label: 'Apple Human Interface Guidelines: App icons', url: 'https://developer.apple.com/design/human-interface-guidelines/app-icons' }

const guide = (path: string, label: string): RelatedLink => ({ href: `${site.docs}/guides/${path}`, label })
const example = (dir: string, label: string): RelatedLink => ({ href: `${site.github}/tree/main/examples/${dir}`, label })

export const sizePages: SizePageEntry[] = [
  {
    slug: 'app-store-screenshots',
    name: 'App Store screenshots',
    title: 'App Store Screenshot Sizes (2026) | Open Assets',
    description:
      'App Store screenshot sizes for iPhone and iPad: 1320×2868 for 6.9 inch, 2064×2752 for iPad 13 inch, plus formats, limits and an assets.json snippet to copy.',
    h1: 'App Store screenshot sizes',
    summary: 'Every iPhone and iPad screenshot size App Store Connect accepts, with the 6.9 inch 1320×2868 answer first.',
    answer:
      'The main App Store screenshot size is 1320×2868 pixels (iPhone 6.9 inch, portrait). Add 2064×2752 (iPad 13 inch) if your app runs on iPad. App Store Connect scales the larger sizes down for smaller devices.',
    sizeNames: ['iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-6.1', 'ipad-13', 'ipad-12.9'],
    lastVerified: VERIFIED,
    references: [apple],
    notes: [
      'Formats: PNG, JPEG or JPG. No alpha channel or transparency.',
      'Up to 10 screenshots per device size, and at least one to submit.',
      'Landscape is the same pixels with width and height swapped.',
      'If you skip a smaller size, App Store Connect scales down from a larger one, so one 6.9 inch set covers most iPhones.',
      'iPad screenshots are 3:4, iPhone screenshots are about 9:19.5. Use a separate collection with an iPad source size so nothing crops.',
    ],
    guide: guide('app-store-screenshots', 'Generate App Store screenshots from HTML'),
    template: { slug: 'app-store-screenshots', label: 'App Store screenshot template', fallback: example('tax-days', 'Example: Tax Days screenshot templates') },
    faqs: [
      { q: 'What size are App Store screenshots in 2026?', a: 'Upload 1320×2868 for the iPhone 6.9 inch class. App Store Connect also accepts 1290×2796 and 1260×2736 in that class. For iPad, upload 2064×2752 (13 inch).' },
      { q: 'Do I need a screenshot set for every iPhone size?', a: 'No. App Store Connect scales screenshots from a larger size when a smaller one is missing. Upload separate sets only when you want different art per device.' },
      { q: 'Can screenshots have transparency?', a: 'No. Apple rejects screenshots with an alpha channel. Open Assets renders opaque PNGs when the template paints a full background.' },
    ],
    related: [
      { href: '/sizes/iphone', label: 'iPhone screenshot sizes', description: '6.9, 6.7, 6.5 and 6.1 inch, one section each.' },
      { href: '/sizes/app-icon-ios', label: 'iOS app icon size', description: 'The 1024×1024 App Store icon.' },
      guide('app-store-connect', 'Upload to App Store Connect'),
    ],
    sources: SOURCES,
  },
  {
    slug: 'iphone',
    name: 'iPhone screenshots',
    title: 'iPhone Screenshot Sizes: 6.9, 6.7, 6.5, 6.1 | Open Assets',
    description:
      'iPhone App Store screenshot sizes by display: 6.9 inch 1320×2868, 6.7 inch 1290×2796, 6.5 inch 1284×2778 and 6.1 inch 1179×2556, checked against Apple docs.',
    h1: 'iPhone screenshot sizes for the App Store',
    summary: 'Pixel sizes for 6.9, 6.7, 6.5 and 6.1 inch iPhone screenshots, one anchored section each.',
    answer:
      'Use 1320×2868 pixels for iPhone 6.9 inch screenshots. The other classes are 1290×2796 (6.7 inch), 1284×2778 (6.5 inch) and 1179×2556 (6.1 inch), all portrait.',
    sizeNames: ['iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-6.1'],
    lastVerified: VERIFIED,
    references: [apple],
    notes: [
      'Formats: PNG, JPEG or JPG, no transparency, up to 10 per size.',
      'Author templates at 440×956 points: it scales cleanly to both the 6.9 and 6.7 inch sizes.',
    ],
    anchors: [
      { id: 'iphone-6-9', heading: 'iPhone 6.9 inch', sizeName: 'iphone-6.9', body: 'The largest class (iPhone Pro Max and Air models). Apple also accepts 1290×2796 and 1260×2736 here. Upload this set first.' },
      { id: 'iphone-6-7', heading: 'iPhone 6.7 inch', sizeName: 'iphone-6.7', body: 'Shares the Dynamic Island large-display category with 6.9 inch, so App Store Connect accepts it in the same slot.' },
      { id: 'iphone-6-5', heading: 'iPhone 6.5 inch', sizeName: 'iphone-6.5', body: 'The Face ID large-display class. Apple also accepts 1242×2688. Only needed when you do not provide the larger Dynamic Island set.' },
      { id: 'iphone-6-1', heading: 'iPhone 6.1 inch', sizeName: 'iphone-6.1', body: 'The medium Dynamic Island class. Apple also accepts 1206×2622. It can be scaled from a larger set.' },
    ],
    guide: guide('app-store-screenshots', 'Generate App Store screenshots from HTML'),
    template: { slug: 'app-store-screenshots', label: 'App Store screenshot template', fallback: example('thoughtful', 'Example: Thoughtful screenshot templates') },
    faqs: [
      { q: 'Which iPhone screenshot size should I upload?', a: '1320×2868 (6.9 inch). It is the largest class and App Store Connect scales it down for smaller iPhones.' },
      { q: 'Is 1290×2796 still accepted?', a: 'Yes. As of 2026-11-17 Apple lists 1290×2796 as an accepted portrait size in the large Dynamic Island class.' },
    ],
    related: [
      { href: '/sizes/app-store-screenshots', label: 'All App Store screenshot sizes', description: 'iPhone and iPad together.' },
      { href: '/sizes/app-icon-ios', label: 'iOS app icon size' },
    ],
    sources: SOURCES,
  },
  {
    slug: 'og-image',
    name: 'OG image',
    title: 'OG Image Size: 1200×630 Open Graph Spec | Open Assets',
    description:
      'The recommended Open Graph image size is 1200×630 pixels at 1.91:1, with 600×315 as the minimum for large cards. File size, format and X card notes inside.',
    h1: 'OG image size',
    summary: 'The 1200×630 Open Graph image size, minimums, file size limit and the X (Twitter) card size.',
    answer:
      'Make Open Graph images 1200×630 pixels (1.91:1). Facebook shows large link previews from 600×315 up and accepts files up to 8 MB.',
    sizeNames: ['og', 'twitter-card'],
    lastVerified: VERIFIED,
    references: [{ label: 'Meta image sharing guidelines', url: 'https://developers.facebook.com/docs/sharing/webmasters/images/' }],
    notes: [
      'Aspect ratio about 1.91:1 so the full image shows without cropping.',
      'Minimum for a large preview: 600×315. Anything under 200×200 is rejected.',
      'Maximum file size 8 MB on Facebook. Keep it well under 1 MB so crawlers fetch it quickly.',
      'Set og:image:width and og:image:height so the first share renders without a refetch.',
      'Open Assets renders static images at build time. For per-request images (one per blog post on the fly) a runtime generator such as Vercel OG fits better.',
    ],
    guide: guide('og-images', 'Generate OG images'),
    template: { slug: 'og-image', label: 'OG image template', fallback: { href: `${site.docs}/guides/og-images`, label: 'OG image starter in the docs' } },
    faqs: [
      { q: 'What is the best OG image size?', a: '1200×630 pixels. It meets the large-card minimum on every major network and keeps the 1.91:1 ratio.' },
      { q: 'Should the X (Twitter) card be a different size?', a: 'X uses og:image when no twitter:image is set. Open Assets also ships a 1200×675 twitter-card preset for a 16:9 card.' },
      { q: 'PNG or JPEG?', a: 'Both work. PNG keeps text crisp; JPEG is smaller for photos.' },
    ],
    related: [
      { href: '/sizes/favicon', label: 'Favicon sizes' },
      guide('favicons', 'Generate favicons'),
    ],
    sources: SOURCES,
  },
  {
    slug: 'favicon',
    name: 'Favicon',
    title: 'Favicon Sizes: 16, 32, 180, 192 and 512 px | Open Assets',
    description:
      'Favicon and web app icon sizes: 32×32 and 16×16 favicons, 180×180 Apple touch icon, and 192 and 512 PWA icons, with Google Search rules and a snippet to copy.',
    h1: 'Favicon sizes',
    summary: 'The 16, 32, 180, 192 and 512 pixel icons a site needs, from browser tab to installed PWA.',
    answer:
      'Ship a 32×32 favicon, a 180×180 Apple touch icon, and 192×192 plus 512×512 icons in your web manifest. Add 16×16 only if you design a separate small version.',
    sizeNames: ['favicon-32', 'favicon-16', 'apple-touch-icon', 'pwa-192', 'pwa-512'],
    lastVerified: VERIFIED,
    references: [
      { label: 'Google Search favicon guidelines', url: 'https://developers.google.com/search/docs/appearance/favicon-in-search' },
      { label: 'web.dev: Add a web app manifest', url: 'https://web.dev/articles/add-manifest' },
    ],
    notes: [
      'Google Search needs a square favicon of at least 8×8 and recommends larger than 48×48.',
      'Chromium needs both 192×192 and 512×512 manifest icons to offer install.',
      'Open Assets exports PNG. It does not produce .ico files; every current browser accepts PNG favicons.',
      'Icons at 16 and 32 pixels read best from a template designed near that size, not a scaled-down 1024 logo.',
    ],
    guide: guide('favicons', 'Generate favicons'),
    template: { slug: 'favicon', label: 'Favicon template', fallback: { href: `${site.docs}/guides/favicons`, label: 'Favicon starter in the docs' } },
    faqs: [
      { q: 'What size should a favicon be?', a: '32×32 for the browser tab, plus a 180×180 Apple touch icon and 192 and 512 pixel manifest icons. Google Search wants a square icon larger than 48×48 for best results.' },
      { q: 'Do I still need favicon.ico?', a: 'No. Current browsers accept PNG. Keep an .ico only if you support very old browsers, and make it with another tool.' },
    ],
    related: [
      { href: '/sizes/og-image', label: 'OG image size' },
      { href: '/sizes/app-icon-ios', label: 'iOS app icon size' },
    ],
    sources: SOURCES,
  },
  {
    slug: 'app-icon-ios',
    name: 'iOS app icon',
    title: 'iOS App Icon Size: 1024×1024 for App Store | Open Assets',
    description:
      'The iOS app icon size is 1024×1024 pixels: one opaque, square PNG with no rounded corners. Xcode makes the rest. Rules, a snippet and the Xcode icon set guide.',
    h1: 'iOS app icon size',
    summary: 'The 1024×1024 App Store icon, its format rules, and how to fill an Xcode icon set from one design.',
    answer:
      'An iOS app icon is one 1024×1024 pixel PNG. Xcode derives the smaller home screen, Spotlight and Settings sizes from it.',
    sizeNames: ['app-icon'],
    lastVerified: VERIFIED,
    references: [appleIcons],
    notes: [
      'Square and full bleed. iOS applies the rounded corner mask, so do not draw it.',
      'Opaque: no transparency. Paint the whole square.',
      'Keep detail away from the edges; the mask trims the corners.',
      'Open Assets can write the icon straight into AppIcon.appiconset with the xcode output.',
    ],
    guide: guide('xcode-app-icon', 'Fill an Xcode app icon set'),
    template: { slug: 'app-icon', label: 'App icon template', fallback: example('cat-iq-test', 'Example: Cat IQ icon template') },
    faqs: [
      { q: 'Do I still need every icon size for iOS?', a: 'No. Since Xcode 14 a single 1024×1024 icon is enough; Xcode generates the device sizes.' },
      { q: 'Can the App Store icon have rounded corners or transparency?', a: 'No. Upload a square, opaque image. iOS applies the corner mask itself.' },
    ],
    related: [
      { href: '/sizes/app-store-screenshots', label: 'App Store screenshot sizes' },
      { href: '/sizes/favicon', label: 'Favicon sizes' },
    ],
    sources: SOURCES,
  },
]
