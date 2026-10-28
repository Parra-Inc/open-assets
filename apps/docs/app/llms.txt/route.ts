import { docsLlms } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

export async function GET() {
  // Absolute links: crawlers and agents read this file outside the site.
  const index = (await docsLlms.index()).replace(/\]\(\//g, `](${siteUrl}/`);
  return new Response(index, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
