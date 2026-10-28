'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

export default function CopyCommand({
  command,
  location,
  className = '',
}: {
  command: string
  /** Where on the page this command sits, for the copy_command event. */
  location: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    track('copy_command', { location, command: command.slice(0, 100) })
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the command is still selectable.
    }
  }

  return (
    <div className={`terminal ${className}`}>
      <span className="prompt">$</span>
      <code>{command}</code>
      <button type="button" className="copy-btn" onClick={copy} aria-label={`Copy "${command}"`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
