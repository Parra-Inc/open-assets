'use client'

import { useEffect } from 'react'
import { track, type AnalyticsEvent } from '@/lib/analytics'

/**
 * Page-wide listeners, mounted once: clicks on any [data-track] element, FAQ
 * items opening, and each section's first scroll into view.
 */
export default function AnalyticsListeners() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.('[data-track]') as HTMLElement | null
      if (!el) return
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(el.dataset)) {
        // data-track-link-url -> dataset.trackLinkUrl -> link_url
        if (key.startsWith('track') && key !== 'track' && value) {
          params[key.slice(5).replace(/^./, (c) => c.toLowerCase()).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = value
        }
      }
      if (el instanceof HTMLAnchorElement && !params.link_url && /^https?:/.test(el.href)) params.link_url = el.href
      track(el.dataset.track as AnalyticsEvent, params)
    }

    // <details> toggle does not bubble, so listen in the capture phase.
    function onToggle(e: Event) {
      const details = e.target as HTMLDetailsElement
      if (!(details instanceof HTMLDetailsElement) || !details.open) return
      const question = details.querySelector('summary')?.textContent?.trim()
      if (question) track('faq_open', { question: question.slice(0, 100) })
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('toggle', onToggle, true)

    // A section counts once it reaches the middle of the screen, or once most of
    // it is on screen. The first alone never fires for the last section (the page
    // ends before it reaches the middle); the second alone never fires for
    // sections taller than the viewport.
    const seen = new Set<string>()
    const onEntries = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        const section = (entry.target as HTMLElement).dataset.section
        if (!entry.isIntersecting || !section || seen.has(section)) continue
        seen.add(section)
        track('section_view', { section })
      }
    }
    const observers = [
      new IntersectionObserver(onEntries, { rootMargin: '-45% 0px -45% 0px' }),
      new IntersectionObserver(onEntries, { threshold: 0.6 }),
    ]
    document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => observers.forEach((o) => o.observe(el)))

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('toggle', onToggle, true)
      observers.forEach((o) => o.disconnect())
    }
  }, [])

  return null
}
