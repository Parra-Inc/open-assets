import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { generateOGImage } from 'fumadocs-ui/og';
import { getPageImageUrl } from '@/lib/shared';

export const revalidate = false;

// One 1200x630 card per page, prerendered at build (fleet standard D1).
export async function GET(_req: Request, { params }: RouteContext<'/og/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: 'Open Assets Docs',
    primaryColor: 'rgba(124, 92, 191, 0.45)',
    primaryTextColor: 'rgb(167, 139, 250)',
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImageUrl(page).segments,
  }));
}
