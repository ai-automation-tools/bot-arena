import { Chess, type Move } from "chess";
import type { BotFunction } from "./match-runner";
import type { ChessMove, ChessState } from "./protocols/chess";

/**
 * The house bots: this repo's own code, run at build time or in the browser, never fed a
 * user's bot. Each takes a seeded random source so the same seed plays the same game.
 */

export type Rng = () => number;

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ChessBot = BotFunction<ChessState, ChessMove>;

// The bots search from the FEN alone, so they don't see repetition; the protocol still scores it.
const toMove = (m: Move): ChessMove => ({ from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion as ChessMove["promotion"] } : {}) });

/** Plays a uniformly random legal move. */
export function createRandomMover(rng: Rng): ChessBot {
  return (state) => {
    const moves = new Chess(state.fen).moves({ verbose: true });
    return toMove(moves[Math.floor(rng() * moves.length)]);
  };
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const MATE = 1000;

/** Material balance from the side to move's point of view. */
function material(chess: Chess): number {
  const us = chess.turn();
  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) if (sq) score += sq.color === us ? VALUES[sq.type] : -VALUES[sq.type];
  }
  return score;
}

/** Negamax with alpha-beta; mates found sooner score higher. */
function negamax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0) {
    // Only a position in check can be mate, so skip the costly move generation otherwise.
    return chess.inCheck() && chess.isCheckmate() ? -MATE : material(chess);
  }
  const moves = chess.moves(); // SAN strings: far cheaper in chess.js than verbose Move objects
  if (moves.length === 0) return chess.inCheck() ? -MATE - depth : 0;
  for (const m of moves) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha);
    chess.undo();
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

/**
 * Shallow-search engine: a material-only negamax `depth` plies deep. Ties are broken at random,
 * so it doesn't play the same opening every game.
 * ponytail: material is the whole evaluation; add piece-square tables if it needs to look smarter.
 */
export function createSearchEngine(rng: Rng, depth = 2): ChessBot {
  return (state) => {
    const chess = new Chess(state.fen);
    const moves = chess.moves({ verbose: true });
    // Shuffle (Fisher-Yates) so the first best move found is a random one of the ties.
    for (let i = moves.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [moves[i], moves[j]] = [moves[j], moves[i]];
    }
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      chess.move(m);
      const score = -negamax(chess, depth - 1, -Infinity, -bestScore);
      chess.undo();
      if (score > bestScore) [best, bestScore] = [m, score];
    }
    return toMove(best);
  };
}

// ---- Strong Engine -------------------------------------------------------------------------------

/**
 * The parts of chess.js's internals the strong engine searches with. The public API turns every move into
 * SAN, which costs ~130 µs a move; these cost ~1 µs, which is the difference between depth 2 and depth 3.
 * `house-bots.test.ts` plays the engine, so a chess.js update that renames them fails CI, not a game.
 */
type RawMove = { from: number; to: number; piece: string; captured?: string; promotion?: string; flags: number };
interface RawChess {
  _moves(opts?: { legal?: boolean }): RawMove[];
  _makeMove(m: RawMove): void;
  _undoMove(): unknown;
  _isKingAttacked(color: string): boolean;
  _board: ({ type: string; color: string } | undefined)[];
  _turn: "w" | "b";
  _hash: bigint;
  _positionCount: Map<bigint, number>;
}

// Centipawns. The king's worth is never traded, so it scores only through its square.
const CP: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const WIN = 100_000;
const CAPTURE = 2; // chess.js move flag bits
const EP_CAPTURE = 8;

// Piece-square tables from white's side, a8 first (Michniewski's "Simplified Evaluation Function").
// Black reads them mirrored. They steer pieces to the centre, pawns forward and the king to safety.
const PST: Record<string, number[]> = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

/** Material plus square bonuses, from the side to move's point of view. chess.js's board is 0x88: rank 8 first. */
function evaluate(c: RawChess): number {
  let score = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = c._board[sq];
    if (!p) continue;
    const i = (sq >> 4) * 8 + (sq & 7);
    const v = CP[p.type] + PST[p.type][p.color === "w" ? i : 56 - (i & 56) + (i & 7)];
    score += p.color === "w" ? v : -v;
  }
  return c._turn === "w" ? score : -score;
}

/** Promotions first, then captures by most valuable victim / least valuable attacker, then the rest. */
const moveScore = (m: RawMove) =>
  (m.promotion ? 8000 + CP[m.promotion] : 0) + (m.flags & (CAPTURE | EP_CAPTURE) ? 1000 + 10 * CP[m.captured ?? "p"] - CP[m.piece] : 0);
const byScore = (moves: RawMove[]) => moves.sort((a, b) => moveScore(b) - moveScore(a));
const isCapture = (m: RawMove) => (m.flags & (CAPTURE | EP_CAPTURE)) !== 0 || !!m.promotion;

class OutOfTime extends Error {}

/**
 * Alpha-beta `depth` plies deep, then captures only until the position is quiet, so it doesn't stop counting
 * halfway through an exchange. A position already reached in the game scores as a draw, so it won't repeat
 * when it's ahead. Moves are pseudo-legal until played: one that leaves the king in check is skipped.
 */
function makeSearch(c: RawChess, deadline: number, nodeBudget: number) {
  let nodes = 0;
  const tick = () => {
    if (++nodes > nodeBudget || ((nodes & 1023) === 0 && Date.now() > deadline)) throw new OutOfTime();
  };

  function quiesce(alpha: number, beta: number, qdepth: number): number {
    tick();
    const standPat = evaluate(c);
    if (standPat >= beta || qdepth === 0) return standPat;
    if (standPat > alpha) alpha = standPat;
    const us = c._turn;
    for (const m of byScore(c._moves({ legal: false }).filter(isCapture))) {
      c._makeMove(m);
      if (c._isKingAttacked(us)) {
        c._undoMove();
        continue;
      }
      const score = -quiesce(-beta, -alpha, qdepth - 1);
      c._undoMove();
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(depth: number, alpha: number, beta: number, ply: number): number {
    tick();
    if (c._positionCount.has(c._hash)) return 0;
    if (depth === 0) return quiesce(alpha, beta, 4);
    const us = c._turn;
    let legal = 0;
    for (const m of byScore(c._moves({ legal: false }))) {
      c._makeMove(m);
      if (c._isKingAttacked(us)) {
        c._undoMove();
        continue;
      }
      legal++;
      const score = -negamax(depth - 1, -beta, -alpha, ply + 1);
      c._undoMove();
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    if (legal === 0) return c._isKingAttacked(us) ? -WIN + ply : 0; // mated sooner scores worse; else stalemate
    return alpha;
  }

  /** Best of `roots` (legal moves) at `depth`, searched in the order given. */
  return (roots: RawMove[], depth: number): RawMove => {
    let best = roots[0];
    let alpha = -Infinity;
    for (const m of roots) {
      c._makeMove(m);
      const score = -negamax(depth - 1, -Infinity, -alpha, 1);
      c._undoMove();
      if (score > alpha) [best, alpha] = [m, score];
    }
    return best;
  };
}

/** Longest the strong engine thinks, whatever the clock allows: house bots run on the server's thread. */
const STRONG_MAX_MS = 1500;
/** Positions it may look at per move. Bounds the work, so the same seed plays the same game on any machine. */
const STRONG_NODE_BUDGET = 60_000;
const squareName = (sq: number) => "abcdefgh"[sq & 7] + (8 - (sq >> 4));

/**
 * Strong Engine: iterative deepening to `maxDepth` plies with alpha-beta, captures searched first, a capture-only
 * extension at the leaves, material plus piece-square tables, and no repeating the game's positions when ahead.
 * Each move stops at a node budget, or at a quarter of the clock (1.5 s at most), keeping the last finished depth.
 * Root moves are shuffled first, so equal moves vary by seed.
 * ponytail: chess.js's generator caps this near depth 3; a bitboard move generator is the upgrade for more.
 */
export function createStrongEngine(rng: Rng, maxDepth = 3, nodeBudget = STRONG_NODE_BUDGET): ChessBot {
  return (state, config) => {
    // Replaying the game fills chess.js's position counts, which the search reads for repetitions.
    const chess = new Chess(state.startFen);
    for (const san of state.moveHistory) chess.move(san);
    if (chess.fen() !== state.fen) chess.load(state.fen); // a state without its history
    const c = chess as unknown as RawChess;
    const roots = c._moves();
    for (let i = roots.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [roots[i], roots[j]] = [roots[j], roots[i]];
    }
    let order = byScore(roots); // stable, so equal moves keep their shuffled order
    const search = makeSearch(c, Date.now() + Math.min(STRONG_MAX_MS, config.timeoutMs / 4), nodeBudget);
    let best = order[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const fen = chess.fen();
      try {
        best = search(order, depth);
      } catch (e) {
        if (!(e instanceof OutOfTime)) throw e;
        chess.load(fen); // stopped mid-line with moves still on the board; only `best` is used after this
        break;
      }
      order = [best, ...order.filter((m) => m !== best)];
    }
    return { from: squareName(best.from), to: squareName(best.to), ...(best.promotion ? { promotion: best.promotion as ChessMove["promotion"] } : {}) };
  };
}

export const HOUSE_BOTS = {
  "random-mover": { name: "Random Mover", create: (rng: Rng) => createRandomMover(rng) },
  "search-engine": { name: "Search Engine", create: (rng: Rng) => createSearchEngine(rng) },
  "strong-engine": { name: "Strong Engine", create: (rng: Rng) => createStrongEngine(rng) },
} as const;

export type HouseBotId = keyof typeof HOUSE_BOTS;
