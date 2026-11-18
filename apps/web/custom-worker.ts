// Worker entrypoint (wrangler `main`). The site is still a static export served
// from Workers static assets; this script handles the newsletter endpoints
// (lib/newsletter-api.ts) and, for agents:
//
//   - Accept: text/markdown gets the page as markdown (lib/agent-markdown.ts).
//   - HTML gets Vary: Accept, and "/" gets the agent discovery Link header.
//
// wrangler `run_worker_first` keeps hashed /_next/static files off this path.
import { asHtmlRequest, asMarkdown, finalize, wantsMarkdown, type AssetsFetcher, type MarkdownAi } from './lib/agent-markdown'
import { SUBSCRIBE_PATH, UNSUBSCRIBE_PATH, handleSubscribe, handleUnsubscribe, type NewsletterDb } from './lib/newsletter-api'

interface Env {
  ASSETS: AssetsFetcher
  AI?: MarkdownAi
  /** D1 newsletter_subscribers (migrations/). */
  DB?: NewsletterDb
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === SUBSCRIBE_PATH) return finalize(request, await handleSubscribe(request, env.DB))
    if (pathname === UNSUBSCRIBE_PATH) return finalize(request, await handleUnsubscribe(request, env.DB))
    if (wantsMarkdown(request)) {
      return finalize(request, await asMarkdown(await env.ASSETS.fetch(asHtmlRequest(request)), env.AI))
    }
    return finalize(request, await env.ASSETS.fetch(request))
  },
}
