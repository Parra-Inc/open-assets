'use client'

import { useState } from 'react'

export default function CopyCommand({ command, className = '' }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
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
