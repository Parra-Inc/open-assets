#!/usr/bin/env node
/**
 * Ping IndexNow with the open-assets.dev pages a deploy changed (standard B9).
 * scripts/deploy.sh runs `pnpm run indexnow --changed=<last deployed sha>` from
 * apps/web after a successful deploy; it reads the built out/sitemap.xml.
 *
 *   node scripts/indexnow-submit.mjs --changed=<sha>   pages touched since <sha>
 *   node scripts/indexnow-submit.mjs --all             every sitemap URL
 *   add --dry-run to print the list without sending
 *
 * Mapping: a family data module (data/templates.ts, data/size-pages.ts,
 * data/competitors.ts) or route folder maps to that family's URLs; anything
 * else in apps/web, or lib/sizes.mjs, can change every page, so all URLs go.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = '3d1b104150a1576e6f2fb3f398cc2b9f' // public/<key>.txt, public by design
const HOST = 'open-assets.dev'
const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const base = args.find((a) => a.startsWith('--changed='))?.slice(10)

const sitemap = readFileSync(join(app, 'out/sitemap.xml'), 'utf8')
const all = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
all.push(`https://${HOST}/llms.txt`, `https://${HOST}/llms-full.txt`)

const FAMILY = {
  'apps/web/data/templates.ts': '/templates',
  'apps/web/app/templates/': '/templates',
  'apps/web/data/size-pages.ts': '/sizes',
  'apps/web/app/sizes/': '/sizes',
  'apps/web/data/competitors.ts': '/alternatives',
  'apps/web/app/alternatives/': '/alternatives',
}

function changedUrls(sha) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: app, encoding: 'utf8' }).trim()
  const files = execFileSync('git', ['diff', '--name-only', `${sha}..HEAD`, '--', 'apps/web', 'lib/sizes.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !/\.(test\.mjs|md)$/.test(f) && !f.startsWith('apps/web/scripts/'))
  const urls = new Set()
  for (const f of files) {
    const prefix = Object.keys(FAMILY).find((k) => f.startsWith(k))
    if (!prefix) return all // shared file: every page may have changed
    const family = FAMILY[prefix]
    for (const u of all) if (new URL(u).pathname.startsWith(family)) urls.add(u)
    urls.add(`https://${HOST}/llms.txt`).add(`https://${HOST}/llms-full.txt`)
  }
  return [...urls]
}

const urlList = args.includes('--all') ? all : base ? changedUrls(base) : null
if (!urlList) {
  console.error('indexnow: pass --changed=<sha> or --all')
  process.exit(2)
}
if (urlList.length === 0) {
  console.log('indexnow: no public pages changed')
  process.exit(0)
}
console.log(`indexnow: ${urlList.length} URL(s)\n  ${urlList.join('\n  ')}`)
if (dryRun) process.exit(0)

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
})
if (res.ok || res.status === 202) console.log(`indexnow: accepted (${res.status})`)
else {
  console.error(`indexnow: ${res.status} ${await res.text()}`)
  process.exit(1)
}
