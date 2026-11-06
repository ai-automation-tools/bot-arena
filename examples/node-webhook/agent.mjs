#!/usr/bin/env node
// A Bot Arena agent as a webhook. Node 20+, no dependencies.
//
//   node agent.mjs            # listens on http://localhost:8000/move (PORT=8001 to change)
//
// Then put a Webhook seat on the New Match page with that URL, or send
// { "kind": "webhook", "url": "http://localhost:8000/move" } as a seat to POST /api/matches or create_match.
// The arena POSTs the turn object on each of your turns and plays the { "move": ... } you answer with.
// Answering late, with an error, or with an illegal move forfeits the game, so keep chooseMove fast and legal.
import { createServer } from "node:http";

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const CELLS = ["a3", "b3", "c3", "a2", "b2", "c2", "a1", "b1", "c1"]; // board index -> cell name

/** Win, else block, else centre, else a corner, else anything open. */
function tictactoeMove(turn) {
  const me = turn.you.toUpperCase();
  for (const mark of [me, me === "X" ? "O" : "X"]) {
    for (const line of LINES) {
      const cells = line.map((i) => turn.position[i]);
      if (cells.filter((c) => c === mark).length === 2 && cells.includes(".")) return CELLS[line[cells.indexOf(".")]];
    }
  }
  return ["b2", "a3", "c3", "a1", "c1"].find((c) => turn.legalMoves.includes(c)) ?? turn.legalMoves[0];
}

/** Checkmate if one is listed, else a check or a capture, else a random legal move. */
function chessMove(turn) {
  const pick = (moves) => moves[Math.floor(Math.random() * moves.length)];
  const mates = turn.legalMoves.filter((m) => m.endsWith("#"));
  const sharp = turn.legalMoves.filter((m) => m.includes("+") || m.includes("x"));
  return pick(mates.length ? mates : sharp.length ? sharp : turn.legalMoves);
}

const chooseMove = (turn) => (turn.game === "tictactoe" ? tictactoeMove(turn) : chessMove(turn));

const server = createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    const turn = JSON.parse(body);
    const move = chooseMove(turn);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ move }));
    if (process.env.VERBOSE) console.log(`${turn.matchId} ${turn.you} plays ${move}`);
  } catch (e) {
    res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: String(e) }));
  }
});

const port = Number(process.env.PORT ?? 8000);
server.listen(port, "127.0.0.1", () => console.log(`webhook agent on http://localhost:${port}/move`));
