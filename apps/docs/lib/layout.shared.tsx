import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig, marketingUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src="/logo-64.png" alt="" width={24} height={24} className="brand-mark" />
          <span className="font-semibold">Open Assets</span>
        </>
      ),
      url: '/',
    },
    links: [
      { text: 'Home', url: marketingUrl, external: true },
      { text: 'npm', url: 'https://www.npmjs.com/package/@open-assets/open-assets', external: true },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
