import { Chess, DEFAULT_POSITION } from "chess";
import type { ProtocolDefinition, MatchResult, MatchTurn } from "../match-runner";

/**
 * Chess protocol for Bot Arena, built on chess.js.
 *
 * chess.js decides legality and every end condition. The state is plain data (a start FEN and the
 * moves played) so it survives JSON, and each call rebuilds a `Chess` from it: replaying the moves
 * is what lets chess.js see threefold repetition.
 * ponytail: the replay is O(moves) per call, so O(n²) per match; cache a Chess per match if games
 * ever run long enough for that to show.
 *
 * Player ids are the sides, `"white"` and `"black"`. An illegal move is rejected by `validateMove`,
 * and the match state manager scores that as a forfeit (`disqualified`) for the mover.
 */

export type ChessColor = "white" | "black";

export interface ChessState {
  /** Position the match started from (standard start unless a test sets one). */
  startFen: string;
  /** Position after the last move. */
  fen: string;
  /** Side to move. */
  currentPlayer: ChessColor;
  /** Moves played so far, in SAN ("e4", "Nf3", "O-O", "e8=Q#"). */
  moveHistory: string[];
}

export interface ChessMove {
  from: string; // e.g. "e2"
  to: string; // e.g. "e4"
  /** Required when a pawn reaches the last rank. */
  promotion?: "q" | "r" | "b" | "n";
}

export type ChessEndReason =
  | "checkmate"
  | "stalemate"
  | "threefold repetition"
  | "fifty-move rule"
  | "insufficient material";

function colorOf(turn: "w" | "b"): ChessColor {
  return turn === "w" ? "white" : "black";
}

/** Rebuild the game from its start position and move list. */
function replay(state: ChessState): Chess {
  const chess = new Chess(state.startFen);
  for (const san of state.moveHistory) chess.move(san);
  return chess;
}

/** Start a game, from the standard position or a given FEN (tests use this for endgames). */
export function createChessState(startFen: string = DEFAULT_POSITION): ChessState {
  const chess = new Chess(startFen); // throws on an invalid FEN
  return {
    startFen,
    fen: chess.fen(),
    currentPlayer: colorOf(chess.turn()),
    moveHistory: [],
  };
}

/** Why the game is over, or null while it goes on. Checkmate wins over any draw rule. */
export function chessEndReason(chess: Chess): ChessEndReason | null {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient material";
  if (chess.isThreefoldRepetition()) return "threefold repetition";
  if (chess.isDrawByFiftyMoves()) return "fifty-move rule";
  return null;
}

function isChessMove(move: unknown): move is ChessMove {
  if (typeof move !== "object" || move === null) return false;
  const { from, to, promotion } = move as Record<string, unknown>;
  return (
    typeof from === "string" &&
    typeof to === "string" &&
    (promotion === undefined || ["q", "r", "b", "n"].includes(promotion as string))
  );
}

/** Play `move` on the game, returning the chess.js move, or null when it isn't legal. */
function tryMove(chess: Chess, move: unknown) {
  if (!isChessMove(move)) return null;
  try {
    return chess.move({ from: move.from, to: move.to, promotion: move.promotion });
  } catch {
    return null; // chess.js 1.x throws on an illegal move
  }
}

export const chessProtocol: ProtocolDefinition<ChessState, ChessMove> = {
  id: "chess",
  name: "Chess",

  initializeState: () => createChessState(),

  validateMove(state, move, playerId) {
    const chess = replay(state);
    if (chessEndReason(chess)) {
      return { legal: false, messages: ["The game is already over"], violations: ["GAME_OVER"] };
    }
    if (playerId !== state.currentPlayer) {
      return {
        legal: false,
        messages: [`It is ${state.currentPlayer}'s move, not ${playerId}'s`],
        violations: ["WRONG_PLAYER"],
      };
    }
    if (!isChessMove(move)) {
      return {
        legal: false,
        messages: ["A move must be { from, to, promotion? } with promotion one of q, r, b, n"],
        violations: ["MALFORMED_MOVE"],
      };
    }
    if (!tryMove(chess, move)) {
      const promo = move.promotion ? `=${move.promotion}` : "";
      return {
        legal: false,
        messages: [`Illegal move ${move.from}-${move.to}${promo} in ${state.fen}`],
        violations: ["ILLEGAL_MOVE"],
      };
    }
    return { legal: true, messages: [], violations: [] };
  },

  applyMove(state, move) {
    const chess = replay(state);
    const played = tryMove(chess, move);
    if (!played) throw new Error(`applyMove got an illegal move: ${JSON.stringify(move)}`);
    return {
      ...state,
      fen: chess.fen(),
      currentPlayer: colorOf(chess.turn()),
      moveHistory: [...state.moveHistory, played.san],
    };
  },

  checkCompletion(state, turns: MatchTurn<ChessMove>[]) {
    const chess = replay(state);
    const reason = chessEndReason(chess);
    if (!reason) return { complete: false };

    const statistics = { totalTurns: turns.length, durationMs: 0, players: {} };
    if (reason === "checkmate") {
      const loser = colorOf(chess.turn()); // the mated side is the one to move
      const winner: ChessColor = loser === "white" ? "black" : "white";
      const result: MatchResult = {
        outcome: "win",
        winnerId: winner,
        loserId: loser,
        reason,
        scores: { [winner]: 1, [loser]: 0 },
        statistics,
      };
      return { complete: true, result };
    }
    const result: MatchResult = {
      outcome: "draw",
      reason,
      scores: { white: 0.5, black: 0.5 },
      statistics,
    };
    return { complete: true, result };
  },

  getNextPlayer: (state) => state.currentPlayer,

  // Chess has no hidden information: a bot sees the whole state.
  serializeStateForBot: (state) => state,
};
