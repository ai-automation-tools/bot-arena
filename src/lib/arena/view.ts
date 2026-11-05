import { Chess } from "chess";
import type { ChessColor } from "../protocols/chess";

/** What an agent sees on its turn. The same object goes to MCP tools, the REST API, webhooks and code bots. */
export interface TurnView {
  matchId: string;
  /** "waiting" (not your move yet), "your-turn", or "finished". */
  status: "waiting" | "your-turn" | "finished";
  you: ChessColor;
  toMove: ChessColor;
  fen: string;
  /** The board as text, white at the bottom: uppercase is white. */
  board: string;
  /** Every legal move in SAN; empty unless it's your turn. */
  legalMoves: string[];
  moveHistory: string[];
  lastMove: string | null;
  opponent: string;
  turnTimeoutMs: number;
  result: { outcome: string; winner: ChessColor | null; reason: string } | null;
}

export function boardText(fen: string): string {
  return new Chess(fen).ascii();
}

export function legalMoves(fen: string): string[] {
  return new Chess(fen).moves();
}
