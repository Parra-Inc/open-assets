'use client'

import { useEffect } from 'react'
import { track, type AnalyticsEvent } from '@/lib/analytics'

const SCROLL_MARKS = [25, 50, 75, 100]

/**
 * Page-wide listeners, mounted once per page by the root layout: clicks on any
 * [data-track] element, external links without one (outbound_click), FAQ items
 * opening, each section's first scroll into view, and scroll depth.
 */
export default function AnalyticsListeners() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.('[data-track]') as HTMLElement | null
      if (!el) {
        // Any external link that was not given its own event still counts.
        const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
        if (a && /^https?:/.test(a.href) && a.host !== location.host) {
          track('outbound_click', {
            location: a.closest('[data-track-area]')?.getAttribute('data-track-area') ?? 'body',
            label: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 100),
            link_url: a.href,
          })
        }
        return
      }
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(el.dataset)) {
        // data-track-link-url -> dataset.trackLinkUrl -> link_url
        if (key.startsWith('track') && key !== 'track' && key !== 'trackArea' && value) {
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

    // Scroll depth: each mark once per page view. A page shorter than the
    // screen has been read to 100% on load.
    const reached = new Set<number>()
    function onScroll() {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const pct = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100)
      for (const mark of SCROLL_MARKS) {
        if (pct >= mark && !reached.has(mark)) {
          reached.add(mark)
          track('scroll_depth', { percent: mark })
        }
      }
      if (reached.size === SCROLL_MARKS.length) window.removeEventListener('scroll', onScroll)
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('toggle', onToggle, true)
    window.addEventListener('scroll', onScroll, { passive: true })

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
      window.removeEventListener('scroll', onScroll)
      observers.forEach((o) => o.disconnect())
    }
  }, [])

  return null
}
