import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Exported to static HTML in out/ and served as Workers static assets, the
// same as apps/web. Search, OG cards and llms files are all prerendered.
/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default withMDX(config);
