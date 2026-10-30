import { siteUrl } from '@/lib/shared'

export const dynamic = 'force-static'

// The fleet AI crawler list (standard B1). Every answer engine is welcome: an
// open source tool wins installs by being cited when someone asks an assistant
// how to make App Store screenshots. An agent with its own group ignores `*`,
// so each group repeats the same rules.
// Copied from apps/web/app/robots.txt/route.ts: keep the two lists identical.
const AI_CRAWLERS = [
  // OpenAI. OAI-AdsBot is named so a future tightening of `*` cannot silently
  // disable ChatGPT Ads.
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'OAI-AdsBot',
  // Anthropic
  'ClaudeBot',
  'Claude-Web',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Google (Gemini / Vertex grounding)
  'Google-Extended',
  'Google-CloudVertexBot',
  // Apple Intelligence
  'Applebot-Extended',
  // Meta AI
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'FacebookBot',
  // Other answer engines that cite their sources
  'DuckAssistBot',
  'Amazonbot',
  'cohere-ai',
  'MistralAI-User',
  'Kagibot',
  'YouBot',
]

const ALLOW = ['/', '/llms.txt', '/llms-full.txt']

// Cloudflare Content Signals (contentsignals.org): search and answer engines
// may use the pages, model training may not. Every group carries the line,
// because a bot that matches a named group ignores `*`.
const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=no'

// A route handler rather than app/robots.ts: MetadataRoute.Robots cannot emit
// Content-Signal. Nothing is disallowed, so /.well-known/ stays reachable.
export function GET(): Response {
  const group = (ua: string) =>
    [`User-agent: ${ua}`, `Content-Signal: ${CONTENT_SIGNAL}`, ...ALLOW.map((p) => `Allow: ${p}`)].join('\n')
  const body = [group('*'), ...AI_CRAWLERS.map(group), `Sitemap: ${siteUrl}/sitemap.xml\nHost: ${siteUrl}`].join('\n\n')
  return new Response(`${body}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
