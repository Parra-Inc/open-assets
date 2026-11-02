# Open Assets: AI search prompt set

The fixed set of buyer prompts used to measure Open Assets in AI search answers. Every rerun asks these exact prompts so results compare. Source: the 2026-10-30 fleet AEO audit (`marketing/seo/audits/2026-10-30/aeo/open-assets.json`).

Prompt text, mention, citation and sources come from the audit JSON. Keyword form, intent and priority were assigned when writing this file (priority follows the audit fix ranking: buying and switching prompts first, head terms last).

## Prompts

| # | Prompt | Keyword form | Intent | Priority |
|---|---|---|---|---|
| 1 | how to generate App Store screenshots from HTML templates in git, open source | app store screenshots from html templates | commercial (open source tool) | High |
| 2 | best free alternative to fastlane frameit / AppMockUp / Previewed for App Store screenshots | fastlane frameit alternative | commercial (switching) | High |
| 3 | localize App Store screenshots into many languages automatically CLI | localize app store screenshots cli | commercial (tool) | Medium |
| 4 | Claude Code skill to design app icons and App Store screenshots | claude code skill app icons screenshots | commercial (agent tool) | High |
| 5 | generate OG images and favicons from one template command line tool | og image favicon generator cli | commercial (tool) | Medium |
| 6 | open-assets.dev Open Assets marketing assets (branded) | open assets | navigational (branded) | Medium |

## Baseline: 2026-10-30

Engine caveat: Claude WebSearch (standard mode) only, one run per prompt. ChatGPT, Perplexity, Gemini and Google AI Overviews were not measured, so treat this as a directional baseline, not a rate.

- Non-branded: mentioned 0/5, cited 0/5. Branded: 0/1; results dominated by unrelated OpenAsset DAM (openasset.com).
- GA4 AI referrals (property 561276147, 90daysAgo..yesterday): 0 (0 rows returned). 0 rows. Property is for open-assets.dev; docs subdomain may or may not share it (unverified).

| # | Mentioned | Cited | Top sources | Cause (audit) |
|---|---|---|---|---|
| 1 | no | no | pypi.org/koubou, producthunt.com (Open Screenshot Generator, Shotcraft), hunted.space, sourcepulse.org (ParthJadhav app-store-screenshots) | existing page: docs /guides/app-store-screenshots, README |
| 2 | no | no | appscreenshotstudio.com, itnext.io, butterkit.app, theapplaunchpad.com, mindnode.com, alternativeto.net, screenhance.com, gainframe.app, toolradar.com | existing page: docs /migrate/frameit (exists) |
| 3 | no | no | alternativeto.net (LocaShot, Shotlingo), hunted.space, aso.dev | existing page: docs /localization (exists) |
| 4 | no | no | claudemarketplaces.com, claudskills.com, pasqualepillitteri.it, crossaitools.com, vibeindex.ai, llmbase.ai, techpp.com | existing page: docs /agents, README (skill) |
| 5 | no | no | pypi.org/faviconx, github.com/rudrodip/seomage, skillselion.com, github.com/nik-rev/og-image-generator, index.dodopayments.com | existing page: docs /guides/og-images, /guides/favicons |
| 6 | no | no | openasset.com (unrelated DAM), fugo.ai, builtworlds.com | existing page: home |
