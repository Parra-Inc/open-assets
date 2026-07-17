# open-assets — Marketing Plan

> Dev server and export tool for app marketing assets. Like Storybook, but for screenshots, icons, logos, OG images, and favicons. Authored in HTML/CSS/SVG, rendered to PNG via Puppeteer, exported direct-to-Xcode.

---

## 1. Positioning

### Primary positioning (the one we lead with)

**"Marketing assets as code. Designed in HTML, rendered by CLI, versioned in git."**

This is the line. It does the work of three lines:

1. It tells developers exactly what category we're in (build tools, not design tools).
2. It signals the workflow (HTML + CLI + git) — which is the only workflow the target customer trusts.
3. It implies the pain we solve without naming it: "no more Figma round-trips, no more sim-screenshot-crop-paste, no more re-doing all eight screenshots when you bump a color."

### Why not the other angles

- *"Stop screenshotting in the simulator."* — Funny, but it picks a fight with a workflow most devs have already given up on. Negative framing, harder to pitch in a tweet, and it doesn't capture icons / logos / OG / favicons.
- *"Fastlane Frameit for the modern indie dev."* — Useful as a comparison line in the README ("if you tried Frameit and bounced"), but Frameit is a niche reference and a 10-year-old tool. Anchoring our identity to it caps our ceiling.
- *"Marketing assets as code."* — Wins. Same energy as "Infrastructure as Code" or "Docs as Code" — both of which became category-defining phrases. Developers already understand the playbook: text files in git, diffed in PRs, rendered in CI.

### One-liner variations (use per channel)

| Channel | One-liner |
|---|---|
| GitHub repo description | Dev server and export tool for app marketing assets. Author in HTML/CSS/SVG, render to PNG via CLI. |
| HN Show title | Show HN: open-assets — Storybook for App Store screenshots, icons, and logos |
| Product Hunt tagline | Marketing assets as code. Render App Store screenshots from HTML. |
| Twitter bio / launch tweet | App Store screenshots, icons, OG images — authored in HTML, rendered by CLI, versioned in git. Free + open source. |
| iOS Dev Weekly pitch | Open-source CLI that lets you design App Store screenshots as HTML files and render them to every iPhone size with one command. |
| Reddit r/SideProject | I got tired of Figma round-trips for App Store screenshots, so I built a Storybook-style dev server + render CLI. Free and open source. |

### Anti-positioning (what we are NOT)

- **Not a no-code editor.** AppMockUp, AppLaunchpad, Previewed, Hotpot all compete on "drag and drop, no skills required." We compete on "you already know HTML, why are you in a drag-and-drop editor."
- **Not a SaaS.** Screenshots Pro is $19/mo. Bannerbear is API-as-a-service. We're MIT-licensed, runs locally, your assets stay in your repo.
- **Not a design tool.** Figma + plugins is the design tool. We're the build pipeline that runs after design is decided — the place where the source of truth lives and where CI re-renders on every commit.

---

## 2. Target Segments

Ranked by acquisition cost (lowest to highest) and lifetime advocacy (highest to lowest).

### Segment 1: Vibe coders / Claude Code users (PRIMARY)

**Who:** Devs who ship apps with Claude Code, Cursor, Codex, or Aider. They have an AI agent that can write HTML and read JSON. They already commit `.claude/skills/` directories. They expect every tool to be CLI-first and machine-readable.

**Pain:** They can ship an iOS app in a weekend, but they still get blocked at the App Store submission step because their AI can't drag-and-drop in Figma. Asset generation is the last manual step in a fully-automated pipeline.

**Why we win:** open-assets ships a Claude Code skill (`npx open-assets skills`). The agent reads `assets.json`, writes HTML templates, runs `npx open-assets render`, and is done. There is literally no other tool in this category that is agent-native. This is our moat.

**Acquisition channels:** Claude Code Discord/community, Claude skill marketplaces, Cursor forum, Aider GitHub discussions, "Vibe Coding" hashtag on X, Show HN, dev.to articles tagged `#claude` `#ai`.

**Estimated TAM:** ~50k–150k active AI-assisted coders in 2026, growing fast. Maybe 10–20% are shipping their own apps.

### Segment 2: Indie iOS dev shipping their first app

**Who:** Solo founders. Mostly Twitter/X, r/iOSProgramming, r/SwiftUI, iOS Dev Discord. They follow @SwiftUILab, @twostraws, @objcio, @StewartLynch, @sebastianboldt, @SwiftyAlex.

**Pain:** They wrote the app. Now they have to make eight beautiful screenshots × four iPhone sizes × however-many languages, and they have to do it again every time they ship a new feature. Most cave and ship ugly simulator screenshots. The ones who care end up paying $97 for AppMockUp templates or $19/mo for Screenshots Pro.

**Why we win:** Free, local, MIT. Looks pretty because the example screenshots in the README ship with real apps (Only Recipes, Cat IQ Test, No Context Bot). They can fork the example and have working screenshots in 10 minutes.

**Acquisition channels:** iOS Dev Weekly (Dave Verwer), SwiftLee Weekly (Antoine van der Lee), Indie Dev Monday, iOS Goodies, This Week in Swift, r/iOSProgramming, r/SwiftUI, iOS Dev Happy Hour Discord, indieapps.space.

### Segment 3: Solo founder shipping 5–10 apps a year

**Who:** The portfolio-app crowd. Pieter Levels, Marc Lou, Danny Postma, and the long tail of devs trying to copy them. Ship-fast, iterate-fast. Often build with Next.js + Expo + RevenueCat + Superwall.

**Pain:** Multiply screenshot pain by 10. They will pay for any automation, but they prefer free + open-source because they want it in CI, not on someone else's server. They've already built scripts on top of Fastlane Snapshot.

**Why we win:** `assets.json` + `assets.lock` + GitHub Action = the workflow they already use for every other build artifact. Adding a new app is `cp -r ./assets ../new-app && edit one file`.

**Acquisition channels:** Indie Hackers, Build in Public Twitter, Marc Lou's Discord, Levels.io, Starter Story, Microconf community, Pioneer.app.

### Segment 4: React Native / Expo devs

**Who:** Cross-platform shippers. Already comfortable with HTML/CSS by virtue of also being web devs. Heavy users of Expo Application Services (EAS), Expo Router, NativeWind.

**Pain:** They need iOS + Android + sometimes web screenshots, all from one source of truth. Existing tools force them to maintain three sets.

**Why we win:** HTML is platform-agnostic. Author once, render at every store's size table. We ship example configs for both stores.

**Acquisition channels:** Expo Discord, r/reactnative, React Native Newsletter, This Week in React, Evan Bacon (@Baconbrix), Brent Vatne (@notbrent).

### Segment 5: Agencies producing assets for clients

**Who:** Boutique iOS / cross-platform shops (Lickability, Black Pixel-era studios, Spec, Made by Hand). They ship multiple apps per quarter across multiple clients.

**Pain:** Every client has a different brand. They want a templated pipeline where switching brand = swapping a CSS variable file. Figma source files lock the asset hostage to whoever has the seat.

**Why we win:** Brand-as-CSS-variables. Asset source lives in the client's repo, not behind a Figma paywall. Easy to hand off when the engagement ends.

**Acquisition channels:** Less programmatic — direct outreach, write a case study with one design-forward shop (Lickability is the obvious one — they already have a Fastlane + SwiftUI screenshot blog post), then ride that case study.

---

## 3. Competitive Landscape

### Direct competitors

| Tool | Model | Pricing | Where they win | Where we beat them |
|---|---|---|---|---|
| **Fastlane Frameit** | Ruby gem, image-magick under the hood | Free, OSS | Ships with Fastlane, default for iOS pros | Limited to 1 screenshot per frame, broken Arabic/RTL, no HTML/CSS, looks dated |
| **Fastlane Snapshot** | Ruby + XCUITest | Free, OSS | Captures real app screens at every device size | Captures only — doesn't design the marketing layout. We're complementary, not competing. Position as "Snapshot for capture, open-assets for design." |
| **FrameKit (ainame)** | Swift library, SwiftUI authoring | Free, OSS | SwiftUI-native, Swift-first | iOS-only; we cover Android, web favicons, OG, Product Hunt cards |
| **Previewed** | Web app, 3D device renders | Free / $9.99 one-time / $19/mo | 3D mockups, nice UI | Locked into their renderer; can't version, no CI, no source of truth |
| **AppMockUp Studio** | Web app, template packs | Free base, $7.97–$199 templates | Massive template library | Pay-per-template, no programmatic control, no git |
| **Screenshots Pro (rs2.app)** | SaaS + API | $19/mo | Has an API | SaaS lock-in, your assets live in their cloud |
| **AppLaunchpad** | Web app | Free / paid tiers | Big template library, localization | No code-first workflow |
| **Rotato** | Mac app, 3D animation | One-time license (~$59–$119) | Best-in-class 3D and motion | Heavy, no batch CI, no source-controlled output |
| **Hotpot.ai** | AI image gen + templates | Freemium | AI generation | Generic AI output, no app-specific workflow |
| **Bannerbear** | API + designer | $49–$249/mo | API-driven, scales | Built for ad creative, not App Store; cloud-only |
| **Screenshot Studio** | Mac app | $29 one-time | Native macOS | macOS-only, no CI, no team workflow |
| **ScreenshotWhale** | Claude skill + SaaS | TBD | Same wedge as us (AI agents) | New, closed source, SaaS — we're free + local |

### The competitive insight

The market splits into two:

1. **No-code editors** (Previewed, AppMockUp, AppLaunchpad, Hotpot) — designed for solo founders without dev skills. Crowded. We don't compete here.
2. **Dev tools** (Fastlane Frameit, FrameKit, Snapshot) — designed for devs but stuck in 2015 paradigms (Ruby + image-magick, or Swift-only).

There is **no modern, language-agnostic, agent-native, CI-first** tool in category 2. ScreenshotWhale is closest, but it's a closed-source SaaS skill. We're the only credible OSS contender for the AI-coding generation.

### Pricing strategy

Free + MIT. Always. The product is the wedge.

Monetization (long-term, not now):
- **open-assets cloud** — hosted render farm for teams with huge asset sets ($X/seat, opt-in)
- **Template marketplace** — devs sell branded screenshot templates ($5–$50, we take 20%)
- **Sponsored templates** — RevenueCat, Superwall, Mixpanel pay to ship a free template branded with their SDK
- **Pro CLI features** — multi-language rendering with auto-translation, A/B variant generation, ASC direct upload

But none of that matters until the open-source tool has 5k+ GitHub stars.

---

## 4. The Five Initiatives

Ordered by what to do first.

### Initiative 1 — The Launch Trilogy (Week 1–4)

A coordinated three-channel launch designed to seed every developer adjacency at once.

**Day 1 — Show HN**
- Title: `Show HN: Open-assets – Storybook for App Store screenshots, icons, and logos`
- Post Tuesday or Wednesday, 8–10am PT
- First comment from author with the "why I built this" story: shipping multiple apps in 2026 with Claude Code, every part automated except the screenshots, every commercial tool either SaaS or locked into a no-code editor
- Stay on the thread all day. Reply to every comment within 30 min.
- Goal: front page top 30, 200+ GitHub stars

**Day 2 — Product Hunt**
- Pre-warm hunter: reach out to Chris Messina (@chrismessina) or one of the top PH hunters for dev tools
- Tagline: "Marketing assets as code. Render App Store screenshots from HTML."
- Gallery assets: a GIF of dev server → render → exports/iphone-6.9/ in 30 seconds; before/after of "simulator screenshot" → "open-assets render"; the three example apps in the README rendered side-by-side
- First comment: same story as HN, slightly different tone
- Goal: top 5 of the day in Developer Tools

**Day 3 — Twitter/X thread**
- 12-tweet thread, posted 8am PT Thursday
- Hook tweet: "I shipped 4 apps last year. The hardest part wasn't the code. It wasn't even the App Review. It was making 32 screenshots × 4 device sizes × 8 languages every time I changed a color. So I built this:" + 5-second GIF
- Tweets 2–10: one per feature with a screenshot or GIF (dev server, HTML template, render CLI, Claude skill, Xcode integration, GitHub Action, before/after, three example apps)
- Tweet 11: GitHub link
- Tweet 12: "Free, MIT licensed, looking for early users — RT if you ship apps and would use this"
- Goal: 100k+ impressions, 500+ GitHub stars from Twitter alone

**Day 4–7 — Newsletter outreach (in parallel)**
- Pitch iOS Dev Weekly (submit through form, also DM Dave Verwer)
- Pitch SwiftLee Weekly (Antoine van der Lee — email)
- Pitch Indie Dev Monday (form)
- Pitch iOS Goodies
- Pitch This Week in Swift
- Pitch Mobile Dev Weekly
- Pitch React Native Newsletter
- Pitch React Status (Cooper Press)
- Pitch JavaScript Weekly (it's a Node CLI, fits)
- Pitch Console.dev (curated dev tools newsletter — exactly our audience)
- Pitch TLDR Web Dev

**Week 2–4 — Sustain**
- Dev.to article: "I built an open-source Fastlane Frameit alternative because Frameit was holding my apps back"
- Hashnode cross-post
- Submit to Awesome lists (see Initiative 4)
- Reply to every related question on r/iOSProgramming, r/SwiftUI, r/SideProject, r/reactnative for 4 weeks
- Cross-post to lobste.rs, devhunt.org, betalist, scrolllaunch, smollaunch

### Initiative 2 — The Claude Code Skill Beachhead (Week 1, Ongoing)

The single biggest differentiator is the Claude Code skill. This is the message that puts us 18 months ahead of every other screenshot tool.

**Actions:**
- Submit to Anthropic's Claude Skills directory (when it opens) — first dev-tool skill in
- Write a dedicated landing page section: "Built for AI-assisted coding. Your agent ships the screenshots."
- Record a 60-second video: "Watch Claude design and render eight App Store screenshots for a new app in 5 minutes" — post to Twitter, YouTube Shorts, dev.to
- Pitch a guest post to Anthropic's blog or developer relations: "Case study: shipping App Store assets with a Claude skill"
- Reach out to: @AnthropicAI, @alexalbert__, @karpathy, Simon Willison (he writes about every meaningful AI dev tool), @swyx
- Pitch the AI Engineer summit / AI Tinkerers meetups in SF and NYC
- Cross-promote with Cursor and Aider communities — open PRs adding open-assets to their "compatible tools" docs

**Long-term:** Build similar skills for Codex and Cursor's @-mentions system. Each one is a one-day port and a fresh launch.

### Initiative 3 — Example Apps Are the Marketing (Ongoing)

The single highest-leverage marketing asset is the README. The README shows three example apps with rendered screenshots. Every new example app added is a piece of marketing collateral.

**Actions:**
- Grow examples from 3 → 10 over 90 days, each from a real shipped app
- Reach out to 5 indie devs we admire and offer to ghost-build their screenshot pipeline in exchange for an open-source example folder
  - Targets: Sebastian Röhl (@sebastianboldt), Adam Wulf (@adamwulf), Hidde van der Ploeg (@hiddevdploeg), Christian Selig (@ChristianSelig), James Thomson (@jamesthomson)
- Each example app = one tweet ("New example: NewApp now ships its App Store screenshots with open-assets") and one footer link in their dev's bio / about page
- Every example app's screenshots in the App Store carry a halo (devs notice when other devs' apps look good)

**Sub-initiative: the "rendered with open-assets" credit**
- Encourage example users to add a footer credit in their `assets.json` README: "Designed and rendered with open-assets"
- Like "Powered by Vercel" or "Hosted on Heroku" of the early 2010s

### Initiative 4 — Awesome List + Discoverability Saturation (Week 2–6)

Get listed everywhere. Each listing is a permanent SEO + discovery asset that compounds.

**Awesome list PRs (open within 2 weeks of launch):**
- `vsouza/awesome-ios` (most-starred iOS list)
- `matteocrippa/awesome-swift`
- `jondot/awesome-react-native`
- `agarrharr/awesome-cli-apps`
- `sindresorhus/awesome-nodejs`
- `agarrharr/awesome-static-website-services` (for OG/favicons)
- `Famolus/awesome-sass` (we render via CSS — adjacent)
- `LucasMW/awesome-storybook` (we are literally Storybook for marketing assets)
- `posquit0/Awesome-CV` (no — wrong audience, skip)
- `appliedrecognition/awesome-asset-generation` (create if doesn't exist)

**Directory submissions:**
- Product Hunt (Initiative 1)
- DevHunt (PH for developers)
- BetaList
- Console.dev
- Hacker News Show HN (Initiative 1)
- Lobsters
- IndieHackers Products section
- alternativeto.net — list as alternative to Fastlane Frameit, AppMockUp, Previewed, Screenshots Pro
- G2 / Capterra (low priority; non-dev audiences)
- Producthuntalternative directories: Smol Launch, Uneed, OpenHunts, Firsto
- Toolify, Futurepedia (the AI tool directories) — angle: AI-native asset generation
- Indie Hackers products
- Refind, Tools.fyi, Indiehackers.com

**Swift / iOS specific:**
- Swift Package Index — submit the repo (even though we're npm, SPI accepts adjacent tools)
- iosfeeds.com
- indieapps.space — submit as a featured tool, not as an app

### Initiative 5 — Sponsored Content & Partnerships (Month 2–4)

Once organic launch is past peak, the next push is paid + partnership leverage. Goal: get in front of the next 50k devs without paying for ads directly.

**Newsletter sponsorships (paid placements):**

| Newsletter | Audience | Approx cost | Why |
|---|---|---|---|
| iOS Dev Weekly | 46k iOS devs | $1,500/issue | Our exact ICP |
| SwiftLee Weekly | 27k Swift devs | $500–800 | Tighter SwiftUI audience |
| React Native Newsletter | ~10k | $300–600 | Cross-platform reach |
| This Week in Swift | ~5k | $300 | Lower funnel |
| Console.dev | 20k dev tool nerds | $1,000–2,000 | Curated dev tools — perfect fit |
| TLDR Web Dev | 300k+ | $4,000–8,000 | Big reach, lower fit |

Probably only do iOS Dev Weekly + Console.dev to start. Budget: ~$3k total.

**Partnership integrations (free, mutually amplifying):**

| Partner | Integration | Pitch |
|---|---|---|
| **RevenueCat** | Ship a free RevenueCat-branded paywall screenshot template | "RevenueCat customers ship beautiful paywalls — here's the template" |
| **Superwall** | Ship a Superwall paywall template | Same play, different audience |
| **Expo / EAS** | Add open-assets to the Expo docs' "marketing assets" section | "Already use EAS for builds — use open-assets for screenshots" |
| **App Store Connect API tooling (asc-cli, fastlane deliver)** | Integrate as a "render → upload" pipeline; pitch joint blog post | One-command screenshot → ASC upload |
| **MakeSwift, Plasmic** | They're visual editors that output HTML — natural upstream | "Designed in Plasmic, exported with open-assets" |
| **Vercel** | OG image generation overlap — pitch as a CLI alternative to @vercel/og | Different use case (App Store), no real conflict |
| **Anthropic / Claude Code** | Featured skill, case study | Already detailed in Initiative 2 |
| **shadcn** | He commands the modern dev community's attention; if he tweets it, we're set | Cold reach via DM with a working example using his components |

**Conference / podcast pitches:**

- Indie Hackers Podcast (Courtland Allen) — "How I built a free tool replacing $1k/yr of SaaS"
- Under the Radar (Marco Arment & David Smith) — episode topic: "Streamlining App Store releases"
- Stacktrace (John Sundell & Gui Rambo) — Swift-focused, "Tools we use this week"
- Vergecast (long shot, but their consumer-tech audience occasionally bites)
- Fatherhood.fm — no, wrong show
- AI Engineer Summit talk pitch — "Agent-native dev tools: the open-assets case study"
- Swift Heroes / try!Swift conference talk

---

## 5. Ads Library — Dev-Marketing Creative

Every piece below is something we can ship in a week. None of these are paid ads. They're all organic creative for dev channels.

### A. The "Before / After" tweet

**Visual:** Side-by-side. Left: ugly iPhone simulator screenshot, raw, status bar at 9:41. Right: branded App Store screenshot rendered by open-assets — bold headline, colored background, real app content in a device frame.

**Copy:**
> Most indie apps ship simulator screenshots. The competition spent $500 in Figma.
>
> open-assets is free, MIT, and renders both in seconds. (Tool below.)

**Channel:** Twitter, Mastodon, Threads, Bluesky.

### B. The 30-second screen recording (the "money shot")

**What it shows:**
1. Terminal: `npx open-assets init`
2. Browser opens at localhost:3200 with sample screenshots
3. Edit `01-hero.html` — change headline, save
4. Browser hot-reloads
5. Terminal: `npx open-assets render`
6. `exports/screenshots/iphone-6.9/01-hero.png` opens in Preview at 1320×2868

**Length:** 30 seconds, no narration, just sound effects + lo-fi soundtrack.

**Channel:** Twitter (native MP4), YouTube Shorts, TikTok dev hashtags, Product Hunt gallery, GitHub README (animated GIF version), Indie Hackers post, blog header.

### C. The "git diff" tweet

**Visual:** Screenshot of `git diff` showing two lines changed in `01-hero.html` — a headline string and a color hex code. Below the diff: the rendered before/after screenshots.

**Copy:**
> When was the last time you changed your App Store screenshots with `git diff`?
>
> open-assets makes marketing assets reviewable in PRs.

**Channel:** Twitter, dev.to article header, GitHub README.

### D. The Show HN post

**Title:** `Show HN: open-assets – Storybook for App Store screenshots, icons, and logos`

**Body:**
> Hi HN — I ship 4–5 apps a year and got tired of the App Store screenshot grind. Every other tool I tried was either a no-code editor (Figma, Previewed, AppMockUp) or a Ruby gem from 2014 (Fastlane Frameit).
>
> I built open-assets because I wanted my marketing assets to live in git, render in CI, and be editable by Claude Code.
>
> - HTML/CSS/SVG → PNG via Puppeteer
> - Dev server with live preview (like Storybook, but for marketing assets)
> - One config file (`assets.json`) defines collections × export sizes
> - Direct export to Xcode `.appiconset`
> - Ships a Claude Code skill so AI agents can design and render screenshots
> - MIT, free, no SaaS
>
> Three real example apps in the repo: a recipe app, a cat IQ test, and a Twitter bot. Would love feedback from anyone shipping apps.
>
> Repo: https://github.com/Parra-Inc/open-assets

### E. The README screenshot grid

**What:** A 3×3 grid of rendered example screenshots from the three (eventually ten) example apps. Composite into one big PNG. Use as:
- Twitter card / OG image when the repo URL is shared
- Top of every blog post
- Hero image on openassets.dev
- README banner (already exists but iterate)

### F. The "listicle pitch" email

**Template for pitching tools-roundup articles:**

> Subject: open-assets — open-source alternative to Fastlane Frameit for your "App Store screenshot tools 2026" roundup
>
> Hey [author],
>
> Saw your post on [10 Best App Screenshot Tools / Fastlane alternatives / etc]. We just open-sourced open-assets — a CLI + dev server that lets devs author App Store screenshots, icons, and OG images in HTML/CSS and render them to PNG. Think Storybook, but for marketing assets.
>
> Differentiator: it's the only tool in the category with a Claude Code skill, so AI coding agents can generate and re-render assets autonomously.
>
> - GitHub: github.com/Parra-Inc/open-assets
> - Examples (3 shipped apps): see README
> - One-line install: `npm i -D @open-assets/open-assets`
>
> Happy to send a 30-second demo GIF if helpful.

**Targets:** AppDrift, AppLaunchpad blog, TheAppLaunchpad, AppScreenshots.net, Udonis blog, Hackernoon, dev.to top authors in `#ios` and `#reactnative`, Console.dev curators.

### G. The "Marketing for Engineers" listing pitch

The [marketingforengineers.com](https://marketingforengineers.com) resource list is read by exactly our ICP. Submit there directly.

### H. The blog-post pitch ("write for them, get linked back")

Pitch guest posts to:
- Lickability blog (they already wrote about Fastlane + SwiftUI screenshots — natural follow-up)
- The Vapor blog (Swift on server crowd, adjacent)
- Expo blog ("How EAS users handle App Store screenshots")
- RevenueCat blog ("Designing your paywall screenshot")

Topic ideas:
- *"Marketing assets as code: why I version-control my App Store screenshots"*
- *"Replacing Fastlane Frameit with a 50-line HTML template"*
- *"How I let Claude Code design my App Store screenshots (with the receipts)"*
- *"A complete CI pipeline: from `git push` to App Store Connect screenshot upload"*

### I. The GitHub README badges

Add at the top of the README:

```markdown
[![npm version](https://img.shields.io/npm/v/@open-assets/open-assets)](https://npmjs.com/package/@open-assets/open-assets)
[![GitHub stars](https://img.shields.io/github/stars/Parra-Inc/open-assets?style=social)](https://github.com/Parra-Inc/open-assets)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Claude Skill](https://img.shields.io/badge/Claude%20Code-Skill-orange)](https://claude.ai)
[![Discord](https://img.shields.io/discord/...)](https://discord.gg/...)
```

Star counts and Claude Skill badges drive trust at first-glance.

### J. The "5-minute video tutorial" YouTube series

Topics:
1. *Your first App Store screenshot in 5 minutes with open-assets*
2. *Generating all of your app icon sizes for Xcode in one command*
3. *Using Claude Code to design 8 App Store screenshots while you watch*
4. *Setting up GitHub Actions to auto-render marketing assets on every push*
5. *Replacing Fastlane Frameit with open-assets (migration guide)*

Each one ~5 min. SEO-targeted titles. Cross-post to YouTube, dev.to embed, Twitter.

### K. The Lickability case-study collaboration

Lickability already wrote a popular post on automating App Store screenshots with Fastlane + SwiftUI. The natural evolution is open-assets — a tool-agnostic, code-first design layer that sits on top of their Snapshot capture pipeline.

Pitch them on writing a follow-up case study together. They get content, we get the halo of a respected studio's endorsement.

### L. The "stickers + swag" play (cheap and effective)

Order 500 die-cut stickers with the open-assets logo. Mail free to anyone who tweets a screenshot of their `assets.json` and a "rendered with open-assets" credit. Cost: ~$200. Reach: incalculable.

---

## 6. Channel-by-Channel Playbook

### Twitter / X

- Post 1 build-in-public update per day for first 30 days
- Reply within 5 min to anyone mentioning Frameit, App Store screenshots, AppMockUp, Previewed
- Pin the launch thread
- Use hashtags `#buildinpublic` `#indiedev` `#iosdev` `#reactnative` `#claudecode`
- Tag accounts when relevant — `@swiftui`, `@iosdevweekly`, `@AnthropicAI`, `@CursorAI`
- Engage with the top 30 indie iOS devs daily (genuine replies, not "great post")

**Accounts to engage:**
- @twostraws (Paul Hudson, Hacking with Swift)
- @objcio (objc.io, Chris Eidhof / Florian Kugler)
- @SwiftUILab (Javier)
- @SwiftyAlex (Alex Logan)
- @sebastianboldt
- @hiddevdploeg (Hidde van der Ploeg)
- @ChristianSelig (Apollo dev)
- @StewartLynch
- @apparentsoft (Jeff Johnson)
- @jamesthomson (PCalc)
- @marcoarment
- @_DavidSmith
- @gruber
- @adam_wulf
- @nickfrey (RevenueCat DevRel)
- @marclou (indie SaaS, broader audience)
- @levelsio (indie portfolio inspiration)
- @cassidoo (frontend, broader Node audience)
- @swyx
- @simonw

### Reddit

- **r/iOSProgramming** — strict no-self-promo rules. Post a "I built this, sharing in case useful" with the full story, not a link-dump. Respond to every comment.
- **r/SwiftUI** — same approach, with SwiftUI angle
- **r/SideProject** — most permissive, lead with story
- **r/reactnative** — emphasize cross-platform
- **r/IndieDev** — mix of game + app devs, broader
- **r/iOSdev** — smaller, friendlier
- **r/AppStoreOptimization** — ASO crowd may find tactical value
- **r/Claude** / **r/ClaudeAI** — lead with the skill angle
- **r/programming** — only if launch is genuinely big news

### Newsletters (cold pitch order)

1. iOS Dev Weekly (Dave Verwer) — must-hit
2. SwiftLee Weekly (Antoine van der Lee) — must-hit
3. Indie Dev Monday — must-hit
4. iOS Goodies
5. This Week in Swift
6. iOS Cookies
7. Mobile Dev Weekly (Peter Steinberger era; check current curator)
8. AppMakers.dev newsletter
9. Console.dev — must-hit, exact ICP
10. JavaScript Weekly (Cooper Press)
11. Node Weekly (Cooper Press)
12. React Status (Cooper Press)
13. React Native Newsletter
14. This Week in React
15. TLDR Web Dev (massive but lower fit)
16. Bytes.dev
17. Smashing Magazine newsletter
18. Indie Hackers digest

### Podcasts (cold pitch order)

1. Indie Hackers Podcast (Courtland Allen)
2. Under the Radar (Marco Arment + Underscore David Smith) — high signal in iOS
3. Stacktrace (John Sundell + Gui Rambo)
4. Swift over Coffee (Paul Hudson + Sean Allen)
5. Empower Apps (Leo Dion)
6. iOS Dev Discussions (Sean Allen)
7. Compressed FM (frontend, secondary)
8. Devtools FM
9. ChangelogFM — the open-source story angle
10. The TWiML / AI engineering podcasts — Claude skill angle
11. Latent Space (swyx + Alessio) — AI tools focus

### Discords / community spaces

- iOS Dev Happy Hour
- Hacking with Swift's Slack
- Indie Hackers Discord
- Build in Public Discord
- Anthropic Claude Discord
- Cursor Discord
- Expo Discord
- Marc Lou's Discord
- The Browser Company indie dev Discord
- Indie Apple Devs Discord
- SwiftUI on Discord

### GitHub-native marketing

- README badges, GIF demo, clear value prop in first 3 lines
- Pin the repo on the org profile
- Star-history.com chart in the README once we hit 500 stars
- "Sponsor" button to GitHub Sponsors (optional but signals seriousness)
- Discussions tab open with seeded topics
- Issue templates that double as social proof ("how I'm using open-assets")
- `topics` tag spam (but accurate): `app-store`, `screenshots`, `marketing`, `puppeteer`, `claude-code`, `cli`, `nodejs`, `ios`, `react-native`, `expo`, `xcode`, `app-icon`, `og-image`, `favicon`

---

## 7. Metrics & Goals

### Month 1 (launch)
- 1,000 GitHub stars
- 500 npm weekly downloads
- 50 forks
- 10 issues, 5 PRs from external contributors
- 200 Twitter followers on the project account
- 1 newsletter feature (iOS Dev Weekly or SwiftLee)
- 1 podcast booked
- 5 example apps in the repo

### Month 3
- 3,000 GitHub stars
- 2,000 npm weekly downloads
- 200 forks
- 3 newsletter features
- 2 podcasts recorded
- 1 case study with a recognizable indie dev / agency
- 10 example apps in the repo
- 3 Awesome list inclusions

### Month 6
- 7,500 GitHub stars
- 5,000 npm weekly downloads
- 500 forks
- 1 conference talk delivered or accepted
- "open-assets" is the answer when people ask "how do I make App Store screenshots without paying $19/mo" in r/iOSProgramming
- First commercial pilot: a paid Pro feature OR an enterprise pilot with an agency

### Year 1
- 15k GitHub stars (top 1% of OSS)
- "Marketing assets as code" is a recognized phrase in indie iOS / RN circles
- Featured in the Anthropic Claude skill marketplace
- Default recommendation in iOS Dev Weekly / SwiftLee / Indie Dev Monday
- Sustainable revenue path identified

### Leading indicators to watch weekly
- GitHub star velocity (stars / week)
- npm downloads (weekly)
- "open-assets" search volume on Google + GitHub
- Inbound mentions on Twitter / Reddit / HN
- Discord / community signups
- Time-to-first-render on new users (from clone to `exports/`)

---

## 8. The #1 Action This Week

**Launch the Show HN + Twitter thread + Product Hunt trilogy (Initiative 1, Days 1–3).**

Specifically, the first 48 hours:

1. Cut the 30-second screen recording (Initiative 5.B) — this is the single highest-leverage asset
2. Add the three README badges (5.I)
3. Write the Show HN post (5.D) — schedule for Tuesday 8am PT
4. Write the launch tweet thread (12 tweets) — schedule for Thursday 8am PT
5. DM Chris Messina or another top PH hunter for Wednesday's PH launch
6. Email iOS Dev Weekly, SwiftLee, Indie Dev Monday, Console.dev with the launch ahead of time so the post is on their radar when Friday's issue is curated

Everything else in this plan compounds off the launch. Without a clean launch week, the Awesome lists, podcasts, and partnerships are harder to land because there's no momentum to point at.

After the launch trilogy, the next move is Initiative 3 (more example apps) — every new example is a tweet, a halo, and another permanent piece of marketing real estate.

---

## Sources & References

**Competitor research:**
- AppDrift — "App Screenshot Makers Compared: 10 Tools Tested (2026)" — https://appdrift.co/blog/10-best-app-store-screenshots
- AppLaunchpad — "Top 7 App Store Screenshot Generators in 2026" — https://theapplaunchpad.com/blog/top-7-app-store-screenshot-generators
- Medium / Ignatius Sani — "I Tested 4 App Store Screenshot Generators" — https://medium.com/@Iggy01/i-tested-4-app-store-screenshot-generators-one-of-them-actually-respects-your-time-6750a8a63212
- Previewed — https://previewed.app/app-store-screenshot-generator/
- Screenshots Pro — https://screenshots.pro/
- AppMockUp Studio — https://app-mockup.com/
- Fastlane Frameit docs — https://docs.fastlane.tools/actions/frameit/
- Fastlane Snapshot docs — https://docs.fastlane.tools/getting-started/ios/screenshots/
- FrameKit by ainame — https://github.com/ainame/FrameKit
- Lickability — "Automating App Store Screenshots with Fastlane and SwiftUI" — https://lickability.com/blog/automating-app-store-screenshots-with-fastlane-and-swiftui/
- ScreenshotWhale — https://screenshotwhale.com/blog/generate-app-store-screenshots-with-claude-code
- Bannerbear / Puppeteer guide — https://www.bannerbear.com/blog/how-to-take-screenshots-with-puppeteer/

**Channel research:**
- iOS Dev Weekly — https://iosdevweekly.com
- SwiftLee Weekly — https://www.avanderlee.com/swiftlee-weekly-subscribe/
- Indie Dev Monday — https://indiedevmonday.com/
- AppMakers.dev newsletter list — https://appmakers.dev/best-ios-development-newsletters/
- Developer newsletters list — https://github.com/jackbridger/developer-newsletters
- vsouza/awesome-ios — https://github.com/vsouza/awesome-ios
- matteocrippa/awesome-swift — https://github.com/matteocrippa/awesome-swift
- Indie Hackers Twitter strategy guide — https://www.teract.ai/resources/twitter-strategy-indie-hackers-2026
- 52 iOS devs to follow on Twitter — https://gist.github.com/namndev/aa0ca9ed273ed92361346ee8093818ed
- DevHunt (Product Hunt for devs) — referenced via Product Hunt alternatives research
- Console.dev — referenced as curated dev tools newsletter
