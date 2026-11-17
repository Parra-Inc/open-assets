'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track, type DocsEvent } from '@/lib/analytics';

const SCROLL_MARKS = [25, 50, 75, 100];
const text = (el: Element | null) => (el?.textContent || el?.getAttribute('aria-label') || '').trim().slice(0, 100);

/** Extension of a code block title such as assets.json, if it has one. */
function titleExt(title?: string | null): string | undefined {
  const m = /\.([a-z0-9]+)$/i.exec(title?.trim() ?? '');
  return m?.[1].toLowerCase();
}

/** Shiki output carries no language attribute here, so infer it from the code. */
function guessLanguage(code: string): string {
  const t = code.trim();
  if (/^[{[]/.test(t)) return 'json';
  if (/^(<!doctype|<html|<div|<svg|<[a-z]+[\s>])/i.test(t)) return 'html';
  if (/^(npx|npm|pnpm|yarn|bun|node|git|cd|brew|curl|open-assets|\$|#|\/plugin)\b/m.test(t)) return 'shell';
  if (/^(name:|on:|jobs:|- uses:)/m.test(t)) return 'yaml';
  if (/^(import|export|const|let|function)\b/m.test(t)) return 'js';
  return 'other';
}

/** Where a link sits on a docs page, for the location param. */
function area(el: Element): string {
  if (el.closest('#nd-toc, [data-toc-popover-content]')) return 'toc';
  if (el.closest('[data-card]')) return 'card';
  if (el.closest('footer')) return 'footer';
  if (el.closest('#nd-sidebar, aside')) return 'sidebar';
  if (el.closest('header, nav')) return 'header';
  if (el.closest('article, .prose')) return 'body';
  return 'page';
}

/**
 * One delegated click listener for the whole docs app plus scroll depth,
 * reset on every client-side navigation. Mounted once in the root layout.
 */
export default function DocsAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target?.closest) return;

      const tagged = target.closest('[data-track]') as HTMLElement | null;
      if (tagged) {
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(tagged.dataset)) {
          if (key.startsWith('track') && key !== 'track' && value) {
            params[key.slice(5).replace(/^./, (c) => c.toLowerCase()).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = value;
          }
        }
        track(tagged.dataset.track as DocsEvent, params);
        return;
      }

      const button = target.closest('button');
      if (button) {
        const figure = button.closest('figure');
        if (figure?.querySelector('pre')) {
          const code = figure.querySelector('pre code, pre') as HTMLElement | null;
          const lang =
            figure.getAttribute('data-language') ||
            code?.getAttribute('data-language') ||
            /language-(\S+)/.exec(code?.className ?? '')?.[1] ||
            titleExt(figure.querySelector('figcaption, [data-title]')?.textContent) ||
            guessLanguage(code?.textContent ?? '');
          track('copy_code', { language: lang.slice(0, 40), page: location.pathname });
          return;
        }
        if (/copy markdown/i.test(text(button))) track('copy_page', { page: location.pathname });
        return;
      }

      const a = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const where = area(a);
      if (a.host !== location.host && /^https?:/.test(a.href)) {
        track('outbound_click', { location: where, label: text(a), link_url: a.href });
      } else if (where === 'toc') {
        track('toc_click', { label: text(a) });
      } else if (where === 'card' || a.closest('footer') || a.rel === 'next' || a.rel === 'prev') {
        track('related_click', { location: where, label: text(a), link_url: a.href });
      } else if (a.pathname.startsWith('/guides/') && a.pathname !== location.pathname && where === 'body') {
        track('guide_cta_click', { location: where, label: text(a), link_url: a.href });
      }
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Scroll depth, each mark once per page view; resets on client navigation.
  useEffect(() => {
    const reached = new Set<number>();
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100);
      for (const mark of SCROLL_MARKS) {
        if (pct >= mark && !reached.has(mark)) {
          reached.add(mark);
          track('scroll_depth', { percent: mark });
        }
      }
      if (reached.size === SCROLL_MARKS.length) window.removeEventListener('scroll', onScroll);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return null;
}
