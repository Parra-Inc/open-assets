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

const inline =
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
  `gtag('consent','default',{'ad_storage':'granted','ad_user_data':'granted','ad_personalization':'granted','analytics_storage':'granted'});` +
  `gtag('consent','default',{'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','analytics_storage':'denied','region':${JSON.stringify(CONSENT_DENIED_REGIONS)}});` +
  `gtag('js',new Date());` +
  `gtag('config','${GA_MEASUREMENT_ID}',{'linker':{'domains':${JSON.stringify(LINKER_DOMAINS)}}});` +
  // Capture phase, so it runs even if a handler stops propagation; beacon
  // transport, so the hit survives navigating away to the store.
  `document.addEventListener('click',function(e){` +
  `var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;` +
  `var h=a.href;if(!/${STORE_LINK_PATTERN}/.test(h))return;` +
  `gtag('event','app_store_click',{'store':/play\\.google/.test(h)?'google_play':'app_store',` +
  `'link_url':h,'link_text':(a.textContent||a.getAttribute('aria-label')||'').trim().slice(0,100),` +
  `'transport_type':'beacon'});},true);`;

export function GoogleTag() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script dangerouslySetInnerHTML={{ __html: inline }} />
    </>
  );
}
