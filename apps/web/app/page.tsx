import type { Metadata } from 'next'
import CopyCommand from '@/components/CopyCommand'
import HeroArt from '@/components/HeroArt'
import Tabs from '@/components/Tabs'
import { docsGuides, faqs, features, installCommands } from '@/data/content'
import { liveDevApps, showcase } from '@/data/devApps'
import { site } from '@/data/site'
import { homeTemplates } from '@/data/templates'
import Faq from '@/components/Faq'
import { GitHubIcon } from '@/components/Icons'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import { trackAttrs } from '@/lib/analytics'
import { appStoreCampaignUrl, campaignUrl } from '@/lib/campaign'

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.org.name,
    url: site.org.url,
    logo: site.org.logo,
    sameAs: [site.github, site.npm, site.docs],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: site.url,
    description: site.description,
    publisher: { '@id': `${site.url}/#organization` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    url: site.url,
    description: site.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Linux, Windows',
    license: 'https://opensource.org/licenses/MIT',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    downloadUrl: site.npm,
    codeRepository: site.github,
    sameAs: [site.github, site.npm, site.docs],
    publisher: { '@id': `${site.url}/#organization` },
  },
]

// A page-level `openGraph` replaces the layout's object rather than merging it
// (standard D2), so it repeats every field. The card image still comes from
// app/opengraph-image.png.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHeader home />

      <main>
        <section className="hero" data-section="hero">
          <div className="hero-bg" aria-hidden="true" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="kicker">
                Marketing assets as code<span className="kicker-dash" />
              </p>
              <h1>
                App Store screenshots, icons and OG images, <span className="grad">rendered from code.</span>
              </h1>
              <p className="lede">
                <strong>Open Assets is an open source App Store screenshot generator for your git repo.</strong> Design
                in HTML, CSS and SVG, preview live, and render every size for the App Store, Google Play and the web
                with one command.
              </p>
              <div className="cta-row">
                <a href="#get-started" className="btn btn-primary" {...trackAttrs('cta_click', { location: 'hero', label: 'get_started' })}>
                  Get started
                </a>
                <a href={site.docs} className="btn btn-ghost" {...trackAttrs('cta_click', { location: 'hero', label: 'read_docs' })}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
                  </svg>
                  Read the docs
                </a>
                <a href={site.github} className="btn btn-ghost" {...trackAttrs('cta_click', { location: 'hero', label: 'star_github' })}>
                  <GitHubIcon />
                  Star on GitHub
                </a>
              </div>
              <CopyCommand command="npx @open-assets/open-assets init" location="hero" />
              <p className="meta-line">
                <strong className="free">Completely free</strong> · MIT licensed · No account, no uploads
              </p>
            </div>
            <HeroArt />
          </div>
        </section>

        {liveDevApps.length > 0 && (
          <section className="section sponsors" aria-labelledby="sponsors-title" data-section="sponsors">
            <div className="container">
              <div className="sponsors-head">
                <h2 id="sponsors-title">Sponsored by</h2>
                <p>iPhone apps for Claude Code users, from the team behind Open Assets. They keep this project free.</p>
              </div>
              <ul className="sponsor-list">
                {liveDevApps.map((app) => (
                  <li key={app.key}>
                    <a
                      href={appStoreCampaignUrl(app.appStoreUrl, 'sponsors', app.key)}
                      {...trackAttrs('sponsor_click', { app: app.key })}
                      className="sponsor"
                      aria-label={`${app.title} on the App Store`}
                    >
                      <img src={app.icon} alt="" width={44} height={44} className="sponsor-icon" />
                      <span className="sponsor-body">
                        <span className="sponsor-name">
                          {app.title}
                          <span className="sponsor-store">App Store ↗</span>
                        </span>
                        <span className="sponsor-line">{app.tagline}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section id="examples" className="section" data-section="examples">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Built with Open Assets</p>
              <h2>Real App Store screenshots, shipped from HTML templates</h2>
              <p>Every image below was rendered by the CLI from templates checked into each app&apos;s repo.</p>
            </div>
            <Tabs
              label="Example apps"
              trackGroup="example_app"
              className="showcase"
              tabs={showcase.map((app) => ({
                key: app.key,
                label: (
                  <>
                    <img src={`/img/examples/${app.key}-icon.png`} alt="" width={20} height={20} loading="lazy" />
                    {app.name}
                  </>
                ),
                content: (
                  <figure className="showcase-frame">
                    <div className="showcase-scroll">
                      <img
                        src={`/img/examples/${app.key}.webp`}
                        alt={`${app.name} App Store screenshots generated with Open Assets`}
                        width={2400}
                        height={app.height}
                        loading="lazy"
                      />
                    </div>
                    <figcaption>
                      <a href={campaignUrl(app.url, 'showcase', app.key)} {...trackAttrs('outbound_click', { location: 'examples', label: app.key })}>{app.name}</a> · rendered with <code>npx open-assets render</code>
                    </figcaption>
                  </figure>
                ),
              }))}
            />
          </div>
        </section>

        <section id="templates" className="section" data-section="template_gallery">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Templates</p>
              <h2>Start from a template</h2>
              <p>HTML templates for store screenshots, banners and social images, each rendered with Open Assets.</p>
            </div>
            <ul className="template-grid">
              {homeTemplates.slice(0, 6).map((t) => {
                const v = t.variants[0]
                return (
                  <li key={t.slug}>
                    <a
                      href={`/templates/${t.slug}`}
                      className="card template-card"
                      {...trackAttrs('related_click', { location: 'home_templates', label: t.slug })}
                    >
                      <img src={v.image} alt={v.alt} width={v.width} height={v.height} loading="lazy" />
                      <span className="related-label">{t.h1}</span>
                      <span className="muted">{t.summary}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
            <p className="page-block">
              <a href="/templates" className="btn btn-ghost" {...trackAttrs('related_click', { location: 'home_templates', label: 'all_templates' })}>
                See all templates
              </a>
            </p>
          </div>
        </section>

        <section id="features" className="section" data-section="features">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Why Open Assets</p>
              <h2>Like Storybook, but for marketing assets</h2>
              <p>
                One unified model: <strong>N templates × M export sizes</strong>. Change a template once and every
                screenshot, app icon and social image updates.
              </p>
            </div>
            <div className="feature-grid">
              {features.map((f) => (
                <article key={f.title} className="card feature">
                  <div className="feature-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={f.icon} />
                    </svg>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" data-section="how_it_works">
          <div className="container how">
            <div className="section-head">
              <p className="eyebrow">How it works</p>
              <h2>One config. Every size. Every destination.</h2>
              <p>
                Each entry in a collection&apos;s <code>export</code> array is a size or an output action. A single
                template renders to all of them in one pass, and unchanged templates are skipped.
              </p>
            </div>
            <div className="how-grid">
              <div className="card code-panel">
                <div className="code-chrome">
                  <span className="dot dot-r" />
                  <span className="dot dot-y" />
                  <span className="dot dot-g" />
                  <span className="code-filename">assets.json</span>
                </div>
                <pre>
                  <code>
                    <span className="c-dim">{'"export": ['}</span>
                    {'\n  { '}
                    <span className="c-attr">&quot;name&quot;</span>: <span className="c-str">&quot;iphone-6.9&quot;</span>, <span className="c-attr">&quot;size&quot;</span>: {'{ '}
                    <span className="c-attr">&quot;width&quot;</span>: <span className="c-num">1320</span>, <span className="c-attr">&quot;height&quot;</span>: <span className="c-num">2868</span>
                    {' } },\n  { '}
                    <span className="c-attr">&quot;name&quot;</span>: <span className="c-str">&quot;iphone-6.7&quot;</span>, <span className="c-attr">&quot;size&quot;</span>: {'{ '}
                    <span className="c-attr">&quot;width&quot;</span>: <span className="c-num">1290</span>, <span className="c-attr">&quot;height&quot;</span>: <span className="c-num">2796</span>
                    {' } },\n  { '}
                    <span className="c-attr">&quot;name&quot;</span>: <span className="c-str">&quot;favicon&quot;</span>, <span className="c-attr">&quot;size&quot;</span>: {'{ '}
                    <span className="c-attr">&quot;width&quot;</span>: <span className="c-num">32</span>, <span className="c-attr">&quot;height&quot;</span>: <span className="c-num">32</span>
                    {' },\n    '}
                    <span className="c-attr">&quot;outFile&quot;</span>: <span className="c-str">&quot;public/favicon.png&quot;</span>
                    {' },\n  { '}
                    <span className="c-attr">&quot;type&quot;</span>: <span className="c-str">&quot;xcode&quot;</span>, <span className="c-attr">&quot;path&quot;</span>: <span className="c-str">&quot;../MyApp/Assets.xcassets/AppIcon.appiconset&quot;</span>
                    {' }\n'}
                    <span className="c-dim">]</span>
                  </code>
                </pre>
              </div>
              <ol className="steps">
                <li>
                  <span className="step-num">1</span>
                  <div>
                    <h3>Design in HTML</h3>
                    <p>Write screenshots, icons and banners as HTML, CSS or SVG. Use any font, gradient or image you like.</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">2</span>
                  <div>
                    <h3>Preview live</h3>
                    <p>
                      <code>npx open-assets dev</code> opens a hot-reloading gallery of every template at every size.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="step-num">3</span>
                  <div>
                    <h3>Render and export</h3>
                    <p>
                      <code>npx open-assets render</code> writes PNGs to exports/, your web app and your Xcode asset
                      catalog.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section id="get-started" className="section" data-section="get_started">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Get started</p>
              <h2>From zero to App Store screenshots in a minute</h2>
            </div>
            <div className="start-grid">
              <div className="card start-card">
                <h3>
                  <span className="step-num">1</span>Install
                </h3>
                <Tabs
                  label="Package manager"
                  trackGroup="package_manager"
                  className="pm-tabs"
                  tabs={installCommands.map((c) => ({
                    key: c.key,
                    label: c.key,
                    content: <CopyCommand command={c.cmd} location="install" />,
                  }))}
                />
              </div>
              <div className="card start-card">
                <h3>
                  <span className="step-num">2</span>Scaffold and preview
                </h3>
                <CopyCommand command="npx open-assets init" location="scaffold" />
                <CopyCommand command="npx open-assets dev" location="scaffold" />
              </div>
              <div className="card start-card">
                <h3>
                  <span className="step-num">3</span>Render every size
                </h3>
                <CopyCommand command="npx open-assets render" location="render" />
                <p className="muted">Only changed templates re-render, locally and in CI.</p>
              </div>
              <div className="card start-card agent-card">
                <h3>
                  <span className="sparkle" aria-hidden="true">✦</span>Let Claude Code do it
                </h3>
                <p className="muted">Install the skill once and ask your agent for a full localized screenshot set.</p>
                <CopyCommand command="/plugin marketplace add Parra-Inc/open-assets" location="claude_code" />
                <CopyCommand command="/plugin install open-assets@open-assets" location="claude_code" />
              </div>
            </div>
          </div>
        </section>

        <section id="guides" className="section" data-section="guides">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Guides</p>
              <h2>Step-by-step guides in the docs</h2>
              <p>Pick the asset you need and follow the guide from template to rendered PNG.</p>
            </div>
            <ul className="related-grid">
              {docsGuides.map((g) => (
                <li key={g.key}>
                  <a href={g.href} className="card related-card" {...trackAttrs('guide_cta_click', { location: 'home_guides', label: g.key })}>
                    <span className="related-label">{g.title}</span>
                    <span className="muted">{g.body}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Faq items={faqs} title="Questions about the screenshot generator" />


        <section className="section final-cta" data-section="final_cta">
          <div className="container">
            <div className="card cta-card">
              <h2>Ship better App Store screenshots tonight</h2>
              <p>Free, local and MIT licensed. Your marketing assets finally live next to your code.</p>
              <div className="cta-row center">
                <a href="#get-started" className="btn btn-primary" {...trackAttrs('cta_click', { location: 'final_cta', label: 'get_started' })}>
                  Get started
                </a>
                <a href={site.github} className="btn btn-ghost" {...trackAttrs('cta_click', { location: 'final_cta', label: 'view_github' })}>
                  <GitHubIcon />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
