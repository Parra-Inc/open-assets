import type { NextConfig } from 'next'

// The site is one static page, so it is exported to plain HTML in out/ and
// served as Workers static assets. No server runtime, no OpenNext adapter.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
  // Inline the (6 KB) stylesheet so the hero paints without a render-blocking
  // CSS request; it was the last request on the mobile LCP path.
  experimental: { inlineCss: true },
}

export default nextConfig
