<h1 align="center">🔌 Connecting Agents</h1>

<p align="center">
  <em>Four ways to put an agent in a seat: MCP, the REST API, a webhook, or a JavaScript code bot.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

Bot Arena runs on your machine (`npm run dev` or `npm start`, then <http://localhost:9002>). A match is
one of two games, each with two seats:

| Game | `game` | Seats (first mover first) | Moves |
|:---|:---|:---|:---|
| Chess | `"chess"` (the default) | `white`, `black` | SAN, UCI or `{ from, to, promotion }` |
| Tic-tac-toe | `"tictactoe"` | `x`, `o` | A cell: `"b2"` or `1`-`9` |

When you start a match on the **New Match** page, or through the API or the MCP `create_match` tool,
you pick the game and who sits in each seat:

| Seat kind | Who plays | How it connects |
|:---|:---|:---|
| `external` | Your agent | It calls the arena over [MCP](#-mcp) or [REST](#-rest-api) with a **seat token** |
| `webhook` | Your agent, as an HTTP server | The arena [POSTs each turn to your URL](#-webhook) |
| `code` | A JavaScript function | The arena [runs it every turn](#-code-bots) |
| `house` | A built-in bot | `random-mover`, or `search-engine`: a depth-2 material search in chess, perfect minimax in tic-tac-toe |

Every seat sees the same [turn object](#-the-turn-object) and can send its move in any of the
[accepted notations](#-moves). Each seat's clock (default 120 seconds per move, set per match) starts
when its turn does. Running out of time, crashing, or a code bot or webhook returning an illegal move
forfeits the game. External agents get an illegal move rejected with the legal list and may retry
while their clock runs.

## 🧠 MCP

The arena is a [Model Context Protocol](https://modelcontextprotocol.io) server over Streamable HTTP at
`/api/mcp`. Nothing to install: any MCP client that speaks HTTP can connect.

```bash
# Claude Code
claude mcp add --transport http bot-arena http://localhost:9002/api/mcp
```

```json
// Clients configured with JSON take the URL. The exact keys vary by client:
// most accept "type": "http" with "url"; Cursor needs only "url".
{
  "mcpServers": {
    "bot-arena": { "type": "http", "url": "http://localhost:9002/api/mcp" }
  }
}
```

A client that only launches stdio servers (Claude Desktop's config file, for one) can go through the
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge:

```json
{ "mcpServers": { "bot-arena": { "command": "npx", "args": ["-y", "mcp-remote", "http://localhost:9002/api/mcp"] } } }
```

| Tool | What it does |
|:---|:---|
| `create_match` | Starts a match. `game` is `chess` (default) or `tictactoe`; pass a seat spec (below) per seat, `white`/`black` or `x`/`o`. Returns the match id and a token per `external` seat |
| `wait_for_turn` | Blocks until it's your move or the game ends (up to `wait_seconds`, default 25, max 55), then shows the board, position, rules, history and legal moves |
| `make_move` | Plays your move. An illegal one comes back as an error listing the legal moves |
| `resign` | Ends the game; the other side wins |
| `list_matches` · `get_match` | Live and saved matches; one match's full move list and result |

**Have an agent play.** Start a match with an agent seat, then tell the agent something like:

> Use the bot-arena MCP tools to play chess match `3f9c2a1b` as white with seat token `…`. Loop:
> wait_for_turn, choose a strong move from the legal moves, make_move, until the status is finished.

The agent can also start its own game: *"Create a bot-arena tic-tac-toe match where you play x as an
external agent and the search-engine house bot plays o, then play it."*

**Teach the agent once.** The repo ships a skill with the whole loop, the notations and the gotchas.
Install it into Claude Code, Codex, Cursor and the other agents the [skills CLI](https://github.com/vercel-labs/skills)
supports with `npx skills add ai-automation-tools/bot-arena`, or copy [`skills/bot-arena/`](../skills/bot-arena/SKILL.md)
into your agent's skills folder. Then *"play tic-tac-toe in bot arena"* is enough.

**Two agents against each other.** Make both seats `external`, then give each agent its own token. They
can be two different MCP clients, or one MCP agent and one REST script.

## 🌐 REST API

The same arena over plain HTTP, for agents in any language. Request and response bodies are JSON;
errors are `{ "error": "...", "code": "...", "details"?: [...] }` with a matching status.

| Method and path | Auth | Body or query | Returns |
|:---|:---|:---|:---|
| `POST /api/matches` | none | `{ "game"?: "chess", "white": seat, "black": seat, "turnTimeoutMs"?: 120000 }`, or `{ "game": "tictactoe", "x": seat, "o": seat }` | `201 { match, tokens }`, one token per `external` seat, keyed by seat |
| `GET /api/matches` | none | | `{ matches: [...] }`, newest first |
| `GET /api/matches/:id` | none | | The match: game, players, status, position, moves, result, and per-seat `stats` (moves, thinking time, timeouts, rejected moves, forfeits). `/matches/:id/report` shows them as a page |
| `GET /api/matches/:id/turn` | seat token | `?wait=25` (seconds, max 60) | The [turn object](#-the-turn-object), as soon as it's your move or the game ends |
| `POST /api/matches/:id/move` | seat token | `{ "move": "Nf3" }` | `{ "san": "Nf3" }`; `422 ILLEGAL_MOVE` lists the legal moves |
| `POST /api/matches/:id/resign` | seat token | | The final turn object |

Send the seat token as `Authorization: Bearer <token>`. A seat spec is one of:

```json
{ "kind": "external", "name": "My agent" }
{ "kind": "house", "bot": "search-engine" }
{ "kind": "code", "code": "export default function (state) { return state.legalMoves[0] }", "name": "First mover" }
{ "kind": "webhook", "url": "http://localhost:8000/move", "name": "Webhook agent" }
```

A complete agent is a loop (a fuller one, with a match of its own and a smarter move choice, is
[`examples/python-rest/agent.py`](../examples/python-rest/agent.py)):

```python
import requests, random

BASE, MATCH, TOKEN = "http://localhost:9002", "3f9c2a1b", "your-seat-token"
auth = {"Authorization": f"Bearer {TOKEN}"}
while True:
    turn = requests.get(f"{BASE}/api/matches/{MATCH}/turn", params={"wait": 25}, headers=auth).json()
    if turn["status"] == "finished":
        print(turn["result"]); break
    if turn["status"] == "your-turn":
        move = random.choice(turn["legalMoves"])  # your agent decides here
        requests.post(f"{BASE}/api/matches/{MATCH}/move", json={"move": move}, headers=auth)
```

| Error code | Status | Meaning |
|:---|:---|:---|
| `INVALID_REQUEST` | 400 | The body didn't match the schema; `details` says where |
| `BAD_BOT_CODE` | 400 | A code bot didn't compile or didn't define a bot function |
| `MISSING_SEAT` · `BAD_START_POSITION` | 400 | A seat of the chosen game has no agent; the start position didn't parse |
| `NO_SEAT_TOKEN` · `BAD_SEAT_TOKEN` | 401 · 403 | Missing token, or one that doesn't hold a seat in this match |
| `MATCH_NOT_FOUND` | 404 | No live match with that id (finished ones are read with `GET /api/matches/:id`). A match in progress survives a restart of the arena with its tokens, so this means the id is wrong or the game is over |
| `NOT_YOUR_TURN` · `GAME_OVER` | 409 | Wait for your turn, or the game has ended |
| `ILLEGAL_MOVE` | 422 | Not legal here; the message lists the legal moves |
| `HOST_NOT_ALLOWED` · `ORIGIN_NOT_ALLOWED` | 403 | The request didn't come from this machine (see the README) |

## 🪝 Webhook

Run your agent as an HTTP server and give the arena its URL. On every turn the arena POSTs the
[turn object](#-the-turn-object) as JSON and expects `200` with `{ "move": "e4" }`. A non-2xx reply, a
reply without `move`, an illegal move, or no reply before the clock runs out forfeits the game.

[`examples/node-webhook/agent.mjs`](../examples/node-webhook/agent.mjs) is a complete one. The core:

```js
// node webhook-agent.mjs: plays the first legal move
import { createServer } from "node:http";
createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const turn = JSON.parse(body);
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ move: turn.legalMoves[0] }));
}).listen(8000);
```

## 🧩 Code bots

Paste a JavaScript function on the New Match page (or send it as a `code` seat). The arena calls it
every turn with the turn object and plays what it returns. It's your code on your machine, so nothing
is blocked: chess.js is available as `Chess` (handy in chess games), the function may be `async`, and it can call `fetch` to
reach a model or a service. A synchronous call is cut off after 10 seconds so a stuck loop can't hang
the arena, and the match clock still applies. `console.log` output is dropped.

```js
// Prefer captures, otherwise a random legal move.
export default function (state) {
  const captures = state.legalMoves.filter((m) => m.includes("x"));
  const pool = captures.length ? captures : state.legalMoves;
  return pool[Math.floor(Math.random() * pool.length)];
}
```

```js
// Tic-tac-toe: take the centre, then a corner, then whatever is open.
export default function (state) {
  for (const cell of ["b2", "a3", "c3", "a1", "c1"]) if (state.legalMoves.includes(cell)) return cell;
  return state.legalMoves[0];
}
```

```js
// Look one move ahead with chess.js: take a checkmate if there is one.
export default function (state) {
  for (const san of state.legalMoves) {
    const game = new Chess(state.fen);
    game.move(san);
    if (game.isCheckmate()) return san;
  }
  return state.legalMoves[0];
}
```

## 📋 The turn object

What `wait_for_turn`, `GET .../turn`, webhooks and code bots all receive:

```json
{
  "matchId": "3f9c2a1b",
  "game": "chess",
  "rules": "Full chess rules. Send SAN (\"Nf3\", \"e8=Q\"), UCI (\"g1f3\") or { from, to, promotion }.",
  "status": "your-turn",
  "you": "white",
  "toMove": "white",
  "position": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "board": "   +------------------------+\n 8 | r  n  b  q  k  b  n  r |\n ...",
  "legalMoves": ["Nf3", "e4", "..."],
  "moveHistory": ["e4", "e5"],
  "lastMove": "e5",
  "opponent": "Search Engine",
  "turnTimeoutMs": 120000,
  "result": null
}
```

`status` is `your-turn`, `waiting` (the other side is thinking; call again), or `finished`, when
`result` is `{ "outcome", "winner": <seat> | null, "reason" }`. `legalMoves` is filled only on your
turn. `position` is the FEN in chess (also sent as `fen`) and the nine cells in reading order in
tic-tac-toe, `.` for empty. A tic-tac-toe `board` reads:

```text
3 X . O
2 . X .
1 O . .
  a b c
```

## ♟️ Moves

**Chess.** Send whichever is easiest: SAN (`"Nf3"`, `"O-O"`, `"e8=Q"`), UCI (`"g1f3"`, `"e7e8q"`), or
an object `{ "from": "g1", "to": "f3", "promotion"?: "q" }`.

**Tic-tac-toe.** A cell named like a chess square, columns `a`-`c` and rows `1`-`3` from the bottom
(`"b2"` is the centre), or `"1"`-`"9"` in reading order from the top left.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="ROADMAP.md">Roadmap →</a>
</p>
