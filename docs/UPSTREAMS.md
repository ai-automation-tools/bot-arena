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
| **chess.js** | Installed as `chess` (`"chess": "npm:chess.js@^1.4.0"`); the chess protocol and house bots use it for legal-move generation, game-over detection and PGN/FEN | `package.json`, `src/lib/protocols/`, `src/lib/house-bots.ts` | github.com/jhlywa/chess.js/releases | 2026-11-19 |
| **react-chessboard** | `^5.12.1`; the replay and interactive game components render the board with it | `src/components/match-chess-replay.tsx`, `src/components/interactive-chess-game.tsx` | github.com/Clariity/react-chessboard/releases | 2026-11-19 |
| **MCP TypeScript SDK** | v2: `@modelcontextprotocol/server` `2.4.0` (and `@modelcontextprotocol/client` `2.4.0` for the tests only). `McpServer.registerTool` with `z.object` input schemas (raw zod shapes are deprecated in v2); `createMcpHandler(server, { legacy: "reject" })` serves 2026-07-28 requests, and `isLegacyRequest` sends 2025-era ones to a stateless `WebStandardStreamableHTTPServerTransport` with `enableJsonResponse` (the SDK's own stateless fallback answers over SSE, which the `--stdio` bridge and curl don't read). Moved from `@modelcontextprotocol/sdk` 1.32.2 on 2026-11-23 | `src/app/api/mcp/route.ts`, `src/__tests__/mcp.test.ts` | github.com/modelcontextprotocol/typescript-sdk/releases | 2026-11-23 |
| **MCP specification** | 2026-07-28 and the 2025 revisions over Streamable HTTP; local servers validate `Origin` and bind to localhost (the arena's `src/proxy.ts` and npm scripts); tools return text content and `isError` results. 2026-07-28 HTTP requests need `MCP-Protocol-Version`, `Mcp-Method` and (for `tools/call`, `prompts/get`, `resources/read`) `Mcp-Name` headers, which `bin/bot-arena.mjs --stdio` adds from each message | `src/app/api/mcp/route.ts`, `bin/bot-arena.mjs`, `src/proxy.ts`, `docs/connecting-agents.md` | modelcontextprotocol.io/specification (changelog) | 2026-11-23 |
| **zod** | `^4`; request schemas for the REST API and the MCP tool inputs, and the `ZodError` → `INVALID_REQUEST` mapping | `src/lib/arena/schema.ts` | github.com/colinhacks/zod/releases | 2026-11-19 |

## Browser-loaded assets

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **Source Code Pro** | Variable Latin subset (`v32`, weights 400–700) committed as `src/app/fonts/source-code-pro-latin.woff2`, SIL OFL in `OFL.txt`; loaded with `next/font/local` | `src/app/layout.tsx` | github.com/adobe-fonts/source-code-pro/releases | 2026-11-19 |
| **Remote image hosts** | `next.config.ts` allows `placehold.co`, `images.unsplash.com` and `picsum.photos` under `images.remotePatterns` | `next.config.ts` | Each host's site still resolves; drop a host the code no longer uses | 2026-11-19 |

## Hosting and runtime

| Upstream | What the code assumes | Where | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **GitHub Pages** | The demo is a Next static export (`output: 'export'`, `trailingSlash: true`, `basePath` from `PAGES_BASE_PATH`, empty at the demo's own domain) uploaded as a Pages artifact and deployed on `main` when the repo variable `DEMO_PAGES` is `true` | `.github/workflows/pages.yml`, `next.config.ts`, `scripts/build-pages.mjs` | docs.github.com/en/pages; github.com/actions/deploy-pages/releases | 2026-11-19 |
| **Node.js** | CI and the Pages build pin Node 24; Node 24 loads `jest.config.ts` natively | `.github/workflows/ci.yml`, `.github/workflows/pages.yml` | nodejs.org/en/about/previous-releases (EOL dates) | 2026-11-19 |
| **GitHub Actions** | `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`; the release workflow adds `docker/setup-qemu-action@v4`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/build-push-action@v7` and `mcp-publisher` v1.8.9 (all on Node 24 since 2026-11-18) | `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `.github/workflows/release.yml` | github.com/actions/checkout/releases; github.com/actions/setup-node/releases; github.com/actions/upload-pages-artifact/releases; github.com/actions/deploy-pages/releases | 2026-11-19 |
| **npm registry** | `@ai-automation-tools/bot-arena` is published (the plain `bot-arena` was refused as too close to `botarena`) from `release.yml` with trusted publishing (OIDC, npm 11.5.1+), so no token is stored; `bin/bot-arena.mjs` runs `next start` from the packed `.next`, and `scripts/pack-externals.mjs` relies on Turbopack linking server externals as `.next/node_modules/<pkg>-<hash>` | `package.json` (`bin`, `files`, `prepack`), `bin/`, `scripts/pack-externals.mjs`, `.github/workflows/release.yml` | docs.npmjs.com/trusted-publishers; the CI `npm-package` job (fails if Next changes how externals load) | 2026-11-19 |
| **MCP registry** | `server.json` follows the `2025-12-11` schema (`$schema` URL resolves; it is the latest dated one) and is published by `mcp-publisher` in `release.yml` | `server.json`, `.github/workflows/release.yml` | github.com/modelcontextprotocol/registry (releases; `docs/reference/server-json/CHANGELOG.md`) | 2026-11-19 |
| **mcp-remote** | `docs/connecting-agents.md` suggests the `mcp-remote` bridge for clients without Streamable HTTP | `docs/connecting-agents.md` | npmjs.com/package/mcp-remote | 2026-11-19 |
| **skills CLI** | `npx skills add ai-automation-tools/bot-arena` installs `skills/bot-arena/SKILL.md` | `skills/bot-arena/SKILL.md`, `docs/connecting-agents.md`, `README.md` | github.com/vercel-labs/skills | 2026-11-19 |

## Framework majors

| Upstream | Declared in `package.json` | Check at | Last checked |
|:---|:---|:---|:---|
| Next.js | `^16.4.6` (since 2026-11-18; request guard in `src/proxy.ts`, lint via `eslint .`) | nextjs.org/blog; github.com/vercel/next.js/releases | 2026-11-19 |
| React / react-dom | `^19.3.1` | react.dev/blog | 2026-11-19 |
| Tailwind CSS | `^4.3.5` with `@tailwindcss/postcss` (since 2026-11-18; theme in `src/app/globals.css`, palette shades pinned to v3 values) | github.com/tailwindlabs/tailwindcss/releases | 2026-11-19 |
| TypeScript | `^5` (7.0 is out: queued on the roadmap) | devblogs.microsoft.com/typescript | 2026-11-19 |
| Jest, ts-jest | `^30.5.2`, `^29.4.15` | github.com/jestjs/jest/releases | 2026-11-19 |
| ESLint, eslint-config-next | `^9.39.2`, `^16.4.6` (ESLint 10 is out: queued on the roadmap) | eslint.org/blog; github.com/vercel/next.js/releases | 2026-11-19 |
| Radix UI, shadcn/ui pieces | see `package.json` | each package's GitHub releases | 2026-11-19 |

Flag breaking majors, EOL runtimes, and security advisories only. Routine bumps are
Dependabot's job.
