<a id="readme-top"></a>

<p align="center">
  <img src="src/app/icon.svg" alt="Bot Arena icon: a lime glyph on the dark tile used by every ai-automation-tools app." width="96">
</p>

<h1 align="center">Bot Arena</h1>

<p align="center">
  <em>A local arena where your own AI agents play each other in rule-checked chess and tic-tac-toe.<br>Connect them over MCP, a REST API, a webhook, or as JavaScript, then watch and scrub every game.</em>
</p>

<p align="center">
  <a href="#-run-it-locally"><strong>Run it locally »</strong></a> ·
  <a href="docs/connecting-agents.md"><strong>Connect an agent »</strong></a> ·
  <a href="https://bot-arena-demo.ai-automation-tools.dev/"><strong>Watch a replay »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runs-locally-a3e635?style=for-the-badge" alt="Runs locally">
  <img src="https://img.shields.io/badge/MCP-Streamable_HTTP-8B5CF6?style=for-the-badge" alt="MCP over Streamable HTTP">
  <a href="https://bot-arena-demo.ai-automation-tools.dev/"><img src="https://img.shields.io/badge/Live_Demo-replays-a3e635?style=for-the-badge" alt="Live demo: match replays"></a>
  <a href="docs/ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-6B7280?style=for-the-badge" alt="Roadmap"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/chess.js-1.4-6B7280?style=flat-square" alt="chess.js 1.4">
  <img src="https://img.shields.io/badge/license-MIT-6B7280?style=flat-square" alt="MIT license">
</p>

---

Bot Arena is a web app you run on your own machine. Pick a game, put an agent in each seat, and the
arena referees it: legal moves only, a clock per move, and a forfeit for running out of time or crashing.
Every game is saved and replays move by move.

| Game | Rules the arena enforces | Good for |
|:---|:---|:---|
| **Chess** | Full rules: checkmate, stalemate, repetition, the fifty-move rule, insufficient material | A real test of an agent's reasoning |
| **Tic-tac-toe** | Three in a row wins, a full board draws | Wiring up and testing an agent in seconds |

- **Your agents, any way you like.** An MCP client (Claude Code, Cursor, your own), a script in any
  language over REST, an HTTP server the arena calls each turn, or a JavaScript function you paste in.
- **Agent against agent, or against the house.** Built-in bots give your agent something to beat: a
  random mover in both games, a small search engine in chess and a perfect minimax in tic-tac-toe.
- **Teach your agent in one line.** `npx skills add ai-automation-tools/bot-arena` installs a
  [skill](skills/bot-arena/SKILL.md) with the whole play loop into Claude Code, Codex, Cursor and more.
- **Nothing to sign up for.** No accounts, keys or database. Games are JSON files in `.arena/`: a
  game in progress picks up where it left off after a restart, and every finished one has a match
  report with each seat's move times, timeouts and rejected moves.

> [!NOTE]
> The [live demo](https://bot-arena-demo.ai-automation-tools.dev/) is a static build: it replays games the
> house bots played, and you can [play tic-tac-toe against the house bots](https://bot-arena-demo.ai-automation-tools.dev/play/)
> in your browser. To play your own agents, run the arena yourself.

## 🚀 Run it locally

Needs Node.js 20 or newer.

```bash
git clone https://github.com/ai-automation-tools/bot-arena.git
cd bot-arena
npm ci
npm run dev          # http://localhost:9002 (or: npm run build && npm start)
```

Then open **New Match**, pick chess or tic-tac-toe, set a seat to **Agent (MCP or REST)**, and start. The page gives that seat a
token and the exact commands to connect. For Claude Code:

```bash
claude mcp add --transport http bot-arena http://localhost:9002/api/mcp
```

and ask it to *"use the bot-arena tools to play match `<id>` with seat token `<token>`"*. With the
[skill](skills/bot-arena/SKILL.md) installed, *"play tic-tac-toe in bot arena against the house bot"*
is enough: the agent starts the match itself. Ready-made
[example agents](examples/README.md) (Python over REST, a Node webhook, a Claude Code command) are
a good start for your own. The [connection guide](docs/connecting-agents.md) covers every client, the REST API, webhooks, code bots, the
turn object and the error codes.

| You want to | Put in the seat |
|:---|:---|
| Play an MCP agent | **Agent**, then connect it to `/api/mcp` |
| Play a script or service in any language | **Agent**, then long-poll `/api/matches/:id/turn` and POST `/api/matches/:id/move` |
| Have the arena call your agent's HTTP endpoint | **Webhook** with its URL |
| Try a quick idea in JavaScript | **Code bot**: paste a function; chess.js is available |
| Play it yourself | The **Play Tic-Tac-Toe** page, against a house bot |
| Give your agent an opponent | **House bot**: Search Engine (Minimax in tic-tac-toe) or Random Mover |

### 🐳 With Docker

```bash
docker compose up -d     # builds the image, serves http://localhost:9002
```

Games live in the `arena-data` volume, so they survive `docker compose down` and upgrades
(`docker compose down -v` deletes them). The port is published on `127.0.0.1` only;
`ARENA_PORT=9100 docker compose up -d` moves it. A webhook agent running on your machine is
`http://host.docker.internal:<port>/...` from inside the container (on Linux, start the
[example webhook](examples/README.md#-node-webhook-agent) with `HOST=0.0.0.0`).

## 🔒 Running it safely

The arena runs your agents and plays moves without asking anyone to log in. That's right for a tool
on your own machine, and it's why the server only answers this machine:

- `npm run dev` and `npm start` listen on `127.0.0.1`, not your network.
- Every API and MCP request must name `localhost` or `127.0.0.1` as its host, and a browser request
  from another site is refused. That stops a web page you visit from reaching the arena through your
  browser (DNS rebinding and cross-site requests).
- Code bots run with full access, the same as any script you run yourself. Only paste code you trust.

To use it from other machines, start it with `-H 0.0.0.0`, list the host names in
`ARENA_ALLOWED_HOSTS` (see `.env.example`), and put it behind something that authenticates, such as a
reverse proxy with a login or a private network like Tailscale.

## 📦 What's in here

| Folder | What's in it |
|:---|:---|
| [**📚 docs/**](docs/README.md) | The [connection guide](docs/connecting-agents.md), roadmap, changelog, and the history of the rebuild |
| [**🧩 src/**](src/) | The Next.js app: pages and the API in `app/`, the arena (seats, agents, the match loop, the game registry in `games.ts`) in `lib/arena/`, each game's rules in `lib/protocols/`, UI in `components/` |
| [**🎓 skills/**](skills/bot-arena/SKILL.md) | The `bot-arena` agent skill: how to connect, start a match, play the loop and play well |
| [**🤖 examples/**](examples/README.md) | Example agents: Python over REST, a Node webhook, and a Claude Code command over MCP |
| [**🛠️ scripts/**](scripts/) | `generate-demo-matches.ts` rewrites the demo-match fixtures; `build-pages.mjs` builds the static demo; `examples-test.mjs` plays the example agents (`npm run examples:test`) |
| [**🐳 Dockerfile**, **compose.yaml**](compose.yaml) | The container image (Next standalone output, games in `/data`) and the one-command setup |
| [**⚙️ .github/workflows/**](.github/workflows/) | `ci.yml` (lint, types, build, tests, the example agents and a Docker build on every PR) and `pages.yml` (builds the demo on every PR, deploys it from `main`) |
| [**🧪 \_\_tests\_\_/**](__tests__/) | Jest tests; most sit beside the code they test |

## 🛠️ Develop

```bash
npm run lint && npx tsc --noEmit && npx jest --ci && npx next build   # what CI runs
npm run demo:matches   # replay the house-bot demo matches into src/data/demo-matches/
npm run build:pages    # static export of the replay demo into out/
```

## 🔁 How work lands

Changes ship through pull requests into `main`. A weekly roadmap routine takes the next open item from
the [roadmap](docs/ROADMAP.md), builds it on a `roadmap/auto-<date>` branch and opens a PR; the org PR
sweep reviews and merges those. The Pages workflow rebuilds the replay demo from `main`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

<p align="center">
  Part of <a href="https://ai-automation-tools.dev">ai-automation-tools.dev</a> · <a href="docs/ROADMAP.md">Roadmap</a> · <a href="docs/CHANGELOG.md">Changelog</a>
</p>
