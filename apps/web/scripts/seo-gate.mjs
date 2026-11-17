#!/usr/bin/env node
/**
 * SEO gate for open-assets.dev, run right after `next build` (fleet standard L1).
 * It reads the exported HTML, so it checks what actually ships:
 *
 * - every sitemap URL, and every family hub, has a <title> of at most 60
 *   characters and a meta description of 150 to 160 characters (A4)
 * - a self-referencing canonical on every one of those pages (A2)
 * - at least one internal link on every page (no orphans or dead ends)
 * - no em dash in any page title or description
 * - every sitemap URL exists as a built page
 *
 * Exits 1 with a list of failures, so a page cannot ship without them.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '../out')
const ORIGIN = 'https://open-assets.dev'
const HUBS = ['/templates', '/sizes', '/alternatives']

const sitemap = readFileSync(join(out, 'sitemap.xml'), 'utf8')
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '') || '/')
const all = [...new Set([...paths, ...HUBS])]

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const failures = []
const fail = (path, msg) => failures.push(`${path}: ${msg}`)

for (const path of all) {
  const file = path === '/' ? join(out, 'index.html') : join(out, `${path}.html`)
  if (!existsSync(file)) {
    fail(path, 'listed but not built')
    continue
  }
  const html = readFileSync(file, 'utf8')
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '')
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
  const expected = path === '/' ? [ORIGIN, `${ORIGIN}/`] : [`${ORIGIN}${path}`]

  if (!title) fail(path, 'missing <title>')
  else if (title.length > 60) fail(path, `title is ${title.length} characters (max 60): "${title}"`)
  if (!description) fail(path, 'missing meta description')
  else if (description.length < 150 || description.length > 160)
    fail(path, `description is ${description.length} characters (150 to 160): "${description}"`)
  if (/\u2014/.test(title + description)) fail(path, 'em dash in title or description')
  if (!canonical) fail(path, 'missing canonical')
  else if (!expected.includes(canonical)) fail(path, `canonical ${canonical} is not ${expected[0]}`)

  const main = html.split('<main')[1] ?? ''
  const internal = [...main.matchAll(/<a [^>]*href="(\/[^"#]*|https:\/\/open-assets\.dev[^"]*)"/g)].filter(
    (m) => m[1] !== path,
  )
  if (path !== '/' && internal.length === 0) fail(path, 'no internal link inside <main>')
}

if (failures.length > 0) {
  console.error(`seo-gate: ${failures.length} problem(s)\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log(`seo-gate: ${all.length} page(s) pass (titles, descriptions, canonicals, internal links)`)
