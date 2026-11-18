'use client'

import { useId, useState, type FormEvent } from 'react'
import { markNewsletterSubscribed, useNewsletterSubscribed } from '@/lib/newsletter'

export const NEWSLETTER_TITLE = 'Subscribe to our newsletter'
export const NEWSLETTER_DESCRIPTION = 'Get new templates and releases delivered to your inbox.'

/**
 * Grouped email field + button (one pill). Every placement passes its own
 * `source`. Once anyone subscribes, every form on the page shows the
 * confirmation instead (lib/newsletter.ts).
 */
export default function NewsletterForm({ source, size = 'md' }: { source: string; size?: 'sm' | 'md' }) {
  const id = useId()
  const subscribed = useNewsletterSubscribed()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (subscribed) {
    return (
      <p role="status" className="newsletter-done">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You&apos;re subscribed
      </p>
    )
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    const website = String(new FormData(e.currentTarget).get('website') ?? '')
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source, website }),
      })
      if (res.ok) {
        markNewsletterSubscribed()
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error ?? 'Something went wrong. Please try again.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="newsletter-control">
      <form className={`newsletter-pill newsletter-${size}`} onSubmit={onSubmit} aria-busy={pending || undefined}>
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <input
          id={id}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="newsletter-hp" />
        <button type="submit" disabled={pending}>
          {pending ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {error && (
        <p id={`${id}-error`} role="alert" className="newsletter-error">
          {error}
        </p>
      )}
    </div>
  )
}
