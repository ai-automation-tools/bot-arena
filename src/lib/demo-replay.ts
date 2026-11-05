import { Chess } from "chess";
import type { DemoMatch } from "./demo-match";
import type { ChessMove } from "./protocols/chess";
import engineVsRandom from "@/data/demo-matches/engine-vs-random.json";
import randomVsEngine from "@/data/demo-matches/random-vs-engine.json";
import engineVsEngine from "@/data/demo-matches/engine-vs-engine.json";

/** The committed demo matches, in the order the lobby lists them. */
export const DEMO_REPLAYS = [engineVsRandom, randomVsEngine, engineVsEngine] as DemoMatch[];

/** What the replay player needs: a demo fixture, a saved match, or one still being played. */
export interface ReplayMatch {
  id: string;
  white: { name: string };
  black: { name: string };
  startFen: string;
  moves: (ChessMove & { san: string })[];
  /** Absent while the game is still going. */
  result?: { winner?: "white" | "black" | null; reason: string } | null;
  seed?: number;
}

export function getDemoReplay(id: string): DemoMatch | undefined {
  return DEMO_REPLAYS.find((m) => m.id === id);
}

/**
 * Every position of a match: index 0 is the start, index n is the board after ply n.
 * Throws if a stored move is illegal, so a stale fixture fails loudly instead of drawing nonsense.
 */
export function replayFens(match: ReplayMatch): string[] {
  const game = new Chess(match.startFen);
  return [
    match.startFen,
    ...match.moves.map(({ from, to, promotion }) => {
      game.move({ from, to, promotion });
      return game.fen();
    }),
  ];
}
