import { skillMarkdown } from '@/lib/agent-skills'

export const dynamic = 'force-static'

// The skill itself, byte for byte what the index digest was computed from.
export function GET(): Response {
  return new Response(skillMarkdown(), { headers: { 'content-type': 'text/markdown; charset=utf-8' } })
}
