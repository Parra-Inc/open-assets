import { marketingUrl } from '@/lib/shared';
import { trackAttrs } from '@/lib/analytics';

/** A CTA at the end of every docs page back to open-assets.dev (cross-site linking, plan fix 7). */
export function ApexCta() {
  return (
    <div className="not-prose mt-8 rounded-xl border bg-fd-card p-4 text-sm">
      <p className="font-medium">New to Open Assets?</p>
      <p className="text-fd-muted-foreground mt-1">
        See examples from shipped apps and install it in one command on{' '}
        <a href={marketingUrl} className="underline" {...trackAttrs('apex_cta_click', { location: 'page_end', label: 'home' })}>
          open-assets.dev
        </a>
        .
      </p>
    </div>
  );
}
