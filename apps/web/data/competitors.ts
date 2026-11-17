import type { Faq, PageSeo, RelatedLink } from './types'

/**
 * Alternatives and comparisons, one entry per /alternatives/<slug> (plan
 * section 6). Never invent prices or features: every claim about a vendor
 * comes from its own page, fetched on `asOf`. Leave `price` out when unclear.
 */
export interface CompetitorRow {
  feature: string
  us: string
  /** One value, or one per entry in `vendors` for a multi-vendor comparison. */
  them: string | string[]
}

export interface Vendor {
  name: string
  url: string
}

export interface CompetitorEntry extends PageSeo {
  name: string
  /** "alternative" for true substitutes, "vs" for tools Open Assets does not replace. */
  framing: 'alternative' | 'vs'
  vendorUrl: string
  /** Set for a page that compares several tools; table columns follow this order. */
  vendors?: Vendor[]
  /** ISO date the vendor pages were fetched. */
  asOf: string
  price?: { text: string; source: string }
  intro: string[]
  rows: CompetitorRow[]
  chooseThem: string[]
  chooseUs: string[]
  guide?: RelatedLink
  faqs: Faq[]
  related: RelatedLink[]
}

const D = 'https://docs.open-assets.dev'
const AS_OF = '2026-11-17'

const docsLinks = {
  quickStart: { href: `${D}/quick-start`, label: 'Quick start', description: 'Install the CLI and render your first screenshot.' },
  screenshots: { href: `${D}/guides/app-store-screenshots`, label: 'App Store screenshots guide', description: 'Every iPhone and iPad size from one HTML template.' },
  googlePlay: { href: `${D}/guides/google-play`, label: 'Google Play guide', description: 'Phone, tablet and the 1024 x 500 feature graphic.' },
  localization: { href: `${D}/localization`, label: 'Localization', description: 'One template in every language, with RTL and number formatting.' },
  agents: { href: `${D}/agents`, label: 'Agent skill', description: 'Let Claude Code design, localize and render your assets.' },
  ci: { href: `${D}/ci/github-actions`, label: 'CI with GitHub Actions', description: 'Re-render screenshots on every push.' },
  frameit: { href: `${D}/migrate/frameit`, label: 'Migrate from frameit', description: 'Map Framefile.json, frames and .strings titles to templates.' },
}

const sibling = (slug: string, label: string): RelatedLink => ({ href: `/alternatives/${slug}`, label })

export const competitors: CompetitorEntry[] = [
  {
    slug: 'fastlane-frameit',
    name: 'fastlane frameit',
    framing: 'alternative',
    vendorUrl: 'https://docs.fastlane.tools/actions/frameit/',
    asOf: AS_OF,
    title: 'fastlane frameit Alternative for Screenshots | Open Assets',
    description:
      'A fastlane frameit alternative: design App Store and Google Play screenshots in HTML and CSS, localize them in one file, and render every size from one CLI.',
    h1: 'A fastlane frameit alternative for App Store screenshots',
    summary: 'Replace the frameit framing step with HTML templates you control, and keep snapshot and deliver.',
    intro: [
      'fastlane frameit puts screenshots you already captured into device frames, and can add a background plus a title and keyword from a Framefile.json. Open Assets replaces that one step: you design each screenshot as an HTML and CSS template and render every store size from it.',
      'Capturing screenshots (snapshot or UI tests) and uploading them (deliver) stay as they are. The migration guide maps each frameit setting to its Open Assets equivalent.',
    ],
    rows: [
      { feature: 'What you design', us: 'Any layout in HTML and CSS (Tailwind works)', them: 'Device frame plus background, title and keyword text' },
      { feature: 'Input', us: 'Templates, with your app screenshots as images', them: 'Existing screenshots in a folder' },
      { feature: 'Configuration', us: 'assets.json', them: 'Framefile.json' },
      { feature: 'Localized text', us: 'localizations.json with fallbacks, number formatting and RTL', them: 'title.strings and keyword.strings per language folder' },
      { feature: 'Device frames', us: 'Drawn in your template (CSS or your own image)', them: 'Downloaded automatically, from the Facebook device frameset' },
      { feature: 'Android', us: 'Yes, Google Play sizes and feature graphic', them: 'Yes, fastlane frameit android' },
      { feature: 'Live preview', us: 'Yes, open-assets dev with hot reload', them: 'Not mentioned' },
      { feature: 'App icons, favicons, OG images', us: 'Yes, from the same templates', them: 'No, screenshots only' },
      { feature: 'Agent skill', us: 'Yes, Claude Code skill', them: 'Not mentioned' },
      { feature: 'Runs in CI', us: 'Yes', them: 'Yes' },
    ],
    chooseThem: [
      'You only need a stock device frame and a caption around existing screenshots.',
      'Your whole release pipeline already lives in fastlane and the frames look the way you want.',
      'You want frames downloaded for you rather than drawn in a template.',
    ],
    chooseUs: [
      'You want full design control: custom layouts, gradients, fonts and panoramic sets.',
      'You want one localization file with fallbacks and RTL instead of .strings files per folder.',
      'You also need the app icon, favicons and OG images from the same source.',
      'You want a live preview while you design, and an agent that can edit templates for you.',
    ],
    guide: docsLinks.frameit,
    faqs: [
      { q: 'Can Open Assets replace fastlane frameit?', a: 'Yes, for the framing step. frameit adds device frames, a background and titles to screenshots you captured. Open Assets renders the finished screenshot from an HTML template instead, and keeps snapshot and deliver unchanged around it.' },
      { q: 'Do I have to stop using fastlane?', a: 'No. Keep snapshot or your UI tests to capture, render with npx open-assets render, and upload the output with deliver. Only frameit is replaced.' },
      { q: 'How do my .strings titles move over?', a: 'Title and keyword text from title.strings and keyword.strings becomes entries in localizations.json, which supports fallbacks, number formatting and right to left layout. The frameit migration guide walks through it.' },
      { q: 'Does Open Assets ship device frames like frameit?', a: 'Not as downloads. You draw the frame in your template, with CSS or an image you add, so it can match your design.' },
      { q: 'Is Open Assets free?', a: 'Yes. Open Assets is MIT licensed and runs locally or in CI with npx.' },
    ],
    related: [docsLinks.frameit, docsLinks.screenshots, docsLinks.localization, sibling('koubou', 'Koubou alternative')],
  },
  {
    slug: 'koubou',
    name: 'Koubou',
    framing: 'alternative',
    vendorUrl: 'https://github.com/bitomule/koubou',
    asOf: AS_OF,
    title: 'Koubou Alternative: HTML App Store Screenshots | Open Assets',
    description:
      'A Koubou alternative for App Store screenshots: HTML and CSS templates, a live preview, localization with RTL, Google Play sizes and icons from one MIT CLI.',
    h1: 'A Koubou alternative for App Store screenshots',
    summary: 'Two MIT command line tools with agent skills: YAML and device frames versus HTML and CSS templates.',
    intro: [
      'Koubou and Open Assets are both MIT licensed command line tools that turn a config file into App Store screenshots, both have a live preview, and both install a skill for AI coding agents.',
      'The difference is how you design. Koubou builds each screenshot from YAML: a device frame, a background, text, images and callouts. Open Assets renders HTML and CSS templates in headless Chrome, so any layout a web page can draw is possible, and the same templates also produce icons and web images.',
    ],
    rows: [
      { feature: 'License', us: 'MIT', them: 'MIT' },
      { feature: 'Install', us: 'npx @open-assets/open-assets', them: 'pip install koubou or Homebrew' },
      { feature: 'Design format', us: 'HTML and CSS templates', them: 'YAML with text, images, highlights and zoom callouts' },
      { feature: 'Device frames', us: 'Drawn in your template', them: 'Over 100 bundled frames (iPhone, iPad, Mac, Watch)' },
      { feature: 'Localization', us: 'localizations.json with fallbacks and RTL', them: 'Xcode .xcstrings' },
      { feature: 'Live preview', us: 'Yes, open-assets dev', them: 'Yes, kou live (macOS and Linux)' },
      { feature: 'Agent skill', us: 'Yes, npx open-assets skills', them: 'Yes, kou install-skills' },
      { feature: 'Google Play sizes', us: 'Yes', them: 'Not mentioned' },
      { feature: 'App icons, favicons, OG images', us: 'Yes', them: 'Not mentioned' },
    ],
    chooseThem: [
      'You want a large library of real Apple device frames without drawing any.',
      'Your translations already live in Xcode .xcstrings and you want screenshots to use them.',
      'You prefer a Python tool and a YAML config over writing HTML.',
    ],
    chooseUs: [
      'You want layouts beyond frame, background and caption, written in HTML and CSS.',
      'You ship on Google Play too and want the phone, tablet and feature graphic sizes.',
      'You want app icons, favicons and OG images from the same project.',
      'You want right to left layout and locale number formatting handled for you.',
    ],
    faqs: [
      { q: 'Is Open Assets a Koubou alternative?', a: 'Yes. Both are MIT licensed CLIs that render App Store screenshots from a config file with a live preview and an agent skill. Open Assets uses HTML and CSS templates; Koubou uses YAML with bundled device frames.' },
      { q: 'Which one has device frames?', a: 'Koubou bundles over 100 Apple device frames. In Open Assets you draw the frame in the template with CSS or your own image.' },
      { q: 'How does localization differ?', a: 'Koubou uses Xcode .xcstrings. Open Assets uses a localizations.json file with fallbacks, locale number formatting and automatic right to left layout.' },
      { q: 'Do both work with AI coding agents?', a: 'Yes. Koubou installs a skill pack with kou install-skills. Open Assets installs a Claude Code skill with npx open-assets skills.' },
    ],
    related: [docsLinks.screenshots, docsLinks.localization, docsLinks.agents, sibling('fastlane-frameit', 'fastlane frameit alternative')],
  },
  {
    slug: 'applaunchpad',
    name: 'AppLaunchpad',
    framing: 'alternative',
    vendorUrl: 'https://theapplaunchpad.com/',
    asOf: AS_OF,
    title: 'AppLaunchpad Alternative: Open Source CLI | Open Assets',
    description:
      'An open source AppLaunchpad alternative: design App Store and Google Play screenshots as code, keep them in git, localize them and render each size in CI.',
    h1: 'An open source AppLaunchpad alternative',
    summary: 'A hosted template editor versus screenshots as code in your repo.',
    intro: [
      'AppLaunchpad is a browser based screenshot generator with a large template library for App Store and Google Play listings. Open Assets is an open source CLI: screenshots are HTML templates in your repo, rendered by a command.',
      'Pick by workflow. A web editor is fast for a one-off set. Templates in git suit teams that redo screenshots every release, review changes in pull requests and render in CI.',
    ],
    rows: [
      { feature: 'Where it runs', us: 'Your machine or CI (npx)', them: 'In the browser' },
      { feature: 'Templates', us: 'Starter templates you edit as HTML', them: '1000+ pre-built templates' },
      { feature: 'Google Play', us: 'Yes', them: 'Yes' },
      { feature: 'Localization', us: 'localizations.json, every language in one render', them: 'Duplicate a design and edit text per language' },
      { feature: 'Source license', us: 'MIT', them: 'Not stated' },
      { feature: 'CLI or API', us: 'CLI', them: 'Not mentioned' },
      { feature: 'Version control', us: 'Yes, files in git', them: 'Not mentioned' },
      { feature: 'App icons, favicons, OG images', us: 'Yes', them: 'Not mentioned' },
    ],
    chooseThem: [
      'You want to pick from a big template library and edit visually, without code.',
      'You make screenshots once in a while and do not need them in CI.',
      'Designers on your team do not work in a code editor.',
    ],
    chooseUs: [
      'You want screenshots versioned in git and reviewed in pull requests.',
      'You localize into many languages and want them rendered in one command.',
      'You want an AI coding agent to build and update the set for you.',
      'You want no account and no subscription.',
    ],
    faqs: [
      { q: 'Is Open Assets a free AppLaunchpad alternative?', a: 'Open Assets is free and MIT licensed. It works differently: you write screenshots as HTML templates and render them with a CLI rather than editing in a browser.' },
      { q: 'What does AppLaunchpad cost?', a: 'AppLaunchpad offers a free start and a paid plan. Published figures differ between sources, so check its pricing page for the current price.' },
      { q: 'Can Open Assets make Google Play screenshots too?', a: 'Yes. It ships Google Play phone, tablet and feature graphic sizes alongside the App Store sizes.' },
      { q: 'Do I need to know HTML?', a: 'It helps, but the Claude Code skill can write and edit the templates for you from a description.' },
    ],
    related: [docsLinks.screenshots, docsLinks.googlePlay, docsLinks.ci, sibling('screenshots-pro', 'Screenshots.pro alternative')],
  },
  {
    slug: 'screenshots-pro',
    name: 'Screenshots.pro',
    framing: 'alternative',
    vendorUrl: 'https://screenshots.pro/',
    asOf: AS_OF,
    price: { text: 'Basic $0, Standard $19 a month, Extended $49 a month', source: 'https://screenshots.pro/' },
    title: 'Screenshots.pro Alternative: Free, Open Source | Open Assets',
    description:
      'A free, open source Screenshots.pro alternative: App Store and Google Play screenshots in HTML and CSS, localized in one file and rendered from a CLI in CI.',
    h1: 'A free, open source Screenshots.pro alternative',
    summary: 'A hosted editor with paid localization and API versus a free CLI with both built in.',
    intro: [
      'Screenshots.pro is a web editor for App Store and Google Play screenshots, with templates, 23 device frames, automatic translation and an alpha REST API on its Extended plan. Open Assets is a free, MIT licensed CLI that renders screenshots from HTML templates in your repo.',
      'Both cover localization and automation. On Screenshots.pro they sit on paid plans; in Open Assets they are part of the CLI.',
    ],
    rows: [
      { feature: 'Where it runs', us: 'Your machine or CI (npx)', them: 'In the browser' },
      { feature: 'Device frames', us: 'Drawn in your template', them: '23 devices, clay or real, with 3D angles' },
      { feature: 'Localization', us: 'Included, localizations.json', them: 'Automatic translation, Standard plan and up' },
      { feature: 'Automation', us: 'CLI, free', them: 'REST API (alpha), Extended plan' },
      { feature: 'Google Play', us: 'Yes', them: 'Yes' },
      { feature: 'Price', us: 'Free, MIT', them: '$0, $19 or $49 a month' },
      { feature: 'App icons, favicons, OG images', us: 'Yes', them: 'Not mentioned' },
    ],
    chooseThem: [
      'You want a visual drag and drop editor with ready templates.',
      'You want 3D device angles without building them.',
      'You want machine translation of your captions done for you.',
    ],
    chooseUs: [
      'You want localization and automation without a subscription.',
      'You want screenshots in git, reviewed and rendered in CI.',
      'You also need the app icon and web images from the same templates.',
    ],
    faqs: [
      { q: 'How much does Screenshots.pro cost?', a: 'Its site lists Basic at $0, Standard at $19 a month and Extended at $49 a month, as of 2026-11-17. Localization starts on Standard and API access on Extended. Check its site for current prices.' },
      { q: 'Is Open Assets really free?', a: 'Yes. It is MIT licensed, with no plan tiers. Localization and the CLI are included.' },
      { q: 'Does Open Assets translate captions automatically?', a: 'No. You supply the text per language in localizations.json, or ask the Claude Code skill to draft translations for review.' },
      { q: 'Can I automate Open Assets in CI?', a: 'Yes. Run npx open-assets render in GitHub Actions or any CI. The docs include a GitHub Actions guide.' },
    ],
    related: [docsLinks.localization, docsLinks.ci, docsLinks.screenshots, sibling('applaunchpad', 'AppLaunchpad alternative')],
  },
  {
    slug: 'appscreen',
    name: 'AppScreen',
    framing: 'alternative',
    vendorUrl: 'https://github.com/YUZU-Hub/appscreen',
    asOf: AS_OF,
    title: 'AppScreen Alternative: Screenshots From a CLI | Open Assets',
    description:
      'An AppScreen alternative: both are free and MIT licensed, but Open Assets renders App Store screenshots from HTML templates with a CLI, in git and in CI.',
    h1: 'An AppScreen alternative that runs from the command line',
    summary: 'Two free MIT tools: a browser editor with 3D mockups versus a CLI with templates in git.',
    intro: [
      'AppScreen, from YUZU-Hub, is a free MIT licensed screenshot editor that runs in the browser, with a 3D iPhone mockup, gradient backgrounds, Google Fonts and AI translation using your own API key. Projects are saved in browser storage.',
      'Open Assets is also free and MIT licensed, but works from files: templates and translations live in your repo and a CLI renders them, so the same set renders again in CI.',
    ],
    rows: [
      { feature: 'License', us: 'MIT', them: 'MIT' },
      { feature: 'Where it runs', us: 'CLI on your machine or CI', them: 'Browser (hosted page, local server or Docker)' },
      { feature: 'Project storage', us: 'Files in your repo', them: 'Browser storage (IndexedDB)' },
      { feature: 'Device mockups', us: 'Drawn in your template', them: '3D iPhone model plus 2D mode' },
      { feature: 'Translation', us: 'localizations.json; the agent skill can draft', them: 'AI translation with your Claude, OpenAI or Google key' },
      { feature: 'Google Play', us: 'Built in sizes', them: 'Custom sizes' },
      { feature: 'CLI or config file', us: 'Yes', them: 'Not described' },
      { feature: 'App icons, favicons, OG images', us: 'Yes', them: 'Not mentioned' },
    ],
    chooseThem: [
      'You want a visual editor with a rotatable 3D iPhone.',
      'You want nothing to install: open the hosted page and export a ZIP.',
      'You want captions machine translated with your own AI key.',
    ],
    chooseUs: [
      'You want the design in files you can diff, review and re-render in CI.',
      'You want built in Google Play sizes, the app icon and web images too.',
      'You want an agent to change every language in one pass.',
    ],
    faqs: [
      { q: 'Is AppScreen the same as AppScreens?', a: 'No. AppScreen by YUZU-Hub is a free, MIT licensed browser tool. AppScreens is a separate commercial product.' },
      { q: 'Are both tools free?', a: 'Yes. AppScreen and Open Assets are both MIT licensed and free to use.' },
      { q: 'Can AppScreen run in CI?', a: 'Its README describes a browser app and no CLI or config file, so it is built for manual editing. Open Assets renders from a command, which suits CI.' },
      { q: 'Does Open Assets have 3D device mockups?', a: 'Not built in. Templates are HTML and CSS, so you can add a device image or CSS 3D transforms yourself.' },
    ],
    related: [docsLinks.screenshots, docsLinks.ci, docsLinks.localization, sibling('koubou', 'Koubou alternative')],
  },
  {
    slug: 'agent-skills',
    name: 'App Store screenshot agent skills',
    framing: 'vs',
    vendorUrl: 'https://github.com/ParthJadhav/app-store-screenshots',
    vendors: [
      { name: 'ParthJadhav app-store-screenshots', url: 'https://github.com/ParthJadhav/app-store-screenshots' },
      { name: 'framara app-store-screenshots-skill', url: 'https://github.com/framara/app-store-screenshots-skill' },
    ],
    asOf: AS_OF,
    title: 'App Store Screenshot Agent Skills Compared | Open Assets',
    description:
      'Three agent skills for App Store screenshots compared: ParthJadhav app-store-screenshots, framara app-store-screenshots-skill and the Open Assets skill.',
    h1: 'App Store screenshot agent skills compared',
    summary: 'ParthJadhav, framara and Open Assets: three MIT skills that let a coding agent make store screenshots.',
    intro: [
      'Three MIT licensed skills let an AI coding agent produce App Store screenshots, and they take different routes. ParthJadhav app-store-screenshots scaffolds a Next.js editor in your project. framara app-store-screenshots-skill captures your app from iOS simulators, composites captions and uploads to App Store Connect. The Open Assets skill drives the Open Assets CLI and its HTML templates.',
      'They are skills rather than products, so this page compares them side by side instead of naming one an alternative.',
    ],
    rows: [
      { feature: 'License', us: 'MIT', them: ['MIT', 'MIT'] },
      { feature: 'Install', us: 'npx open-assets skills', them: ['npx skills add ParthJadhav/app-store-screenshots', 'npx skills add framara/app-store-screenshots-skill'] },
      { feature: 'Agents', us: 'Claude Code', them: ['Claude Code, Cursor, Windsurf, OpenCode, Codex', 'Claude Code'] },
      { feature: 'How it renders', us: 'HTML templates in headless Chrome via the CLI', them: ['Next.js editor, PNGs via html-to-image', 'HTML and CSS compositor in headless Chrome'] },
      { feature: 'Input', us: 'Templates plus your images', them: ['Your screenshots in the editor', 'Live iOS simulator captures per language'] },
      { feature: 'Localization', us: 'localizations.json with RTL', them: ['Multiple locales, RTL guidance', 'One captions JSON, 39 App Store locales'] },
      { feature: 'Google Play', us: 'Yes', them: ['Yes', 'Not mentioned'] },
      { feature: 'Upload to App Store Connect', us: 'No, export only', them: ['Not mentioned', 'Yes, with the asc CLI'] },
      { feature: 'App icons, favicons, OG images', us: 'Yes', them: ['App Store creative assets', 'Not mentioned'] },
    ],
    chooseThem: [
      'ParthJadhav: you want a visual editor app generated in your repo and support for many agents.',
      'framara: you ship an iOS app, want real simulator captures in every language and want the upload handled too.',
    ],
    chooseUs: [
      'You want one CLI that renders screenshots, the app icon, favicons and OG images.',
      'You want renders that work without the agent, in CI, from a stable assets.json.',
      'You want incremental renders and a live preview server.',
    ],
    faqs: [
      { q: 'What is an agent skill for App Store screenshots?', a: 'A packaged set of instructions and scripts that an AI coding agent such as Claude Code loads, so it can design, localize and export store screenshots for you.' },
      { q: 'Which skill uploads to App Store Connect?', a: 'framara app-store-screenshots-skill uploads with the asc CLI. The ParthJadhav skill and Open Assets export files for you to upload.' },
      { q: 'Which one needs Xcode?', a: 'framara captures from iOS simulators, so it needs Xcode. ParthJadhav needs Node.js 20.9 or later. Open Assets needs Node.js and Chrome.' },
      { q: 'Can I use them together?', a: 'Yes. For example, capture app screens with simulator automation, then place them in Open Assets templates.' },
    ],
    related: [docsLinks.agents, docsLinks.screenshots, docsLinks.quickStart, sibling('koubou', 'Koubou alternative')],
  },
]
