import { Chess } from "chess";
import type { DemoMatch } from "./demo-match";
import type { GameId, MoveRecord } from "./arena/games";
import { applyTttMove, createTttState, playTttDemo } from "./protocols/tictactoe";
import engineVsRandom from "@/data/demo-matches/engine-vs-random.json";
import randomVsEngine from "@/data/demo-matches/random-vs-engine.json";
import engineVsEngine from "@/data/demo-matches/engine-vs-engine.json";

/** What the replay player needs: a demo game, a saved match, or one still being played. */
export interface ReplayMatch {
  id: string;
  game: GameId;
  /** Keyed by seat, first mover first. */
  players: Record<string, { name: string }>;
  startPosition: string;
  moves: MoveRecord[];
  /** Absent while the game is still going. */
  result?: { winner?: string | null; reason: string } | null;
  seed?: number;
  /** Chess fixtures: the position the stored game ends on, checked by the tests. */
  finalFen?: string;
}

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

/** The demo games, in the order the lobby lists them. Tic-tac-toe ones are small enough to play on load. */
export const DEMO_REPLAYS: ReplayMatch[] = [
  ...([engineVsRandom, randomVsEngine, engineVsEngine] as DemoMatch[]).map(fromChessFixture),
  playTttDemo("ttt-minimax-vs-random", 7, "search-engine", "random-mover"),
  playTttDemo("ttt-random-vs-minimax", 11, "random-mover", "search-engine"),
  playTttDemo("ttt-minimax-vs-minimax", 3, "search-engine", "search-engine"),
];

export function getDemoReplay(id: string): ReplayMatch | undefined {
  return DEMO_REPLAYS.find((m) => m.id === id);
}

/**
 * Every position of a match: index 0 is the start, index n is the position after ply n.
 * Throws if a stored move is illegal, so a stale fixture fails loudly instead of drawing nonsense.
 */
export function replayPositions(match: ReplayMatch): string[] {
  if (match.game === "tictactoe") {
    let state = createTttState(match.startPosition);
    return [state.board, ...match.moves.map(({ san }) => (state = applyTttMove(state, san)).board)];
  }
  const game = new Chess(match.startPosition);
  return [
    match.startPosition,
    ...match.moves.map(({ from, to, promotion }) => {
      game.move({ from: from!, to: to!, promotion });
      return game.fen();
    }),
  ];
}

/** "Minimax wins by three in a row", "Draw by full board", or whose move it is. */
export function resultText(match: ReplayMatch): string {
  const seats = Object.keys(match.players);
  if (!match.result) return `${match.players[seats[match.moves.length % 2]].name} to move`;
  const winner = match.result.winner ? match.players[match.result.winner]?.name : null;
  if (winner) return `${winner} wins by ${match.result.reason}`;
  return `${match.result.reason === "resignation" ? "Ended" : "Draw"} by ${match.result.reason}`;
}
