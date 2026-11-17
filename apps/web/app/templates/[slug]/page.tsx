import { notFound } from 'next/navigation'
import CopyButton from '@/components/CopyButton'
import Faq from '@/components/Faq'
import PageShell from '@/components/PageShell'
import RelatedLinks from '@/components/RelatedLinks'
import SizeTable from '@/components/SizeTable'
import Toc from '@/components/Toc'
import VariantPicker from '@/components/VariantPicker'
import { hubs } from '@/data/pages'
import { templates } from '@/data/templates'
import { trackAttrs } from '@/lib/analytics'
import { pageMetadata, staticSlugs } from '@/lib/pageMeta'

export const dynamicParams = false

export function generateStaticParams() {
  return staticSlugs(templates)
}

function find(slug: string) {
  return templates.find((t) => t.slug === slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = find((await params).slug)
  if (!t) return { robots: { index: false, follow: false } }
  return pageMetadata({ path: `/templates/${t.slug}`, title: t.title, description: t.description })
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const t = find((await params).slug)
  if (!t) notFound()
  const hub = hubs.templates
  return (
    <PageShell
      crumbs={[{ name: hub.label, path: hub.path }, { name: t.name, path: `${hub.path}/${t.slug}` }]}
      h1={t.h1}
      eyebrow="Template"
      lede={t.intro.map((p) => <p key={p}>{p}</p>)}
    >
      <section className="section" data-section="template_preview">
        <div className="container">
          <Toc
            items={[
              { id: 'prompt', label: 'Agent prompt' },
              { id: 'config', label: 'assets.json' },
              { id: 'sizes', label: 'Sizes' },
              { id: 'faq', label: 'FAQ' },
            ]}
          />
          <VariantPicker template={t.slug} variants={t.variants} />
          {t.guide && (
            <p className="page-block">
              <a href={t.guide.href} className="btn btn-ghost" {...trackAttrs('guide_cta_click', { location: 'template', label: t.guide.label })}>
                {t.guide.label}
              </a>
            </p>
          )}
          <div id="prompt" className="page-block">
            <h2>Agent prompt</h2>
            <pre className="code-block"><code>{t.prompt}</code></pre>
            <CopyButton text={t.prompt} event="template_copy_prompt" params={{ template: t.slug }} label="Copy prompt" className="btn btn-primary btn-sm" />
          </div>
          <div id="config" className="page-block">
            <h2>assets.json collection</h2>
            <pre className="code-block"><code>{t.config}</code></pre>
            <CopyButton text={t.config} event="template_copy_config" params={{ template: t.slug }} label="Copy assets.json" className="btn btn-ghost btn-sm" />
          </div>
          <div id="sizes" className="page-block">
            <h2>Sizes it renders</h2>
            <SizeTable names={t.sizes} location={`template_${t.slug}`} />
          </div>
        </div>
      </section>
      <div id="faq">
        <Faq items={t.faqs} />
      </div>
      <RelatedLinks links={t.related} location="template" />
    </PageShell>
  )
}
