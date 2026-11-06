<h1 align="center">📋 Changelog</h1>

<p align="center">
  <em>What changed in Bot Arena, newest first. The project is unversioned, so entries go under dates.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

## 2026-11-06

- **Added** a match report at `/matches/<id>/report`, linked from every finished match: the result, the length, and each seat's moves, average and slowest move time, timeouts, rejected moves and forfeits, with the template commentary reading the real game. Saved matches now carry per-seat `stats` and `finishedAt`. *(roadmap: Finish the refocus)*
- **Added** restart-safe matches: a match in progress is written to `.arena/live/` after every ply and resumed when the arena starts again, with the same seat tokens. *(roadmap: Finish the refocus)*
- **Removed** the last mock pages: the protocol detail pages (now the Games section of the home page), the simulated spectator view with its in-browser engine (and the Stockfish download from unpkg), the mock match report with its share image, and `src/lib/data.ts`. *(roadmap: Finish the refocus)*
- **Changed** `package.json` to declare Node 20 or newer in `engines`. *(roadmap: Finish the refocus)*

## 2026-11-05

- **Added** tic-tac-toe, the second game: seats `x` and `o`, moves as cells (`b2`) or 1-9, a random house bot and a perfect minimax. Pick it on New Match, with `"game": "tictactoe"` in `POST /api/matches`, or in the MCP `create_match` tool. *(roadmap: More games)*
- **Added** a game registry (`src/lib/arena/games.ts`): the arena, the MCP tools, the REST API and the replay run any registered game. **Changed** the match JSON to `game`, `players` (keyed by seat), `position` and `startPosition` in place of `white`, `black`, `fen` and `startFen`; the turn object gains `game`, `rules` and `position` and keeps `fen` for chess. Games saved earlier still load. *(roadmap: More games)*
- **Added** a Play Tic-Tac-Toe page (`/play`), where you play a house bot in the browser, and three tic-tac-toe replays. Both are in the static demo too. *(roadmap: More games)*
- **Added** the `bot-arena` agent skill in `skills/bot-arena/`, installable with `npx skills add ai-automation-tools/bot-arena`. *(roadmap: Publish and promote)*
- **Changed** `MatchChessReplay` to `MatchReplay`, which draws a chess or tic-tac-toe board. *(roadmap: More games)*

- **Changed** the homepage (`bot-arena.ai-automation-tools.dev`) and the ai-automation-tools.dev card to describe the local arena for your own agents, with MCP, REST, webhooks and code bots. *(roadmap: Publish and promote)*
- **Removed** the four games that were never built (Search & Find, Logic Gate Solvers, Constraint Satisfaction Mazes, Protocol Mutation Challenge) from the home page, the protocol and spectate pages and the mock history, plus the unused `submittedGames` mock. The chess card is now plain "Chess". *(roadmap: Finish the refocus)*
- **Added** a "More games" plan to the roadmap: a game registry first, then Connect Four, Othello, Checkers, 9×9 Go, Battleship, heads-up Hold'em and Liar's Dice, then matches with more than two seats. *(roadmap)*
- **Changed** what Bot Arena is: a local app you run to battle your own AI agents, instead of a hosted site where strangers submit bots. *(roadmap: Refocus)*
- **Added** the arena: a match has two seats, each an external agent, a webhook, a JavaScript code bot or a house bot, with a per-move clock and forfeits for timeouts, crashes and illegal webhook or code moves. Finished games are saved as JSON in `.arena/`. Code lives in `src/lib/arena/`; 11 new tests. *(roadmap: Refocus)*
- **Added** an MCP server at `/api/mcp` (Streamable HTTP) with `create_match`, `wait_for_turn`, `make_move`, `resign`, `list_matches` and `get_match`, and a REST API under `/api/matches` with long-polled turns and seat tokens. New dependencies: `@modelcontextprotocol/sdk` (the MCP server) and `zod` (request validation for both). *(roadmap: Refocus)*
- **Added** the New Match page, a live match view, real match history and a Connect Agents page, plus `docs/connecting-agents.md`. *(roadmap: Refocus)*
- **Removed** the public-site restrictions and the pages that existed for them: the forbidden-API check on bot code, the "proof of silicon" captcha, bot submission, the admin page and its `ADMIN_PASSWORD`, the mock lobby, and `docs/bot-submission-spec.md`. *(roadmap: Refocus)*
- **Security** The dev and production servers bind `127.0.0.1`, and `src/middleware.ts` refuses API and MCP calls whose Host or Origin isn't this machine, which blocks DNS rebinding and cross-site requests. `SECURITY.md` describes the single-user model. *(roadmap: Refocus)*
- **Removed** from the roadmap the hosted-arena plan, which the refocus made obsolete: ADR-001 to ADR-003, the Supabase project, the sandboxed runner, hosted persistence, bot ownership, admin auth, rate limits, terms for submitted code, the hosted security review and the Vercel go-live. The roadmap now plans the local arena: real data on every page, a match report, restart-safe games, example agents, Docker, an optional access key, leaderboards and tournaments. *(roadmap)*
- **Added** `docs/UPSTREAMS.md`, the worklist for the biweekly upstream check, and `.github/dependabot.yml` (weekly npm and GitHub Actions updates, minor and patch grouped, majors ignored). *(roadmap: Public release)*
- **Changed** the demo's home to https://bot-arena-demo.ai-automation-tools.dev/ (set by the publish step): the Pages build now serves from the root, and the README links follow. *(roadmap: Public release)*
- **Launched** the replay demo at https://ai-automation-tools.dev/bot-arena/ (GitHub Pages enabled, `DEMO_PAGES=true`). The repo stays private. *(roadmap: Public release)*
- **Added** the match replay: `/spectate/<id>` replays any of the three house-bot demo matches with autoplay, pause, step, four speeds, a scrubber over every ply and a clickable move list (`src/lib/demo-replay.ts`, `MatchChessReplay`). The home page lists the replays. 5 new tests; the suite passes 116 of 116. *(roadmap: Phase 1)*
- **Removed** `use-match-data` and the `?matchId=` spectate path, which fetched an API route that never existed. The protocol spectate page no longer hangs on its loading skeleton. *(roadmap: Phase 1)*
- **Added** the static Pages demo: `npm run build:pages` and `.github/workflows/pages.yml`, which builds on every PR and deploys from `main` once the `DEMO_PAGES` repo variable is set. The demo has the org source bar and no API, admin, submission or match-report routes. The `site/` placeholder shell is gone. *(roadmap: Public release)*
- **Fixed** horizontal scrolling at phone width: the content column could grow past the viewport. *(roadmap: Public release)*
- **Changed** the README to point at the org repo and the Pages demo instead of `botarena.mikesailab.com`, with a Live Demo badge and a verified usage section. *(roadmap: Public release)*

## 2026-11-04

- **Added** two house bots in `src/lib/house-bots.ts`, a seeded random legal mover and a depth-2 material search engine, and `npm run demo:matches`, which plays them through the match state manager and the chess protocol into three JSON fixtures under `src/data/demo-matches/` (two checkmates and a threefold-repetition draw). Same seed, same match. 8 new tests in `house-bots.test.ts`; the suite passes 111 of 111. *(roadmap: Phase 1)*

## 2026-11-03

- **Security** `/api/admin/auth` no longer falls back to a built-in password when `ADMIN_PASSWORD` is unset: it refuses every login with a 503. Two new tests in `src/app/api/admin/auth/__tests__/route.test.ts`; the suite passes 103 of 103. *(security sweep)*

## 2026-11-02

- **Changed** the chess protocol plays real chess on chess.js: only legal moves are accepted, an illegal move forfeits the match, and games end on checkmate, stalemate, threefold repetition, the fifty-move rule or insufficient material instead of "king captured". The state is now a FEN plus the SAN move list. 20 new tests in `chess-protocol.test.ts`; the suite passes 101 of 101. *(roadmap: Phase 1)*

## 2026-10-30

- **Changed** CI runs hard gates: `ci.yml` calls `npx tsc --noEmit` and `npx jest --ci` directly, so any type error or failing test fails the check, like lint and `next build` already did. The baseline ratchet is gone. *(roadmap: Phase 0)*
- **Closed** issues #5, #7 and #8, the `PageProps` type errors from Next 15's async `params`, with a link to the 2026-10-28 fix (a6c9bbd, #39). *(roadmap: Phase 0)*

## 2026-10-28

- **Changed** `next build` no longer ignores type or lint errors, and ESLint runs the real `eslint-config-next` rules (core-web-vitals and typescript) instead of an empty config. Fixing what that surfaced: the five dynamic routes await Next 15's async `params`, `MatchChessReplay` uses the react-chessboard v5 `options` prop (the last tsc error), effects no longer set state synchronously, and the spectate metrics stop showing made-up latency numbers. Removed the unused carousel component and its `embla-carousel-react` dependency. Lint, `tsc --noEmit`, 81 of 81 tests and `next build` all pass; the CI tsc ratchet is 0. *(roadmap: Phase 0)*

## 2026-10-26

- **Security:** `ci.yml` declares `permissions: contents: read` (security sweep). The repo default is already read; this pins it.
- **Fixed** the last failing test and the 6 type errors in `match-runner-integration.test.ts`: the test now checks the real initial `ChessState` instead of a `turn` field it never had, and `validateMatchSetup` accepts a protocol's own move type. `npx jest --ci` passes 81 of 81, tsc errors fell from 7 to 1, and the CI ratchet dropped to 1 tsc error and 0 failing tests. *(roadmap: Phase 0)*
- **Removed** the unused `zod` dependency (3.24.2): nothing imports it, and it carried Dependabot alert #232 (GHSA-mrhx-c7xc-m3w5, high). The only zod left is eslint-plugin-react-hooks' own 4.6.7, which is patched.

## 2026-10-23

**Changed**
- Renamed the package from `nextn` to `bot-arena`, and made `npm run build` a plain `next build` so it works on Windows (the Unix-only `NODE_ENV=production` prefix is gone; Next sets it for builds). *(roadmap: Phase 0)*

**Docs**
- Moved `planning.md`, `notes.md` and `TEST_SUMMARY.md` into [`docs/archive/`](archive/README.md), each with a note that it describes the February-March 2026 build. *(roadmap: Phase 0)*

## 2026-10-22

**Changed**
- Removed Genkit (`genkit`, `@genkit-ai/google-genai`, `@genkit-ai/next`) and `dotenv`, and with them the OpenTelemetry and Google Cloud chain behind ten Dependabot alerts. The live shoutcaster and the match-report audit now write their text from the match data, with no model call or API key; the two prompts are kept for when ADR-003 brings AI commentary back. *(roadmap: Next slices)*
- Security updates for the Dependabot alerts that had a non-breaking fix: `next` 15.5.9 → 15.5.28 (all ten Next advisories, three of them critical), `npm audit fix` across the transitive tree, and an `overrides` entry that lifts the `postcss` Next bundles from 8.4.31 to 8.5.31. Removed `patch-package` (no patches existed) and `genkit-cli` with the `genkit:dev` / `genkit:watch` scripts (a local dev UI only; the Genkit runtime the app calls is unchanged). `npm audit` went from 125 findings (6 critical, 39 high) to 70 (0 critical, 9 high); the rest come from Genkit's OpenTelemetry chain, Tailwind 3 and `eslint-config-next`, and leave with the Genkit-removal and framework items on the roadmap.
- Moved to the `ai-automation-tools` org as `ai-automation-tools/bot-arena` (was `michaelschecht/BotArena-Retro-FB`), private and incubating in the org pipeline. The weekly roadmap routine now runs Mon, Wed and Fri at 20:30 and the org PR sweep merges its PRs daily.
- Restructured the [roadmap](ROADMAP.md) for public release: `## After go-live` is now `## After public release`. Above it stay Phase 0, a new MVP phase (real chess, two house bots, a working replay) and the `🚦 Public release` gates; the ADRs, the core rebuild, gameplay and the hosted go-live moved below it unchanged. No items dropped. *(roadmap)*

**Added**
- `AGENTS.md` (with `CLAUDE.md` importing it), `SECURITY.md`, an MIT `LICENSE`, and a demo shell in `site/` with the org source bar and the app icon. `.gitignore` now keeps `.env.example` trackable. *(roadmap: Public release)*

## 2026-10-19

**Docs**
- Moved the [roadmap](ROADMAP.md) onto the lab's roadmap standard: `🔒 Needs owner` replaces **(Mike)**, done notes read `— done YYYY-MM-DD:`, Phase 4 is the `🚦 Go-live` gate list, and Later sits under `## After go-live`. No items added or dropped.

## 2026-10-17

**Removed**
- Deleted the unused Firebase dependency, `.idx/`, `apphosting.yaml`, `ai-shoutcaster.tsx`, `game-view.tsx`, `src/game-templates/`, the `/dev` pages, the empty placeholder-image data and the `daily-update` workflow. *(roadmap: Phase 0)*

**Changed**
- Moved the interactive chess component the spectate demo renders from `src/game-templates/classic-game/chess-game.tsx` to `src/components/interactive-chess-game.tsx`. *(roadmap: Phase 0)*

## 2026-10-14

**Changed**
- Production paused. The Vercel project was serving `POST /api/match/run`, which ran submitted
  JavaScript with no authentication. The apex tile now shows "Coming soon".
- Development restarted. A weekly roadmap routine now works through the roadmap and opens PRs.

**Fixed**
- CI no longer posts "CI checks passed" on every PR regardless of the result, and now fails only when a change adds a
  type error or a failing test beyond the 2026-10-14 baseline, so roadmap PRs can merge while Phase 0 is open.

**Changed**
- Added `vercel.json` with Git deployments off. A paused Vercel project posts a failing "Deployment was blocked"
  check on every PR, which would stop the PR sweep merging anything.

**Removed**
- Deleted `POST /api/match/run`, `GET /api/match/[id]`, `bot-executor.ts` and `error-handler.ts` with their tests, so no server route executes submitted code. *(roadmap: Phase 0)*
- Disabled the scheduled `daily-update` workflow, which failed every day. Phase 0 deletes the file.

**Docs**
- Wrote the [salvage assessment](2026-10-14-salvage-assessment.md): restart with pieces, keeping the
  match-engine design and the spectator UI.
- Rebuilt the [roadmap](ROADMAP.md) from that assessment, replacing `planning.md`.
- Added this changelog and the docs index.

## 2026-10-14 (earlier)

**Changed**
- Switched the app icon to the shared dark-tile icon used across mikesailab.com.

## 2026-09-30

**Changed**
- The repo moved to the `ai-automation-tools` org and came straight back the same day, because Vercel's
  Hobby plan can't deploy a private org repo. Links point at `michaelschecht/BotArena-Retro-FB` again.

## 2026-05-12 to 2026-06-08

**Changed**
- Replaced the generated icon with the mikesailab favicon family, and refreshed `package-lock.json`.

## 2026-02-13 to 2026-03-18

**Added**
- The original build, one feature a day by an automated agent (details in [`archive/notes.md`](archive/notes.md)): the marketplace,
  spectator replay with a Stockfish demo, AI shoutcaster and match audit, bot submission form, admin
  pages, the protocol-agnostic match runner, and a Jest suite.
- The [salvage assessment](2026-10-14-salvage-assessment.md) found most of it ran on mock data and never
  stored or ran a real match.

## 2025-12-10

**Added**
- Project started in Firebase Studio.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="ROADMAP.md">Roadmap</a>
</p>
