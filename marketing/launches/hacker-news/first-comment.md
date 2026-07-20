# HN First Comment

Post this as a top-level comment within seconds of submitting. Have it in your clipboard
before you post. Fill the one placeholder first.

---

Hi HN, I build a lot of small iOS apps, and every one of them has the same asset sprawl
problem: the icon exists in Figma, in an Xcode .appiconset, as a favicon in the web
app's public/ folder, in the OG image, and in the App Store screenshots. None of them
share a source. Change the icon and you are re-exporting and copy-pasting files into
five places, and something is always stale.

Open Assets makes the template the single source of truth. Each asset (icon, screenshot,
logo, social card) is one HTML/Tailwind or SVG file checked into your repo. A manifest
declares where it needs to go, and one command fans it out:

- The app icon renders at 1024/180/120 and writes directly into the Xcode .appiconset

- The favicon template exports 512/192/16 and drops a 32px favicon.png and a 180px
  apple-touch-icon.png straight into your web app's public/ directory

- One screenshot template renders for iPhone 6.9", 6.7", iPad, and Play Store, and once
  per locale if you add a localizations file (mustache-style placeholders, Intl number
  formatting, automatic RTL for Arabic and Hebrew). Output folders map 1:1 to App Store
  Connect's per-language screenshot slots.

Change the template, run `npx open-assets render`, and every destination updates. Under
the hood it is Puppeteer rendering each template at a source size and scaling to each
export size, with a lockfile of SHA256 checksums so unchanged assets are skipped. That
makes it cheap to run in CI: screenshot changes show up in PR diffs and re-render on
push. There is also a Storybook-style dev server with hot reload for designing the
templates.

It also ships a Claude Code skill, so an agent can read your app and generate the whole
screenshot set. Templates being plain HTML is what makes that work: LLMs write Tailwind
far better than they drive design tools.

Known limitations: the lockfile only checksums the template files themselves, so changes
to referenced images or compiled Tailwind need --force. [VERIFY BEFORE POSTING: any
other current sharp edge you would want named before a commenter finds it, e.g. font
loading in offline CI.]

Free, local, MIT licensed. The repo includes the complete real asset sets from four
shipped apps as examples. Happy to go deep on the rendering pipeline, the localization
format, or keeping an icon in sync across an app, a website, and a store listing.

---

## Why this shape

- Leads with a problem every shipped-an-app reader has felt, then one thesis sentence.
- Three concrete fan-out proofs instead of a feature list.
- Technical substance (Puppeteer, SHA256 lockfile, CI) because HN wants the hard parts.
- Limitations named before the top critic names them.
- The agent angle is a closing flourish, not the pitch, to avoid reflexive AI-tool
  skepticism.
