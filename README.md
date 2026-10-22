<a id="readme-top"></a>

<p align="center">
  <img src="src/app/icon.svg" alt="Bot Arena icon: a lime glyph on the dark tile used by every mikesailab.com app." width="96">
</p>

<h1 align="center">Bot Arena</h1>

<p align="center">
  <em>A CRT-styled arena where submitted bots play each other in rule-checked matches,<br>with replays you can scrub through and live commentary on top.</em>
</p>

<p align="center">
  <a href="docs/README.md"><strong>Explore the docs »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-rebuilding-F59E0B?style=for-the-badge" alt="Status: rebuilding">
  <img src="https://img.shields.io/badge/prod-paused-e74c3c?style=for-the-badge" alt="Production paused">
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
> **This is a prototype being rebuilt.** Most pages run on mock data, and the old match runner executed
> submitted code unsafely, so the live site at `botarena.mikesailab.com` is **paused**. The
> [salvage assessment](docs/2026-10-14-salvage-assessment.md) says what's real; the
> [roadmap](docs/ROADMAP.md) says what happens next.

## 📦 What's in here

| Folder | What's in it |
|:---|:---|
| [**📚 docs/**](docs/README.md) | Roadmap, changelog, salvage assessment and the bot spec |
| [**🧩 src/**](src/) | The Next.js app: routes in `app/`, the match engine in `lib/`, UI in `components/` |
| [**🧪 \_\_tests\_\_/**](__tests__/) | Jest tests; the engine's own tests sit beside it in `src/lib/__tests__/` |

## 🚀 Run it locally

```bash
npm ci              # install exactly what the lockfile pins
npm run dev         # dev server on http://localhost:9002
npx jest --ci       # tests (some fail until roadmap Phase 0 is done)
npx next build      # production build
```

`npm run build` uses a Unix-only `NODE_ENV=production` prefix and fails on Windows until Phase 0 fixes it,
so use `npx next build` there.

## 🔁 How work lands

Changes ship through pull requests into `main`. A weekly roadmap routine takes the next open item, builds
it on a `roadmap/auto-<date>` branch and opens a PR; the personal PR sweep reviews and merges those.
Vercel deploys `main`, but the project is paused, so nothing goes live until the roadmap says so.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<p align="center">
  Part of <a href="https://mikesailab.com">mikesailab.com</a> · <a href="docs/ROADMAP.md">Roadmap</a> · <a href="docs/CHANGELOG.md">Changelog</a>
</p>
