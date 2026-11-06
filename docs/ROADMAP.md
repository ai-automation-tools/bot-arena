<h1 align="center">🗺️ Roadmap</h1>

<p align="center">
  <em>From a paused public prototype to a local arena where anyone runs their own AI agents against each other.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/now-finish_the_local_refocus-F59E0B?style=for-the-badge" alt="Now: finish the local refocus">
  <img src="https://img.shields.io/badge/stage-public_since_2026--11--05-2ea44f?style=for-the-badge" alt="Stage: public since 2026-11-05">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs_home-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

The Bot-Arena Weekly Roadmap routine (Mondays) works this file top to bottom: it takes the first open
item that isn't `🔒 Needs owner`, builds it on a `roadmap/auto-<date>` branch and opens a PR that the org
PR sweep reviews. Items are ordered by what blocks what. The release gates above
`## After public release` are all done; the work now is below it. Ticking an item adds its line to the
[changelog](CHANGELOG.md) and updates any doc it made stale, in the same commit.

Markers: `- [ ]` open, `- [-]` claimed by a run in progress (a dated note says by what, e.g. a PR number),
`- [x]` done, `- [!]` blocked (the reason follows on the line). `small` marks an item a check verifies;
`🔒 Needs owner` marks one only the owner can do: an account, a signature, money, or a decision only the owner
makes.

> [!NOTE]
> **Where we are, 2026-11-05.** Bot Arena went public with its replay demo, then changed direction the
> same day: it's no longer a hosted site where strangers submit bots, but an app people run on their own
> machine to battle their own agents. The local arena is built (MCP, REST, webhooks, code bots, live
> view, saved games), and the hosted-arena plan (sandbox ADRs, Supabase, accounts, admin, rate limits,
> Vercel) is retired. Next: replace the remaining mock pages, then example agents and Docker.
>
> **Earlier.** The rebuild started from the [salvage assessment](2026-10-14-salvage-assessment.md) on
> 2026-10-14; the old plan is in [`archive/planning.md`](archive/planning.md).

## 🚨 Phase 0: make it safe and honest (done 2026-10-30)

- [x] No server route executes submitted code: `src/app/api/match/run/`, `src/app/api/match/[id]/`, `src/lib/bot-executor.ts` and `src/lib/error-handler.ts` are deleted, and the `next build` route list shows no `/api/match/*` — done 2026-10-14: deleted the two routes, both modules and their tests, and the four executor-driven cases in `match-runner-integration.test.ts`; tsc errors fell from 36 to 7 and failing tests from 12 to 1. `/spectate/<id>?matchId=…` now always shows its error state until Phase 2 persistence lands.
- [x] Dead scaffolding removed: the `firebase` dependency, `.idx/`, `apphosting.yaml`, `ai-shoutcaster.tsx`, `game-view.tsx`, `src/game-templates/`, `src/app/dev/`, the placeholder-image data, and `.github/workflows/daily-update.yml`; `npm ls firebase` prints nothing — done 2026-10-17: deleted all of it and uninstalled `firebase` (`npm ls firebase` now shows `(empty)`), but `game-templates/classic-game/chess-game.tsx` was not dead: the spectate demo renders it, so it moved to `src/components/interactive-chess-game.tsx`. `npm audit --omit=dev` stayed at 106, so the Phase 2 audit items rest on Genkit and Next alone.
- [x] `small` Package renamed from `nextn` to `bot-arena`, and `npm run build` works on Windows (plain `next build`) — done 2026-10-23: `name` is `bot-arena` in `package.json` and the lockfile, and the `build` script is plain `next build` (Next sets `NODE_ENV=production` itself); `npm run build` exits 0 on Windows.
- [x] Test suite green: the 12 failing tests are fixed or deleted with their code (route tests run under the `node` environment), and `npx jest --ci` exits 0 *(2026-10-14: 11 of the 12 went with the deleted executor and route; one remains, "should initialize chess match state correctly" in `match-runner-integration.test.ts`, alongside 6 tsc errors in the same file and 1 in `match-chess-replay.tsx`.)* — done 2026-10-26: the last test asserted a `turn` field `ChessState` never had; it now checks the real initial state. The file's 6 tsc errors are fixed (players carry `position`, configs are `MatchRunnerConfig<ChessState>`, and `validateMatchSetup` takes the protocol's move type instead of `unknown`). `npx jest --ci` passes 81 of 81; tsc is down to the 1 error in `match-chess-replay.tsx` (Phase 1). No route tests are left to move to `node`. The CI ratchet is lowered to 1 tsc error and 0 failing tests.
- [x] Quality gates on: `ignoreBuildErrors` and `ignoreDuringBuilds` removed from `next.config.ts`, a real ESLint flat config (`eslint-config-next`) replaces `export default []`, and `npx tsc --noEmit`, lint and `next build` all pass — done 2026-10-28: `eslint.config.mjs` spreads `eslint-config-next`'s core-web-vitals and typescript configs; its 15 errors are fixed in code with no rule turned off (effects that set state now derive it, use lazy initial state or `useSyncExternalStore`; the unused carousel, `embla-carousel-react` and `SidebarMenuSkeleton` are gone; the spectate metrics' random "latency" rows are dropped). The last tsc error went with `MatchChessReplay`'s move to the react-chessboard v5 `options` prop, and the five dynamic routes now await Next 15's async `params`, which `next build` had been hiding. All four checks exit 0 (lint leaves 34 warnings); the CI tsc ratchet is lowered to 0.
- [x] `small` CI that means it: the 2026-10-14 baseline ratchet in `ci.yml` (lowered on 2026-10-26 to at most 1 tsc error and 0 failing tests) is replaced by hard gates, so any PR into `main` fails when typecheck, lint, tests or build fail — done 2026-10-30: `ci.yml` now runs plain `npx tsc --noEmit` and `npx jest --ci` next to lint and `next build`, so each step fails on its own exit code; the counting scripts and baselines are gone, and `AGENTS.md` drops the ratchet rule.
- [x] `small` Issues #5, #7 and #8 closed with a link to the commit that fixed the type errors — done 2026-10-30: all three reported the `PageProps` error from Next 15's async `params`; closed as completed with a comment linking a6c9bbd (#39), which made the dynamic routes await `params`. `npx tsc --noEmit` exits 0.
- [x] `small` `planning.md`, `notes.md` and `TEST_SUMMARY.md` moved to `docs/archive/` with a one-line note that they describe the February-March 2026 build — done 2026-10-23: moved with `git mv`, each opens with an archived note, and `docs/archive/README.md` indexes them from the docs home.

## 🎯 Phase 1: the MVP — real chess, real replays (done 2026-11-05)

The smallest thing that keeps the core promise end to end without running anyone's code on a server:
two house bots play legal chess, and you can watch and scrub the replay.

- [x] Real chess: the chess protocol is built on chess.js, accepts legal moves only, ends on checkmate, stalemate, threefold repetition, the fifty-move rule and insufficient material, and treats an illegal move as a forfeit. Each end condition has a unit test — done 2026-11-02: `src/lib/protocols/chess.ts` keeps plain-data state (start FEN, current FEN, side to move, SAN history) and replays it through chess.js, which decides legality, promotion and all five end conditions (checkmate outranks a draw rule on the same move). An illegal, malformed or out-of-turn move fails `validateMove`, which the match state manager scores as `disqualified` for the mover. `src/lib/__tests__/chess-protocol.test.ts` adds 20 tests, one per end condition plus the forfeit; `bot-submission-spec.md` shows the new state.
- [x] Two house bots ship with the app (random legal mover, shallow-search engine) and a script plays them against each other through the chess protocol, writing each finished match (moves, result, end reason) to a JSON fixture committed under `src/data/demo-matches/`. Same seed, same match — done 2026-11-04: `src/lib/house-bots.ts` has the seeded random mover and a depth-2 material negamax engine; `src/lib/demo-match.ts` plays them through `initializeMatch`/`processTurn` and the chess protocol, and `npm run demo:matches` (`scripts/generate-demo-matches.ts`, run with the new dev dependency `tsx`) writes three fixtures: engine-vs-random (checkmate, 55 plies), random-vs-engine (checkmate, 44) and engine-vs-engine (threefold repetition, 88). A rerun rewrites them byte for byte; `house-bots.test.ts` replays every fixture through the protocol and regenerates the shortest from its seed.
- [x] `MatchChessReplay` works with react-chessboard v5, the board updates on every move, and `/spectate/<id>` replays a demo fixture end to end with scrubbing, instead of the error state — done 2026-11-05: `src/lib/demo-replay.ts` loads the three fixtures and replays each through chess.js into one FEN per ply; `MatchChessReplay` takes a demo match and owns playback (autoplay, pause, step, 0.5-4x, a slider over every ply, a clickable move list, last-move highlight, the result). `/spectate/<id>` shows the replay when the id is a demo match and the protocol view otherwise; the home page lists the three replays. The `?matchId=` path and `use-match-data`, which fetched an `/api/match/<id>` route that never existed, are gone, and the protocol spectate page no longer sits on its loading skeleton. `match-chess-replay.test.tsx` adds 5 tests; the suite passes 116 of 116.

## 🚦 Public release (done 2026-11-05)

- [x] `small` CI workflow on every PR and push to `main` (`.github/workflows/ci.yml`) — done 2026-10-22: already in place from 2026-10-14; Phase 0 turns its ratchet into hard gates.
- [x] `small` `SECURITY.md` saying how to report a vulnerability — done 2026-10-22.
- [x] `small` Demo shell in `site/` with the org source bar and the app-icon favicon — done 2026-10-22.
- [x] `small` Secret scan clean over every ref (`gitleaks git . --log-opts=--all`) — done 2026-10-22: 82 commits, no leaks.
- [x] `small` `LICENSE` (MIT), `AGENTS.md` for the roadmap routine, and `.env.example` kept trackable — done 2026-10-22.
- [x] `small` README and docs point at `ai-automation-tools/bot-arena` and the Pages demo, not `botarena.mikesailab.com` or the apex tile; the README usage section is verified against the real code — done 2026-11-05: the hero carries a Live Demo badge and a "Watch a replay" link, the warning says what's real and what's still mock, the footer and icon alt point at ai-automation-tools.dev, and every command in the usage block was run (`dev`, `jest`, `build`, `demo:matches`, the new `build:pages`).
- [x] Live demo on GitHub Pages, served from this repo by an `actions/deploy-pages` workflow (at `https://ai-automation-tools.dev/bot-arena/` until the publish step gives it `https://bot-arena-demo.ai-automation-tools.dev/`): a static export of the spectator UI replaying the Phase 1 demo matches, with the source bar and favicon from the shell, no network calls needing secrets, no admin or submission routes, and the README hero's Live Demo badge pointing at it — done 2026-11-05: `npm run build:pages` (`scripts/build-pages.mjs`) exports the app with `NEXT_PUBLIC_DEMO=1` and `PAGES_BASE_PATH`, leaving out `api/`, `admin/`, `submit/` and `match-report/` and hiding every link to them; the source bar moved from `site/` into `src/components/layout/source-bar.tsx` and `site/` is gone (the favicon was already `src/app/icon.svg`). `.github/workflows/pages.yml` builds it on every PR and deploys from `main` once `DEMO_PAGES` is set (next item). Checked locally under `/bot-arena/`: all three replays play and scrub, no console errors, no horizontal scroll at 375px.
- [x] Turn the demo on: enable Pages for the repo with GitHub Actions as the source and set the repo variable `DEMO_PAGES=true`, then rerun the Demo workflow on `main` — done 2026-11-05 on Mike's go: Pages enabled (build type workflow), `DEMO_PAGES=true`, and the Demo run deployed; `https://ai-automation-tools.dev/bot-arena/` and the three `/spectate/<id>/` replays return 200 from GitHub Pages, and `/admin/` and `/submit/` return 404. The repo itself is still private
- [x] Rewrite the author email on the commits that used a personal address — done 2026-11-05: the 18 gmail / `mike@local` / `noreply@firebase.studio` commits lived only in GitHub's PR refs, so the repo was re-created fresh (old one archived private as `bot-arena-legacy`), then `git filter-repo --mailmap` moved the 86 `outlook.com` and 3 old-style noreply commits to `225616888+michaelschecht@users.noreply.github.com` and every branch was force-pushed; trees unchanged, history now only noreply addresses

## After public release

Nothing below blocks go-live.

### 🔌 Refocus: a local arena for your own agents (done 2026-11-05)

- [x] Arena core: a match has two seats, each an external agent, a webhook, a JavaScript code bot or a house bot; a per-move clock; timeouts, crashes and illegal webhook or code moves forfeit; finished games saved as JSON — done 2026-11-05: `src/lib/arena/` (`arena.ts` run loop and registry, `agents.ts` seat kinds and SAN/UCI/object move parsing, `view.ts` turn object), games in `$ARENA_DATA_DIR` (default `.arena/`). 11 tests in `src/lib/arena/__tests__/arena.test.ts`
- [x] MCP server at `/api/mcp` (Streamable HTTP, stateless) with `create_match`, `wait_for_turn`, `make_move`, `resign`, `list_matches`, `get_match` — done 2026-11-05: `src/app/api/mcp/route.ts` on `@modelcontextprotocol/sdk` 1.32; checked end to end with initialize, tools/list and a played game
- [x] REST API for agents in any language: create and list matches, long-poll `/turn`, POST `/move` and `/resign` with a seat token, errors as `{ error, code, details? }` — done 2026-11-05: `src/app/api/matches/`, schemas in `src/lib/arena/schema.ts`
- [x] UI: New Match (pick each seat, get tokens and connect snippets), a live match view that follows the game, real match history, a Connect Agents page — done 2026-11-05: `/new`, `/matches/<id>`, `/history`, `/connect`
- [x] Public-site restrictions removed: the forbidden-API check on bot code, the "proof of silicon" captcha, bot submission and review, the admin page and its shared password, and the mock lobby — done 2026-11-05
- [x] Safe by default on one machine: the servers bind `127.0.0.1`, and `src/middleware.ts` refuses API and MCP calls whose Host or Origin isn't this machine (DNS rebinding, cross-site); `ARENA_ALLOWED_HOSTS` opts in other names — done 2026-11-05
- [x] `small` Docs for the new shape: README, `docs/connecting-agents.md` (every client, the REST API, webhooks, code bots, the turn object, error codes), `SECURITY.md` and `AGENTS.md` — done 2026-11-05

### 🧹 Finish the refocus

- [x] The four games that were never built (Search & Find, Logic Gate Solvers, Constraint Satisfaction Mazes, Protocol Mutation Challenge) are gone from the home page, the protocol and spectate pages and the mock match history; the chess card is plain "Chess" and describes how agents connect — done 2026-11-05: `src/lib/data.ts` keeps only chess, and the unused `submittedGames` mock is deleted
- [x] Every page shows real data: the chess card's `/protocol/chess-turing` stats and history read saved games (or the page is folded into the home page), `/spectate/chess-turing` (the in-browser engine game that loads Stockfish from unpkg) is removed, and `src/lib/data.ts` is gone. No page links to a mock — done 2026-11-06: the protocol pages are folded into the home page's Games section (built from the game registry), and the mock spectator view with its engine, metrics, event log and shoutcaster panel, `src/services/`, the mock match report and `src/lib/data.ts` are deleted
- [x] Match report rebuilt on saved games at `/matches/<id>/report`: per-seat move times, timeouts, illegal attempts and the end reason, with the template commentary in `src/ai/flows/` reading the real game (tests with a saved fixture) — done 2026-11-06: saved matches carry per-seat `stats` and `finishedAt`; `src/lib/arena/report.ts` builds the report and the auditor input; the match view links to it; 3 tests
- [x] A match in progress survives a server restart: the arena writes each ply to `.arena/`, resumes in-progress games on boot, and external seats keep their tokens (test: start, restart the module, finish the game) — done 2026-11-06: `.arena/live/<id>.json` after every ply, resumed by `src/instrumentation.ts` at start and on the first arena call; a file that won't load becomes `.bad`. 2 tests, and checked by stopping and starting the real server mid-game. Thinking times of plies before a restart aren't kept
- [x] Example agents in `examples/`: a Python REST agent, a Node webhook agent and a Claude Code prompt file, each in a README section; `npm run examples:test` plays the REST and webhook ones to the end against the random mover, and CI runs it — done 2026-11-06: `examples/python-rest/agent.py` (stdlib only), `examples/node-webhook/agent.mjs` (no dependencies), `examples/claude-code/play-bot-arena.md` (a slash command), `examples/README.md`; `scripts/examples-test.mjs` runs its own arena (separate `NEXT_DIST_DIR`, throwaway data) and plays each agent through a tic-tac-toe and a chess game; CI's "Example agents" step
- [x] Docker: a `Dockerfile` and `compose.yaml` so `docker compose up` serves the arena on `127.0.0.1:9002` with `.arena/` as a volume; README section; CI builds the image — done 2026-11-06: three-stage `node:24-alpine` image on Next's standalone output (`NEXT_OUTPUT=standalone`), runs as `node`, games in the `arena-data` volume at `/data`, a healthcheck, `host.docker.internal` for webhooks; CI's `docker` job builds it and checks the API answers. Checked locally: the example agents played all four games against the container, and a game in progress resumed after `docker compose restart`
- [x] Optional access key for exposed setups: with `ARENA_API_KEY` set, every API and MCP call needs `X-Arena-Key` (the seat token stays the Bearer), the UI asks for the key once, and the MCP snippets include the header; tests cover with and without the key — done 2026-11-06: the middleware gates pages too (the Matches and report pages read games without the API), sending a browser to `/unlock`, which stores the key in an httpOnly, SameSite=Strict cookie; the Python example takes `--key`; 7 middleware tests. Checked in the Docker image with a key set: API, MCP, pages, unlock, and the Python agent with and without the key
- [x] `small` `package.json` declares `engines.node` `>=20`, and the README's Node requirement matches — done 2026-11-06
- [ ] Framework current: Next 16, React 19.3, and Tailwind 4, with typecheck, lint, tests and build green and `npm audit --omit=dev` clean of critical and high
- [ ] Delete the paused Vercel project `bot-arena` and remove `vercel.json`: the app is no longer hosted 🔒 Needs owner

### 🎲 More games

Each game reuses the arena's seats, clocks, MCP tools and REST API, ships with a random house bot and a
stronger one, and has rules tests for every way a game can end. Order: the registry first, then simple to
deep, then hidden information.

- [x] Game registry: the arena runs any game from a `GameDefinition` (start state, legal moves as strings, apply a move, end check, a text board, and a per-seat view so a seat can be shown only what it may see). Chess is ported onto it with every existing test passing; `create_match`, `POST /api/matches` and New Match take a `game`; the turn object names the game; `docs/connecting-agents.md` documents both — done 2026-11-05: `GameDef` in `src/lib/arena/games.ts` (seats, protocol, parse, text board, legal moves, house bots); match summaries carry `game`, `players`, `position`; saved chess games from before are read as chess. The hidden-information view is left for Battleship, the first game that needs it
- [x] Tic-tac-toe: seats `x` and `o`, cells `a1`-`c3` or 1-9, house bots random and perfect minimax, on New Match, MCP and REST, plus a playable board against the house bots and three replays in the static demo — done 2026-11-05: `src/lib/protocols/tictactoe.ts`, `/play`, `MatchReplay` draws either game; 9 new tests
- [ ] Connect Four: 7×6 grid, a move is a column number, win on four in a row or draw on a full board; house bots: random and a depth-limited minimax
- [ ] Othello (Reversi): 8×8, a move is a square like `d3` or `pass` when no flip is possible, game ends when neither side can move, winner by disc count
- [ ] Checkers (English draughts): 8×8, captures are mandatory, multi-jumps are one move written `a3xc5xe7`, kings, draw by 40 moves without a capture or a promotion
- [ ] Go on a 9×9 board: area scoring with 7.5 komi, positional superko, `pass`, and the game ends on two passes in a row; a text board with coordinates for agents
- [ ] Battleship: a placement phase, then shots at `B7`; each seat sees its own fleet and only the shots on the other side, so it's the first hidden-information game and proves the per-seat view
- [ ] Heads-up No-Limit Texas Hold'em: blinds, fold/check/call/bet/raise with amounts, each seat sees only its own hole cards, a seeded deck so every hand replays exactly, and a match is a set number of hands scored in chips
- [ ] Liar's Dice for two: hidden dice, bids and challenges; a short bluffing game where an LLM agent's reasoning matters more than search
- [ ] More than two seats: the match model allows 3 to 6 seats with a turn order, and multi-player Hold'em is the first game to use it

### 🏆 Make it worth playing

- [ ] Rematch with colours swapped, and start a match from a FEN, from the match view and `create_match`
- [ ] Leaderboard: Elo per agent name across saved games, on a page and as an MCP tool, updated when a game ends
- [ ] Tournaments: a round robin between up to eight seats with a standings table, then single-elimination brackets
- [ ] Optional AI commentary: with a model key in `.env.local`, the shoutcaster comments on the live game through a direct SDK call (the `SHOUTCASTER_PROMPT` in `src/ai/flows/`); without a key the template commentary stays
- [ ] Accessibility pass: full keyboard play and replay, CRT palette meets WCAG AA contrast, and `prefers-reduced-motion` turns off scanlines and flicker

### 📣 Publish and promote

- [x] Tile and card for Bot Arena on ai-automation-tools.dev — done 2026-11-05 by the graduate stage (homepage `bot-arena.ai-automation-tools.dev`, landing-page PR #69)
- [x] The homepage (`bot-arena-site` repo) and the landing-page card describe the local arena for your own agents, with the MCP and REST hooks, not a hosted site — done 2026-11-05: homepage rewritten and live (`bot-arena-site` 2c7c1b0), landing-page card in ai-automation-tools.github.io PR #70
- [x] An agent skill for the MCP tools, installable with `npx skills add ai-automation-tools/bot-arena` — done 2026-11-05: `skills/bot-arena/SKILL.md` (connect, start or join a match, the play loop, error codes, how to play each game well)
- [ ] List the MCP server where people look for one (the MCP registry, awesome-mcp-servers) once the example agents are in 🔒 Needs owner

### 🔭 Later

- [ ] One-command start with `npx bot-arena` (publish the package to npm) 🔒 Needs owner
- [ ] Team and negotiation games for LLM agents once more than two seats exist (a Codenames-style word game, a Diplomacy-style press-and-orders game)

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="2026-10-14-salvage-assessment.md">Salvage assessment</a> ·
  <a href="CHANGELOG.md">Changelog →</a>
</p>
