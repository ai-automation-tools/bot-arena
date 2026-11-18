# AGENTS.md

Standing orders for the agent that works this repo, usually the Bot-Arena Weekly Roadmap routine.
`CLAUDE.md` imports this file; edit this one.

## What Bot Arena is

A local web app: people clone it, run it on their own machine, and battle their own AI agents in
rule-checked chess, Connect Four and tic-tac-toe. It was first built as a public site where strangers would submit bots; on
2026-11-05 it was refocused on local use, so there are no accounts, no submission review and no
restrictions on bot code. A seat in a match is an MCP agent, a REST agent, a webhook, a JavaScript code
bot, or a house bot (`src/lib/arena/`). The CRT-styled UI starts matches, shows them live, and replays
them.

It's public in the `ai-automation-tools` org. The static GitHub Pages demo replays house-bot games and
has a playable tic-tac-toe board; the real thing is the app you run locally. Games are registered in
`src/lib/arena/games.ts` (chess, tic-tac-toe, Connect Four); each game's rules are a protocol in `src/lib/protocols/`,
and the roadmap's "More games" group adds the rest. The `bot-arena` agent skill lives in `skills/`. Every page reads real
games: live and saved matches from the arena, or the demo replays.

Work queue: [`docs/ROADMAP.md`](docs/ROADMAP.md), top to bottom.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind 4 (theme in `src/app/globals.css`, no `tailwind.config`) with shadcn/ui (Radix), npm. New palette shades go in the pinned list at the top of `globals.css`.
- Chess rules: the `chess` / chess.js package; board: `react-chessboard`.
- Commentary: `src/ai/flows/` builds the shoutcaster and post-match audit text from the match data, with no
  model call or key. Genkit was removed on 2026-10-22; the roadmap's optional AI commentary item brings AI
  back, using the `SHOUTCASTER_PROMPT` and `AUDITOR_PROMPT` kept in those files.
- The arena: `src/lib/arena/` holds the in-process match registry and run loop (`arena.ts`), the game
  registry and move parsing (`games.ts`), the seat kinds (`agents.ts`), the turn object every agent sees (`view.ts`) and the zod schemas
  and error shape shared by the API and MCP (`schema.ts`). REST routes live in `src/app/api/matches/`;
  the MCP server (Streamable HTTP, stateless, `@modelcontextprotocol/sdk`) is `src/app/api/mcp/route.ts`.
  The agent-facing contract is [`docs/connecting-agents.md`](docs/connecting-agents.md): change it in the
  same commit as any change to a tool, route, the turn object or an error code.
- `src/proxy.ts` refuses API calls whose Host or Origin isn't this machine (DNS rebinding,
  cross-site), and with `ARENA_API_KEY` set requires the key on every page and API call (`X-Arena-Key`,
  or the httpOnly cookie `/unlock` sets via `src/app/api/unlock/`).
- Saved games live in `$ARENA_DATA_DIR` (default `.arena/`, gitignored): finished matches in
  `matches/<id>.json` with per-seat `stats`, matches in progress in `live/<id>.json` (they hold seat
  tokens and code-bot source). `src/instrumentation.ts` resumes live ones when the server starts. The
  match report is `src/app/matches/[id]/report/` on `src/lib/arena/report.ts`.
- Example agents: `examples/` (Python REST, Node webhook, a Claude Code command).
  `npm run examples:test` (`scripts/examples-test.mjs`) plays them against a throwaway arena with its
  own `NEXT_DIST_DIR`; CI runs it. Change an example and the test in the same commit as any API change.
- Docker: `Dockerfile` (Next standalone output when `NEXT_OUTPUT=standalone`) and `compose.yaml`;
  CI's `docker` job builds the image and checks the API answers.
- The agent skill: `skills/bot-arena/SKILL.md`, installed with `npx skills add ai-automation-tools/bot-arena`.
  Keep it in step with the MCP tools and error codes.
- Tests: Jest with `ts-jest`, files in `__tests__/` and next to the code they test.
- House bots: `src/lib/house-bots.ts`. `npm run demo:matches` (via `tsx`) regenerates the demo fixtures in
  `src/data/demo-matches/`; rerun it whenever the bots, the protocol or the seeds change, or the fixture tests fail.
- Pages demo: `npm run build:pages` (`scripts/build-pages.mjs`) is a static export of the app with
  `NEXT_PUBLIC_DEMO=1`. It leaves out every route that needs the local server (see `SERVER_ONLY`), and shows the org
  source bar (`src/components/layout/source-bar.tsx`). `.github/workflows/pages.yml` builds it on every PR;
  it deploys from `main` to `bot-arena-demo.ai-automation-tools.dev` (repo variable `DEMO_PAGES=true`).
  A new route the demo can't export goes in that script's `SERVER_ONLY` list, and links to it hide behind `IS_DEMO`.

## Verify

From the repo root. Run all of them before a PR opens; report each result in the PR body.

```
npm run lint
npx tsc --noEmit
npx jest --ci
npx next build
npm run examples:test
```

CI (`.github/workflows/ci.yml`) runs the same five as hard gates on every PR and push to `main`, plus
a Docker image build: any lint error, type error, failing test, build error or example agent that
doesn't finish its games fails the check. Never weaken a test, loosen a type
or turn a rule off to get one passing.

## Won't (this version)

If a roadmap item seems to need one of these, stop and flag it in the PR body.

- **Hosted or multi-user features**: accounts, sign-in, a hosted database, per-user rate limits. The
  arena is single-user and local; the one shared `ARENA_API_KEY` is the whole access model for people
  who expose it.
- **Restrict what a code bot can do.** It's the user's own code on the user's machine. Keep the
  synchronous time cap (it stops a stuck loop) and the match clock, nothing more.
- **Weaken the localhost guard**: the `127.0.0.1` bind in the npm scripts and compose port, the Host
  and Origin checks in `src/proxy.ts`, or the access-key check. Opening it up stays an explicit
  opt-in (`ARENA_ALLOWED_HOSTS`, with `ARENA_API_KEY`).
- **Paid APIs or required keys.** Everything works with no `.env`. An optional feature that calls a
  model reads its key from `.env.local` and is off without it.
- **Host it anywhere.** The old Vercel project was deleted on 2026-11-18; the only deploy is the static Pages demo.

## Standards

- Settings live in `.env` (or `.env.local`), names in `.env.example`. Never Windows user
  environment variables or `setx` in docs.
- This repo goes public at graduation. Never commit `.env*` (except `.env.example`), tokens, real
  personal data, or local paths like `C:\Users\...` or `D:\...`.
- No new runtime dependency without a line in the PR body saying why.
- Commit messages: plain imperative sentences ("Build the chess protocol on chess.js"), no
  Conventional Commit prefixes. Author email: the GitHub noreply address only.
- **The CRT look is a recorded exception to the org house style** (owner's call, 2026-11-18): no Light/Dark
  switch, Source Code Pro instead of Inter and JetBrains Mono. Keep the retro theme; the org source bar
  and the shared favicon still apply. Don't "fix" it toward the house style.
- **Releases** are a `vX.Y.Z` tag on `main`. Bump `version` in `package.json` (and `npm install
  --package-lock-only`) and in `server.json` (the top-level `version`, the npm package's `version` and the
  image tag) in the PR before tagging; `.github/workflows/release.yml` refuses a mismatch, then publishes
  the image to GHCR, the npm package `bot-arena` (trusted publishing, no token) and that version in the
  MCP registry. Tagging is 🔒 Needs owner.
- **The npm package** is the prebuilt `.next` plus `bin/bot-arena.mjs`, which runs `next start` on
  `127.0.0.1` with games in `~/.bot-arena`. `prepack` builds it and runs `scripts/pack-externals.mjs`,
  which records the `.next/node_modules/<pkg>-<hash>` links Turbopack uses for `serverExternalPackages`;
  npm never packs a `node_modules` folder, so the launcher recreates them. CI's `npm-package` job packs,
  installs and runs it. A runtime package must stay in `dependencies`, not `devDependencies`.

## What "done" means for a roadmap item

1. The item's own text is true of the code, checked by running it.
2. The verify commands pass, and new behaviour has a test.
3. Anything the change made untrue is fixed: `README.md`, `docs/`, this file.
4. `docs/CHANGELOG.md` has a line for it, tagged with the roadmap phase in italics, in the same
   commit that flips the box to `- [x]` with a `— done YYYY-MM-DD:` note.
5. It's on a `roadmap/auto-<date>` branch with a PR into `main`. Never push to `main`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
