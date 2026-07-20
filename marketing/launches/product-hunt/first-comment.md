# Product Hunt Maker Comment

Post immediately after the launch goes live. Warmer than the HN version, leads with the
why, ends with a question that invites feedback.

---

Hey Product Hunt! Ian here, maker of Open Assets.

I ship a lot of small iOS apps, and the step that always hurt was never the code, it was
the assets. The icon lives in Figma, in an Xcode asset catalog, as a favicon on the
website, in the OG image, and in every App Store screenshot, and none of them share a
source. Change one color and you spend the afternoon re-exporting files into five
places.

Open Assets makes the template the single source of truth. Every asset is one HTML or
SVG file in your git repo. You preview it in a Storybook-style dev server with hot
reload, and one command renders every size and sends each one where it belongs:
screenshots for every iPhone and iPad size, the icon straight into Xcode, the favicon
into your web app's public folder. Add a localizations file and the same templates
render in every language, with automatic right-to-left layout for Arabic and Hebrew.

A few things I am proud of:

- It is free, local, and MIT licensed. No SaaS, no per-seat design tool, your assets
  stay in your repo and re-render in CI.
- The examples in the repo are not mockups, they are the complete real asset sets from
  four apps I have shipped to the App Store.
- It is agent-native: there is a Claude Code skill, so a coding agent can design and
  render your entire screenshot set. HTML templates are the reason this works well.
- This launch is dogfooded: every image in the gallery above was rendered by Open
  Assets from HTML templates that live in the repo, in a folder called
  marketing/launches/product-hunt. [IF HN WENT WELL: We launched on Hacker News on
  Tuesday and (front page / great discussion), and a couple of fixes from that thread
  are already shipped.]

What it does not do yet: it renders raster PNG/JPG output only (SVG sources can be
copied through), and the incremental cache only tracks template files, so changes to
referenced images need a --force flag.

I would love to know: what is the most painful asset workflow in your current project?
If Open Assets does not cover it, that is exactly the feedback I am here for. I will be
around all day.

---

Placeholders to resolve before posting: the HN result line (cut it entirely if the HN
launch was quiet).
