import { Chess, type Move } from "chess";
import type { BotFunction } from "./match-runner";
import type { ChessMove, ChessState } from "./protocols/chess";

/**
 * The two house bots: this repo's own code, run at build time or in the browser, never fed a
 * user's bot. Both take a seeded random source so the same seed plays the same game.
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

export const HOUSE_BOTS = {
  "random-mover": { name: "Random Mover", create: (rng: Rng) => createRandomMover(rng) },
  "search-engine": { name: "Search Engine", create: (rng: Rng) => createSearchEngine(rng) },
} as const;

export type HouseBotId = keyof typeof HOUSE_BOTS;
