import { marketingUrl } from '@/lib/shared';
import { trackAttrs } from '@/lib/analytics';

/**
 * Building blocks for the export-type guides (plan section 4 page template).
 * Every link here carries data-track attributes, so the delegated listener in
 * DocsAnalytics.tsx sends the right event without per-page code.
 */

/** "Last verified" line under a sizes table. */
export function LastVerified({ date, source }: { date: string; source?: string }) {
  return (
    <p className="text-sm text-fd-muted-foreground">
      Last verified: {date}
      {source ? ` against ${source}` : ''}.
    </p>
  );
}

/** A real Open Assets render with intrinsic dimensions, so the browser reserves its box. */
export function GuideImage({
  src,
  alt,
  width,
  height,
  caption,
  maxWidth,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  maxWidth?: number;
}) {
  return (
    <figure className="not-prose my-6 rounded-xl border bg-fd-card p-3">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="mx-auto h-auto w-full rounded-lg"
        style={maxWidth ? { maxWidth } : undefined}
      />
      {caption && <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

/** Primary call to action inside a guide body (guide_cta_click). */
export function GuideCta({ href, label, location = 'body_cta' }: { href: string; label: string; location?: string }) {
  return (
    <p className="not-prose my-6">
      <a
        href={href}
        className="inline-flex items-center rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
        {...trackAttrs('guide_cta_click', { location, label, link_url: href })}
      >
        {label}
      </a>
    </p>
  );
}

type Link = { href: string; label: string };

/**
 * The "Related" block every export guide ends with: the matching template and
 * size lookup pages on open-assets.dev, then neighbouring docs pages.
 * Every link sends related_click with location "related".
 */
export function RelatedLinks({ template, size, links = [] }: { template?: string; size?: string; links?: Link[] }) {
  const all: Link[] = [
    ...(template ? [{ href: `${marketingUrl}/templates/${template}`, label: `${titleCase(template)} template on open-assets.dev` }] : []),
    ...(size ? [{ href: `${marketingUrl}/sizes/${size}`, label: `${titleCase(size)} size lookup on open-assets.dev` }] : []),
    ...links,
  ];
  return (
    <ul>
      {all.map((l) => (
        <li key={l.href}>
          <a href={l.href} {...trackAttrs('related_click', { location: 'related', label: l.label, link_url: l.href })}>
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w === 'og' ? 'OG' : w === 'ios' ? 'iOS' : w === 'ipad' ? 'iPad' : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
