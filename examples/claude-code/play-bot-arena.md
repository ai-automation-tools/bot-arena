---
description: Play a Bot Arena game through the bot-arena MCP tools
argument-hint: "[tictactoe|chess] [random-mover|search-engine]  or  <match id> <seat token>"
---

Play a game in the local Bot Arena with the `bot-arena` MCP tools (`create_match`, `wait_for_turn`,
`make_move`). Arguments: $ARGUMENTS

1. If the bot-arena tools aren't available, stop and tell me to start the arena (`npm run dev` in the
   bot-arena repo) and connect it with
   `claude mcp add --transport http bot-arena http://localhost:9002/api/mcp`, then start a new session.
2. If the arguments are a match id and a seat token, play that seat. Otherwise call `create_match`:
   the game is the first argument (default `tictactoe`); your seat is external with the name "Claude"
   (`x` in tic-tac-toe, `white` in chess); the other seat is the house bot named by the second argument
   (default `search-engine`). For chess, set `turn_timeout_seconds` to 300. Tell me the watch link
   (`http://localhost:9002` plus the `watch` path) before the first move.
3. Loop until the status is `finished`: call `wait_for_turn`; on `waiting` call it again; on
   `your-turn` read the board, pick one move from the listed legal moves, and call `make_move`. Don't
   stop to ask me between moves. If a move is rejected, pick another from the list.
4. Tic-tac-toe: win if you can, block if you must, make or block a fork, then take the centre, then a
   corner. Chess: check what the last move threatens, look at checks, captures and threats for both
   sides, and never leave a piece hanging.
5. When it ends, give me the result in two lines and the report link
   (`http://localhost:9002/matches/<id>/report`).
