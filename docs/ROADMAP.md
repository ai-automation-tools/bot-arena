<h1 align="center">🗺️ Roadmap</h1>

<p align="center">
  <em>Everything between today's paused prototype and a Bot Arena that's safe to switch back on.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/rebuilt-2026--10--14-8B5CF6?style=for-the-badge" alt="Rebuilt 2026-10-14">
  <img src="https://img.shields.io/badge/prod-paused-e74c3c?style=for-the-badge" alt="Production paused">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

The old plan in `planning.md` is retired. This roadmap was rebuilt from the
[salvage assessment](2026-10-14-salvage-assessment.md): keep the match-engine design and the spectator UI,
replace everything that fakes data or runs code unsafely.

**How to read it.** Work top to bottom. Items are ordered by what blocks what. `- [ ]` is open, `- [x]` is
done, `- [-] … claimed by PR #N` is in flight. Items tagged **(Mike)** need a person: an account, a
signature, money, or a decision only the owner makes. Everything else an agent can finish.

> [!IMPORTANT]
> **Production stays paused** until Phase 2 is complete and the Phase 4 security review is done. The Vercel
> project `bot-arena` was paused on 2026-10-14 because `POST /api/match/run` ran unauthenticated code.
> The apex tile shows "Coming soon" until then.

## 🚨 Phase 0: make it safe and honest

- [x] No server route executes submitted code: `src/app/api/match/run/`, `src/app/api/match/[id]/`, `src/lib/bot-executor.ts` and `src/lib/error-handler.ts` are deleted, and the `next build` route list shows no `/api/match/*` **Done 2026-10-14.** Deleted the two routes, both modules and their tests, and the four executor-driven cases in `match-runner-integration.test.ts`; tsc errors fell from 36 to 7 and failing tests from 12 to 1. `/spectate/<id>?matchId=…` now always shows its error state until Phase 2 persistence lands.
- [ ] Dead scaffolding removed: the `firebase` dependency, `.idx/`, `apphosting.yaml`, `ai-shoutcaster.tsx`, `game-view.tsx`, `src/game-templates/`, `src/app/dev/`, the placeholder-image data, and `.github/workflows/daily-update.yml`; `npm ls firebase` prints nothing
- [ ] Package renamed from `nextn` to `botarena`, and `npm run build` works on Windows (plain `next build`)
- [ ] Test suite green: the 12 failing tests are fixed or deleted with their code (route tests run under the `node` environment), and `npx jest --ci` exits 0 *(2026-10-14: 11 of the 12 went with the deleted executor and route; one remains, "should initialize chess match state correctly" in `match-runner-integration.test.ts`, alongside 6 tsc errors in the same file and 1 in `match-chess-replay.tsx`.)*
- [ ] Quality gates on: `ignoreBuildErrors` and `ignoreDuringBuilds` removed from `next.config.ts`, a real ESLint flat config (`eslint-config-next`) replaces `export default []`, and `npx tsc --noEmit`, lint and `next build` all pass
- [ ] CI that means it: the 2026-10-14 baseline ratchet in `ci.yml` (at most 36 tsc errors and 12 failing tests) is replaced by hard gates, so any PR into `main` fails when typecheck, lint, tests or build fail
- [ ] Issues #5, #7 and #8 closed with a link to the commit that fixed the type errors
- [ ] `planning.md`, `notes.md` and `TEST_SUMMARY.md` moved to `docs/archive/` with a one-line note that they describe the February-March 2026 build

## 🧭 Phase 1: decide the foundation

Each decision is a short record in `docs/decisions/` that compares the options, recommends one, and states
its status as **Proposed**. Phase 2 work that depends on a decision waits for it to be **Accepted**.

- [ ] **ADR-001, bot execution.** Compare a WebAssembly sandbox in a serverless function (QuickJS), an isolated worker on the Hetzner box, and bots as remote HTTP agents. Cover CPU time per move, memory caps, no network or filesystem, cost, and how an infinite loop gets killed. Recommend one
- [ ] **ADR-002, data and auth.** Supabase (Postgres with RLS, GitHub sign-in) against the alternatives, with a schema sketch for users, bots, matches and moves, and the retention rule for stored bot code
- [ ] **ADR-003, AI commentary.** Replace Genkit with a direct SDK call, decide the provider, keep commentary optional with the existing template fallback, and keep the key server-side
- [ ] **(Mike)** Review ADR-001 to ADR-003 and mark each Accepted or send it back
- [ ] **(Mike)** Create the Supabase project per ADR-002 and put its keys in `.env.local` and the Vercel project's env vars

## 🔨 Phase 2: rebuild the core

- [ ] Framework current: Next 16, React 19.3, Tailwind 4 and Zod 4, with typecheck, lint, tests and build green and the Next critical advisory gone from `npm audit --omit=dev`
- [ ] Genkit removed: the shoutcaster and match-audit prompts call the ADR-003 SDK directly, and `npm audit --omit=dev` shows no critical or high findings
- [ ] One protocol registry: the UI and the engine use the same protocol ids (no more `chess-turing` vs `chess`), and the marketplace reads from it instead of `lib/data.ts`
- [ ] Real chess: the chess protocol is built on chess.js, accepts legal moves only, ends on checkmate, stalemate, threefold repetition, the fifty-move rule and insufficient material, and treats an illegal move as a forfeit. Each end condition has a unit test
- [ ] Sandboxed bot runner per ADR-001: a bot receives the position and returns a move inside the time limit. Tests prove that an infinite loop, a memory bomb and a network call are all contained and scored as a forfeit
- [ ] Persistence per ADR-002: migrations committed, RLS on every table, and a stored match survives a cold start (`GET` it from a fresh process)
- [ ] Bot submission stores a bot owned by the signed-in user, keeping the `match-validator` config checks
- [ ] A match runs end to end from the UI: pick two bots, start the match, watch the replay at `/spectate/<matchId>` built from the stored moves
- [ ] `MatchChessReplay` works with react-chessboard v5 and the board updates on every move
- [ ] Match report and history read real matches, and every mock in `lib/data.ts` is gone
- [ ] Admin is behind real auth, with the role read from the database; the shared password and `admin_override` are removed

## 🏆 Phase 3: make it worth playing

- [ ] Two house bots ship with the app (random legal mover, shallow-search engine) so a new player has opponents on day one
- [ ] Elo leaderboard updated after every finished match, with a page that ranks bots
- [ ] Rate limits on bot submission and match runs, per user, enforced server-side
- [ ] Bot authoring guide rewritten from `bot-submission-spec.md` for the accepted execution model, plus a starter bot that passes validation and beats the random mover
- [ ] The four unbuilt protocols resolved: implement at most one more, or remove the rest from the marketplace
- [ ] Accessibility pass: full keyboard play and replay, CRT palette meets WCAG AA contrast, and `prefers-reduced-motion` turns off scanlines and flicker

## 🚦 Phase 4: launch-ready

- [ ] Every route has real loading, empty and error states, and unknown ids return 404 rather than a crash
- [ ] Privacy note (what's stored, for how long) and terms for submitted code, linked from the footer
- [ ] Security review written to `docs/`: sandbox escape attempts, RLS tests per table, a secrets scan of the history, and `npm audit` clean of critical and high
- [ ] `.env.example` lists every variable the app reads, with what each is for
- [ ] `vercel.json` no longer sets `git.deploymentEnabled: false` (added 2026-10-14 so a paused project doesn't post a failing check on every PR)
- [ ] **(Mike)** Unpause the Vercel project, confirm `botarena.mikesailab.com` serves the new build, and flip the apex tile off "Coming soon"

## 🔭 Later

- [ ] Tournaments (round robin, then brackets)
- [ ] A second game family beyond chess
- [ ] Decide whether Bot Arena moves to the public `ai-automation-tools` org (needs Mike's explicit yes and the public release checklist)

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="2026-10-14-salvage-assessment.md">Salvage assessment</a> ·
  <a href="CHANGELOG.md">Next: Changelog →</a>
</p>
