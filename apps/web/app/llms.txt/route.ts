import { llmsHeader, llmsLinks, textResponse } from '@/lib/llms'

export const dynamic = 'force-static'

export function GET() {
  return textResponse([...llmsHeader(), ...llmsLinks()].join('\n'))
}
