import type { MetadataRoute } from 'next'
import { site } from '@/data/site'

export const dynamic = 'force-static'

// The fleet AI crawler list (standard B1). Every answer engine is welcome: an
// open source tool wins installs by being cited when someone asks an assistant
// how to make App Store screenshots. An agent with its own group ignores `*`,
// so each group repeats the same rules.
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
  'Bytespider',
  'CCBot',
]

const ALLOW = ['/', '/llms.txt', '/llms-full.txt']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ALLOW }, ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: ALLOW }))],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  }
}
