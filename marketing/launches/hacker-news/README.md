# Hacker News Launch: Open Assets

**Launch date:** Tuesday, July 21, 2026, 8:00 AM MT (7:00 AM PT)
**Post type:** Show HN
**Primary goal:** GitHub stars and first-wave adopters (npm installs). One goal, not five.
**URL to submit:** https://github.com/Parra-Inc/open-assets

## Why Hacker News first

Open Assets is a developer CLI, open source, MIT licensed, try-able in one command
(`npx open-assets init`). That is the exact profile the Show HN format rewards. Product
Hunt follows two days later (Thursday, July 23) with momentum, testimonials, and any
sharp questions from the HN thread folded into the maker comment. Do not run both the
same day: you cannot own two comment sections at once.

## Sequencing

| Day | Move |
|-----|------|
| Mon Jul 20 (evening) | Warm owned channels: personal note to anyone who has used it (Tax Days, Only Recipes, Thoughtful beta circles), "launching on HN tomorrow morning, here's a first look." No vote asks, ever. |
| Tue Jul 21, 8:00 AM MT | Submit to HN. Immediately post the first comment. Live in the thread for 3 hours minimum. |
| Tue all day | Answer everything. Capture recurring questions for the PH maker comment and follow-up content. |
| Thu Jul 23, 1:01 AM MT | Product Hunt launch (see `../product-hunt/`). |
| Sat Jul 25 | Recap post on X / owned channels: "what happened when we launched." |

## Readiness gate result

Passing now:

- Live and try-able: `npx open-assets init && npx open-assets dev` works from a cold
  machine (verify once more Monday night on a clean directory outside the repo).
- npm package published: `@open-assets/open-assets@0.4.0` is live.
- README states what it does in the first two lines, with real example galleries from
  four shipped apps.
- Pricing is transparent: free, MIT, no SaaS.
- First comment: drafted in `first-comment.md`.
- Title: final in `title.md`.

Still on you (blockers in bold):

- **Block 8:00 AM to 12:00 PM MT on Tuesday.** No meetings. The comments are the launch.
- **HN account standing.** The `ianmaccallum` account shows karma 1. Spend Sunday and
  Monday leaving a handful of genuine, substantive comments on threads you actually know
  about (iOS dev, App Store process, build tooling). Do not submit anything. A brand-new
  looking account gets less benefit of the doubt on launch day.
- Set the GitHub repo social preview image (Settings > Social preview) to
  `public/img/banner/1280.png` so the link unfurls well everywhere the thread travels.
- Fresh-install test Monday night: `npm create` a scratch dir, run
  `npx @open-assets/open-assets init` and `dev`, confirm the viewer opens and an export
  works. The first click from the top comment must not hit a broken flow.
- Optional but high payoff: a 10 second GIF of the dev server hot-reloading a screenshot
  template, linked from the README top. Moving demo beats static images.

## Files

- `title.md`: the submission title, plus alternates
- `first-comment.md`: paste-ready founder comment, post it within seconds of submitting
- `launch-day.md`: hour-by-hour timeline in MT, comment-handling rules
- `checklist.md`: tick-box pre-launch checklist
- `follow-up.md`: the T+24h retrospective and what feeds Product Hunt on Thursday
