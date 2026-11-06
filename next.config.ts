import type {NextConfig} from 'next';

// `npm run build:pages` sets NEXT_PUBLIC_DEMO=1: a static export of the replay demo for GitHub Pages,
// served under PAGES_BASE_PATH (e.g. /bot-arena), with the server-only routes left out of the build.
const isDemo = process.env.NEXT_PUBLIC_DEMO === '1';

const nextConfig: NextConfig = {
  // The Docker build sets NEXT_OUTPUT=standalone: a self-contained server.js with only the modules it needs.
  ...(process.env.NEXT_OUTPUT === 'standalone' && { output: 'standalone' as const }),
  // `npm run examples:test` runs a second arena beside your dev server; it needs its own build folder.
  ...(process.env.NEXT_DIST_DIR && { distDir: process.env.NEXT_DIST_DIR }),
  ...(isDemo && {
    output: 'export',
    basePath: process.env.PAGES_BASE_PATH || '',
    trailingSlash: true,
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
