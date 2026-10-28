import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Used when git has no history for the file (uncommitted, or a shallow clone).
const FALLBACK = new Date('2026-10-28T00:00:00Z');

/** First commit date of a docs page, for datePublished. */
export function pageFirstPublished(pagePath: string): Date {
  try {
    const out = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%cI', '--', join('content/docs', pagePath)],
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .pop();
    return out ? new Date(out) : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Last commit date of a docs page, for "Last updated" and sitemap lastmod. */
export function pageLastModified(pagePath: string): Date {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', join('content/docs', pagePath)], {
      encoding: 'utf8',
    }).trim();
    return out ? new Date(out) : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
