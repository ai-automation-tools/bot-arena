<h1 align="center">🔍 Salvage Assessment</h1>

<p align="center">
  <em>What the February-March 2026 build actually delivered, and what the rebuild keeps.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/assessed-2026--10--14-8B5CF6?style=for-the-badge" alt="Assessed 2026-10-14">
  <img src="https://img.shields.io/badge/verdict-restart_with_pieces-F59E0B?style=for-the-badge" alt="Verdict: restart with pieces">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

## The verdict

**Restart with pieces.** About 70% of the code is a demo UI over hardcoded data. The match engine is the
best-built part, and its design is worth keeping, but it runs submitted code unsafely and plays chess with
no rules. Nothing stores a bot, a match or a user.

The repo started in Firebase Studio on 2025-12-10. Most commits came from an automated "daily task" agent
between 2026-02-13 and 2026-03-14, one feature a day, logged in `notes.md`. It never got as far as running
a real match from the UI. After March the only commits are icon and link edits.

> [!CAUTION]
> Production exposed `POST /api/match/run` with no authentication. It runs submitted JavaScript through
> `new Function` inside the server process, behind a regex blocklist. The Vercel project was **paused on
> 2026-10-14** for that reason and stays paused until the roadmap's safety and launch phases are done.

## Inventory

| Area | State | Verdict | Why |
|:---|:---|:---|:---|
| Marketplace `/`, `/protocol/[id]` | Stub | Rework | Five hardcoded protocols in `lib/data.ts`; only chess exists in any form |
| `/history`, match-report summary | Stub | Drop | Eight fake matches; history links 404 because reports are keyed by protocol id |
| Match report AI audit | Stub | Rework | Mock text sent to Gemini. Prod has no working key, so it shows "AI Audit Failed" |
| Spectate `/spectate/[id]` demo | Works | Keep the UI | chess.js plus a Stockfish worker playing itself; replay speed and shortcuts work |
| `MatchChessReplay` | Broken | Rework | react-chessboard v4 props on v5; the board never updates |
| AI shoutcaster (live) | Works with a key | Rework | Genkit server action with a template fallback |
| `ai-shoutcaster.tsx`, `game-view.tsx`, `game-templates/`, `/dev/*`, placeholder images | Dead | Drop | Unused or empty |
| Lobby | Stub | Drop | Every "Launch" goes to a 404 |
| Bot submission form and API | Stub | Rework | Validation works; the API returns a fake id and stores nothing |
| Admin and review | Stub | Drop | Shared password with an `admin_override` fallback; settings in localStorage |
| Reverse CAPTCHA | Works | Optional | Client-side only, so it's flavour, not security |
| `match-runner` types, state manager, completion, validator | Works, tested | **Keep** | Clean protocol-agnostic design; 106 passing tests |
| `bot-executor.ts` | Unsafe | Drop | `new Function` in-process; can't stop a synchronous infinite loop; its own tests fail. Deleted 2026-10-14 (roadmap Phase 0) |
| `error-handler.ts` (587 lines) | Dead | Drop | Only reachable from a function nothing calls. Deleted 2026-10-14 (roadmap Phase 0) |
| `protocols/chess.ts` | Stub | Drop | No move legality, check or mate; ignores the chess.js already installed |
| `match-persistence.ts` | Stub | Rework | In-memory Map, so a serverless cold start loses every match |
| Firebase | Dead | Drop | Installed, never imported; no config, no Firestore, no auth |
| CI `daily-update.yml` | Stub | Drop | Placeholder task; its "passed" comment is unconditional |

## Health on 2026-10-14

| Check | Result |
|:---|:---|
| `tsc --noEmit` | ❌ 36 errors (35 in one integration test, 1 in `match-chess-replay.tsx`). `next.config.ts` ignores type and lint errors, so they never blocked a deploy |
| Lint | Passes because `eslint.config.mjs` is `export default []` |
| Jest | ❌ 3 of 8 suites, 12 of 118 tests fail, identical to `TEST_SUMMARY.md` from March |
| `next build` | ✅ 14 pages. `npm run build` fails on Windows (`NODE_ENV=production` prefix) |
| Outdated majors | Next 15 → 16, Tailwind 3 → 4, Zod 3 → 4, Firebase 11 → 13, ESLint 9 → 10, recharts 2 → 3, date-fns 3 → 4 |
| `npm audit --omit=dev` | 106: 6 critical, 31 high, 68 moderate, 1 low. One critical is Next itself; most of the rest arrive through Genkit and Firebase |
| GitHub | Issues #5, #7, #8 open, all filed by the old automation about the type errors |

## What carries over

- `match-runner.ts` types and the `ProtocolDefinition` interface.
- `match-state-manager` and `match-completion`, with their passing tests.
- `match-validator` config checks, without the claim that a regex blocklist is security.
- The spectator layout, replay controls, event log, metrics panel, sound hook, CRT theme in `globals.css`,
  OG image and share button.
- `ChessEngine` (the chess.js wrapper) as the start of a real chess protocol.
- The two prompt texts, moved off Genkit to a direct SDK call.
- `docs/bot-submission-spec.md`, revised once the execution model is decided.

Everything marked Drop above goes. The [roadmap](ROADMAP.md) turns this into ordered work.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="ROADMAP.md">Next: Roadmap →</a>
</p>
