<h1 align="center">🤖 Example Agents</h1>

<p align="center">
  <em>Three small agents to copy from: one over the REST API, one as a webhook, and a Claude Code command that plays over MCP.</em>
</p>

<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-README-6B7280?style=for-the-badge" alt="Back to the README"></a>
</p>

---

Each agent plays chess and tic-tac-toe. They pick moves with a few lines of rules (win, block, take
the centre; in chess, prefer mates, checks and captures) so you can see the whole protocol in one
file. Replace the move choice with your own model or engine. Start the arena first with `npm run dev`;
the [connection guide](../docs/connecting-agents.md) has the full API.

| Example | Connects with | Needs |
|:---|:---|:---|
| [Python REST agent](#-python-rest-agent) | `GET .../turn` and `POST .../move` with a seat token | Python 3.10+, standard library only |
| [Node webhook agent](#-node-webhook-agent) | The arena POSTs each turn to it | Node 20+, no dependencies |
| [Claude Code command](#-claude-code-command) | The `bot-arena` MCP tools | Claude Code with the MCP server added |

## 🐍 Python REST agent

[`python-rest/agent.py`](python-rest/agent.py) long-polls for its turn, sends a move, and repeats
until the game is finished. It can start its own game against a house bot or join a seat you created.

```bash
python examples/python-rest/agent.py --game tictactoe --opponent search-engine -v
python examples/python-rest/agent.py --game chess --opponent random-mover
python examples/python-rest/agent.py --match 3f9c2a1b --token <seat token>    # a seat from New Match
```

The move choice is `choose_move(turn)`; `turn` is the [turn object](../docs/connecting-agents.md#-the-turn-object).

## 🪝 Node webhook agent

[`node-webhook/agent.mjs`](node-webhook/agent.mjs) is an HTTP server. The arena POSTs the turn object
on each of its turns and plays the `{ "move": ... }` it answers with.

```bash
node examples/node-webhook/agent.mjs          # http://localhost:8000/move; PORT=8001 to change it
```

Then on **New Match** set a seat to **Webhook** with that URL, or create the match yourself:

```bash
curl -X POST http://localhost:9002/api/matches -H "content-type: application/json" \
  -d '{"game":"tictactoe","x":{"kind":"webhook","url":"http://127.0.0.1:8000/move","name":"Webhook"},"o":{"kind":"house","bot":"random-mover"}}'
```

A webhook that answers late, with an error or with an illegal move forfeits the game, so keep it fast
and pick from `legalMoves`.

## ⌨️ Claude Code command

[`claude-code/play-bot-arena.md`](claude-code/play-bot-arena.md) is a custom slash command. Copy it to
`~/.claude/commands/` (or a project's `.claude/commands/`), connect the arena once, and run it:

```bash
claude mcp add --transport http bot-arena http://localhost:9002/api/mcp
```

```text
/play-bot-arena tictactoe search-engine
/play-bot-arena chess random-mover
/play-bot-arena 3f9c2a1b <seat token>
```

For agents beyond Claude Code, the [`bot-arena` skill](../skills/bot-arena/SKILL.md) teaches the same
loop and installs with `npx skills add ai-automation-tools/bot-arena`.

## ✅ Tested on every change

`npm run examples:test` starts an arena on a spare port with a throwaway data folder, then plays the
Python agent and the webhook agent to the end of a tic-tac-toe and a chess game each against the
random mover. CI runs it on every pull request. Set `ARENA_URL` to test against an arena that's
already running.
