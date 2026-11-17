import { docsGuides, faqs, features, installCommands } from '@/data/content'
import { hubs, registeredPages } from '@/data/pages'
import { liveDevApps } from '@/data/devApps'
import { site } from '@/data/site'
import { appStoreCampaignUrl } from '@/lib/campaign'

/** A spaced em dash becomes a comma; an unspaced one becomes a hyphen. */
export function withoutEmDashes(text: string): string {
  return text.replace(/\s+\u2014\s+/g, ', ').replace(/\u2014/g, '-')
}

export function textResponse(body: string): Response {
  return new Response(withoutEmDashes(body), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

export function llmsHeader(): string[] {
  return [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `${site.name} is an open-source CLI that renders App Store screenshots, app icons, OG images and store graphics from HTML and Tailwind, committed to your repo, run in CI, and driven by AI coding agents. It is not related to the Open Assets Protocol for colored coins on Bitcoin.`,
    '',
    `${site.name} is a free, MIT licensed command line tool and dev server from Parra. You design App Store screenshots, Google Play screenshots, app icons, favicons, OG images and social banners as HTML, CSS or SVG templates in your repository, then render every required size with \`npx open-assets render\`.`,
    '',
  ]
}

export function llmsLinks(): string[] {
  return [
    '## Links',
    '',
    `- [Homepage](${site.url}): what it is, examples and getting started`,
    `- [Full text for LLMs](${site.url}/llms-full.txt): every section of the site as plain text`,
    `- [GitHub repository](${site.github}): source, issues and the full README`,
    `- [npm package](${site.npm}): ${site.pkg}`,
    `- [Documentation](${site.docs}): configuration reference, guides, localization and CI ([full text](${site.docs}/llms-full.txt))`,
    `- [Quick start](${site.docs}/quick-start): install and render the first asset`,
    `- [Agents](${site.docs}/agents/skill): the Claude Code skill and agent setup`,
    `- [FAQ](${site.docs}/faq): common questions`,
    ...docsGuides.map((g) => `- [${g.title}](${g.href}): ${g.body}`),
    '',
    ...familyLinks(),
  ]
}

/** Hub and entry pages from the registry, grouped by family. Empty families are skipped. */
function familyLinks(): string[] {
  const lines: string[] = []
  const pages = registeredPages()
  for (const hub of Object.values(hubs)) {
    const family = pages.filter((p) => p.family === hub.family)
    if (family.length === 0) continue
    lines.push(`## ${hub.label}`, '')
    for (const p of family) lines.push(`- [${p.title.replace(/ \| Open Assets$/, '')}](${site.url}${p.path}): ${p.summary}`)
    lines.push('')
  }
  return lines
}

export function llmsFullBody(): string[] {
  const lines: string[] = []
  lines.push('## Features', '')
  for (const f of features) lines.push(`### ${f.title}`, '', f.body, '')
  lines.push('## Get started', '', 'Install the package:', '')
  for (const c of installCommands) lines.push(`- ${c.key}: \`${c.cmd}\``)
  lines.push(
    '',
    'Then scaffold, preview and render:',
    '',
    '```bash',
    'npx open-assets init     # creates assets.json and sample templates',
    'npx open-assets dev      # live preview gallery with hot reload',
    'npx open-assets render   # renders every template at every export size',
    '```',
    '',
    'Install the Claude Code skill so an agent can design and render the asset set:',
    '',
    '```',
    '/plugin marketplace add Parra-Inc/open-assets',
    '/plugin install open-assets@open-assets',
    '```',
    '',
  )
  lines.push('## FAQ', '')
  for (const f of faqs) lines.push(`### ${f.q}`, '', f.a, '')
  if (liveDevApps.length > 0) {
    lines.push('## More iPhone apps for developers from Parra', '')
    for (const app of liveDevApps) lines.push(`- [${app.title}](${appStoreCampaignUrl(app.appStoreUrl, 'llms', app.key)}): ${app.tagline}`)
    lines.push('')
  }
  return lines
}
