#!/usr/bin/env python3
"""A Bot Arena agent over the REST API. Python 3.10+, standard library only.

Join a match you started on the New Match page:
    python agent.py --match 3f9c2a1b --token <seat token>

Or let the agent start its own game against a house bot:
    python agent.py --game tictactoe --opponent search-engine
    python agent.py --game chess --opponent random-mover

The loop is the whole protocol: wait for your turn (a long poll), send a move, repeat until the game
is finished. `choose_move` is where your own agent's thinking goes; swap it for a model call.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import random
import sys
import urllib.error
import urllib.request

log = logging.getLogger("agent")


class Arena:
    def __init__(self, base: str, key: str | None = None) -> None:
        self.base = base.rstrip("/")
        self.key = key

    def call(self, method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
        req = urllib.request.Request(f"{self.base}{path}", method=method, data=json.dumps(body).encode() if body is not None else None)
        req.add_header("content-type", "application/json")
        if token:
            req.add_header("authorization", f"Bearer {token}")
        if self.key:
            req.add_header("x-arena-key", self.key)
        try:
            with urllib.request.urlopen(req, timeout=90) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            err = json.load(e)
            raise ArenaError(e.code, err.get("code", "?"), err.get("error", "")) from None


class ArenaError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(f"{status} {code}: {message}")
        self.code = code


# ---------------------------------------------------------------- the agent's brain

LINES = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]
CELLS = ["a3", "b3", "c3", "a2", "b2", "c2", "a1", "b1", "c1"]  # board index -> cell name


def tictactoe_move(turn: dict) -> str:
    """Win, else block, else centre, else a corner, else anything open."""
    board, me = turn["position"], turn["you"].upper()
    them = "O" if me == "X" else "X"
    for mark in (me, them):
        for line in LINES:
            marks = [board[i] for i in line]
            if marks.count(mark) == 2 and marks.count(".") == 1:
                return CELLS[line[marks.index(".")]]
    for cell in ("b2", "a3", "c3", "a1", "c1"):
        if cell in turn["legalMoves"]:
            return cell
    return turn["legalMoves"][0]


def chess_move(turn: dict) -> str:
    """Checkmate if one is listed, else a check or a capture, else a random legal move."""
    legal = turn["legalMoves"]
    for pick in ([m for m in legal if m.endswith("#")], [m for m in legal if "+" in m or "x" in m]):
        if pick:
            return random.choice(pick)
    return random.choice(legal)


def choose_move(turn: dict) -> str:
    return tictactoe_move(turn) if turn["game"] == "tictactoe" else chess_move(turn)


# ---------------------------------------------------------------- the loop

def play(arena: Arena, match: str, token: str) -> dict:
    while True:
        turn = arena.call("GET", f"/api/matches/{match}/turn?wait=25", token=token)
        if turn["status"] == "finished":
            return turn["result"]
        if turn["status"] != "your-turn":
            continue  # the other side is still thinking
        move = choose_move(turn)
        try:
            arena.call("POST", f"/api/matches/{match}/move", {"move": move}, token=token)
            log.info("%s played %s", turn["you"], move)
        except ArenaError as e:
            if e.code != "ILLEGAL_MOVE":
                raise
            log.warning("rejected %s, trying again: %s", move, e)  # the clock is still running


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--base", default="http://localhost:9002", help="the arena's address")
    p.add_argument("--match", help="match id to join (with --token)")
    p.add_argument("--token", help="your seat token")
    p.add_argument("--game", choices=["chess", "tictactoe"], default="tictactoe", help="game to start when no --match is given")
    p.add_argument("--opponent", choices=["random-mover", "search-engine"], default="random-mover", help="house bot to start against")
    p.add_argument("--name", default="Python REST agent")
    p.add_argument("--key", default=os.environ.get("ARENA_API_KEY"), help="the arena's access key, if it has one (default: $ARENA_API_KEY)")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(message)s")

    arena = Arena(args.base, args.key)
    if args.match:
        if not args.token:
            p.error("--match needs --token")
        match, token = args.match, args.token
    else:
        me, them = ("x", "o") if args.game == "tictactoe" else ("white", "black")
        created = arena.call("POST", "/api/matches", {
            "game": args.game,
            me: {"kind": "external", "name": args.name},
            them: {"kind": "house", "bot": args.opponent},
        })
        match, token = created["match"]["id"], created["tokens"][me]
        print(f"match {match}: watch at {args.base}/matches/{match}")

    result = play(arena, match, token)
    print(json.dumps({"match": match, **result}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
