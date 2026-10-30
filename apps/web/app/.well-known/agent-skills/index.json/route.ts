import { skillsIndex } from '@/lib/agent-skills'

export const dynamic = 'force-static'

// Agent Skills discovery index (agentskills.io, discovery 0.2.0).
export function GET(): Response {
  return new Response(`${JSON.stringify(skillsIndex(), null, 2)}\n`, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
