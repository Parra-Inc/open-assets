import { execFileSync } from 'node:child_process'

// Used when git is unavailable at build time (shallow CI checkout, tarball).
const FALLBACK = '2026-10-28'

/**
 * The date the page content last changed, from git, for sitemap `lastmod`
 * (standard B4). Never `new Date()`: a build date that moves on every deploy
 * teaches crawlers to ignore the field.
 */
export function contentLastModified(paths: string[]): string {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], { encoding: 'utf8' }).trim()
    return out || FALLBACK
  } catch {
    return FALLBACK
  }
}
