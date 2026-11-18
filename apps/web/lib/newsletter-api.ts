// Newsletter endpoints, served by the Worker in front of the static export
// (custom-worker.ts). The site has no server runtime, so these live here
// rather than in app/api.
//
//   POST /api/newsletter/subscribe    { email, source?, website? }
//   POST /api/newsletter/unsubscribe  { token }
//
// Both are idempotent and never reveal whether an address or token is on the
// list. The in-memory limiter is per isolate (a speed bump); the real limit is
// the zone WAF rate-limit rule in program/index.ts.

/** The slice of the D1 binding these handlers use. */
export interface NewsletterDb {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } }
}

export const SUBSCRIBE_PATH = '/api/newsletter/subscribe'
export const UNSUBSCRIBE_PATH = '/api/newsletter/unsubscribe'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL = 254
const MAX_SOURCE = 60
const MAX_TOKEN = 64

const hits = new Map<string, { count: number; reset: number }>()
function limited(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Normalizes a submitted address, or returns null when it is not one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) return null
  return email
}

export function normalizeSource(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const source = value.trim().slice(0, MAX_SOURCE)
  return source || null
}

export async function handleSubscribe(request: Request, db: NewsletterDb | undefined): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  if (limited(`subscribe:${ip}`)) return json({ error: 'Too many requests, try again in a minute' }, 429)

  const body = await readJson(request)
  const email = normalizeEmail(body?.email)
  if (!email) return json({ error: 'Enter a valid email address' }, 400)
  // Honeypot: bots fill every field. Same answer, no write.
  if (typeof body?.website === 'string' && body.website !== '') return json({ subscribed: true })
  if (!db) return json({ error: 'Signups are unavailable right now' }, 503)

  // One atomic upsert: a repeat signup reactivates the row and keeps the
  // original unsubscribe_token so old email links keep working.
  await db
    .prepare(
      `INSERT INTO newsletter_subscribers (email, source, unsubscribe_token)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         is_active = 1,
         unsubscribed_at = NULL,
         source = COALESCE(excluded.source, newsletter_subscribers.source),
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(email, normalizeSource(body?.source), crypto.randomUUID())
    .run()

  return json({ subscribed: true }, 201)
}

export async function handleUnsubscribe(request: Request, db: NewsletterDb | undefined): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  if (limited(`unsubscribe:${ip}`, 10)) return json({ error: 'Too many requests, try again in a minute' }, 429)

  const token = (await readJson(request))?.token
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN) {
    return json({ error: 'A valid token is required' }, 400)
  }
  if (!db) return json({ error: 'Unsubscribing is unavailable right now' }, 503)

  // Always the same answer for a well-formed token, so tokens cannot be probed.
  await db
    .prepare(
      `UPDATE newsletter_subscribers
       SET is_active = 0, unsubscribed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE unsubscribe_token = ? AND is_active = 1`,
    )
    .bind(token)
    .run()
  return json({ success: true })
}
