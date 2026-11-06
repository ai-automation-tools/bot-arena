# Upstreams

Every external service, library, and platform Bot Arena depends on, what the code assumes
about each, and where to check whether that assumption still holds. The biweekly **Bot-Arena
Upstream Check** routine (`upstream/auto-*` PRs) works from this file. Keep it current by hand
too: a new outside call is a new row.

Bot Arena runs locally: its MCP server and REST API serve the user's own agents, and it calls
outside services only when the user points a webhook seat or a code bot at one. The replay demo is a
static export with no backend. A new game, an AI commentary provider or any other outside call gets
a row when the code that uses it lands.

**Last checked** is filled in by the routine, and only with a date it actually read the
source. `—` means never checked.

## Libraries the product logic rests on

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **chess.js** | Installed as `chess` (`"chess": "npm:chess.js@^1.4.0"`); the chess protocol and house bots use it for legal-move generation, game-over detection and PGN/FEN | `package.json`, `src/lib/protocols/`, `src/lib/house-bots.ts` | github.com/jhlywa/chess.js/releases | — |
| **react-chessboard** | `^5.8.6`; the replay and interactive game components render the board with it | `src/components/match-chess-replay.tsx`, `src/components/interactive-chess-game.tsx` | github.com/Clariity/react-chessboard/releases | — |
| **MCP TypeScript SDK** | `@modelcontextprotocol/sdk` `1.32.2`: `McpServer.registerTool` with zod shapes and the stateless `WebStandardStreamableHTTPServerTransport` (one server per request, `enableJsonResponse`). The SDK's v2 splits into `@modelcontextprotocol/server`; moving to it changes these imports | `src/app/api/mcp/route.ts` | github.com/modelcontextprotocol/typescript-sdk/releases | — |
| **MCP specification** | Streamable HTTP transport; local servers validate `Origin` and bind to localhost (the arena's `src/middleware.ts` and npm scripts); tools return text content and `isError` results | `src/app/api/mcp/route.ts`, `src/middleware.ts`, `docs/connecting-agents.md` | modelcontextprotocol.io/specification (changelog) | — |
| **zod** | `^4`; request schemas for the REST API and the MCP tool inputs, and the `ZodError` → `INVALID_REQUEST` mapping | `src/lib/arena/schema.ts` | github.com/colinhacks/zod/releases | — |

## Browser-loaded assets

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **Google Fonts** | `fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600;700` linked from the root layout | `src/app/layout.tsx` | developers.google.com/fonts/docs/css2 | — |
| **Remote image hosts** | `next.config.ts` allows `placehold.co`, `images.unsplash.com` and `picsum.photos` under `images.remotePatterns` | `next.config.ts` | Each host's site still resolves; drop a host the code no longer uses | — |

## Hosting and runtime

| Upstream | What the code assumes | Where | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **GitHub Pages** | The demo is a Next static export (`output: 'export'`, `trailingSlash: true`, `basePath` from `PAGES_BASE_PATH`, empty at the demo's own domain) uploaded as a Pages artifact and deployed on `main` when the repo variable `DEMO_PAGES` is `true` | `.github/workflows/pages.yml`, `next.config.ts`, `scripts/build-pages.mjs` | docs.github.com/en/pages; github.com/actions/deploy-pages/releases | — |
| **Node.js** | CI and the Pages build pin Node 24; Node 24 loads `jest.config.ts` natively | `.github/workflows/ci.yml`, `.github/workflows/pages.yml` | nodejs.org/en/about/previous-releases (EOL dates) | — |
| **GitHub Actions** | `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` | `.github/workflows/ci.yml`, `.github/workflows/pages.yml` | github.com/actions/checkout/releases; github.com/actions/setup-node/releases; github.com/actions/upload-pages-artifact/releases; github.com/actions/deploy-pages/releases | — |
| **Vercel (paused)** | `vercel.json` sets `git.deploymentEnabled: false` so the paused Vercel project posts no failing check on PRs; nothing deploys there | `vercel.json` | vercel.com/docs/project-configuration (the `git.deploymentEnabled` key) | — |

## Framework majors

| Upstream | Declared in `package.json` | Check at | Last checked |
|:---|:---|:---|:---|
| Next.js | `^15.5.28` (the roadmap plans a move to Next 16) | nextjs.org/blog; github.com/vercel/next.js/releases | — |
| React / react-dom | `^19.2.1` | react.dev/blog | — |
| Tailwind CSS | `^3.4.1` (the roadmap plans Tailwind 4) | github.com/tailwindlabs/tailwindcss/releases | — |
| TypeScript | `^5` | devblogs.microsoft.com/typescript | — |
| Jest, ts-jest | `^30.3.0`, `^29.4.6` | github.com/jestjs/jest/releases | — |
| ESLint, eslint-config-next | `^9.39.2`, `^16.1.6` | eslint.org/blog; github.com/vercel/next.js/releases | — |
| Radix UI, shadcn/ui pieces, recharts, react-hook-form | see `package.json` | each package's GitHub releases | — |

Flag breaking majors, EOL runtimes, and security advisories only. Routine bumps are
Dependabot's job.
