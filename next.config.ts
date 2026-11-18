import type {NextConfig} from 'next';

// `npm run build:pages` sets NEXT_PUBLIC_DEMO=1: a static export of the replay demo for GitHub Pages,
// served under PAGES_BASE_PATH (e.g. /bot-arena), with the server-only routes left out of the build.
const isDemo = process.env.NEXT_PUBLIC_DEMO === '1';

const nextConfig: NextConfig = {
  // Code bots run in a worker thread that `require`s chess.js at run time (src/lib/arena/agents.ts), so it
  // has to stay a real package in node_modules, including in the Docker image's standalone output.
  serverExternalPackages: ['chess'],
  // The Docker build sets NEXT_OUTPUT=standalone: a self-contained server.js with only the modules it needs.
  ...(process.env.NEXT_OUTPUT === 'standalone' && { output: 'standalone' as const }),
  // `npm run examples:test` runs a second arena beside your dev server; it needs its own build folder.
  ...(process.env.NEXT_DIST_DIR && { distDir: process.env.NEXT_DIST_DIR }),
  ...(isDemo && {
    output: 'export',
    // The demo build moves the server routes aside, so tests that import them don't resolve. Types are
    // checked by `tsc` and the normal build, on the whole tree.
    typescript: { ignoreBuildErrors: true },
    basePath: process.env.PAGES_BASE_PATH || '',
    trailingSlash: true,
  }),
};

export default nextConfig;
