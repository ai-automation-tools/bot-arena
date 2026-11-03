/**
 * Chess protocol: legality and every end condition, plus an illegal move scored as a forfeit.
 */

import type { BotExecutionResult, MatchRunnerConfig } from "../match-runner";
import { initializeMatch, processTurn, startMatch } from "../match-state-manager";
import { chessProtocol, createChessState, type ChessMove, type ChessState } from "../protocols/chess";

/** "e2e4" or "e7e8q" -> ChessMove */
function uci(move: string): ChessMove {
  const promotion = move[4] as ChessMove["promotion"];
  return { from: move.slice(0, 2), to: move.slice(2, 4), ...(promotion ? { promotion } : {}) };
}

/** Play moves through validateMove/applyMove, failing loudly on any illegal one. */
function play(moves: string[], state: ChessState = createChessState()): ChessState {
  for (const m of moves) {
    const check = chessProtocol.validateMove(state, uci(m), state.currentPlayer);
    if (!check.legal) throw new Error(`${m}: ${check.messages.join("; ")}`);
    state = chessProtocol.applyMove(state, uci(m), state.currentPlayer);
  }
  return state;
}

const complete = (state: ChessState) => chessProtocol.checkCompletion(state, []);

describe("chess protocol: legality", () => {
  it("starts from the standard position with white to move", () => {
    const state = chessProtocol.initializeState();
    expect(state.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(state.currentPlayer).toBe("white");
    expect(complete(state).complete).toBe(false);
  });

  it("accepts a legal move and records it in SAN", () => {
    const state = play(["e2e4", "e7e5", "g1f3"]);
    expect(state.moveHistory).toEqual(["e4", "e5", "Nf3"]);
    expect(state.currentPlayer).toBe("black");
  });

  it.each([
    ["a pawn moving three squares", "e2e5"],
    ["a bishop jumping its own pawn", "f1c4"],
    ["an empty square", "e4e5"],
    ["an off-board square", "e2e9"],
  ])("rejects %s", (_label, move) => {
    const result = chessProtocol.validateMove(createChessState(), uci(move), "white");
    expect(result.legal).toBe(false);
    expect(result.violations).toEqual(["ILLEGAL_MOVE"]);
  });

  it("rejects moving out of turn", () => {
    const result = chessProtocol.validateMove(createChessState(), uci("e7e5"), "black");
    expect(result.violations).toEqual(["WRONG_PLAYER"]);
  });

  it("rejects a malformed move without throwing", () => {
    for (const bad of [null, "e2e4", { from: "e2" }, { from: "e7", to: "e8", promotion: "k" }]) {
      const result = chessProtocol.validateMove(createChessState(), bad as unknown as ChessMove, "white");
      expect(result.violations).toEqual(["MALFORMED_MOVE"]);
    }
  });

  it("rejects a move that leaves the king in check", () => {
    // White king e1 pinned piece: the e2 rook may not leave the e-file with a black rook on e8.
    const state = createChessState("k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1");
    expect(chessProtocol.validateMove(state, uci("e2d2"), "white").legal).toBe(false);
    expect(chessProtocol.validateMove(state, uci("e2e8"), "white").legal).toBe(true);
  });

  it("requires a promotion piece when a pawn reaches the last rank", () => {
    const state = createChessState("k7/4P3/8/8/8/8/8/K7 w - - 0 1");
    expect(chessProtocol.validateMove(state, uci("e7e8"), "white").legal).toBe(false);
    expect(play(["e7e8n"], state).moveHistory).toEqual(["e8=N"]);
  });

  it("rejects any move once the game is over", () => {
    const mated = play(["f2f3", "e7e5", "g2g4", "d8h4"]);
    expect(chessProtocol.validateMove(mated, uci("a2a3"), "white").violations).toEqual(["GAME_OVER"]);
  });

  it("survives a JSON round trip", () => {
    const state = JSON.parse(JSON.stringify(play(["e2e4", "c7c5"]))) as ChessState;
    expect(play(["g1f3"], state).moveHistory).toEqual(["e4", "c5", "Nf3"]);
  });
});

describe("chess protocol: end conditions", () => {
  it("ends on checkmate with the mating side winning", () => {
    const { complete: done, result } = complete(play(["f2f3", "e7e5", "g2g4", "d8h4"]));
    expect(done).toBe(true);
    expect(result).toMatchObject({
      outcome: "win",
      winnerId: "black",
      loserId: "white",
      reason: "checkmate",
      scores: { black: 1, white: 0 },
    });
  });

  it("ends on stalemate as a draw", () => {
    const state = play(["f2f7"], createChessState("7k/8/8/8/8/8/5Q2/K7 w - - 0 1"));
    expect(complete(state).result).toMatchObject({ outcome: "draw", reason: "stalemate" });
  });

  it("ends on threefold repetition as a draw", () => {
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8"];
    const twice = play(shuffle);
    expect(complete(twice).complete).toBe(false); // start position seen twice so far
    const thrice = play([...shuffle, ...shuffle]);
    expect(complete(thrice).result).toMatchObject({ outcome: "draw", reason: "threefold repetition" });
  });

  it("ends on the fifty-move rule as a draw", () => {
    const start = createChessState("k7/8/8/8/8/8/8/K6R w - - 99 80");
    expect(complete(start).complete).toBe(false);
    const state = play(["h1h2"], start);
    expect(complete(state).result).toMatchObject({ outcome: "draw", reason: "fifty-move rule" });
  });

  it("ends on insufficient material as a draw", () => {
    const state = play(["a1b2"], createChessState("k7/8/8/8/8/8/1r6/K7 w - - 0 1"));
    expect(complete(state).result).toMatchObject({ outcome: "draw", reason: "insufficient material" });
  });

  it("scores checkmate, not the fifty-move rule, when the hundredth half-move mates", () => {
    // Rook h1-h8 is mate (black king a8 boxed in by the white king on b6) and also half-move 100.
    const state = play(["h1h8"], createChessState("k7/8/1K6/8/8/8/8/7R w - - 99 80"));
    expect(complete(state).result).toMatchObject({ outcome: "win", winnerId: "white", reason: "checkmate" });
  });
});

describe("chess protocol in a match", () => {
  const config: MatchRunnerConfig<ChessState> = {
    matchId: "chess-forfeit",
    protocolId: "chess",
    initialState: chessProtocol.initializeState(),
    players: [
      { id: "white", name: "White Bot", position: "white", botCode: "" },
      { id: "black", name: "Black Bot", position: "black", botCode: "" },
    ],
    turnTimeoutMs: 1000,
    matchTimeoutMs: 60000,
    maxTurns: 200,
  };
  const turn = (move: ChessMove): BotExecutionResult<ChessMove> => ({
    move,
    executionTimeMs: 1,
    timedOut: false,
    violations: [],
  });

  it("treats an illegal move as a forfeit for the side that made it", () => {
    let match = startMatch(initializeMatch(config, chessProtocol));
    match = processTurn(match, turn(uci("e2e4")), chessProtocol);
    match = processTurn(match, turn(uci("e8e6")), chessProtocol); // a king can't move two squares

    expect(match.status).toBe("completed");
    expect(match.result).toMatchObject({ outcome: "disqualified", winnerId: "white", loserId: "black" });
    expect(match.turns[1].legal).toBe(false);
    expect(match.gameState.moveHistory).toEqual(["e4"]);
  });

  it("completes a match on checkmate", () => {
    let match = startMatch(initializeMatch(config, chessProtocol));
    for (const m of ["f2f3", "e7e5", "g2g4", "d8h4"]) {
      match = processTurn(match, turn(uci(m)), chessProtocol);
    }
    expect(match.status).toBe("completed");
    expect(match.result).toMatchObject({ outcome: "win", winnerId: "black", reason: "checkmate" });
  });
});
