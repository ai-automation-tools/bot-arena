<h1 align="center">📋 Changelog</h1>

<p align="center">
  <em>What changed in Bot Arena, newest first. The project is unversioned, so entries go under dates.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

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
- The original build, one feature a day by an automated agent (details in `notes.md`): the marketplace,
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
