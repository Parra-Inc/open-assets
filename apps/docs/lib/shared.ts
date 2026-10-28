import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Open Assets';
export const siteUrl = 'https://docs.open-assets.dev';
// TODO(domain): switch to https://open-assets.dev once the zone exists.
export const marketingUrl = 'https://open-assets-web-production.ian-b42.workers.dev';
export const docsRoute = '/';
export const docsImageRoute = '/og';
export const docsContentRoute = '/llms.mdx';

export const gitConfig = {
  user: 'Parra-Inc',
  repo: 'open-assets',
  branch: 'main',
  contentDir: 'apps/docs/content/docs',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
