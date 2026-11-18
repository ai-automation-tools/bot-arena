import type { MatchResult, ProtocolDefinition } from "../match-runner";
import { seededRng, type Rng } from "../house-bots";

/**
 * Connect Four for Bot Arena. Seats are `"red"` (moves first) and `"yellow"`.
 *
 * Seven columns, six rows. A move is a column, "1" to "7" left to right; the disc drops to the lowest empty
 * cell. The board is a 42-character string in reading order: index 0 is the top-left cell, index 41 the
 * bottom-right, "." for empty, "R" and "Y" for discs.
 */

export type C4Seat = "red" | "yellow";

export interface C4State {
  board: string;
  currentPlayer: C4Seat;
  /** Columns played so far, e.g. ["4", "4", "3"]. */
  moveHistory: string[];
}

export interface C4Move {
  column: number; // 1-7
}

export const COLS = 7;
export const ROWS = 6;
export const C4_START = ".".repeat(COLS * ROWS);
const DISC: Record<C4Seat, "R" | "Y"> = { red: "R", yellow: "Y" };
// Right, down, down-right, down-left.
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function createC4State(board = C4_START): C4State {
  if (!new RegExp(`^[.RY]{${COLS * ROWS}}$`).test(board)) throw new Error(`Bad Connect Four board: 42 cells of ".", "R" or "Y", top row first`);
  const reds = [...board].filter((c) => c === "R").length;
  const yellows = [...board].filter((c) => c === "Y").length;
  if (reds - yellows !== 0 && reds - yellows !== 1) throw new Error("Impossible Connect Four board: red moves first, so red has as many discs as yellow or one more");
  for (let i = 0; i < COLS * (ROWS - 1); i++) {
    if (board[i] !== "." && board[i + COLS] === ".") throw new Error(`Impossible Connect Four board: a disc floats above an empty cell in column ${(i % COLS) + 1}`);
  }
  return { board, currentPlayer: reds > yellows ? "yellow" : "red", moveHistory: [] };
}

/** The seat with four in a row, or null. */
export function c4Winner(board: string): C4Seat | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const d = board[r * COLS + c];
      if (d === ".") continue;
      for (const [dr, dc] of DIRS) {
        const er = r + 3 * dr;
        const ec = c + 3 * dc;
        if (er >= ROWS || ec < 0 || ec >= COLS) continue;
        if ([1, 2, 3].every((k) => board[(r + k * dr) * COLS + c + k * dc] === d)) return d === "R" ? "red" : "yellow";
      }
    }
  }
  return null;
}

const columnFull = (board: string, col: number) => board[col - 1] !== ".";

export const c4LegalMoves = (board: string): string[] =>
  c4Winner(board) ? [] : Array.from({ length: COLS }, (_, i) => i + 1).filter((c) => !columnFull(board, c)).map(String);

/** "4" (or " 4 ") to a legal move here, or why it isn't one. */
export function parseC4Move(state: C4State, input: unknown): { move: C4Move; san: string } | { error: string } {
  const raw = typeof input === "string" ? input.trim() : "";
  const col = /^[1-7]$/.test(raw) ? Number(raw) : 0;
  if (!col || columnFull(state.board, col)) {
    return { error: `Illegal or unreadable move ${JSON.stringify(input)}. Send a column that isn't full. Legal moves: ${c4LegalMoves(state.board).join(", ")}` };
  }
  return { move: { column: col }, san: String(col) };
}

export function c4BoardText(board: string): string {
  const rows = Array.from({ length: ROWS }, (_, r) => `${ROWS - r} ${[...board.slice(r * COLS, (r + 1) * COLS)].join(" ")}`);
  return [...rows, "  1 2 3 4 5 6 7"].join("\n");
}

/** The cell index a disc dropped in `col` (1-7) lands on. */
export function c4LandingCell(board: string, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r * COLS + col - 1] === ".") return r * COLS + col - 1;
  return -1;
}

export function applyC4Move(state: C4State, column: string | number): C4State {
  const col = Number(column);
  const i = Number.isInteger(col) && col >= 1 && col <= COLS ? c4LandingCell(state.board, col) : -1;
  if (i < 0) throw new Error(`Illegal Connect Four move ${JSON.stringify(column)} on ${state.board}`);
  return {
    board: state.board.slice(0, i) + DISC[state.currentPlayer] + state.board.slice(i + 1),
    currentPlayer: state.currentPlayer === "red" ? "yellow" : "red",
    moveHistory: [...state.moveHistory, String(col)],
  };
}

export const connect4Protocol: ProtocolDefinition<C4State, C4Move> = {
  id: "connect4",
  name: "Connect Four",
  initializeState: () => createC4State(),

  validateMove(state, move, playerId) {
    if (c4Winner(state.board) || !state.board.includes(".")) return { legal: false, messages: ["The game is already over"], violations: ["GAME_OVER"] };
    if (playerId !== state.currentPlayer) return { legal: false, messages: [`It is ${state.currentPlayer}'s move`], violations: ["WRONG_PLAYER"] };
    const parsed = parseC4Move(state, String(move?.column ?? move));
    return "error" in parsed ? { legal: false, messages: [parsed.error], violations: ["ILLEGAL_MOVE"] } : { legal: true, messages: [], violations: [] };
  },

  applyMove: (state, move) => applyC4Move(state, move.column),

  checkCompletion(state, turns) {
    const statistics = { totalTurns: turns.length, durationMs: 0, players: {} };
    const winner = c4Winner(state.board);
    if (winner) {
      const loser = winner === "red" ? "yellow" : "red";
      const result: MatchResult = { outcome: "win", winnerId: winner, loserId: loser, reason: "four in a row", scores: { [winner]: 1, [loser]: 0 }, statistics };
      return { complete: true, result };
    }
    if (!state.board.includes(".")) return { complete: true, result: { outcome: "draw", reason: "full board", scores: { red: 0.5, yellow: 0.5 }, statistics } };
    return { complete: false };
  },

  getNextPlayer: (state) => state.currentPlayer,
  serializeStateForBot: (state) => state,
};

// ---------------------------------------------------------------- house bots

const WIN = 1_000_000;
const CENTRE_FIRST = [3, 2, 4, 1, 5, 0, 6]; // 0-based columns, searched in this order

/** The board as the search plays on it: 0 empty, 1 red, 2 yellow, plus how many discs each column holds. */
class SearchBoard {
  cells: Int8Array;
  heights: Int8Array; // discs in each column
  constructor(board: string) {
    this.cells = Int8Array.from([...board], (c) => (c === "R" ? 1 : c === "Y" ? 2 : 0));
    this.heights = new Int8Array(COLS);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (this.cells[r * COLS + c]) this.heights[c]++;
  }
  play(col: number, who: number): number {
    const i = (ROWS - 1 - this.heights[col]) * COLS + col;
    this.cells[i] = who;
    this.heights[col]++;
    return i;
  }
  undo(col: number) {
    this.heights[col]--;
    this.cells[(ROWS - 1 - this.heights[col]) * COLS + col] = 0;
  }
  /** Does the disc at `i` complete four? */
  wins(i: number): boolean {
    const who = this.cells[i];
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    for (const [dr, dc] of DIRS) {
      let n = 1;
      for (const s of [1, -1]) {
        for (let k = 1; k < 4; k++) {
          const rr = r + s * k * dr;
          const cc = c + s * k * dc;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || this.cells[rr * COLS + cc] !== who) break;
          n++;
        }
      }
      if (n >= 4) return true;
    }
    return false;
  }
  /** The side to move can win right now. */
  canWin(who: number): boolean {
    for (let c = 0; c < COLS; c++) {
      if (this.heights[c] >= ROWS) continue;
      const i = this.play(c, who);
      const won = this.wins(i);
      this.undo(c);
      if (won) return true;
    }
    return false;
  }
  /** Windows of four, both sides alike: three and a gap is worth a lot, two and two gaps a little; centre discs too. */
  score(who: number): number {
    const them = 3 - who;
    let s = 0;
    for (let r = 0; r < ROWS; r++) {
      const v = this.cells[r * COLS + 3];
      if (v === who) s += 3;
      else if (v === them) s -= 3;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of DIRS) {
          const er = r + 3 * dr;
          const ec = c + 3 * dc;
          if (er >= ROWS || ec < 0 || ec >= COLS) continue;
          let mine = 0;
          let theirs = 0;
          for (let k = 0; k < 4; k++) {
            const v = this.cells[(r + k * dr) * COLS + c + k * dc];
            if (v === who) mine++;
            else if (v === them) theirs++;
          }
          if (theirs === 0) s += mine === 3 ? 5 : mine === 2 ? 2 : 0;
          else if (mine === 0) s -= theirs === 3 ? 5 : theirs === 2 ? 2 : 0;
        }
      }
    }
    return s;
  }
}

class OutOfBudget extends Error {}

/**
 * Minimax with alpha-beta `depth` plies deep, centre columns first, scored by `SearchBoard.score`. A win found
 * sooner scores higher. Stops at `nodeBudget` positions (so a seed plays the same game anywhere) or `deadline`,
 * keeping the last finished depth.
 */
function bestColumn(state: C4State, rng: Rng, depth: number, nodeBudget: number, deadline: number): number {
  const b = new SearchBoard(state.board);
  const me = state.currentPlayer === "red" ? 1 : 2;
  let nodes = 0;

  const negamax = (who: number, d: number, alpha: number, beta: number, ply: number): number => {
    if (++nodes > nodeBudget || ((nodes & 1023) === 0 && Date.now() > deadline)) throw new OutOfBudget();
    // At the horizon, a win the side to move can take at once is still a win.
    if (d === 0) return b.canWin(who) ? WIN - ply - 1 : b.score(who);
    let any = false;
    for (const c of CENTRE_FIRST) {
      if (b.heights[c] >= ROWS) continue;
      any = true;
      const i = b.play(c, who);
      const score = b.wins(i) ? WIN - ply : -negamax(3 - who, d - 1, -beta, -alpha, ply + 1);
      b.undo(c);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return any ? alpha : 0; // full board: a draw
  };

  // Shuffle, then put the centre first: ties go to the first found, so equal columns vary by seed.
  const roots = CENTRE_FIRST.filter((c) => b.heights[c] < ROWS);
  for (let i = roots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [roots[i], roots[j]] = [roots[j], roots[i]];
  }
  let best = roots[0];
  for (let d = 1; d <= depth; d++) {
    let alpha = -Infinity;
    let pick = roots[0];
    try {
      for (const c of roots) {
        const i = b.play(c, me);
        const score = b.wins(i) ? WIN : -negamax(3 - me, d - 1, -Infinity, -alpha, 1);
        b.undo(c);
        if (score > alpha) [pick, alpha] = [c, score];
      }
    } catch (e) {
      if (!(e instanceof OutOfBudget)) throw e;
      break; // the board is left mid-line, but only `best` is used from here
    }
    best = pick;
    if (alpha >= WIN - depth) break; // a forced win: no need to look deeper
  }
  return best + 1;
}

export type C4Bot = (state: C4State, timeoutMs?: number) => C4Move;

export const c4Random = (rng: Rng): C4Bot => (state) => {
  const legal = c4LegalMoves(state.board);
  return { column: Number(legal[Math.floor(rng() * legal.length)]) };
};

/** Longest a Connect Four house bot thinks, whatever the clock allows: house bots run on the server's thread. */
const C4_MAX_MS = 1500;

export const c4Minimax = (depth: number, nodeBudget: number) => (rng: Rng): C4Bot => (state, timeoutMs = 120_000) => ({
  column: bestColumn(state, rng, depth, nodeBudget, Date.now() + Math.min(C4_MAX_MS, timeoutMs / 4)),
});

export const C4_HOUSE_BOTS = {
  "random-mover": { name: "Random Mover", create: c4Random },
  "search-engine": { name: "Minimax", create: c4Minimax(4, 50_000) },
  "strong-engine": { name: "Deep Minimax", create: c4Minimax(8, 2_000_000) },
} as const;

/** A house-bot game for the demo, played the same way every time for a given seed. */
export function playC4Demo(id: string, seed: number, red: keyof typeof C4_HOUSE_BOTS, yellow: keyof typeof C4_HOUSE_BOTS) {
  const rng = seededRng(seed);
  const bots = { red: C4_HOUSE_BOTS[red].create(rng), yellow: C4_HOUSE_BOTS[yellow].create(rng) };
  let state = createC4State();
  while (!c4Winner(state.board) && state.board.includes(".")) state = applyC4Move(state, bots[state.currentPlayer](state).column);
  const winner = c4Winner(state.board);
  return {
    id,
    game: "connect4" as const,
    seed,
    players: { red: { name: C4_HOUSE_BOTS[red].name }, yellow: { name: C4_HOUSE_BOTS[yellow].name } },
    startPosition: C4_START,
    moves: state.moveHistory.map((san) => ({ san })),
    result: { winner, reason: winner ? "four in a row" : "full board" },
  };
}
