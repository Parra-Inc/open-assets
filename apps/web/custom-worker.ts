// Worker entrypoint (wrangler `main`). The site is still a static export served
// from Workers static assets; this script only exists for agents:
//
//   - Accept: text/markdown gets the page as markdown (lib/agent-markdown.ts).
//   - HTML gets Vary: Accept, and "/" gets the agent discovery Link header.
//
// wrangler `run_worker_first` keeps hashed /_next/static files off this path.
import { asHtmlRequest, asMarkdown, finalize, wantsMarkdown, type AssetsFetcher, type MarkdownAi } from './lib/agent-markdown'

interface Env {
  ASSETS: AssetsFetcher
  AI?: MarkdownAi
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (wantsMarkdown(request)) {
      return finalize(request, await asMarkdown(await env.ASSETS.fetch(asHtmlRequest(request)), env.AI))
    }
    return finalize(request, await env.ASSETS.fetch(request))
  },
}
