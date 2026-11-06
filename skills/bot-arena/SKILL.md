---
name: bot-arena
description: Play chess or tic-tac-toe in a local Bot Arena through its MCP tools (create_match, wait_for_turn, make_move, resign, list_matches, get_match). Use when the user asks you to play a game in Bot Arena, to join a match with a seat token, to start a match against a house bot or another agent, to set two agents against each other, or to look up a past match. Also use when the bot-arena MCP tools are connected and the user mentions a match id, a seat token, chess, or tic-tac-toe against an agent.
---

# Bot Arena

Bot Arena is a referee that runs on the user's machine (default `http://localhost:9002`). It holds
the board, checks every move, runs a clock per move and saves each game. You play one **seat** with a
**seat token**, through the `bot-arena` MCP server at `/api/mcp`.

| Game | `game` | Seats, first mover first | A move is |
|:---|:---|:---|:---|
| Chess | `chess` (default) | `white`, `black` | SAN `Nf3`, `O-O`, `e8=Q`, or UCI `g1f3` |
| Tic-tac-toe | `tictactoe` | `x`, `o` | A cell `a1`-`c3` (`b2` is the centre), or `1`-`9` in reading order |

## Before you start

1. **Are the tools there?** Look for `create_match`, `wait_for_turn` and `make_move` from a server
   named `bot-arena` (in Claude Code: `mcp__bot-arena__wait_for_turn` and so on).
2. **If they aren't,** the server isn't connected. Tell the user how to fix it, then stop:
   - Start the arena: `npm run dev` in the bot-arena repo, then open <http://localhost:9002>.
   - Connect it. Claude Code: `claude mcp add --transport http bot-arena http://localhost:9002/api/mcp`.
     Other clients take `{ "type": "http", "url": "http://localhost:9002/api/mcp" }`, or the stdio bridge
     `npx -y mcp-remote http://localhost:9002/api/mcp`. A new server shows up in a new session.
3. **If a call fails to connect,** the arena isn't running. Ask the user to start it; don't retry in a loop.
4. **`ARENA_KEY_REQUIRED`** means the arena has an access key. The MCP server must be added with the
   header (`claude mcp add --transport http bot-arena <url> --header "X-Arena-Key: <key>"`). Ask the
   user for the key; never guess it.

## Join a match you were given

The user gives you a match id and a seat token (from the New Match page or from someone's
`create_match`). Go straight to [the play loop](#the-play-loop). You don't need to know your seat in
advance: `wait_for_turn` tells you (`you are x`).

## Start a match

Call `create_match` with the game and one agent per seat:

| Seat agent | Who plays it |
|:---|:---|
| `{"kind":"external","name":"Claude"}` | An MCP or REST agent. You get a token for it. **Use this for your own seat** |
| `{"kind":"house","bot":"search-engine"}` | The strong house bot: a 2-ply search in chess, perfect minimax in tic-tac-toe |
| `{"kind":"house","bot":"random-mover"}` | A random legal mover, for a first test |
| `{"kind":"code","code":"export default (s) => s.legalMoves[0]"}` | JavaScript the arena runs each turn |
| `{"kind":"webhook","url":"http://localhost:8000/move"}` | An HTTP agent the arena POSTs each turn to |

```json
{ "game": "tictactoe", "x": { "kind": "external", "name": "Claude" }, "o": { "kind": "house", "bot": "search-engine" } }
```

```json
{ "white": { "kind": "external", "name": "Claude" }, "black": { "kind": "house", "bot": "search-engine" }, "turn_timeout_seconds": 300 }
```

The reply has `match_id`, a `tokens` object keyed by seat, and `watch` (a path such as
`/matches/4ccf2d45`). Give the user the watch link as `http://localhost:9002<watch>` so they can follow
along, then play.

- **Your seat's token is a password for that seat.** Use it; don't paste it into anything public.
- **Two agents against each other:** make both seats `external` and hand each token to the agent that
  plays it. Never play both seats yourself unless the user asks for that.
- **Clock:** the default is 120 s per move, starting when your turn does. Ask for more
  (`turn_timeout_seconds`, up to 3600) if you'll think long, as in chess.

## The play loop

```text
repeat:
  wait_for_turn(match_id, token)            # blocks up to 25 s
  status "waiting"   -> call wait_for_turn again (the opponent is thinking)
  status "your-turn" -> choose ONE move from "Legal moves", then make_move(match_id, token, move)
  status "finished"  -> stop and report the result
```

- **Keep looping until `finished`.** A game is many turns. Don't stop to ask the user between moves,
  and don't summarize mid-game unless they asked for commentary.
- **Pick from the legal list.** It's printed on your turn. A move that isn't on it is rejected with
  `ILLEGAL_MOVE`, and the clock keeps running: read the list again and send a legal one.
- **`NOT_YOUR_TURN`** means you called `make_move` early. Call `wait_for_turn` first.
- **`GAME_OVER`** or status `finished`: stop. **`BAD_SEAT_TOKEN`** or **`MATCH_NOT_FOUND`**: the id or
  token is wrong. Ask the user. A restart of the arena doesn't lose the match: once it's back, call
  `wait_for_turn` again with the same id and token.
- **Connection refused mid-game** means the arena is restarting or stopped. Wait a little and call
  `wait_for_turn` again; if it stays down, tell the user.
- **Timing out forfeits the game.** If you're slow, move sooner. A reasonable move now beats a perfect
  one too late.
- `resign` ends the game for good. Only resign when the user asks or the position is truly lost and
  they said to resign lost games.

## Playing well

**Tic-tac-toe.** Perfect play always draws, and the house `search-engine` never loses. In order:

1. Win: complete your own three in a row.
2. Block: fill the cell that completes the opponent's three.
3. Fork: make two open threats at once. Block an opponent's fork, ideally by making a threat of your own.
4. Centre `b2`, then a corner opposite the opponent's (`a3`↔`c1`, `c3`↔`a1`), then any corner, then an edge.

The board comes as text, row 3 on top:

```text
3 X . O
2 . X .
1 O . .
  a b c
```

Against a perfect bot, a draw is the best result. Say so instead of claiming a loss was bad luck.

**Chess.** Read the board and the FEN on every turn. Before each move, check what the opponent's last
move threatens, look for checks, captures and threats for both sides, and don't leave a piece hanging.
Prefer development, king safety and central control in the opening. SAN from the legal list is the
safest notation. Never invent a move that isn't listed.

## After the game

Report the result in one or two lines: who won, how (`three in a row`, `checkmate`, `resignation`,
`timeout`), how many moves, and the watch link. The match report at
`http://localhost:9002/matches/<id>/report` has each seat's move times, timeouts and rejected moves. `get_match` returns the full move list; `list_matches`
shows every live and saved game, newest first, if the user wants history.
