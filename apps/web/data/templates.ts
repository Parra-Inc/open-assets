import { site } from './site'
import type { Faq, PageSeo, RelatedLink } from './types'

/**
 * Template gallery, one entry per /templates/<slug> page (plan section 5).
 * Add an entry plus its images under public/img/templates/<slug>/; the hub,
 * sitemap, llms files, footer and SEO gate pick it up with no other edits.
 *
 * Thin-content guard (enforced by scripts/seo-gate.mjs after build): every
 * page needs at least 400 words of copy outside code blocks, at least 3
 * variants or a size table, and an FAQ. A template that cannot meet that is
 * folded into a parent page instead (the X header lives on the Product Hunt
 * page, the logo lockup on the app icon page).
 */
export interface TemplateVariant {
  key: string
  label: string
  /** Path under public/, for example /img/templates/<slug>/dark.webp. */
  image: string
  width: number
  height: number
  alt: string
}

export interface TemplateSection {
  heading: string
  body: string[]
}

export interface TemplateEntry extends PageSeo {
  /** Short display name, for cards and breadcrumbs. */
  name: string
  category: 'screenshots' | 'icons' | 'og-images' | 'banners'
  /** Intro paragraphs under the H1. */
  intro: string[]
  /** Size names from lib/sizes.mjs this template renders at. */
  sizes: string[]
  variants: TemplateVariant[]
  /** Longer how-to copy, rendered after the preview. */
  sections: TemplateSection[]
  /** The source of the template on GitHub. */
  example: { href: string; label: string }
  /** A prompt for a coding agent that recreates this template. */
  prompt: string
  /** The assets.json collection for this template, as pretty-printed JSON. */
  config: string
  /** Docs guide this template belongs to. */
  guide?: RelatedLink
  faqs: Faq[]
  related: RelatedLink[]
  /** Shown in the homepage gallery when set, lowest first. */
  homeRank?: number
}

const repo = 'https://github.com/Parra-Inc/open-assets/tree/main'
const img = (slug: string, file: string) => `/img/templates/${slug}/${file}.webp`
const json = (v: unknown) => JSON.stringify(v, null, 2)
const size = (name: string, width: number, height: number) => ({ name, size: { width, height } })
const guide = (path: string, label: string): RelatedLink => ({ href: `${site.docs}/guides/${path}`, label })
const tpl = (slug: string, name: string) => ({ src: `assets/${slug}/${name}.html`, name })

const iphoneSizes = [size('iphone-6.9', 1320, 2868), size('iphone-6.7', 1290, 2796), size('iphone-6.5', 1284, 2778), size('iphone-6.1', 1179, 2556)]

export const templates: TemplateEntry[] = [
  {
    slug: 'app-store-screenshots',
    name: 'App Store screenshots',
    category: 'screenshots',
    homeRank: 1,
    title: 'App Store screenshot template (HTML) | Open Assets',
    description:
      'Free App Store screenshot template in HTML and CSS. Device frame hero, dark and localized variants, rendered at every iPhone size by the Open Assets CLI.',
    h1: 'App Store screenshot template',
    summary: 'Device-frame hero screenshots for iPhone, written in HTML and rendered at 6.9, 6.7, 6.5 and 6.1 inch sizes.',
    intro: [
      'This App Store screenshot template is a headline above a phone frame, with your real app screenshot inside the frame. It is the layout most top charting apps use, written as one HTML file per screenshot.',
      'Open Assets renders each file at every iPhone size Apple accepts, so you design once at 440 by 956 points and get all four PNG sets from one command.',
    ],
    sizes: ['iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-6.1'],
    variants: [
      { key: 'tax-days', label: 'Light, device frame', image: img('app-store-screenshots', 'tax-days'), width: 1600, height: 833, alt: 'Four Tax Days App Store screenshots with a headline over a phone frame on a pale green background' },
      { key: 'cat-iq-test', label: 'Dark, bold', image: img('app-store-screenshots', 'cat-iq-test'), width: 1600, height: 833, alt: 'Four Cat IQ Test App Store screenshots on a dark purple background with large white headlines' },
      { key: 'thoughtful', label: 'Editorial, no frame', image: img('app-store-screenshots', 'thoughtful'), width: 1600, height: 833, alt: 'Four Thoughtful App Store screenshots in a serif editorial style on cream paper' },
      { key: 'skimmer-arabic', label: 'Localized, right to left', image: img('app-store-screenshots', 'skimmer-arabic'), width: 1600, height: 833, alt: 'Four Skimmer App Store screenshots in Arabic, laid out right to left' },
    ],
    sections: [
      {
        heading: 'What the template contains',
        body: [
          'Each screenshot is a single HTML file in assets/screenshots/. The top third holds a short pill, a two line headline and one supporting sentence. The bottom two thirds hold a CSS phone frame that runs past the bottom edge, which reads as larger on a small search result than a phone that floats in the middle.',
          'Copy lives in localizations.json as keys like hero_line1, so the same file renders in every language. The Arabic variant above is the same HTML with dir="rtl" set by the CLI, not a second design.',
        ],
      },
      {
        heading: 'How to adapt it to your app',
        body: [
          'Replace the PNGs in public/screenshots/en/ with captures from your app, ideally exported from UI tests so they stay current. Change the brand tokens in the stylesheet, then edit the headline keys. Keep each headline under about six words; App Store search shows screenshots at roughly a quarter of their real size.',
          'Order matters more than polish. The first three screenshots appear in search results, so lead with the outcome a user gets, then the main screen, then the feature that sets you apart.',
        ],
      },
      {
        heading: 'Variants worth trying',
        body: [
          'The dark version suits games, media and night time apps. The editorial version drops the frame and works for writing or journaling apps where the text is the product. A comparison or review screenshot is a good fourth or fifth slide once the basics are in place.',
        ],
      },
    ],
    example: { href: `${repo}/examples/tax-days`, label: 'Tax Days example on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), create an App Store screenshot collection in assets.json with sourceSize 440x956 and exports iphone-6.9, iphone-6.7, iphone-6.5 and iphone-6.1. Make one HTML file per screenshot in assets/screenshots/: a pill, a two line headline with one accent word and a short subheadline at the top, then a CSS phone frame holding my app screenshot from public/screenshots/en/, running off the bottom edge. Put all copy in localizations.json. Render with npx open-assets render and show me the PNGs.',
    config: json({
      id: 'screenshots',
      label: 'App Store screenshots',
      sourceSize: { width: 440, height: 956 },
      locales: ['en', 'ar', 'de', 'ja'],
      templates: [tpl('screenshots', '01-hero'), tpl('screenshots', '02-dashboard'), tpl('screenshots', '03-calendar')],
      export: iphoneSizes,
    }),
    guide: guide('app-store-screenshots', 'App Store screenshot guide'),
    faqs: [
      { q: 'What size should App Store screenshots be in 2026?', a: 'Apple requires one iPhone set. The 6.9 inch size, 1320 by 2868 pixels, is the one to upload first; App Store Connect scales it down for older phones. Open Assets also renders 6.7, 6.5 and 6.1 inch sets if you want exact pixels for each.' },
      { q: 'Can I use this template without a designer?', a: 'Yes. The template is plain HTML and CSS, so a coding agent like Claude Code can edit the copy, colors and screenshots from a prompt. Paste the agent prompt on this page to start.' },
      { q: 'How many screenshots should I make?', a: 'Apple allows up to ten. Most apps ship five to eight. The first three matter most because they show in search results.' },
      { q: 'Does it work for localized App Store listings?', a: 'Yes. Add locales to the collection and keys to localizations.json. The CLI renders one folder per locale and flips right to left languages automatically.' },
    ],
    related: [
      { href: '/templates/ipad-screenshots', label: 'iPad screenshot template' },
      { href: '/templates/google-play-screenshots', label: 'Google Play screenshot template' },
      { href: '/templates/app-icon', label: 'App icon template' },
    ],
  },
  {
    slug: 'google-play-screenshots',
    name: 'Google Play screenshots',
    category: 'screenshots',
    homeRank: 2,
    title: 'Google Play screenshot template (HTML) | Open Assets',
    description:
      'Free Google Play screenshot template in HTML. Phone and tablet store listing images rendered at 1080x1920 and up by the Open Assets CLI, ready for Play Console.',
    h1: 'Google Play screenshot template',
    summary: 'Phone and tablet screenshots for a Play Store listing, rendered at the sizes Play Console accepts.',
    intro: [
      'This Google Play screenshot template gives you phone and tablet store listing images from the same HTML you use for iOS, with an Android style frame and a slightly taller canvas.',
      'Play Console accepts a range of aspect ratios, so the template renders at 1080 by 1920 for phones plus 7 inch and 10 inch tablet sizes, all from one command.',
    ],
    sizes: ['phone', 'phone-tall', 'tablet-7', 'tablet-10'],
    variants: [
      { key: 'only-recipes', label: 'Bold photo hero', image: img('google-play-screenshots', 'only-recipes'), width: 1600, height: 851, alt: 'Four Only Recipes Google Play screenshots with large food photography and green highlighted headlines' },
      { key: 'tax-days', label: 'Light, phone frame', image: img('google-play-screenshots', 'tax-days'), width: 1600, height: 851, alt: 'Four Tax Days Google Play phone screenshots with headlines above an Android phone frame' },
      { key: 'tax-days-tablet', label: '10 inch tablet', image: img('google-play-screenshots', 'tax-days-tablet'), width: 1600, height: 829, alt: 'Three Tax Days Google Play screenshots rendered at the 10 inch tablet size' },
    ],
    sections: [
      {
        heading: 'How it differs from the iOS template',
        body: [
          'The Android collection uses a 440 by 978 source size instead of 440 by 956, which matches the 9 by 20 ratio of most current Android phones. The frame has a punch hole camera and thinner bezels, so the listing does not look like an iPhone app that was copied over.',
          'Everything else is shared. The same stylesheet, the same localizations.json and the same app captures can feed both stores, which keeps the two listings in step when you change a headline.',
        ],
      },
      {
        heading: 'Phone and tablet from one design',
        body: [
          'Play Console asks for tablet screenshots if you want the app featured on tablets and Chromebooks. Add tablet-7 and tablet-10 to the export list and the CLI scales the same template up. Because the canvas is wider, check that headlines still wrap where you expect before uploading.',
          'Google shows screenshots in a horizontal row on phones, so the first two carry most of the weight. Lead with the main benefit, not the sign in screen.',
        ],
      },
      {
        heading: 'Pair it with a feature graphic',
        body: [
          'A Play listing also needs a 1024 by 500 feature graphic, which appears above the screenshots on some surfaces. The feature graphic template on this site uses the same brand tokens, so add it to the same assets.json.',
        ],
      },
    ],
    example: { href: `${repo}/examples/only-recipes`, label: 'Only Recipes example on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add an Android screenshot collection to assets.json with sourceSize 440x978 and exports phone (1080x1920), tablet-7 and tablet-10. Reuse my iOS screenshot copy, but use an Android phone frame with a punch hole camera. One HTML file per screenshot in assets/screenshots-android/. Render with npx open-assets render and list the output files.',
    config: json({
      id: 'android',
      label: 'Google Play screenshots',
      sourceSize: { width: 440, height: 978 },
      templates: [tpl('screenshots-android', '01-hero'), tpl('screenshots-android', '02-import'), tpl('screenshots-android', '03-save-from-anywhere')],
      export: [size('phone', 1080, 1920), size('tablet-7', 1200, 1920), size('tablet-10', 1600, 2560)],
    }),
    guide: guide('google-play', 'Google Play guide'),
    faqs: [
      { q: 'What size are Google Play screenshots?', a: 'Play Console accepts PNG or JPEG between 320 and 3840 pixels per side, with the long side no more than twice the short side. 1080 by 1920 is the common phone size; Open Assets also has a 1080 by 2400 preset for tall phones.' },
      { q: 'How many Google Play screenshots do I need?', a: 'At least two and up to eight per device type. Tablet screenshots are optional but needed for tablet featuring.' },
      { q: 'Can I reuse my App Store screenshots for Google Play?', a: 'You can, but an iPhone frame on a Play listing looks out of place. Keep the copy and swap the frame, which this template does.' },
      { q: 'Does Open Assets upload to Play Console?', a: 'No. It renders the PNGs. Upload them by hand or with a tool like fastlane supply.' },
    ],
    related: [
      { href: '/templates/play-feature-graphic', label: 'Play feature graphic template' },
      { href: '/templates/app-store-screenshots', label: 'App Store screenshot template' },
      { href: '/templates/favicon', label: 'Favicon template' },
    ],
  },
  {
    slug: 'product-hunt-gallery',
    name: 'Product Hunt gallery',
    category: 'banners',
    homeRank: 5,
    title: 'Product Hunt gallery image template | Open Assets',
    description:
      'Free Product Hunt gallery template in HTML. Launch images at 1270x760 plus a matching X header, rendered from your repo with the Open Assets CLI for launch day.',
    h1: 'Product Hunt gallery template',
    summary: 'A launch day image set: Product Hunt gallery slides at 1270 by 760 and a matching X header.',
    intro: [
      'This Product Hunt gallery template is a set of five to seven 1270 by 760 slides that tell the launch story: what it is, how it works, proof and a call to action.',
      'The same project renders the 1500 by 500 X header you change on launch day, so every image in the launch matches.',
    ],
    sizes: ['product-hunt'],
    variants: [
      { key: 'cat-iq-test', label: 'Playful hero', image: img('product-hunt-gallery', 'cat-iq-test'), width: 1270, height: 760, alt: 'Cat IQ Test Product Hunt gallery hero slide with a cat illustration and bold headline' },
      { key: 'cat-iq-test-how', label: 'How it works', image: img('product-hunt-gallery', 'cat-iq-test-how'), width: 1270, height: 760, alt: 'Cat IQ Test Product Hunt slide explaining how the quiz works in three steps' },
      { key: 'no-context', label: 'Product shot', image: img('product-hunt-gallery', 'no-context'), width: 1270, height: 760, alt: 'No Context Bot Product Hunt slide showing a Slack message with a generated painting' },
      { key: 'no-context-pricing', label: 'Pricing', image: img('product-hunt-gallery', 'no-context-pricing'), width: 1270, height: 760, alt: 'No Context Bot Product Hunt slide showing pricing plans' },
      { key: 'x-header', label: 'X header 1500x500', image: img('social-header', 'no-context'), width: 1600, height: 533, alt: 'No Context Bot X profile header with a headline on the left and a tilted gallery of paintings on the right' },
    ],
    sections: [
      {
        heading: 'The slide order that works',
        body: [
          'The first slide doubles as the thumbnail, so it needs the product name and one line of value in type large enough to read at card size. Slide two explains the problem or the idea. Slides three to five show the product doing its job. The last slide repeats the offer and where to get it.',
          'Each slide is its own HTML file, which makes it easy to reorder or drop one the night before launch without opening a design tool.',
        ],
      },
      {
        heading: 'The X header comes along',
        body: [
          'The No Context example keeps the X header in the same assets.json as the gallery. It renders at 1x and 2x so it stays sharp on high density screens. The left side holds the headline and keeps clear of the round profile photo that X places over the bottom left corner.',
          'A separate page for the header alone would repeat most of what is here, so it lives as a variant of this template.',
        ],
      },
      {
        heading: 'Launch checklist',
        body: [
          'Render at 2x as well as 1x if you want crisp images on retina displays; Product Hunt downsizes either way. Keep text away from the outer 40 pixels, which can be cropped in some layouts. Commit the rendered set so the launch post links to images that match the repo.',
        ],
      },
    ],
    example: { href: `${repo}/examples/no-context`, label: 'No Context example on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), create a product-hunt collection in assets.json with sourceSize 1270x760 and exports 1x and 2x. Make five HTML slides in assets/launches/product-hunt/: hero with product name and one line, the problem, how it works in three steps, a product screenshot, and a call to action. Add an x-header collection at 1500x500 in the same style with the headline on the left half. Render with npx open-assets render.',
    config: json({
      id: 'product-hunt',
      label: 'Product Hunt',
      sourceSize: { width: 1270, height: 760 },
      templates: [tpl('launches/product-hunt', '01-hero'), tpl('launches/product-hunt', '02-whats-a-no-context-channel'), tpl('launches/product-hunt', '03-how-it-works')],
      export: [size('1x', 1270, 760), size('2x', 2540, 1520)],
    }),
    guide: guide('launch-kit', 'Launch kit guide'),
    faqs: [
      { q: 'What size are Product Hunt gallery images?', a: 'Product Hunt recommends 1270 by 760 pixels for gallery images. Open Assets has a product-hunt preset at that size, and you can add a 2x export for sharper images.' },
      { q: 'How many gallery images should a launch have?', a: 'Most strong launches use four to eight. The first image is the thumbnail, so treat it like a cover.' },
      { q: 'What size is an X (Twitter) header?', a: '1500 by 500 pixels. Keep important text off the bottom left, where the profile photo overlaps.' },
      { q: 'Can the gallery include a video or GIF?', a: 'Open Assets renders still PNG and JPEG images. Add a video to the gallery separately.' },
    ],
    related: [
      { href: '/templates/twitter-card', label: 'Twitter card template' },
      { href: '/templates/og-image', label: 'OG image template' },
      { href: '/templates/slack-app-listing', label: 'Slack app listing template' },
    ],
  },
  {
    slug: 'play-feature-graphic',
    name: 'Play feature graphic',
    category: 'banners',
    homeRank: 3,
    title: 'Google Play feature graphic template | Open Assets',
    description:
      'Free Google Play feature graphic template at 1024x500 in HTML. Centered, device and dark variants rendered by the Open Assets CLI, ready for Play Console.',
    h1: 'Google Play feature graphic template',
    summary: 'The 1024 by 500 banner every Play listing needs, in centered, device and dark layouts.',
    intro: [
      'This Google Play feature graphic template renders the 1024 by 500 pixel banner that Play Console requires before you can publish a listing. It comes in three layouts you can switch between above.',
      'The graphic is one HTML file, so changing the tagline or the brand color is a text edit, and the CLI renders an exact 1024 by 500 PNG every time.',
    ],
    sizes: ['feature-graphic'],
    variants: [
      { key: 'centered', label: 'Centered logo', image: img('play-feature-graphic', '01-centered'), width: 1024, height: 500, alt: 'Feature graphic with a centered app mark, app name and tagline on a purple to cyan gradient' },
      { key: 'device', label: 'Headline and phone', image: img('play-feature-graphic', '02-device'), width: 1024, height: 500, alt: 'Feature graphic with a headline on the left and a tilted phone showing the app on the right' },
      { key: 'dark', label: 'Dark, feature launch', image: img('play-feature-graphic', '03-dark'), width: 1024, height: 500, alt: 'Dark feature graphic announcing focus mode with a stats card and bar chart' },
    ],
    sections: [
      {
        heading: 'Where the feature graphic shows',
        body: [
          'Google uses the feature graphic as the banner on some store surfaces, as the poster frame when you add a promo video and in featured placements. Because it can be cropped or overlaid, the safest layout keeps the logo and text in the middle 70 percent, which is what the centered variant does.',
          'The device variant works when your app screen is the hook. The dark variant suits an update, where the banner announces one new feature instead of the app as a whole.',
        ],
      },
      {
        heading: 'Rules that get a graphic rejected',
        body: [
          'Play policy disallows rankings, prices and calls to action such as "download now" in store graphics, and asks that text stays readable. Keep the tagline short and skip badges. The template has no ranking or award slot for that reason.',
          'Use a PNG or a 24 bit JPEG with no transparency. The template paints a full background, so the export has no alpha.',
        ],
      },
      {
        heading: 'Keep it in sync with the screenshots',
        body: [
          'The graphic reads its colors from the same CSS variables as the screenshot templates. Change --brand once and the banner, the phone screenshots and the tablet set all update on the next render.',
        ],
      },
    ],
    example: { href: `${repo}/templates/assets/feature-graphic`, label: 'Feature graphic source on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add a play-feature-graphic collection to assets.json with sourceSize 1024x500 and the feature-graphic export (1024x500). Create assets/feature-graphic/01-centered.html with my app icon, name and a tagline of five words or fewer centered on a brand gradient. Keep all text inside the middle 70 percent, no prices, rankings or download prompts. Render with npx open-assets render.',
    config: json({
      id: 'play-feature-graphic',
      label: 'Play feature graphic',
      sourceSize: { width: 1024, height: 500 },
      templates: [tpl('feature-graphic', '01-centered'), tpl('feature-graphic', '02-device'), tpl('feature-graphic', '03-dark')],
      export: [size('feature-graphic', 1024, 500)],
    }),
    guide: guide('google-play', 'Google Play guide'),
    faqs: [
      { q: 'What size is the Google Play feature graphic?', a: '1024 by 500 pixels, as a JPEG or 24 bit PNG with no alpha channel. Play Console will not accept other sizes.' },
      { q: 'Is the feature graphic required?', a: 'Yes. Play Console requires a feature graphic before a store listing can be published.' },
      { q: 'Can I put text on the feature graphic?', a: 'Yes, but keep it short and centered. Google may crop the edges or overlay a play button when there is a promo video.' },
      { q: 'Can I generate the feature graphic in CI?', a: 'Yes. npx open-assets render works headless, so a GitHub Actions job can render the graphic on every change and commit or upload the PNG.' },
    ],
    related: [
      { href: '/templates/google-play-screenshots', label: 'Google Play screenshot template' },
      { href: '/templates/og-image', label: 'OG image template' },
      { href: '/templates/app-icon', label: 'App icon template' },
    ],
  },
  {
    slug: 'ipad-screenshots',
    name: 'iPad screenshots',
    category: 'screenshots',
    homeRank: 4,
    title: 'iPad App Store screenshot template | Open Assets',
    description:
      'Free iPad App Store screenshot template in HTML. Hero, Split View and dark slides rendered at 13 inch 2064x2752 and 12.9 inch sizes by the Open Assets CLI.',
    h1: 'iPad App Store screenshot template',
    summary: 'Portrait iPad screenshots with a headline and an iPad frame, rendered at the 13 inch and 12.9 inch sizes.',
    intro: [
      'This iPad App Store screenshot template puts a large headline over an iPad frame that shows your app with its sidebar open, the layout that tells a shopper the app is built for iPad and is not a stretched phone app.',
      'It renders at the 13 inch size, 2064 by 2752 pixels, which App Store Connect requires for any app that runs on iPad, plus the older 12.9 inch size.',
    ],
    sizes: ['ipad-13', 'ipad-12.9'],
    variants: [
      { key: 'set', label: 'Full set', image: img('ipad-screenshots', 'set'), width: 1600, height: 695, alt: 'Three iPad screenshots side by side: a gradient hero, a light Split View slide and a dark mode slide' },
      { key: 'hero', label: 'Hero', image: img('ipad-screenshots', '01-hero'), width: 900, height: 1200, alt: 'iPad screenshot with the headline "Your whole week, on one screen" above an iPad showing a task dashboard' },
      { key: 'split', label: 'Split View', image: img('ipad-screenshots', '02-split'), width: 900, height: 1200, alt: 'Light iPad screenshot with the headline "Built for Split View"' },
      { key: 'dark', label: 'Dark mode', image: img('ipad-screenshots', '03-dark'), width: 900, height: 1200, alt: 'Dark iPad screenshot with the headline "Easy on the eyes after dark" over a dark themed app' },
    ],
    sections: [
      {
        heading: 'Why iPad needs its own screenshots',
        body: [
          'If your app runs on iPad, App Store Connect asks for iPad screenshots and shows them to iPad shoppers instead of the iPhone set. Reusing phone screenshots on a 3 by 4 canvas leaves wide empty margins, and reviewers notice when the iPad shots show a phone layout.',
          'The template uses a 1032 by 1376 source, half of the 13 inch size, so CSS pixels map cleanly to the export. The iPad frame is pure CSS with a 44 pixel radius, close to the real device corners.',
        ],
      },
      {
        heading: 'What to show on each slide',
        body: [
          'Lead with the screen that uses the width: a sidebar with a detail view, a dashboard, or two panes. The Split View slide is a good place to mention multitasking or keyboard support. A dark mode slide is cheap to add, since it is the same markup with a class switched.',
          'The sample app inside the frame is fictional HTML. Replace it with an img tag that points at a real iPad capture from your UI tests.',
        ],
      },
      {
        heading: 'Sizes and cropping',
        body: [
          'The 12.9 inch size is a few pixels narrower in ratio than the 13 inch size. The CLI scales to cover and crops the overflow, which removes a sliver at the bottom. Keep text away from the bottom 30 pixels and both sizes look the same.',
        ],
      },
    ],
    example: { href: `${repo}/templates/assets/ipad`, label: 'iPad template source on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add an ipad-screenshots collection to assets.json with sourceSize 1032x1376 and exports ipad-13 (2064x2752) and ipad-12.9 (2048x2732). Make three HTML files in assets/ipad/: a hero, a Split View slide and a dark mode slide. Each has a headline at the top and a CSS iPad frame below holding my iPad screenshot from public/screenshots/ipad/. Render with npx open-assets render.',
    config: json({
      id: 'ipad-screenshots',
      label: 'iPad screenshots',
      sourceSize: { width: 1032, height: 1376 },
      templates: [tpl('ipad', '01-hero'), tpl('ipad', '02-split'), tpl('ipad', '03-dark')],
      export: [size('ipad-13', 2064, 2752), size('ipad-12.9', 2048, 2732)],
    }),
    guide: guide('app-store-screenshots', 'App Store screenshot guide'),
    faqs: [
      { q: 'What size are iPad App Store screenshots?', a: 'The 13 inch size is 2064 by 2752 pixels in portrait. App Store Connect also accepts the 12.9 inch size, 2048 by 2732. Open Assets renders both from one template.' },
      { q: 'Do I need iPad screenshots if my app is iPhone only?', a: 'No. They are required only when the app runs natively on iPad.' },
      { q: 'Can iPad screenshots be landscape?', a: 'Yes. Swap the source size to 1376 by 1032 and the export sizes to their landscape versions. Do not mix orientations within one set.' },
      { q: 'Is the iPad frame an Apple asset?', a: 'No. It is a CSS rounded rectangle, so there are no licensing questions and it scales to any size.' },
    ],
    related: [
      { href: '/templates/app-store-screenshots', label: 'App Store screenshot template' },
      { href: '/templates/mac-app-store-screenshots', label: 'Mac App Store screenshot template' },
      { href: '/templates/app-icon', label: 'App icon template' },
    ],
  },
  {
    slug: 'og-image',
    name: 'OG image',
    category: 'og-images',
    homeRank: 6,
    title: 'OG image template as HTML code | Open Assets',
    description:
      'Free Open Graph image template in HTML and CSS. Centered title, blog post and docs variants rendered at 1200x630 by the Open Assets CLI from your own repo.',
    h1: 'OG image template',
    summary: 'Open Graph images at 1200 by 630 as HTML: a centered title card, a blog post card and a docs card.',
    intro: [
      'This OG image template is the social preview image for your site, written as HTML and CSS and rendered to a 1200 by 630 PNG. Variants cover a centered home page card, a blog post card with author and read time, and a dark docs card.',
      'It lives in your repo next to the code, so an agent can make a new card for each post and the CLI renders it in CI.',
    ],
    sizes: ['og', 'twitter-card'],
    variants: [
      { key: 'centered', label: 'Centered title', image: img('og-image', '01-centered'), width: 1200, height: 630, alt: 'OG image with a centered app mark and the headline "Plan less. Finish more." on a gradient' },
      { key: 'blog', label: 'Blog post', image: img('og-image', '02-blog'), width: 1200, height: 630, alt: 'Blog post OG image with the post title, author name, read time and category on a light background' },
      { key: 'docs', label: 'Docs page', image: img('og-image', '03-docs'), width: 1200, height: 630, alt: 'Dark docs OG image with the title "Sync API reference" and a JSON code sample' },
    ],
    sections: [
      {
        heading: 'Static OG images, rendered ahead of time',
        body: [
          'Many frameworks generate OG images at request time with a restricted subset of CSS. This template renders ahead of time in a real Chromium, so grid, gradients, web fonts and backdrop filters all work, and the result is a static file your host serves with no function.',
          'Use it for pages that change rarely: the home page, product pages, docs sections and each blog post. For thousands of user generated pages, a request time renderer is still the better fit.',
        ],
      },
      {
        heading: 'One card per blog post',
        body: [
          'The blog variant takes the title, author and read time as text in the HTML. Copy the file per post, or keep one file and drive it from localizations.json with a key per post. Long titles wrap to three lines at 64 pixels, which is about 70 characters.',
          'Point your page metadata at the rendered PNG with outFile, so it lands in your public folder under a stable path.',
        ],
      },
      {
        heading: 'Use it for X cards too',
        body: [
          'X shows summary_large_image cards at roughly 1.91 to 1, which is the same shape as 1200 by 630. Add the twitter-card export if you want a 1200 by 675 version for posts.',
        ],
      },
    ],
    example: { href: `${repo}/templates/assets/og`, label: 'OG template source on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add an og-image collection to assets.json with sourceSize 1200x630 and the og export. Create assets/og/01-centered.html with my logo and site tagline centered on a brand gradient, and assets/og/02-blog.html with a post title, author and read time. Use outFile to write the home card to public/og.png. Render with npx open-assets render and wire the PNG into my page metadata.',
    config: json({
      id: 'og-image',
      label: 'OG image',
      sourceSize: { width: 1200, height: 630 },
      templates: [tpl('og', '01-centered'), tpl('og', '02-blog'), tpl('og', '03-docs')],
      export: [size('og', 1200, 630)],
    }),
    guide: guide('og-images', 'OG image guide'),
    faqs: [
      { q: 'What size should an OG image be?', a: '1200 by 630 pixels is the size Facebook, LinkedIn, Slack and X all display well. Keep text away from the outer 60 pixels in case of cropping.' },
      { q: 'Is this a free OG image generator?', a: 'Open Assets is free and open source under the MIT license. It is a CLI rather than a web form, so the template and the image both stay in your repo.' },
      { q: 'Can I make OG images with Tailwind?', a: 'Yes. Templates are plain HTML, so the Tailwind CDN script or a built stylesheet both work.' },
      { q: 'Should OG images be PNG or JPEG?', a: 'PNG for flat graphics and text; JPEG for photos to keep the file small. Name the outFile with .jpg to get JPEG.' },
    ],
    related: [
      { href: '/templates/twitter-card', label: 'Twitter card template' },
      { href: '/templates/favicon', label: 'Favicon template' },
      { href: '/templates/product-hunt-gallery', label: 'Product Hunt gallery template' },
    ],
  },
  {
    slug: 'mac-app-store-screenshots',
    name: 'Mac App Store screenshots',
    category: 'screenshots',
    title: 'Mac App Store screenshot template | Open Assets',
    description:
      'Free Mac App Store screenshot template in HTML. Hero, keyboard and dark mode slides in a MacBook frame, rendered at 2880x1800 by the Open Assets CLI tool.',
    h1: 'Mac App Store screenshot template',
    summary: 'Landscape Mac App Store screenshots at 2880 by 1800 with a CSS MacBook frame.',
    intro: [
      'This Mac App Store screenshot template places a headline on the left and a MacBook showing your app on the right, rendered at 2880 by 1800, the Retina size App Store Connect accepts for macOS apps.',
      'Three variants cover the launch hero, a keyboard first feature slide and dark mode.',
    ],
    sizes: ['mac-retina'],
    variants: [
      { key: 'hero', label: 'Hero', image: img('mac-app-store-screenshots', '01-hero'), width: 1600, height: 1000, alt: 'Mac App Store screenshot with the headline "Lumen, now on Mac" beside a MacBook showing a task dashboard' },
      { key: 'keyboard', label: 'Keyboard first', image: img('mac-app-store-screenshots', '02-keyboard'), width: 1600, height: 1000, alt: 'Light Mac App Store screenshot with the headline "Keyboard first" beside a MacBook' },
      { key: 'dark', label: 'Dark mode', image: img('mac-app-store-screenshots', '03-dark'), width: 1600, height: 1000, alt: 'Dark Mac App Store screenshot with the headline "Dark mode, done right" beside a MacBook in dark mode' },
    ],
    sections: [
      {
        heading: 'Built for a 16 by 10 canvas',
        body: [
          'Mac screenshots are landscape, so the phone layout of headline over device does not fit. The template splits the canvas: a 420 pixel text column on the left and a laptop on the right. It renders from a 1440 by 900 source at exactly 2x, so the CSS is easy to reason about.',
          'The MacBook lid, screen and base are three CSS boxes. Swap the fake UI inside .screen for an img of a real window capture taken with the screencapture command or from a UI test.',
        ],
      },
      {
        heading: 'What Mac shoppers look for',
        body: [
          'People browsing the Mac App Store care about keyboard shortcuts, menu bar access, window behavior and whether the app feels native. Give one slide to each of those that applies to your app instead of repeating phone features.',
          'If the app is a Mac Catalyst or iPad app running on Mac, show it in a window at a desktop size, not stretched to fill the screen.',
        ],
      },
      {
        heading: 'Dark mode in one class',
        body: [
          'The dark slide is the same markup with a dark class on the UI and a night background. Most Mac users run dark mode at least part of the day, so one dark slide shows the app respects it.',
        ],
      },
    ],
    example: { href: `${repo}/templates/assets/mac`, label: 'Mac template source on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add a mac-screenshots collection to assets.json with sourceSize 1440x900 and the mac-retina export (2880x1800). Make three HTML files in assets/mac/: a hero, a keyboard shortcuts slide and a dark mode slide. Each has a headline column on the left and a CSS MacBook on the right that shows my window capture from public/screenshots/mac/. Render with npx open-assets render.',
    config: json({
      id: 'mac-screenshots',
      label: 'Mac App Store screenshots',
      sourceSize: { width: 1440, height: 900 },
      templates: [tpl('mac', '01-hero'), tpl('mac', '02-keyboard'), tpl('mac', '03-dark')],
      export: [size('mac-retina', 2880, 1800)],
    }),
    guide: guide('app-store-connect', 'App Store Connect guide'),
    faqs: [
      { q: 'What size are Mac App Store screenshots?', a: 'App Store Connect accepts 1280 by 800, 1440 by 900, 2560 by 1600 and 2880 by 1800 pixels at a 16 by 10 ratio. 2880 by 1800 is the sharpest and the size this template renders.' },
      { q: 'How many Mac screenshots can I upload?', a: 'Between one and ten.' },
      { q: 'Do I need a device frame on Mac screenshots?', a: 'No. A plain window on a background is also common. The frame helps when the app is small or mostly white.' },
      { q: 'Can I render other Mac sizes?', a: 'Yes. Add an export entry with any width and height. Open Assets scales the same template.' },
    ],
    related: [
      { href: '/templates/ipad-screenshots', label: 'iPad screenshot template' },
      { href: '/templates/app-store-screenshots', label: 'App Store screenshot template' },
      { href: '/templates/app-icon', label: 'App icon template' },
    ],
  },
  {
    slug: 'twitter-card',
    name: 'Twitter / X card',
    category: 'og-images',
    title: 'Twitter (X) card image template | Open Assets',
    description:
      'Free Twitter and X card image template in HTML at 1200x675. Launch, review quote and milestone variants rendered by the Open Assets CLI for your posts.',
    h1: 'Twitter (X) card image template',
    summary: 'X post images at 1200 by 675: a launch card, a review quote and a milestone number.',
    intro: [
      'This Twitter card template makes the 1200 by 675 images that fill the timeline at a 16 by 9 ratio: a launch announcement with an app window, a review quote and a milestone number.',
      'Each card is HTML in your repo, so making the next one means copying a file and changing the text.',
    ],
    sizes: ['twitter-card', 'og'],
    variants: [
      { key: 'launch', label: 'Launch', image: img('twitter-card', '01-launch'), width: 1200, height: 675, alt: 'X card announcing "Lumen 2.0" with a desktop window showing the app' },
      { key: 'quote', label: 'Review quote', image: img('twitter-card', '02-quote'), width: 1200, height: 675, alt: 'X card with a large quotation mark and a five star App Store review' },
      { key: 'milestone', label: 'Milestone', image: img('twitter-card', '03-milestone'), width: 1200, height: 675, alt: 'Dark X card with the number 100,000 and the line "tasks finished with Lumen this month"' },
    ],
    sections: [
      {
        heading: 'Why 1200 by 675',
        body: [
          'X crops single images in the timeline to 16 by 9 on most clients. A 1200 by 675 image shows in full without the top and bottom being cut, while a 1200 by 630 OG image gets small bars or a crop.',
          'For link previews, X reads your og:image or twitter:image tag. Use the OG template for those and this one for images you attach to posts.',
        ],
      },
      {
        heading: 'Three posts that come up again and again',
        body: [
          'Launches, reviews and milestones are the posts most indie apps make every month. The launch card shows the product. The quote card turns a real review into social proof; only use reviews you have permission to share. The milestone card is one big number and a line of context.',
          'Because the cards share a stylesheet, a month of posts looks like one set.',
        ],
      },
      {
        heading: 'Text that survives the timeline',
        body: [
          'People scroll past at speed, so keep the headline above 50 pixels and under ten words. Leave the bottom right clear if you post with alt text badges or video controls. Export at 2x if the card holds small UI text, since X recompresses uploads and fine detail is the first thing to blur.',
        ],
      },
    ],
    example: { href: `${repo}/templates/assets/twitter`, label: 'Twitter card source on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add a twitter-card collection to assets.json with sourceSize 1200x675 and the twitter-card export. Create three HTML cards in assets/twitter/: a launch card with my app window, a review quote card and a milestone card with one large number. Share brand colors with my other templates. Render with npx open-assets render.',
    config: json({
      id: 'twitter-card',
      label: 'X / Twitter card',
      sourceSize: { width: 1200, height: 675 },
      templates: [tpl('twitter', '01-launch'), tpl('twitter', '02-quote'), tpl('twitter', '03-milestone')],
      export: [size('twitter-card', 1200, 675)],
    }),
    guide: guide('og-images', 'OG image guide'),
    faqs: [
      { q: 'What is the best image size for X (Twitter) posts?', a: '1200 by 675 pixels, a 16 by 9 ratio, shows uncropped in the timeline on most clients.' },
      { q: 'What size is a Twitter summary_large_image card?', a: 'X recommends an aspect ratio of about 2 to 1. A 1200 by 630 OG image works for link cards.' },
      { q: 'Can I schedule posts with these images?', a: 'Open Assets only renders the images. Attach them in X or any scheduling tool.' },
      { q: 'Can I make a card per release automatically?', a: 'Yes. Drive the text from a JSON file or localizations.json and render in CI after each release tag.' },
    ],
    related: [
      { href: '/templates/og-image', label: 'OG image template' },
      { href: '/templates/product-hunt-gallery', label: 'Product Hunt gallery template' },
      { href: '/templates/slack-app-listing', label: 'Slack app listing template' },
    ],
  },
  {
    slug: 'app-icon',
    name: 'App icon',
    category: 'icons',
    title: 'App icon template in HTML and SVG | Open Assets',
    description:
      'Free app icon template in HTML and SVG. Render a 1024x1024 iOS icon, a Play icon and an Xcode AppIcon set from one design with the Open Assets CLI tool.',
    h1: 'App icon template',
    summary: 'A 1024 by 1024 app icon as HTML or SVG, exported for iOS, Google Play and Xcode, plus a matching logo lockup.',
    intro: [
      'This app icon template is a 1024 by 1024 HTML or SVG file that renders your icon for the App Store, Google Play and Xcode from one source. The examples above are real icons from apps that use Open Assets.',
      'It is a design as code, not a drag and drop editor: you or your agent change a gradient, a glyph or a corner radius in text, and the CLI renders every size.',
    ],
    sizes: ['app-icon', 'play-icon', 'pwa-512', 'apple-touch-icon'],
    variants: [
      { key: 'tax-days', label: 'Calendar glyph', image: img('app-icon', 'tax-days'), width: 512, height: 512, alt: 'Tax Days app icon: a calendar page showing 83 days on a green background' },
      { key: 'thoughtful', label: 'Warm, editorial', image: img('app-icon', 'thoughtful'), width: 512, height: 512, alt: 'Thoughtful app icon on a warm background' },
      { key: 'skimmer', label: 'Water gradient', image: img('app-icon', 'skimmer'), width: 512, height: 512, alt: 'Skimmer pool care app icon with a blue water gradient' },
      { key: 'cat-iq-test', label: 'Character', image: img('app-icon', 'cat-iq-test'), width: 512, height: 512, alt: 'Cat IQ Test app icon with an illustrated cat face' },
      { key: 'logo', label: 'Logo lockup (SVG)', image: img('app-logo', 'cat-iq-test'), width: 640, height: 640, alt: 'Cat IQ Test logo, a cat head with a pink brain, rendered from an SVG template' },
    ],
    sections: [
      {
        heading: 'One source, every icon size',
        body: [
          'The collection uses a 1024 by 1024 source. Add export entries for app-icon, play-icon at 512, and web sizes, and the CLI scales the same file. An xcode output writes AppIcon.appiconset with its Contents.json, so Xcode picks up the new icon on the next build.',
          'App Store icons must be opaque and square; iOS applies the rounded mask. Paint a full bleed background in the template and let the collection borderRadius handle the preview corners only.',
        ],
      },
      {
        heading: 'HTML or SVG',
        body: [
          'Use HTML when the icon needs CSS effects such as layered gradients, blur or text with a web font. Use SVG for flat, geometric icons; an SVG template rendered at its source size also gets an .svg copy beside the PNG, which is handy for a logo lockup on your website.',
          'The Cat IQ logo above is an SVG template in the same project as its icon, which is why the logo lockup lives on this page rather than its own.',
        ],
      },
      {
        heading: 'Test it small',
        body: [
          'An icon is judged at 60 pixels on a home screen. Render a 120 pixel export and look at it next to other apps before you commit. Bold shapes and two or three colors read best.',
        ],
      },
    ],
    example: { href: `${repo}/examples/tax-days`, label: 'Tax Days icon on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add an icon collection to assets.json with sourceSize 1024x1024, exports app-icon (1024), play-icon (512) and apple-touch-icon (180), and an xcode output pointing at my AppIcon.appiconset. Create assets/icon/icon.html with a full bleed brand gradient and one bold glyph that reads at 60 pixels. Render with npx open-assets render.',
    config: json({
      id: 'icon',
      label: 'App icon',
      sourceSize: { width: 1024, height: 1024 },
      borderRadius: 224,
      templates: [{ src: 'assets/icon/icon.html', name: 'icon' }],
      export: [size('app-icon', 1024, 1024), size('play-icon', 512, 512), { type: 'xcode', path: '../ios/MyApp/Assets.xcassets/AppIcon.appiconset' }],
    }),
    guide: guide('xcode-app-icon', 'Xcode app icon guide'),
    faqs: [
      { q: 'What size should an app icon be?', a: 'Design at 1024 by 1024 pixels. That is the App Store size, and Xcode generates the smaller sizes from it. Google Play wants a 512 by 512 PNG.' },
      { q: 'Should the icon have rounded corners?', a: 'No. Upload a square, opaque image. iOS and Android apply their own masks.' },
      { q: 'Can I make an app icon without design software?', a: 'Yes. The icon is HTML or SVG, so you can describe the change to a coding agent and render the result.' },
      { q: 'Does it support iOS dark and tinted icons?', a: 'Render extra templates for dark and tinted versions and add them to the asset catalog. The xcode output writes the standard single icon.' },
    ],
    related: [
      { href: '/templates/favicon', label: 'Favicon template' },
      { href: '/templates/app-store-screenshots', label: 'App Store screenshot template' },
      { href: '/templates/play-feature-graphic', label: 'Play feature graphic template' },
    ],
  },
  {
    slug: 'favicon',
    name: 'Favicon set',
    category: 'icons',
    title: 'Favicon set from one SVG, as code | Open Assets',
    description:
      'Make a full favicon set from one SVG: 16, 32, 180, 192 and 512 pixel PNGs plus the SVG, rendered by the Open Assets CLI. A free generator in your repo.',
    h1: 'Favicon set from one SVG',
    summary: 'One SVG rendered to favicon-16, favicon-32, apple-touch-icon, PWA 192 and 512, plus an SVG copy.',
    intro: [
      'This favicon template turns one SVG into the full set a modern site needs: 16 and 32 pixel favicons, the 180 pixel Apple touch icon, the 192 and 512 pixel PWA icons, and the SVG itself for browsers that support it.',
      'Unlike an upload form, it runs in your repo, so the favicon updates whenever the SVG does.',
    ],
    sizes: ['pwa-512', 'pwa-192', 'apple-touch-icon', 'favicon-32', 'favicon-16'],
    variants: [
      { key: 'sizes', label: 'Every size', image: img('favicon', 'sizes'), width: 1200, height: 400, alt: 'The favicon rendered at 512, 192, 180, 32 and 16 pixels side by side' },
      { key: 'icon', label: 'Source SVG', image: img('favicon', 'icon'), width: 512, height: 512, alt: 'The source favicon SVG, a white spark on a purple to cyan rounded square' },
      { key: 'favicon-32', label: '32 px, zoomed', image: img('favicon', 'favicon-32-zoom'), width: 256, height: 256, alt: 'The 32 pixel favicon enlarged so each pixel is visible' },
    ],
    sections: [
      {
        heading: 'The files and the HTML that uses them',
        body: [
          'The collection exports PNGs named after each size and a copy-source entry that writes the SVG. Add outFile to each export to write straight into your public folder. Then link them in the head: an icon link with type image/svg+xml, a 32 pixel PNG fallback, an apple-touch-icon link and a web manifest listing the 192 and 512 icons.',
          'Open Assets does not write a .ico file. Every current browser accepts PNG and SVG favicons; if you still need favicon.ico for an old crawler, convert the 32 pixel PNG with a tool like ImageMagick.',
        ],
      },
      {
        heading: 'Design for 16 pixels',
        body: [
          'At 16 pixels a favicon is 256 dots. Thin strokes vanish and text becomes noise. The sample uses a stroke width near 9 percent of the canvas and one central shape. If your logo has detail, make a simpler mark for the favicon rather than shrinking the logo.',
          'The zoomed 32 pixel variant above shows how the render handles anti aliasing at that size.',
        ],
      },
      {
        heading: 'Reuse it as the app icon',
        body: [
          'The same SVG can feed an app icon collection at 1024 pixels, so the website, the PWA and the store icon all match. Add a dark mode version with a media query inside the SVG if you want the tab icon to adapt.',
        ],
      },
    ],
    example: { href: `${repo}/templates/assets/favicon`, label: 'Favicon source on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add a favicon collection to assets.json with sourceSize 512x512, using assets/favicon/icon.svg as the template. Export pwa-512, pwa-192, apple-touch-icon, favicon-32 and favicon-16, each with an outFile into public/, plus a copy-source svg entry. Then add the matching link tags and web manifest icons to my site head. Render with npx open-assets render.',
    config: json({
      id: 'favicon',
      label: 'Favicon set',
      sourceSize: { width: 512, height: 512 },
      templates: [{ src: 'assets/favicon/icon.svg', name: 'icon' }],
      export: [
        size('pwa-512', 512, 512),
        size('pwa-192', 192, 192),
        size('apple-touch-icon', 180, 180),
        size('favicon-32', 32, 32),
        size('favicon-16', 16, 16),
        { type: 'copy-source', format: 'svg' },
      ],
    }),
    guide: guide('favicons', 'Favicon guide'),
    faqs: [
      { q: 'What favicon sizes do I need in 2026?', a: 'An SVG favicon, a 32 pixel PNG fallback, a 180 pixel Apple touch icon, and 192 and 512 pixel icons in the web manifest. The 16 pixel size is optional.' },
      { q: 'Does this make a favicon.ico?', a: 'No. Open Assets renders PNG and copies the SVG. Convert the 32 pixel PNG if you need an .ico file.' },
      { q: 'Is it a free favicon generator?', a: 'Yes. Open Assets is MIT licensed and runs locally or in CI. Nothing is uploaded.' },
      { q: 'Can the favicon change with dark mode?', a: 'The SVG favicon can, using a prefers-color-scheme media query inside the SVG. PNG fallbacks cannot.' },
    ],
    related: [
      { href: '/templates/app-icon', label: 'App icon template' },
      { href: '/templates/og-image', label: 'OG image template' },
      { href: '/templates/twitter-card', label: 'Twitter card template' },
    ],
  },
  {
    slug: 'slack-app-listing',
    name: 'Slack app listing',
    category: 'banners',
    title: 'Slack App Directory image template | Open Assets',
    description:
      'Free Slack App Directory image template in HTML at 1600x1000. Hero, how it works and feature slides rendered by the Open Assets CLI for your Slack app.',
    h1: 'Slack App Directory image template',
    summary: 'Listing images for the Slack App Directory at 1600 by 1000: hero, how it works and features.',
    intro: [
      'This Slack app listing template makes the screenshots for a Slack App Directory page at 1600 by 1000 pixels: a hero with the bot in a real looking channel, a how it works slide and a feature slide.',
      'It comes from No Context Bot, a Slack app that ships its listing images with Open Assets.',
    ],
    sizes: [],
    variants: [
      { key: 'hero', label: 'Hero', image: img('slack-app-listing', 'hero'), width: 1600, height: 1000, alt: 'Slack listing hero with a headline and a mock Slack message containing a generated painting' },
      { key: 'how-it-works', label: 'How it works', image: img('slack-app-listing', 'how-it-works'), width: 1600, height: 1000, alt: 'Slack listing slide explaining how No Context Bot works in steps' },
      { key: 'art-styles', label: 'Features', image: img('slack-app-listing', 'art-styles'), width: 1600, height: 1000, alt: 'Slack listing slide showing a grid of art styles the bot can paint in' },
    ],
    sections: [
      {
        heading: 'Show the app inside Slack',
        body: [
          'Directory shoppers want to see what the bot does in a channel. The hero slide is an HTML mock of a Slack message, with a real avatar, display name and timestamp, so it stays crisp at any size and is easy to change when the bot does.',
          'Mocking the message in HTML also avoids posting test content in a real workspace and blurring out names afterwards.',
        ],
      },
      {
        heading: 'Slide order',
        body: [
          'Open with the outcome, then explain setup in three steps, then show range: styles, commands or integrations. A pricing slide is useful when there is a paid plan, so people know before they install.',
          'Each slide is its own HTML file, and they share a stylesheet with the Product Hunt set from the same project.',
        ],
      },
      {
        heading: 'Discord and Teams too',
        body: [
          'Discord app directory and Microsoft Teams store images use similar landscape layouts at different sizes. Add an export entry with each size and reuse the slides; the CLI scales to cover and crops any overflow. Check each crop in the dev viewer before you submit, because a headline near the edge is the first thing to get cut.',
        ],
      },
    ],
    example: { href: `${repo}/examples/no-context`, label: 'No Context example on GitHub' },
    prompt:
      'Using Open Assets (npx open-assets), add a slack collection to assets.json with sourceSize 1600x1000 and a 1x export. Make HTML slides in assets/apps/slack/: a hero with an HTML mock of my bot posting in a Slack channel, a three step how it works slide, and a features slide. Render with npx open-assets render.',
    config: json({
      id: 'slack',
      label: 'Slack App Directory',
      sourceSize: { width: 1600, height: 1000 },
      templates: [tpl('apps/slack', '01-hero'), tpl('apps/slack', '02-whats-a-no-context-channel'), tpl('apps/slack', '03-how-it-works')],
      export: [size('1x', 1600, 1000)],
    }),
    guide: guide('launch-kit', 'Launch kit guide'),
    faqs: [
      { q: 'What size are Slack App Directory screenshots?', a: 'This template renders at 1600 by 1000 pixels, a 16 by 10 ratio. Check the current Slack listing requirements before you submit, since Slack reviews every listing.' },
      { q: 'Can I use real Slack screenshots instead?', a: 'Yes. Put the capture in public/ and reference it with an img tag inside the template.' },
      { q: 'Does it work for Discord bots?', a: 'Yes. Change the message mock styling and add an export at the size the Discord directory asks for.' },
      { q: 'Is the Slack UI mock allowed?', a: 'Showing your app in context is the purpose of listing images. Keep it accurate to what the app actually posts.' },
    ],
    related: [
      { href: '/templates/product-hunt-gallery', label: 'Product Hunt gallery template' },
      { href: '/templates/twitter-card', label: 'Twitter card template' },
      { href: '/templates/og-image', label: 'OG image template' },
    ],
  },
]

/** Templates featured on the homepage gallery, in order. */
export const homeTemplates = templates
  .filter((t) => t.homeRank !== undefined)
  .sort((a, b) => (a.homeRank ?? 0) - (b.homeRank ?? 0))
