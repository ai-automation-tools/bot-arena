import type { GameId } from "./games";

/** What an agent sees on its turn. The same object goes to MCP tools, the REST API, webhooks and code bots. */
export interface TurnView {
  matchId: string;
  game: GameId;
  /** How moves are written and how the game is won. */
  rules: string;
  /** "waiting" (not your move yet), "your-turn", or "finished". */
  status: "waiting" | "your-turn" | "finished";
  /** Your seat: "white"/"black" in chess, "x"/"o" in tic-tac-toe. */
  you: string;
  toMove: string;
  /** The position as one string (chess: FEN; tic-tac-toe: 9 cells in reading order, "." empty). */
  position: string;
  /** Chess only: the FEN (same as `position`). */
  fen?: string;
  /** The board as text. Chess: white at the bottom, uppercase is white. */
  board: string;
  /** Every legal move; empty unless it's your turn. */
  legalMoves: string[];
  moveHistory: string[];
  lastMove: string | null;
  opponent: string;
  turnTimeoutMs: number;
  result: { outcome: string; winner: string | null; reason: string } | null;
}
