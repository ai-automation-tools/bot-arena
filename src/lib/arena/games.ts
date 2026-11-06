import { Chess } from "chess";
import { HOUSE_BOTS, seededRng, type HouseBotId } from "../house-bots";
import type { ProtocolDefinition } from "../match-runner";
import { chessProtocol, createChessState, type ChessMove, type ChessState } from "../protocols/chess";
import {
  TTT_HOUSE_BOTS, createTttState, parseTttMove, tictactoeProtocol, tttBoardText, tttLegalMoves, type TttMove, type TttState,
} from "../protocols/tictactoe";

/**
 * Every game the arena can run. A game is its rules (a match-runner protocol) plus what an agent
 * needs around them: seat names, move parsing, a text board, the legal moves and the house bots.
 * Adding a game is one entry here, one protocol file, and a board component for the replay.
 */

/** A move as an agent may send it. Chess: SAN, UCI or { from, to, promotion }. Tic-tac-toe: "b2" or 1–9. */
export type MoveInput = string | { from: string; to: string; promotion?: string };

/** A played move as a match stores it: its notation plus the game's own fields (chess: from, to, promotion). */
export type MoveRecord = { san: string; from?: string; to?: string; promotion?: string };

export interface GameDef<S = unknown, M = unknown> {
  id: string;
  name: string;
  /** Seat ids, first mover first. They're also the keys an agent spec is sent under. */
  seats: readonly [string, string];
  protocol: ProtocolDefinition<S, M>;
  rules: string;
  create(start?: string): S;
  /** The position as one string (chess: FEN; tic-tac-toe: 9 cells in reading order). */
  position(state: S): string;
  board(state: S): string;
  legalMoves(state: S): string[];
  parse(state: S, input: MoveInput): { move: M; san: string } | { error: string };
  record(move: M, san: string): MoveRecord;
  houseBotName(bot: HouseBotId): string;
  /** A house bot's move, in a notation `parse` reads. */
  houseBot(bot: HouseBotId, seed: number): (state: S, seat: string, timeoutMs: number) => MoveInput;
  /** Extra fields for the turn view, e.g. chess's FEN. */
  extraView?(state: S): Record<string, unknown>;
}

/** Chess moves in any accepted notation, checked against the position. */
export function parseChessMove(fen: string, input: MoveInput): { move: ChessMove; san: string } | { error: string } {
  const chess = new Chess(fen);
  let candidate: MoveInput = input;
  if (typeof input === "string") {
    const s = input.trim();
    // Squares lowercase only: with /i, rank-disambiguated SAN like "B5c6" reads as UCI b5c6.
    const uci = /^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/.exec(s);
    candidate = uci ? { from: uci[1].toLowerCase(), to: uci[2].toLowerCase(), promotion: uci[3]?.toLowerCase() } : s;
  }
  try {
    const m = chess.move(candidate as Parameters<Chess["move"]>[0]);
    return { move: { from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion as ChessMove["promotion"] } : {}) }, san: m.san };
  } catch {
    return { error: `Illegal or unreadable move ${JSON.stringify(input)}. Legal moves: ${chess.moves().join(", ")}` };
  }
}

const chess: GameDef<ChessState, ChessMove> = {
  id: "chess",
  name: "Chess",
  seats: ["white", "black"],
  protocol: chessProtocol,
  rules: 'Full chess rules. Send SAN ("Nf3", "e8=Q"), UCI ("g1f3") or { from, to, promotion }.',
  create: (start) => createChessState(start),
  position: (s) => s.fen,
  board: (s) => new Chess(s.fen).ascii(),
  legalMoves: (s) => new Chess(s.fen).moves(),
  parse: (s, input) => parseChessMove(s.fen, input),
  record: (m, san) => ({ ...m, san }),
  houseBotName: (bot) => HOUSE_BOTS[bot].name,
  houseBot(bot, seed) {
    const play = HOUSE_BOTS[bot].create(seededRng(seed));
    return (s, seat, timeoutMs) => play(s, { timeoutMs, playerId: seat }) as ChessMove;
  },
  extraView: (s) => ({ fen: s.fen }),
};

const tictactoe: GameDef<TttState, TttMove> = {
  id: "tictactoe",
  name: "Tic-Tac-Toe",
  seats: ["x", "o"],
  protocol: tictactoeProtocol,
  rules: 'Three in a row wins; a full board is a draw. X moves first. Send a cell: "b2" (columns a-c, rows 1-3 from the bottom) or 1-9 in reading order.',
  create: (start) => createTttState(start),
  position: (s) => s.board,
  board: (s) => tttBoardText(s.board),
  legalMoves: (s) => tttLegalMoves(s.board),
  parse: (s, input) => parseTttMove(s, input),
  record: (_m, san) => ({ san }),
  houseBotName: (bot) => TTT_HOUSE_BOTS[bot].name,
  houseBot(bot, seed) {
    const play = TTT_HOUSE_BOTS[bot].create(seededRng(seed));
    return (s) => play(s).cell;
  },
};

export const GAMES = { chess, tictactoe } as const;
export type GameId = keyof typeof GAMES;
export const GAME_IDS = Object.keys(GAMES) as [GameId, ...GameId[]];

export function getGame(id: GameId = "chess"): GameDef {
  return GAMES[id] as unknown as GameDef;
}
