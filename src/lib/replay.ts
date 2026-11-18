import { Chess } from "chess";
import type { GameId, MoveRecord } from "./arena/games";
import { applyTttMove, createTttState } from "./protocols/tictactoe";
import { applyC4Move, createC4State } from "./protocols/connect4";
import { describeResult } from "./arena/result-text";

/**
 * Replaying a match in the browser: what the player needs and every position along the way. Kept apart from
 * `demo-replay.ts` so the client bundle doesn't play the demo games on load.
 */

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

/** Display names, for labels that don't need the whole game registry. */
export const GAME_NAMES: Record<GameId, string> = { chess: "Chess", tictactoe: "Tic-tac-toe", connect4: "Connect Four" };

/**
 * Every position of a match: index 0 is the start, index n is the position after ply n.
 * Throws if a stored move is illegal, so a stale fixture fails loudly instead of drawing nonsense.
 */
export function replayPositions(match: ReplayMatch): string[] {
  if (match.game === "tictactoe") {
    let state = createTttState(match.startPosition);
    return [state.board, ...match.moves.map(({ san }) => (state = applyTttMove(state, san)).board)];
  }
  if (match.game === "connect4") {
    let state = createC4State(match.startPosition);
    return [state.board, ...match.moves.map(({ san }) => (state = applyC4Move(state, san)).board)];
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
  return describeResult(match.result, (seat) => match.players[seat]?.name ?? seat);
}
