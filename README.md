<a id="readme-top"></a>

<p align="center">
  <img src="src/app/icon.svg" alt="Bot Arena icon: a lime glyph on the dark tile used by every ai-automation-tools app." width="96">
</p>

<h1 align="center">Bot Arena</h1>

<p align="center">
  <em>A CRT-styled arena where submitted bots play each other in rule-checked matches,<br>with replays you can scrub through and live commentary on top.</em>
</p>

<p align="center">
  <a href="https://bot-arena-demo.ai-automation-tools.dev/"><strong>Watch a replay »</strong></a> ·
  <a href="docs/README.md"><strong>Explore the docs »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-rebuilding-F59E0B?style=for-the-badge" alt="Status: rebuilding">
  <a href="https://bot-arena-demo.ai-automation-tools.dev/"><img src="https://img.shields.io/badge/Live_Demo-replays-a3e635?style=for-the-badge" alt="Live demo: match replays"></a>
  <a href="docs/ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/chess.js-1.4-6B7280?style=flat-square" alt="chess.js 1.4">
</p>

---

> [!WARNING]
> **This is a prototype being rebuilt.** What's real today: the chess protocol (built on chess.js), two
> house bots, and the replay player. The [live demo](https://bot-arena-demo.ai-automation-tools.dev/) is a
> static build that replays matches those bots played; it runs no submitted code and has no backend.
> The lobby, history and protocol pages still show mock data, and bot submission waits for a sandbox.
> The [salvage assessment](docs/2026-10-14-salvage-assessment.md) says what was kept; the
> [roadmap](docs/ROADMAP.md) says what happens next.

## 📦 What's in here

| Folder | What's in it |
|:---|:---|
| [**📚 docs/**](docs/README.md) | Roadmap, changelog, salvage assessment and the bot spec |
| [**🧩 src/**](src/) | The Next.js app: routes in `app/`, the match engine and the two house bots in `lib/`, UI in `components/`, demo-match fixtures in `data/demo-matches/` |
| [**🛠️ scripts/**](scripts/) | `generate-demo-matches.ts`, which plays the house bots and rewrites the demo-match fixtures; `build-pages.mjs`, which builds the static demo |
| [**⚙️ .github/workflows/**](.github/workflows/) | `ci.yml` (lint, types, build, tests on every PR) and `pages.yml` (builds the demo on every PR, deploys it from `main`) |
| [**🧪 \_\_tests\_\_/**](__tests__/) | Jest tests; the engine's own tests sit beside it in `src/lib/__tests__/` |

## 🚀 Run it locally

```bash
npm ci              # install exactly what the lockfile pins
npm run dev         # dev server on http://localhost:9002
npx jest --ci       # tests
npm run build       # production build (plain next build, works on Windows too)
npm run demo:matches  # replay the house-bot demo matches into src/data/demo-matches/ (same seeds, same files)
npm run build:pages   # static export of the replay demo into out/, served from the root like the live demo
```

Open `/spectate/engine-vs-random` (or either of the other two ids in `src/data/demo-matches/`) to watch a
replay. Space pauses, the arrow keys step, 1-4 set the speed, and the slider or the move list jumps
anywhere in the game.

## 🔁 How work lands

Changes ship through pull requests into `main`. A weekly roadmap routine takes the next open item, builds
it on a `roadmap/auto-<date>` branch and opens a PR; the org PR sweep reviews and merges those.
The Pages workflow builds the static demo on every PR and deploys it from `main`. The hosted arena
(submitted bots, accounts) isn't deployed anywhere until the roadmap's security review is done.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<p align="center">
  Part of <a href="https://ai-automation-tools.dev">ai-automation-tools.dev</a> · <a href="docs/ROADMAP.md">Roadmap</a> · <a href="docs/CHANGELOG.md">Changelog</a>
</p>
