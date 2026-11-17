'use client'

import { useState } from 'react'
import { track, type AnalyticsEvent } from '@/lib/analytics'

/** A copy-to-clipboard button that sends one analytics event per click. */
export default function CopyButton({
  text,
  event,
  params,
  label = 'Copy',
  className = 'copy-btn',
  ariaLabel,
}: {
  text: string
  event: AnalyticsEvent
  params: Record<string, string | number>
  label?: string
  className?: string
  ariaLabel?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    track(event, params)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked; the text is still on the page to select.
    }
  }

  return (
    <button type="button" className={className} onClick={copy} aria-label={ariaLabel ?? label}>
      {copied ? 'Copied' : label}
    </button>
  )
}
