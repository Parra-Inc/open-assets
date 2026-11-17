/*
 * GA4 for open-assets.dev and docs.open-assets.dev: one property and one stream
 * (Open Assets, properties/561276147, owned by cloudflare-infra's account stack).
 *
 * The rest of the fleet injects this tag at the edge (worker-analytics.ts). These
 * sites are static assets with no Worker code, so the same tag ships in the page
 * <head> instead, with the same policy:
 *   - consent granted by default, denied for the EU, EEA and UK
 *   - linker across both domains, so landing on the site and reading the docs
 *     stays one session
 *   - an app_store_click key event on every App Store or Google Play link
 *   - page grouping on every hit, set before config so it rides on page_view
 *     and every later event: content_group (home, templates, sizes,
 *     alternatives, or the docs section such as guides or reference),
 *     page_type (home, hub, template, size, alternative, docs, docs_home) and
 *     site_host (open-assets.dev or docs.open-assets.dev). Both hosts share one
 *     stream, so site_host is what tells apex and docs paths apart in reports.
 *     pushState and popstate re-set them, so client-side navigations (the docs
 *     app) and GA's history page_view carry the new page's group.
 *
 * Only production builds served from a production host load it, so `next dev`,
 * a local preview and any non-canonical host never send hits to the property.
 *
 * Identical copies live in apps/web and apps/docs. Change both.
 */

export const GA_MEASUREMENT_ID = 'G-W128DQBYJL';

const LINKER_DOMAINS = ['open-assets.dev', 'docs.open-assets.dev'];

// EU 27, the three non-EU EEA states, and the UK. Switzerland is out on purpose:
// the revFADP has no prior-consent requirement. Same list as the fleet's edge tag.
const CONSENT_DENIED_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB',
];

const STORE_LINK_PATTERN = 'apps\\.apple\\.com|itunes\\.apple\\.com|play\\.google\\.com\\/store\\/apps';

// Mirrors pageGroup() in lib/analytics.ts; keep the two in step.
const PAGE_GROUP =
  `function oaGroup(){var h=location.hostname,p=location.pathname.split('/'),s=p[1]||'',r=p[2]||'';` +
  `if(h.indexOf('docs.')===0)return{'content_group':s||'home','page_type':s?'docs':'docs_home','site_host':h};` +
  `var f={'templates':'template','sizes':'size','alternatives':'alternative'}[s];` +
  `return{'content_group':s||'home','page_type':!s?'home':f?(r?f:'hub'):'other','site_host':h};}` +
  `function oaSet(){gtag('set',oaGroup());}` +
  `['pushState','replaceState'].forEach(function(m){var o=history[m];history[m]=function(){var x=o.apply(this,arguments);oaSet();return x;};});` +
  `addEventListener('popstate',oaSet);`;

// The gtag.js loader is injected by the inline script, after the host check.
const inline =
  `if(${JSON.stringify(LINKER_DOMAINS)}.indexOf(location.hostname)!==-1){` +
  `var s=document.createElement('script');s.async=true;` +
  `s.src='https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';document.head.appendChild(s);` +
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
  `gtag('consent','default',{'ad_storage':'granted','ad_user_data':'granted','ad_personalization':'granted','analytics_storage':'granted'});` +
  `gtag('consent','default',{'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','analytics_storage':'denied','region':${JSON.stringify(CONSENT_DENIED_REGIONS)}});` +
  `gtag('js',new Date());` +
  PAGE_GROUP +
  `oaSet();` +
  `gtag('config','${GA_MEASUREMENT_ID}',{'linker':{'domains':${JSON.stringify(LINKER_DOMAINS)}}});` +
  // Capture phase, so it runs even if a handler stops propagation; beacon
  // transport, so the hit survives navigating away to the store.
  `document.addEventListener('click',function(e){` +
  `var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;` +
  `var h=a.href;if(!/${STORE_LINK_PATTERN}/.test(h))return;` +
  `gtag('event','app_store_click',{'store':/play\\.google/.test(h)?'google_play':'app_store',` +
  `'link_url':h,'link_text':(a.textContent||a.getAttribute('aria-label')||'').trim().slice(0,100),` +
  `'transport_type':'beacon'});},true);}`;

export function GoogleTag() {
  if (process.env.NODE_ENV !== 'production') return null;
  return <script dangerouslySetInnerHTML={{ __html: inline }} />;
}
