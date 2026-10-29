import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getPageImageUrl, getPageMarkdownUrl, gitConfig, marketingUrl, siteUrl } from '@/lib/shared';
import { pageFirstPublished, pageLastModified } from '@/lib/lastModified';

function canonicalPath(url: string) {
  return url === '/' ? '/' : url;
}

export default async function Page(props: PageProps<'/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${gitConfig.contentDir}/${page.path}`;
  const lastModified = pageLastModified(page.path);

  // TechArticle + BreadcrumbList (fleet standard C5, C7).
  const crumbs = [{ name: 'Docs', url: siteUrl }];
  page.slugs.forEach((_, i) => {
    const node = source.getPage(page.slugs.slice(0, i + 1));
    crumbs.push({ name: node?.data.title ?? page.slugs[i], url: `${siteUrl}/${page.slugs.slice(0, i + 1).join('/')}` });
  });
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: page.data.title,
      description: page.data.description,
      url: `${siteUrl}${page.url === '/' ? '' : page.url}`,
      datePublished: pageFirstPublished(page.path).toISOString(),
      dateModified: lastModified.toISOString(),
      author: { '@type': 'Organization', name: 'Parra', url: 'https://parra.io' },
      publisher: { '@type': 'Organization', name: 'Parra', url: 'https://parra.io' },
      about: {
        '@type': 'SoftwareApplication',
        name: 'Open Assets',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'macOS, Linux, Windows',
        url: marketingUrl,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    },
    ...(page.slugs.length === 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Open Assets Docs',
            url: siteUrl,
            publisher: { '@type': 'Organization', name: 'Parra', url: 'https://parra.io' },
          },
        ]
      : []),
    ...(page.slugs.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
          },
        ]
      : []),
  ];

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      <PageLastUpdate date={lastModified} />
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const image = getPageImageUrl(page).url;
  const isHome = page.slugs.length === 0;
  return {
    title: isHome ? { absolute: 'Open Assets Docs: App Store screenshots and icons from HTML' } : page.data.title,
    description: page.data.description,
    alternates: { canonical: canonicalPath(page.url) },
    // A page-level openGraph replaces the layout's (standard D2): repeat it all.
    openGraph: {
      type: 'article',
      siteName: 'Open Assets Docs',
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      images: image,
    },
    twitter: { card: 'summary_large_image', title: page.data.title, description: page.data.description, images: image },
  };
}
