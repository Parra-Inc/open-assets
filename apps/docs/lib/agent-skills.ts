import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// The Claude skill this repo ships (skills/open-assets/SKILL.md, also published
// in the npm package). Read at build time; the index digest is computed from
// the exact bytes served at SKILL_PATH, so the two cannot drift.
export const SKILL_NAME = 'open-assets'
export const SKILL_PATH = '/.well-known/agent-skills/open-assets/SKILL.md'
export const SKILL_ORIGIN = 'https://docs.open-assets.dev'

export function skillMarkdown(): string {
  return readFileSync(path.join(process.cwd(), '..', '..', 'skills', 'open-assets', 'SKILL.md'), 'utf8')
}

export function skillDescription(md: string): string {
  const m = md.match(/^description:\s*(.+)$/m)
  return (m?.[1] ?? '').trim()
}

export function skillsIndex() {
  const md = skillMarkdown()
  return {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      {
        name: SKILL_NAME,
        type: 'skill-md',
        description: skillDescription(md),
        url: `${SKILL_ORIGIN}${SKILL_PATH}`,
        digest: `sha256:${createHash('sha256').update(md, 'utf8').digest('hex')}`,
      },
    ],
  }
}
