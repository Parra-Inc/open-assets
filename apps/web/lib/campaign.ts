import { site } from '@/data/site'

/**
 * App Store campaign links for every outbound App Store link on the site.
 *
 * Apple's campaign format is `pt` (provider token) plus `ct` (campaign token,
 * 40-character cap); installs then show up per token under App Analytics >
 * Campaigns for the app that was linked. The fleet's own sites use
 * `w_{type}_{slug}_{placement}` tokens, so this site prefixes its tokens with
 * `oa_` instead of `w_`: a link into Tax Days from here must never read as a
 * click on Tax Days' own homepage (`w_h_*`).
 *
 * The site is one page (type code `h`), so a token is `oa_h_{placement}`.
 */

export const CT_MAX_LENGTH = 40

function clean(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/** `oa_h_dev_apps`, `oa_h_showcase`. Placements are stable: ASC reports are keyed on them. */
export function campaignToken(placement: string): string {
  return `oa_h_${clean(placement)}`.slice(0, CT_MAX_LENGTH)
}

/**
 * An App Store listing URL with the campaign params (`pt`, `ct`, `mt`) plus
 * UTM params for web analytics. Apple ignores utm_*, so both share one URL.
 */
export function appStoreCampaignUrl(listingUrl: string, placement: string, content: string): string {
  const url = new URL(listingUrl)
  url.search = new URLSearchParams({
    pt: site.appStoreProviderToken,
    ct: campaignToken(placement),
    mt: '8',
    utm_source: 'open-assets',
    utm_medium: 'website',
    utm_campaign: clean(placement),
    utm_content: content,
  }).toString()
  return url.toString()
}

/** UTM-tagged link for a non-App Store destination (a web app's site). */
export function webCampaignUrl(href: string, placement: string, content: string): string {
  const url = new URL(href)
  url.search = new URLSearchParams({
    utm_source: 'open-assets',
    utm_medium: 'website',
    utm_campaign: clean(placement),
    utm_content: content,
  }).toString()
  return url.toString()
}

/** Tags any outbound link: App Store links get `pt`/`ct`, everything else UTM only. */
export function campaignUrl(href: string, placement: string, content: string): string {
  return new URL(href).hostname === 'apps.apple.com'
    ? appStoreCampaignUrl(href, placement, content)
    : webCampaignUrl(href, placement, content)
}
