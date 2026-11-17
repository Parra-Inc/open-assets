#!/usr/bin/env node
/**
 * Ping IndexNow with the docs.open-assets.dev pages a deploy changed (standard B9).
 * scripts/deploy.sh runs `pnpm run indexnow --changed=<last deployed sha>` from
 * apps/docs after a successful deploy.
 *
 *   node scripts/indexnow-submit.mjs --changed=<sha>   pages touched since <sha>
 *   node scripts/indexnow-submit.mjs --all             every docs page
 *   add --dry-run to print the list without sending
 *
 * content/docs/<slug>.mdx maps to /<slug> (index.mdx to its folder). A change
 * to lib/sizes.mjs or generated/ maps to the pages that render generated data;
 * a change anywhere else in apps/docs (layout, components) sends every page.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = '4dec8efe55bbb78431893bc9a87b51cc' // public/<key>.txt, public by design
const HOST = 'docs.open-assets.dev'
const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(app, 'content/docs')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const base = args.find((a) => a.startsWith('--changed='))?.slice(10)

function walk(dir) {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]))
}
function urlFor(rel) {
  const slug = rel.replace(/\.mdx$/, '').replace(/(^|\/)index$/, '')
  return `https://${HOST}${slug ? `/${slug}` : ''}`
}
const pageFiles = walk(content).filter((f) => f.endsWith('.mdx')).map((f) => relative(content, f))
const all = [...pageFiles.map(urlFor), `https://${HOST}/llms.txt`, `https://${HOST}/llms-full.txt`]

function changedUrls(sha) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: app, encoding: 'utf8' }).trim()
  const files = execFileSync('git', ['diff', '--name-only', '--diff-filter=AMR', `${sha}..HEAD`, '--', 'apps/docs', 'lib/sizes.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !/\.test\.mjs$/.test(f) && !f.startsWith('apps/docs/scripts/'))
  const urls = new Set()
  for (const f of files) {
    if (f.startsWith('apps/docs/content/docs/')) {
      if (f.endsWith('.mdx')) urls.add(urlFor(f.slice('apps/docs/content/docs/'.length)))
    } else if (f === 'lib/sizes.mjs' || f.startsWith('apps/docs/generated/')) {
      urls.add(`https://${HOST}/reference/sizes`)
    } else {
      return all
    }
  }
  if (urls.size > 0) urls.add(`https://${HOST}/llms.txt`).add(`https://${HOST}/llms-full.txt`)
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
