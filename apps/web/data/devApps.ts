/**
 * The AI Drops family of developer apps, promoted in the "More for developers"
 * section. Mirrors bleeping-swift's data/aiDrops.ts.
 *
 * Every app has a `live` boolean. An app with `live: false` is fully wired up
 * but hidden: the page renders `liveDevApps`, never the raw list. Flip it to
 * `true` (and fix `appStoreUrl` if needed) when the app ships.
 */

export interface DevApp {
  key: string
  title: string
  tagline: string
  icon: string
  appStoreUrl: string
  /** Brand accent (hex), used for the card glow. */
  accent: string
  live: boolean
}

export const devApps: DevApp[] = [
  {
    key: 'claude-drops',
    title: 'Claude Drops',
    tagline: 'Changelog and push alerts so you never fall behind on Claude Code.',
    icon: '/img/apps/claude-drops.png',
    appStoreUrl: 'https://apps.apple.com/app/id6760681118',
    accent: '#d97757',
    live: true,
  },
  {
    key: 'slash-cards',
    title: '/cards',
    tagline: 'Flashcards to master every Claude Code slash command.',
    icon: '/img/apps/cards.png',
    appStoreUrl: 'https://apps.apple.com/app/id6770581039',
    accent: '#d97757',
    live: true,
  },
  {
    key: 'claude-prep',
    title: 'Claude Prep',
    tagline: 'Mock exams to pass the Claude Certified Architect exam on the first try.',
    icon: '/img/apps/claude-prep.png',
    appStoreUrl: 'https://apps.apple.com/app/id6790151492',
    accent: '#d97757',
    live: true,
  },
  {
    key: 'open-drops',
    title: 'Open Drops',
    tagline: 'Stay up to date on ChatGPT, API and Codex releases.',
    icon: '/img/apps/open-drops.png',
    appStoreUrl: 'https://apps.apple.com/app/id6782110963',
    accent: '#10a37f',
    // Not shipped yet, flip to true on launch.
    live: false,
  },
  {
    key: 'cursor-drops',
    title: 'Cursor Drops',
    tagline: 'Every Cursor release the day it ships.',
    icon: '/img/apps/cursor-drops.png',
    appStoreUrl: 'https://apps.apple.com/app/id6782111232',
    accent: '#0098ff',
    // Not shipped yet, flip to true on launch.
    live: false,
  },
]

export const liveDevApps = devApps.filter((app) => app.live)

/** Apps whose screenshots are shown in the Examples section, with their real dimensions. */
export const showcase = [
  { key: 'skimmer', height: 652, name: 'Skimmer', url: 'https://apps.apple.com/app/id6775022955' },
  { key: 'tax-days', height: 652, name: 'Tax Days', url: 'https://apps.apple.com/us/app/tax-days-residency-tracker/id6761441335' },
  { key: 'only-recipes', height: 652, name: 'Only Recipes', url: 'https://apps.apple.com/us/app/only-recipes-recipe-keeper/id1553858589' },
  { key: 'thoughtful', height: 745, name: 'Thoughtful', url: 'https://apps.apple.com/us/app/thoughtful-grow-relationships/id6762098726' },
  { key: 'cat-iq-test', height: 869, name: 'Cat IQ Test', url: 'https://apps.apple.com/us/app/cat-iq-test/id6759520249' },
  { key: 'no-context', height: 957, name: 'No Context Bot', url: 'https://nocontextbot.com' },
]
