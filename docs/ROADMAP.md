<h1 align="center">🗺️ Roadmap</h1>

<p align="center">
  <em>Everything between today's paused prototype and a public Bot Arena repo with a working replay demo, then the hosted arena after it.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/now-phase_0:_safe_and_honest-F59E0B?style=for-the-badge" alt="Now: Phase 0, make it safe and honest">
  <img src="https://img.shields.io/badge/stage-incubating_(private)-2ea44f?style=for-the-badge" alt="Stage: incubating, private">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs_home-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

The Bot-Arena Weekly Roadmap routine (Mon, Wed and Fri at 20:30) works this file top to bottom: it takes
the first open item that isn't `🔒 Needs Mike`, builds it on a `roadmap/auto-<date>` branch and opens a PR
that the org PR sweep reviews the next morning. Items are ordered by what blocks what. **Every item above
`## After public release` is a release gate.** When all of them are `- [x]`, the org pipeline's graduate
stage asks Mike to approve making `ai-automation-tools/bot-arena` public. Ticking an item adds its line to
the [changelog](CHANGELOG.md) and updates any doc it made stale, in the same commit.

Markers: `- [ ]` open, `- [-]` claimed by a run in progress (a dated note says by what, e.g. a PR number),
`- [x]` done, `- [!]` blocked (the reason follows on the line). `small` marks an item a check verifies;
`🔒 Needs Mike` marks one only Mike can do: an account, a signature, money, or a decision only the owner
makes.

The old plan in `planning.md` is retired. This roadmap was rebuilt from the
[salvage assessment](2026-10-14-salvage-assessment.md): keep the match-engine design and the spectator UI,
replace everything that fakes data or runs code unsafely.

> [!NOTE]
> **Where we are, 2026-10-22.** The repo moved from `michaelschecht/BotArena-Retro-FB` to the
> `ai-automation-tools` org as a private incubating project. The release is the **MVP**: a safe, honest
> codebase plus a static replay demo where the two house bots play real, rule-checked chess. The hosted
> arena (sandboxed submitted bots, accounts, persistence) is the work below the line, built in public.
> The Vercel project `bot-arena` stays paused; it was linked to the old repo.

## 🚨 Phase 0: make it safe and honest

- [x] No server route executes submitted code: `src/app/api/match/run/`, `src/app/api/match/[id]/`, `src/lib/bot-executor.ts` and `src/lib/error-handler.ts` are deleted, and the `next build` route list shows no `/api/match/*` — done 2026-10-14: deleted the two routes, both modules and their tests, and the four executor-driven cases in `match-runner-integration.test.ts`; tsc errors fell from 36 to 7 and failing tests from 12 to 1. `/spectate/<id>?matchId=…` now always shows its error state until Phase 2 persistence lands.
- [x] Dead scaffolding removed: the `firebase` dependency, `.idx/`, `apphosting.yaml`, `ai-shoutcaster.tsx`, `game-view.tsx`, `src/game-templates/`, `src/app/dev/`, the placeholder-image data, and `.github/workflows/daily-update.yml`; `npm ls firebase` prints nothing — done 2026-10-17: deleted all of it and uninstalled `firebase` (`npm ls firebase` now shows `(empty)`), but `game-templates/classic-game/chess-game.tsx` was not dead: the spectate demo renders it, so it moved to `src/components/interactive-chess-game.tsx`. `npm audit --omit=dev` stayed at 106, so the Phase 2 audit items rest on Genkit and Next alone.
- [ ] `small` Package renamed from `nextn` to `bot-arena`, and `npm run build` works on Windows (plain `next build`)
- [ ] Test suite green: the 12 failing tests are fixed or deleted with their code (route tests run under the `node` environment), and `npx jest --ci` exits 0 *(2026-10-14: 11 of the 12 went with the deleted executor and route; one remains, "should initialize chess match state correctly" in `match-runner-integration.test.ts`, alongside 6 tsc errors in the same file and 1 in `match-chess-replay.tsx`.)*
- [ ] Quality gates on: `ignoreBuildErrors` and `ignoreDuringBuilds` removed from `next.config.ts`, a real ESLint flat config (`eslint-config-next`) replaces `export default []`, and `npx tsc --noEmit`, lint and `next build` all pass
- [ ] `small` CI that means it: the 2026-10-14 baseline ratchet in `ci.yml` (at most 36 tsc errors and 12 failing tests) is replaced by hard gates, so any PR into `main` fails when typecheck, lint, tests or build fail
- [ ] `small` Issues #5, #7 and #8 closed with a link to the commit that fixed the type errors
- [ ] `small` `planning.md`, `notes.md` and `TEST_SUMMARY.md` moved to `docs/archive/` with a one-line note that they describe the February-March 2026 build

## 🎯 Phase 1: the MVP — real chess, real replays

The smallest thing that keeps the core promise end to end without running anyone's code on a server:
two house bots play legal chess, and you can watch and scrub the replay. Submitted bots, accounts and
persistence wait for the ADRs below the line.

- [ ] Real chess: the chess protocol is built on chess.js, accepts legal moves only, ends on checkmate, stalemate, threefold repetition, the fifty-move rule and insufficient material, and treats an illegal move as a forfeit. Each end condition has a unit test
- [ ] Two house bots ship with the app (random legal mover, shallow-search engine) and a script plays them against each other through the chess protocol, writing each finished match (moves, result, end reason) to a JSON fixture committed under `src/data/demo-matches/`. Same seed, same match
- [ ] `MatchChessReplay` works with react-chessboard v5, the board updates on every move, and `/spectate/<id>` replays a demo fixture end to end with scrubbing, instead of the error state

## 🚦 Public release

- [x] `small` CI workflow on every PR and push to `main` (`.github/workflows/ci.yml`) — done 2026-10-22: already in place from 2026-10-14; Phase 0 turns its ratchet into hard gates.
- [x] `small` `SECURITY.md` saying how to report a vulnerability — done 2026-10-22.
- [x] `small` Demo shell in `site/` with the org source bar and the app-icon favicon — done 2026-10-22.
- [x] `small` Secret scan clean over every ref (`gitleaks git . --log-opts=--all`) — done 2026-10-22: 82 commits, no leaks.
- [x] `small` `LICENSE` (MIT), `AGENTS.md` for the roadmap routine, and `.env.example` kept trackable — done 2026-10-22.
- [ ] `small` README and docs point at `ai-automation-tools/bot-arena` and the Pages demo, not `botarena.mikesailab.com` or the apex tile; the README usage section is verified against the real code
- [ ] Live demo on GitHub Pages, served from this repo by an `actions/deploy-pages` workflow (at `https://ai-automation-tools.dev/bot-arena/` until the publish step gives it `https://bot-arena-demo.ai-automation-tools.dev/`): a static export of the spectator UI replaying the Phase 1 demo matches, with the source bar and favicon from the shell, no network calls needing secrets, no admin or submission routes, and the README hero's Live Demo badge pointing at it
- [ ] Rewrite the author email on the 18 commits that use a personal address (gmail, `mike@local`, `noreply@firebase.studio`) to `225616888+michaelschecht@users.noreply.github.com` with `git filter-repo --mailmap`, then force-push every branch. `Publish-OrgRepo.ps1` refuses any other commit email 🔒 Needs Mike

## After public release

Nothing below blocks go-live.

### 🧭 Decide the hosted arena

Each decision is a short record in `docs/decisions/` that compares the options, recommends one, and states
its status as **Proposed**. Hosted work that depends on a decision waits for it to be **Accepted**.

- [ ] **ADR-001, bot execution.** Compare a WebAssembly sandbox in a serverless function (QuickJS), an isolated worker on the Hetzner box, and bots as remote HTTP agents. Cover CPU time per move, memory caps, no network or filesystem, cost, and how an infinite loop gets killed. Recommend one
- [ ] **ADR-002, data and auth.** Supabase (Postgres with RLS, GitHub sign-in) against the alternatives, with a schema sketch for users, bots, matches and moves, and the retention rule for stored bot code
- [ ] **ADR-003, AI commentary.** Replace Genkit with a direct SDK call, decide the provider, keep commentary optional with the existing template fallback, and keep the key server-side
- [ ] Review ADR-001 to ADR-003 and mark each Accepted or send it back 🔒 Needs Mike
- [ ] Create the Supabase project per ADR-002 and put its keys in `.env.local` and the hosting provider's env vars 🔒 Needs Mike

### 🔨 Next slices: rebuild the core

- [ ] Framework current: Next 16, React 19.3, Tailwind 4 and Zod 4, with typecheck, lint, tests and build green and the Next critical advisory gone from `npm audit --omit=dev`
- [ ] Genkit removed: the shoutcaster and match-audit prompts call the ADR-003 SDK directly, and `npm audit --omit=dev` shows no critical or high findings
- [ ] One protocol registry: the UI and the engine use the same protocol ids (no more `chess-turing` vs `chess`), and the marketplace reads from it instead of `lib/data.ts`
- [ ] Sandboxed bot runner per ADR-001: a bot receives the position and returns a move inside the time limit. Tests prove that an infinite loop, a memory bomb and a network call are all contained and scored as a forfeit
- [ ] Persistence per ADR-002: migrations committed, RLS on every table, and a stored match survives a cold start (`GET` it from a fresh process)
- [ ] Bot submission stores a bot owned by the signed-in user, keeping the `match-validator` config checks
- [ ] A match runs end to end from the UI: pick two bots, start the match, watch the replay at `/spectate/<matchId>` built from the stored moves
- [ ] Match report and history read real matches, and every mock in `lib/data.ts` is gone
- [ ] Admin is behind real auth, with the role read from the database; the shared password and `admin_override` are removed

### 🏆 Next slices: make it worth playing

- [ ] Elo leaderboard updated after every finished match, with a page that ranks bots
- [ ] Rate limits on bot submission and match runs, per user, enforced server-side
- [ ] Bot authoring guide rewritten from `bot-submission-spec.md` for the accepted execution model, plus a starter bot that passes validation and beats the random mover
- [ ] The four unbuilt protocols resolved: implement at most one more, or remove the rest from the marketplace
- [ ] Accessibility pass: full keyboard play and replay, CRT palette meets WCAG AA contrast, and `prefers-reduced-motion` turns off scanlines and flicker

### 🌐 Hosted arena go-live

- [ ] Every route has real loading, empty and error states, and unknown ids return 404 rather than a crash
- [ ] Privacy note (what's stored, for how long) and terms for submitted code, linked from the footer
- [ ] Security review written to `docs/`: sandbox escape attempts, RLS tests per table, a secrets scan of the history, and `npm audit` clean of critical and high
- [ ] `.env.example` lists every variable the app reads, with what each is for
- [ ] `vercel.json` no longer sets `git.deploymentEnabled: false` (added 2026-10-14 so a paused project doesn't post a failing check on every PR)
- [ ] Reconnect or replace the paused Vercel project `bot-arena` (still linked to the old `michaelschecht/BotArena-Retro-FB` repo), pick the hosted arena's domain, and switch it on 🔒 Needs Mike

### 📣 Publish and promote

- [ ] Tile and card for Bot Arena on ai-automation-tools.dev (the graduate stage adds them)

### 🔭 Later

- [ ] Tournaments (round robin, then brackets)
- [ ] A second game family beyond chess

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="2026-10-14-salvage-assessment.md">Salvage assessment</a> ·
  <a href="CHANGELOG.md">Changelog →</a>
</p>
