// Markdown for agents, used by custom-worker.ts. A GET whose Accept asks for
// text/markdown gets the static HTML page converted by Workers AI toMarkdown
// (free for HTML). Cloudflare's zone-level "Markdown for Agents" needs a Pro
// plan and this zone is Free, so the Worker does it.
//
// Bindings are typed structurally: this app has no workers-types, and only
// these two methods are used.

export interface MarkdownAi {
  toMarkdown(files: { name: string; blob: Blob }[]): Promise<{ data: string; tokens?: number | string }[]>
}

export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>
}

export function wantsMarkdown(req: Request): boolean {
  return req.method === 'GET' && /\btext\/markdown\b/.test(req.headers.get('accept') ?? '')
}

/** The same request, asking for HTML. */
export function asHtmlRequest(req: Request): Request {
  const headers = new Headers(req.headers)
  headers.set('accept', 'text/html')
  return new Request(req, { headers })
}

export async function asMarkdown(res: Response, ai: MarkdownAi | undefined): Promise<Response> {
  if (!ai || !res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return res
  const html = await res.text()
  const [doc] = await ai.toMarkdown([{ name: 'page.html', blob: new Blob([html], { type: 'text/html' }) }])
  const headers = new Headers(res.headers)
  headers.set('content-type', 'text/markdown; charset=utf-8')
  // Never cacheable: the cache key ignores Accept, so a cached copy would be served to browsers.
  headers.set("cache-control", "private, no-store");
  headers.set('vary', 'Accept')
  headers.set('x-markdown-tokens', String(doc?.tokens ?? Math.ceil((doc?.data.length ?? 0) / 4)))
  headers.delete('content-length')
  headers.delete('etag')
  return new Response(doc?.data ?? '', { status: res.status, headers })
}

/**
 * Headers the worker guarantees on every response it returns. public/_headers
 * sets the same ones, but Cloudflare does not promise to apply _headers to
 * responses that pass through Worker code, so they are set here too when
 * absent. Keep the two in step.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/** Agent discovery Link header for the homepage (RFC 8288). */
export const HOME_LINK =
  '</llms.txt>; rel="describedby"; type="text/markdown", </sitemap.xml>; rel="sitemap", </.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"'

/** Adds the security headers, Vary: Accept on HTML, and the Link header on "/". */
export function finalize(req: Request, res: Response): Response {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v)
  if ((out.headers.get('content-type') ?? '').includes('text/html')) {
    const vary = out.headers.get('vary')
    if (!vary || !/\baccept\b/i.test(vary)) out.headers.set('vary', vary ? `${vary}, Accept` : 'Accept')
  }
  if (new URL(req.url).pathname === '/' && !out.headers.has('link')) out.headers.set('link', HOME_LINK)
  return out
}
