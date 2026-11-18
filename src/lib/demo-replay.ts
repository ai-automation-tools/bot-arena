import type { DemoMatch } from "./demo-match";
import { playTttDemo } from "./protocols/tictactoe";
import { playC4Demo } from "./protocols/connect4";
import type { ReplayMatch } from "./replay";
import engineVsRandom from "@/data/demo-matches/engine-vs-random.json";
import randomVsEngine from "@/data/demo-matches/random-vs-engine.json";
import engineVsEngine from "@/data/demo-matches/engine-vs-engine.json";

// The replay helpers live in replay.ts (the browser needs them); re-exported for the server pages and tests.
export { replayPositions, resultText, GAME_NAMES, type ReplayMatch } from "./replay";

const fromChessFixture = (m: DemoMatch): ReplayMatch => ({
  id: m.id,
  game: "chess",
  players: { white: m.white, black: m.black },
  startPosition: m.startFen,
  moves: m.moves,
  result: m.result,
  seed: m.seed,
  finalFen: m.finalFen,
});

/** The demo games, in the order the lobby lists them. The tic-tac-toe and Connect Four ones are played at build time. */
export const DEMO_REPLAYS: ReplayMatch[] = [
  ...([engineVsRandom, randomVsEngine, engineVsEngine] as DemoMatch[]).map(fromChessFixture),
  playTttDemo("ttt-minimax-vs-random", 7, "search-engine", "random-mover"),
  playTttDemo("ttt-random-vs-minimax", 11, "random-mover", "search-engine"),
  playTttDemo("ttt-minimax-vs-minimax", 3, "search-engine", "search-engine"),
  playC4Demo("c4-deep-vs-minimax", 4, "strong-engine", "search-engine"),
  playC4Demo("c4-minimax-vs-random", 2, "search-engine", "random-mover"),
];

export function getDemoReplay(id: string): ReplayMatch | undefined {
  return DEMO_REPLAYS.find((m) => m.id === id);
}
