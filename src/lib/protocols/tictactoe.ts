import type { MatchResult, ProtocolDefinition } from "../match-runner";
import { seededRng, type Rng } from "../house-bots";

/**
 * Tic-tac-toe for Bot Arena. Seats are `"x"` (moves first) and `"o"`.
 *
 * Cells are named like chess squares: columns a–c left to right, rows 1–3 bottom to top, so `b2` is
 * the centre. Agents may also send 1–9, counted in reading order from the top left.
 * The board is a 9-character string in reading order (index 0 = a3), "." for an empty cell.
 */

export type TttMark = "x" | "o";

export interface TttState {
  board: string;
  currentPlayer: TttMark;
  /** Cells played so far, e.g. ["b2", "a1"]. */
  moveHistory: string[];
}

export interface TttMove {
  cell: string;
}

export const TTT_START = ".........";
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export const cellName = (i: number) => `${"abc"[i % 3]}${3 - Math.floor(i / 3)}`;

/** "b2", "B2" or "5" to a board index, or -1. */
export function cellIndex(input: string): number {
  const s = input.trim().toLowerCase();
  if (/^[1-9]$/.test(s)) return Number(s) - 1;
  const m = /^([abc])([123])$/.exec(s);
  return m ? (3 - Number(m[2])) * 3 + "abc".indexOf(m[1]) : -1;
}

export function createTttState(board = TTT_START): TttState {
  if (!/^[.XO]{9}$/.test(board)) throw new Error(`Bad tic-tac-toe board ${JSON.stringify(board)}`);
  const xs = [...board].filter((c) => c === "X").length;
  const os = [...board].filter((c) => c === "O").length;
  return { board, currentPlayer: xs > os ? "o" : "x", moveHistory: [] };
}

export function tttWinner(board: string): TttMark | null {
  for (const [a, b, c] of LINES) if (board[a] !== "." && board[a] === board[b] && board[a] === board[c]) return board[a] === "X" ? "x" : "o";
  return null;
}

export const tttLegalMoves = (board: string): string[] =>
  tttWinner(board) ? [] : [...board].flatMap((c, i) => (c === "." ? [cellName(i)] : []));

/** Any accepted notation to a legal move here, or why it isn't one. */
export function parseTttMove(state: TttState, input: unknown): { move: TttMove; san: string } | { error: string } {
  const raw = typeof input === "string" ? input : (input as { cell?: unknown })?.cell;
  const i = typeof raw === "string" ? cellIndex(raw) : -1;
  if (i < 0 || state.board[i] !== ".") {
    return { error: `Illegal or unreadable move ${JSON.stringify(input)}. Legal moves: ${tttLegalMoves(state.board).join(", ")}` };
  }
  return { move: { cell: cellName(i) }, san: cellName(i) };
}

export function tttBoardText(board: string): string {
  const rows = [0, 1, 2].map((r) => `${3 - r} ${[...board.slice(r * 3, r * 3 + 3)].join(" ")}`);
  return [...rows, "  a b c"].join("\n");
}

export function applyTttMove(state: TttState, cell: string): TttState {
  const i = cellIndex(cell);
  if (i < 0 || state.board[i] !== ".") throw new Error(`Illegal tic-tac-toe move ${JSON.stringify(cell)} on ${state.board}`);
  const board = state.board.slice(0, i) + state.currentPlayer.toUpperCase() + state.board.slice(i + 1);
  return { board, currentPlayer: state.currentPlayer === "x" ? "o" : "x", moveHistory: [...state.moveHistory, cellName(i)] };
}

export const tictactoeProtocol: ProtocolDefinition<TttState, TttMove> = {
  id: "tictactoe",
  name: "Tic-Tac-Toe",
  initializeState: () => createTttState(),

  validateMove(state, move, playerId) {
    if (tttWinner(state.board) || !state.board.includes(".")) return { legal: false, messages: ["The game is already over"], violations: ["GAME_OVER"] };
    if (playerId !== state.currentPlayer) return { legal: false, messages: [`It is ${state.currentPlayer}'s move`], violations: ["WRONG_PLAYER"] };
    const parsed = parseTttMove(state, move);
    return "error" in parsed ? { legal: false, messages: [parsed.error], violations: ["ILLEGAL_MOVE"] } : { legal: true, messages: [], violations: [] };
  },

  applyMove: (state, move) => applyTttMove(state, move.cell),

  checkCompletion(state, turns) {
    const statistics = { totalTurns: turns.length, durationMs: 0, players: {} };
    const winner = tttWinner(state.board);
    if (winner) {
      const loser = winner === "x" ? "o" : "x";
      const result: MatchResult = { outcome: "win", winnerId: winner, loserId: loser, reason: "three in a row", scores: { [winner]: 1, [loser]: 0 }, statistics };
      return { complete: true, result };
    }
    if (!state.board.includes(".")) return { complete: true, result: { outcome: "draw", reason: "full board", scores: { x: 0.5, o: 0.5 }, statistics } };
    return { complete: false };
  },

  getNextPlayer: (state) => state.currentPlayer,
  serializeStateForBot: (state) => state,
};

// ---------------------------------------------------------------- house bots

/** Score for the side to move: +1 it can force a win, 0 a draw, -1 a loss. Tiny tree, no pruning needed. */
function negamax(board: string, mark: "X" | "O"): number {
  if (tttWinner(board)) return -1; // the previous mover just won
  if (!board.includes(".")) return 0;
  let best = -2;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== ".") continue;
    best = Math.max(best, -negamax(board.slice(0, i) + mark + board.slice(i + 1), mark === "X" ? "O" : "X"));
    if (best === 1) break;
  }
  return best;
}

export type TttBot = (state: TttState) => TttMove;

export const tttRandom = (rng: Rng): TttBot => (state) => {
  const legal = tttLegalMoves(state.board);
  return { cell: legal[Math.floor(rng() * legal.length)] };
};

/** Perfect play; picks at random among equally good moves so games differ. */
export const tttMinimax = (rng: Rng): TttBot => (state) => {
  const mark = state.currentPlayer === "x" ? "X" : "O";
  const scored = tttLegalMoves(state.board).map((cell) => {
    const i = cellIndex(cell);
    return { cell, score: -negamax(state.board.slice(0, i) + mark + state.board.slice(i + 1), mark === "X" ? "O" : "X") };
  });
  const top = Math.max(...scored.map((s) => s.score));
  const best = scored.filter((s) => s.score === top);
  return { cell: best[Math.floor(rng() * best.length)].cell };
};

export const TTT_HOUSE_BOTS = {
  "random-mover": { name: "Random Mover", create: tttRandom },
  "search-engine": { name: "Minimax", create: tttMinimax },
} as const;

/** A house-bot game for the demo, played the same way every time for a given seed. */
export function playTttDemo(id: string, seed: number, x: keyof typeof TTT_HOUSE_BOTS, o: keyof typeof TTT_HOUSE_BOTS) {
  const rng = seededRng(seed);
  const bots = { x: TTT_HOUSE_BOTS[x].create(rng), o: TTT_HOUSE_BOTS[o].create(rng) };
  let state = createTttState();
  while (!tttWinner(state.board) && state.board.includes(".")) state = applyTttMove(state, bots[state.currentPlayer](state).cell);
  const winner = tttWinner(state.board);
  return {
    id,
    game: "tictactoe" as const,
    seed,
    players: { x: { name: TTT_HOUSE_BOTS[x].name }, o: { name: TTT_HOUSE_BOTS[o].name } },
    startPosition: TTT_START,
    moves: state.moveHistory.map((san) => ({ san })),
    result: { winner, reason: winner ? "three in a row" : "full board" },
  };
}
