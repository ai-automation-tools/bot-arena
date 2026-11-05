# AGENTS.md

Standing orders for the agent that works this repo, usually the Bot-Arena Weekly Roadmap routine.
`CLAUDE.md` imports this file; edit this one.

## What Bot Arena is

A CRT-styled arena where bots play each other in rule-checked matches, with replays you can scrub
through and live commentary (template-based for now; AI commentary returns with ADR-003). It's a Next.js prototype from early 2026 being rebuilt: the
[salvage assessment](docs/2026-10-14-salvage-assessment.md) says what's real, and most pages still
run on mock data from `src/lib/data.ts`.

It's an incubating project in the `ai-automation-tools` org, private until the graduate stage makes
it public. The public release is the **MVP**: a safe, honest codebase plus a static GitHub Pages demo
where the two house bots play real chess and you watch the replay. The hosted arena, with submitted
bots, accounts and persistence, comes after.

Work queue: [`docs/ROADMAP.md`](docs/ROADMAP.md). Every item above `## After public release` is a
release gate; work those first, top to bottom.

## Stack

- Next.js 15 (App Router), React 19, TypeScript 5, Tailwind 3 with shadcn/ui (Radix), npm.
- Chess rules: the `chess` / chess.js package; board: `react-chessboard`.
- Commentary: `src/ai/flows/` builds the shoutcaster and post-match audit text from the match data, with no
  model call or key. Genkit was removed on 2026-10-22; ADR-003 (below the line) picks the SDK that brings AI
  back, using the `SHOUTCASTER_PROMPT` and `AUDITOR_PROMPT` kept in those files.
- Tests: Jest with `ts-jest`, files in `__tests__/` and next to the code they test.
- House bots: `src/lib/house-bots.ts`. `npm run demo:matches` (via `tsx`) regenerates the demo fixtures in
  `src/data/demo-matches/`; rerun it whenever the bots, the protocol or the seeds change, or the fixture tests fail.
- Pages demo: `npm run build:pages` (`scripts/build-pages.mjs`) is a static export of the app with
  `NEXT_PUBLIC_DEMO=1`. It leaves out `api/`, `admin/`, `submit/` and `match-report/`, and shows the org
  source bar (`src/components/layout/source-bar.tsx`). `.github/workflows/pages.yml` builds it on every PR;
  it deploys from `main` only once the repo variable `DEMO_PAGES` is `true` (set at graduation).
  A new route the demo can't export goes in that script's `SERVER_ONLY` list, and links to it hide behind `IS_DEMO`.

## Verify

From the repo root. Run all of them before a PR opens; report each result in the PR body.

```
npm run lint
npx tsc --noEmit
npx jest --ci
npx next build
```

CI (`.github/workflows/ci.yml`) runs the same four as hard gates on every PR and push to `main`: any
lint error, type error, failing test or build error fails the check. Never weaken a test, loosen a type
or turn a rule off to get one passing.

## Won't (this version)

If a roadmap item seems to need one of these, stop and flag it in the PR body.

- **Run submitted code on a server.** No `eval`, `new Function`, `vm`, worker or child process fed
  a user's bot, until ADR-001 is Accepted and its sandbox exists. That's why production was paused.
- **Unpause or redeploy the Vercel project**, or change `vercel.json`. That's 🔒 Needs owner.
- **Accounts, a database or paid APIs before the release.** The MVP demo is static and calls nothing
  that needs a secret.
- **New game protocols.** Chess first; the four unbuilt ones are resolved below the line.

## Standards

- Settings live in `.env` (or `.env.local`), names in `.env.example`. Never Windows user
  environment variables or `setx` in docs.
- This repo goes public at graduation. Never commit `.env*` (except `.env.example`), tokens, real
  personal data, or local paths like `C:\Users\...` or `D:\...`.
- No new runtime dependency without a line in the PR body saying why.
- Commit messages: plain imperative sentences ("Build the chess protocol on chess.js"), no
  Conventional Commit prefixes. Author email: the GitHub noreply address only.

## What "done" means for a roadmap item

1. The item's own text is true of the code, checked by running it.
2. The verify commands pass, and new behaviour has a test.
3. Anything the change made untrue is fixed: `README.md`, `docs/`, this file.
4. `docs/CHANGELOG.md` has a line for it, tagged with the roadmap phase in italics, in the same
   commit that flips the box to `- [x]` with a `— done YYYY-MM-DD:` note.
5. It's on a `roadmap/auto-<date>` branch with a PR into `main`. Never push to `main`.
