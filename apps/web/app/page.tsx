import type { Metadata } from 'next'
import CopyCommand from '@/components/CopyCommand'
import HeroArt from '@/components/HeroArt'
import Tabs from '@/components/Tabs'
import { faqs, features, installCommands } from '@/data/content'
import { liveDevApps, showcase } from '@/data/devApps'
import { site } from '@/data/site'
import { appStoreCampaignUrl, campaignUrl } from '@/lib/campaign'

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.org.name,
    url: site.org.url,
    logo: site.org.logo,
    sameAs: [site.github],
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
    publisher: { '@id': `${site.url}/#organization` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
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

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="nav">
        <div className="container nav-inner">
          <a href="/" className="brand">
            <img src="/logo-64.png" alt="" width={28} height={28} />
            Open Assets
          </a>
          <nav aria-label="Primary" className="nav-links">
            <a href="#features">Features</a>
            <a href="#examples">Examples</a>
            <a href="#get-started">Get started</a>
            <a href={site.docs}>Docs</a>
            <a href={site.github} className="btn btn-ghost btn-sm">
              <GitHubIcon />
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
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
                <a href="#get-started" className="btn btn-primary">
                  Get started
                </a>
                <a href={site.docs} className="btn btn-ghost">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
                  </svg>
                  Read the docs
                </a>
                <a href={site.github} className="btn btn-ghost">
                  <GitHubIcon />
                  Star on GitHub
                </a>
              </div>
              <CopyCommand command="npx @open-assets/open-assets init" />
              <p className="meta-line">MIT licensed · Node 18+ · No account, no uploads</p>
            </div>
            <HeroArt />
          </div>
        </section>

        {liveDevApps.length > 0 && (
          <section className="section sponsors" aria-labelledby="sponsors-title">
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

        <section id="examples" className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Built with Open Assets</p>
              <h2>Real App Store screenshots, shipped from HTML templates</h2>
              <p>Every image below was rendered by the CLI from templates checked into each app&apos;s repo.</p>
            </div>
            <Tabs
              label="Example apps"
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
                      <a href={campaignUrl(app.url, 'showcase', app.key)}>{app.name}</a> · rendered with <code>npx open-assets render</code>
                    </figcaption>
                  </figure>
                ),
              }))}
            />
          </div>
        </section>

        <section id="features" className="section">
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

        <section className="section">
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

        <section id="get-started" className="section">
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
                  className="pm-tabs"
                  tabs={installCommands.map((c) => ({
                    key: c.key,
                    label: c.key,
                    content: <CopyCommand command={c.cmd} />,
                  }))}
                />
              </div>
              <div className="card start-card">
                <h3>
                  <span className="step-num">2</span>Scaffold and preview
                </h3>
                <CopyCommand command="npx open-assets init" />
                <CopyCommand command="npx open-assets dev" />
              </div>
              <div className="card start-card">
                <h3>
                  <span className="step-num">3</span>Render every size
                </h3>
                <CopyCommand command="npx open-assets render" />
                <p className="muted">Only changed templates re-render, locally and in CI.</p>
              </div>
              <div className="card start-card agent-card">
                <h3>
                  <span className="sparkle" aria-hidden="true">✦</span>Let Claude Code do it
                </h3>
                <p className="muted">Install the skill once and ask your agent for a full localized screenshot set.</p>
                <CopyCommand command="/plugin marketplace add Parra-Inc/open-assets" />
                <CopyCommand command="/plugin install open-assets@open-assets" />
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container faq">
            <div className="section-head">
              <p className="eyebrow">FAQ</p>
              <h2>Questions about the screenshot generator</h2>
            </div>
            <div className="faq-list">
              {faqs.map((f) => (
                <details key={f.q} className="faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>


        <section className="section final-cta">
          <div className="container">
            <div className="card cta-card">
              <h2>Ship better App Store screenshots tonight</h2>
              <p>Free, local and MIT licensed. Your marketing assets finally live next to your code.</p>
              <div className="cta-row center">
                <a href="#get-started" className="btn btn-primary">
                  Get started
                </a>
                <a href={site.github} className="btn btn-ghost">
                  <GitHubIcon />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <a href="/" className="brand">
            <img src="/logo-64.png" alt="" width={22} height={22} loading="lazy" />
            Open Assets
          </a>
          <nav aria-label="Footer" className="footer-links">
            <a href={site.github}>GitHub</a>
            <a href={site.npm}>npm</a>
            <a href={site.docs}>Docs</a>
            <a href="/llms.txt">llms.txt</a>
          </nav>
          <p className="muted">MIT License · Made by Parra</p>
        </div>
      </footer>
    </>
  )
}
