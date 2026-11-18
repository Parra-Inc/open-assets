'use client'

import { useSyncExternalStore } from 'react'

// Remembers a signup in localStorage AND a 2-year cookie, then fires a window
// event so every mounted form (home section + footer) flips at once. Stores a
// flag, never the address.
const STORAGE_KEY = 'open-assets:newsletter-subscribed'
const COOKIE_NAME = 'open_assets_newsletter'
const CHANGE_EVENT = 'open-assets:newsletter-change'

function read(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return true
  } catch {}
  return document.cookie.split('; ').some((c) => c === `${COOKIE_NAME}=1`)
}

export function markNewsletterSubscribed() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {}
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=1; Path=/; Max-Age=${60 * 60 * 24 * 730}; SameSite=Lax${secure}`
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function useNewsletterSubscribed() {
  return useSyncExternalStore(subscribe, read, () => false)
}
