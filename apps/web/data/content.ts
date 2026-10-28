import { site } from './site'

/** Page copy shared by the homepage, llms.txt and llms-full.txt. */

export const features = [
  {
    title: 'One template, every size',
    body: 'Author an App Store screenshot once and render it for iPhone 6.9", 6.7", iPad, Google Play, Product Hunt and any custom dimension. No per-device rework.',
    icon: 'M4 5h10v14H4zM16 8h4v8h-4z',
  },
  {
    title: 'Export anywhere',
    body: 'Write favicon.png into public/, send the OG image to your web app, and fill your Xcode .appiconset directly. Each size picks its own destination.',
    icon: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  },
  {
    title: 'Localization built in',
    body: 'One template renders in every language with {{placeholders}}, locale-aware number formatting and automatic RTL layout for Arabic and Hebrew.',
    icon: 'M4 6h9M8.5 4v2m2.5 0c-.5 4-3 7-6.5 8.5M7 9.5c1 2 3 3.5 5 4.5M13 20l4-9 4 9m-6.5-3h5',
  },
  {
    title: 'Live preview dev server',
    body: 'A Storybook-style UI with hot reload, zoom and pan, and one-click exports while you iterate on templates.',
    icon: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm9 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
  {
    title: 'Versioned in git, rendered in CI',
    body: 'No SaaS and no per-seat design tool. Review screenshot changes in a pull request and re-render on every push with GitHub Actions. assets.lock skips anything unchanged.',
    icon: 'M6 4v10m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm12-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 0c0 5-6 4-12 8',
  },
  {
    title: 'Agent native',
    body: 'Ships a Claude Code skill so your coding agent can design, localize and render the entire App Store asset set for you.',
    icon: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Zm6 11 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z',
  },
]

export const faqs = [
  {
    q: 'What is Open Assets?',
    a: 'Open Assets is a free, open source CLI and dev server for generating app marketing assets: App Store screenshots, Google Play screenshots, app icons, favicons, OG images and social banners. You design each asset as an HTML, CSS or SVG template in your repository and render it at every size you need.',
  },
  {
    q: 'How do I generate App Store screenshots for every iPhone and iPad size?',
    a: 'Add one template per screenshot and list the export sizes you need in assets.json, for example iPhone 6.9" (1320×2868), iPhone 6.7" (1290×2796) and iPad 13". Running npx open-assets render produces a PNG for every template at every size.',
  },
  {
    q: 'Can it generate app icons and favicons?',
    a: 'Yes. Design the icon once at 1024×1024, then export 512, 192, 180, 32 and 16 pixel variants, write favicon.png straight into your web app, and fill an Xcode AppIcon.appiconset in the same pass.',
  },
  {
    q: 'Does it support localized screenshots?',
    a: 'Yes. Templates use {{placeholders}} backed by per-locale strings, with locale-aware number formatting and automatic right-to-left layout, so one template renders for every App Store language.',
  },
  {
    q: 'Is Open Assets free?',
    a: 'Yes. It is MIT licensed, runs locally with Node.js 18 or newer, and has no account, subscription or upload step.',
  },
  {
    q: 'How is this different from Figma or a screenshot builder website?',
    a: 'Your assets live as code next to your app. They are diffable in pull requests, rendered in CI, reproducible on any machine, and easy for an AI coding agent like Claude Code to edit.',
  },
]

export const installCommands = [
  { key: 'npm', cmd: `npm install --save-dev ${site.pkg}` },
  { key: 'pnpm', cmd: `pnpm add --save-dev ${site.pkg}` },
  { key: 'yarn', cmd: `yarn add --dev ${site.pkg}` },
  { key: 'bun', cmd: `bun add --dev ${site.pkg}` },
]
