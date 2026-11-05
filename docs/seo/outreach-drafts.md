# Outreach drafts: App Store screenshot tool roundups (DRAFT, NOT SENT)

Status: drafts only. Nothing here has been sent or posted. Each draft discloses that we make Open Assets. Targets come from the sources AI search returned for screenshot-tool prompts in the 2026-10-30 audit (`marketing/seo/audits/2026-10-30/aeo/open-assets.json`). Before sending, confirm each target page still exists, is a roundup that accepts suggestions, and find the real contact route on the page itself.

Facts used in every draft (from this repo): free, MIT license, npm CLI (`npx open-assets render`), Claude Code skill included, localization with `localizations.json` (fallbacks, number formatting, RTL), renders app icons, favicons and OG images from the same `assets.json`. Docs: https://docs.open-assets.dev. Comparison: https://docs.open-assets.dev/compare

## 1. itnext.io article on frameit alternatives

- Who: the author of the itnext.io article returned for "best free alternative to fastlane frameit".
- Where: the author's Medium profile contact or a response on the article.
- Why: the article ranks for the exact frameit-alternative prompt where we were not mentioned.
- Text:

> Hi, I make Open Assets (disclosure: it is our product, from Parra). It is a free, MIT-licensed CLI that renders App Store screenshots from HTML/CSS templates in your repo and localizes them per language, so it fits next to frameit for people who want a scriptable, CI-friendly step. If you ever update the piece, it might be a useful entry. Docs: https://docs.open-assets.dev, and a migration guide from frameit: https://docs.open-assets.dev/migrate/frameit. No worries if it does not fit.

## 2. theapplaunchpad.com / appscreenshotstudio.com style roundups

- Who: editors of screenshot-tool comparison or blog posts on these sites (only if they publish third-party roundups, not just their own product).
- Where: the contact form on the site.
- Why: these pages were sources for the frameit-alternative prompt.
- Text:

> Hello, I work on Open Assets (disclosure: we build it). If you keep a list of App Store screenshot tools, we would be glad to be considered: free and MIT licensed, a CLI that renders screenshots from HTML templates, 1 command for every locale, and a Claude Code skill. Comparison with other tools: https://docs.open-assets.dev/compare. Thanks for reading.

## 3. aso.dev localization content

- Who: aso.dev authors, returned for "localize App Store screenshots into many languages automatically CLI".
- Where: contact route on aso.dev.
- Why: localization is the prompt where a CLI answer is most relevant.
- Text:

> Hi, disclosure first: I make Open Assets. For readers who want to localize screenshots from a script or CI, it renders one HTML template per locale from an `.xcstrings`-style strings file, with locale number formatting and automatic RTL. It is free and MIT licensed. Guide: https://docs.open-assets.dev/localization. Happy to answer questions if it is useful for a future article.

## 4. Claude skill directories (claudemarketplaces.com, claudskills.com)

- Who: maintainers of directories returned for "Claude Code skill to design app icons and App Store screenshots".
- Where: each directory's own submission form, if it has one.
- Why: we ship a skill and were not listed for that prompt.
- Note: this overlaps "third-party listing claims", which is PUNTED in fleet.md. Hold this one until that decision is revisited.
- Text:

> Open Assets skill (disclosure: we make it). A Claude Code skill plus MIT CLI for designing and rendering App Store screenshots, app icons, favicons and OG images from HTML templates. Install: `npx skills add https://github.com/Parra-Inc/open-assets --skill open-assets`.
