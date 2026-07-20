# Product Hunt Launch: Open Assets

**Launch date:** Thursday, July 23, 2026, 1:01 AM MT (12:01 AM PT, banks the full PH day)
**Product name:** Open Assets
**Primary goal:** Reach the non-HN builder audience (indie devs, vibe coders, design-adjacent makers) and convert them to installs. Secondary: a launch badge and durable PH page for SEO.
**Links:** https://github.com/Parra-Inc/open-assets and https://www.npmjs.com/package/@open-assets/open-assets

## Why Product Hunt second

HN (Tuesday) is the primary room for a CLI, but Open Assets has a genuinely visual
story: the Storybook-style dev server, the gallery fan-out, real App Store screenshots
from shipped apps. That earns it a PH day, two days after HN, carrying momentum and
with the HN thread's sharpest Q&A folded into the maker comment. The launch is
dogfooded: every gallery frame below was rendered by Open Assets itself, from HTML
templates in this folder. Say so in the maker comment, it is the best proof the tool
works.

## Readiness gate result

Passing:

- Try-able instantly: `npx open-assets init`.
- Gallery: 5 brand-matched frames authored in `screenshots/` and rendered to
  `exports/gallery/` at 2x (2540x1520) and 1x (1270x760). Upload the 2x set.
- Tagline and maker comment drafted (`title.md`, `first-comment.md`).
- Pricing transparent: free, MIT.

Still on you (blockers in bold):

- **Create/claim the PH maker account and the product page in advance** (Wednesday at
  the latest). New accounts posting at 12:01 AM cold is a bad look.
- **Availability:** PH is an all-day game. Block Thursday morning MT for comments, and
  check in hourly through the evening. If you cannot do launch-day presence two days
  after the HN push, move PH to the following Tuesday instead of half-running it.
- Strongly recommended: a 15-30 second screen recording of the dev server (hot reload a
  template, click export) as the first gallery slot. Video/GIF leads outperform static
  thumbnails by a wide margin. The rendered `01-hero` frame is the fallback thumbnail.
- Line up 3-5 real early users to leave honest comments Thursday morning (comments and
  discussion, never "please upvote").

## Files

- `title.md`: name, tagline, and the topics/links metadata
- `first-comment.md`: the maker's first comment
- `gallery.md`: gallery order, captions, and how to re-render the frames
- `launch-day.md`: hour-by-hour timeline in MT
- `checklist.md`: pre-launch tick boxes
- `follow-up.md`: post-launch capture and content plan
- `screenshots/` + `assets.json`: the gallery source templates (rendered with Open
  Assets itself; see `gallery.md`)
