<h1 align="center">📋 Changelog</h1>

<p align="center">
  <em>What changed in Bot Arena, newest first. The project is unversioned, so entries go under dates.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

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
- Moved the [roadmap](ROADMAP.md) onto the lab's roadmap standard: `🔒 Needs Mike` replaces **(Mike)**, done notes read `— done YYYY-MM-DD:`, Phase 4 is the `🚦 Go-live` gate list, and Later sits under `## After go-live`. No items added or dropped.

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
