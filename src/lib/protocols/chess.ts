import { ProtocolDefinition, MatchResult, MatchTurn } from "../match-runner";

/**
 * Chess Protocol for BotArena
 *
 * Implements standard chess rules with algebraic notation.
 */

// Chess-specific types
export interface ChessState {
  board: string[][]; // 8x8 board, pieces as strings ("wP", "bK", etc.)
  currentPlayer: "white" | "black";
  moveHistory: string[];
  castlingRights: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  };
  enPassantTarget: string | null; // e.g., "e3"
  halfmoveClock: number; // For 50-move rule
  fullmoveNumber: number;
}

export interface ChessMove {
  from: string; // e.g., "e2"
  to: string; // e.g., "e4"
  promotion?: "Q" | "R" | "B" | "N"; // Optional promotion piece
}

export interface ChessConfig {
  timeControl?: {
    initial: number; // seconds
    increment: number; // seconds per move
  };
  variant?: "standard" | "chess960"; // Default: standard
}

// Initial chess board setup
const INITIAL_BOARD: string[][] = [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
  ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
  ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
];

/**
 * Chess Protocol Implementation
 */
export const chessProtocol: ProtocolDefinition<ChessState, ChessMove> = {
  id: "chess",
  name: "Chess",

  /**
   * Initialize chess game state
   */
  initializeState(config?: ChessConfig): ChessState {
    return {
      board: INITIAL_BOARD.map((row) => [...row]), // Deep copy
      currentPlayer: "white",
      moveHistory: [],
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true,
      },
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
    };
  },

  /**
   * Validate a chess move
   */
  validateMove(
    state: ChessState,
    move: ChessMove,
    playerId: string
  ): { legal: boolean; messages: string[]; violations: string[] } {
    const messages: string[] = [];
    const violations: string[] = [];

    if (!move) {
      return {
        legal: false,
        messages: ["Move is null or undefined"],
        violations: ["NULL_MOVE"],
      };
    }

    const { from, to } = move;

    // Basic validation: algebraic notation format
    if (!isValidSquare(from) || !isValidSquare(to)) {
      return {
        legal: false,
        messages: [`Invalid square notation: ${from} to ${to}`],
        violations: ["INVALID_NOTATION"],
      };
    }

    const fromCoords = algebraicToCoords(from);
    const toCoords = algebraicToCoords(to);

    if (!fromCoords || !toCoords) {
      return {
        legal: false,
        messages: ["Failed to parse square coordinates"],
        violations: ["PARSE_ERROR"],
      };
    }

    const piece = state.board[fromCoords.row][fromCoords.col];

    // Check piece exists
    if (!piece) {
      return {
        legal: false,
        messages: [`No piece at ${from}`],
        violations: ["NO_PIECE"],
      };
    }

    // Check piece belongs to current player
    const pieceColor = piece[0] === "w" ? "white" : "black";
    if (pieceColor !== state.currentPlayer) {
      return {
        legal: false,
        messages: [`Cannot move opponent's piece`],
        violations: ["WRONG_PLAYER"],
      };
    }

    // TODO: Implement full chess move validation
    // For MVP, we'll allow any move from valid piece to valid square
    // This should be enhanced with proper chess rules (piece movement, check, etc.)

    return {
      legal: true,
      messages: [],
      violations: [],
    };
  },

  /**
   * Apply a chess move to the game state
   */
  applyMove(state: ChessState, move: ChessMove, playerId: string): ChessState {
    const fromCoords = algebraicToCoords(move.from)!;
    const toCoords = algebraicToCoords(move.to)!;

    const newBoard = state.board.map((row) => [...row]);
    const piece = newBoard[fromCoords.row][fromCoords.col];

    // Move piece
    newBoard[toCoords.row][toCoords.col] = piece;
    newBoard[fromCoords.row][fromCoords.col] = "";

    // Handle promotion
    if (move.promotion && (toCoords.row === 0 || toCoords.row === 7)) {
      const color = piece[0];
      newBoard[toCoords.row][toCoords.col] = color + move.promotion;
    }

    // Update move history
    const moveNotation = `${move.from}${move.to}${move.promotion || ""}`;
    const newMoveHistory = [...state.moveHistory, moveNotation];

    // Toggle current player
    const newCurrentPlayer = state.currentPlayer === "white" ? "black" : "white";

    // Increment fullmove number after black's move
    const newFullmoveNumber =
      state.currentPlayer === "black"
        ? state.fullmoveNumber + 1
        : state.fullmoveNumber;

    return {
      ...state,
      board: newBoard,
      currentPlayer: newCurrentPlayer,
      moveHistory: newMoveHistory,
      fullmoveNumber: newFullmoveNumber,
      enPassantTarget: null, // TODO: Calculate en passant
      halfmoveClock: piece[1] === "P" ? 0 : state.halfmoveClock + 1, // Reset on pawn move
    };
  },

  /**
   * Check if the match is complete
   */
  checkCompletion(
    state: ChessState,
    turns: MatchTurn<ChessMove>[]
  ): { complete: boolean; result?: MatchResult } {
    // TODO: Implement proper checkmate/stalemate detection
    // For MVP, check for:
    // - 50-move rule (draw)
    // - Threefold repetition (not implemented yet)
    // - King capture (simplified win condition for MVP)

    // Check 50-move rule
    if (state.halfmoveClock >= 100) {
      const result: MatchResult = {
        outcome: "draw",
        reason: "50-move rule",
        scores: { white: 0.5, black: 0.5 },
        statistics: {
          totalTurns: turns.length,
          durationMs: 0,
          players: {},
        },
      };
      return { complete: true, result };
    }

    // Check if either king is missing (simplified win condition)
    let whiteKingExists = false;
    let blackKingExists = false;

    for (const row of state.board) {
      for (const piece of row) {
        if (piece === "wK") whiteKingExists = true;
        if (piece === "bK") blackKingExists = true;
      }
    }

    if (!whiteKingExists) {
      const result: MatchResult = {
        outcome: "win",
        winnerId: "black",
        loserId: "white",
        reason: "King captured",
        scores: { white: 0, black: 1 },
        statistics: {
          totalTurns: turns.length,
          durationMs: 0,
          players: {},
        },
      };
      return { complete: true, result };
    }

    if (!blackKingExists) {
      const result: MatchResult = {
        outcome: "win",
        winnerId: "white",
        loserId: "black",
        reason: "King captured",
        scores: { white: 1, black: 0 },
        statistics: {
          totalTurns: turns.length,
          durationMs: 0,
          players: {},
        },
      };
      return { complete: true, result };
    }

    // Match continues
    return { complete: false };
  },

  /**
   * Get the next player ID based on current state
   */
  getNextPlayer(state: ChessState, currentPlayerId: string): string {
    // Chess alternates between white and black
    return currentPlayerId === "white" ? "black" : "white";
  },

  /**
   * Serialize state for bot execution (may hide information)
   * For chess, we can show the full state since it's fully observable
   */
  serializeStateForBot(state: ChessState, playerId: string): unknown {
    // For now, return the full state
    // In future, could add perspective transformations or hidden information
    return state;
  },
};

/**
 * Helper: Check if a string is a valid chess square (a1-h8)
 */
function isValidSquare(square: string): boolean {
  return /^[a-h][1-8]$/.test(square);
}

/**
 * Helper: Convert algebraic notation to board coordinates
 */
function algebraicToCoords(
  square: string
): { row: number; col: number } | null {
  if (!isValidSquare(square)) return null;

  const file = square.charCodeAt(0) - "a".charCodeAt(0); // 0-7
  const rank = 8 - parseInt(square[1], 10); // 0-7 (inverted: 8 = row 0)

  return { row: rank, col: file };
}

/**
 * Helper: Convert board coordinates to algebraic notation
 */
function coordsToAlgebraic(row: number, col: number): string {
  const file = String.fromCharCode("a".charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
}
