'use client'

import { useState, useSyncExternalStore } from 'react'

const noop = () => () => {}
const readToken = () => new URLSearchParams(location.search).get('token') ?? ''

/**
 * Unsubscribes only on a button press (a POST). A GET that unsubscribed would
 * be triggered by mail link scanners and prefetch.
 */
export default function UnsubscribeConfirm() {
  const token = useSyncExternalStore(noop, readToken, () => '')
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

  async function confirm() {
    setState('pending')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div role="status">
        <h1>You&apos;re unsubscribed</h1>
        <p>You will not get any more newsletter emails from Open Assets. Changed your mind? Subscribe again from the form at the bottom of any page.</p>
        <a className="btn btn-ghost" href="/">Back to Open Assets</a>
      </div>
    )
  }

  return (
    <div>
      <h1>Unsubscribe from the newsletter</h1>
      {token ? (
        <>
          <p>Press the button to stop getting new templates and releases by email.</p>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={state === 'pending'} aria-busy={state === 'pending' || undefined}>
            {state === 'pending' ? 'Unsubscribing...' : 'Unsubscribe'}
          </button>
          {state === 'error' && (
            <p role="alert" className="newsletter-error">Something went wrong. Please try again.</p>
          )}
        </>
      ) : (
        <p>This link is missing its token. Use the unsubscribe link from the bottom of a newsletter email.</p>
      )}
    </div>
  )
}
