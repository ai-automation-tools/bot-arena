import { Chess, Square, Move } from 'chess';

export type GameMode = 'pvp' | 'vs_ai' | 'llm_vs_llm' | 'llm_vs_ai';
export type PlayerColor = 'white' | 'black';
export type GameStatus = 'idle' | 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';

export interface ChessGameState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  moveHistory: string[];
  capturedPieces: { white: string[]; black: string[] };
  lastMove: { from: Square; to: Square } | null;
  status: GameStatus;
}

export interface MoveResult {
  success: boolean;
  move?: Move;
  error?: string;
  gameState: ChessGameState;
}

export class ChessEngine {
  private chess: Chess;
  private moveHistory: string[] = [];
  private capturedPieces: { white: string[]; black: string[] } = { white: [], black: [] };
  private lastMove: { from: Square; to: Square } | null = null;
  private status: GameStatus = 'idle';

  constructor(fen?: string) {
    this.chess = new Chess(fen);
    if (fen) {
      this.status = 'playing';
    }
  }

  getState(): ChessGameState {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      moveHistory: [...this.moveHistory],
      capturedPieces: {
        white: [...this.capturedPieces.white],
        black: [...this.capturedPieces.black],
      },
      lastMove: this.lastMove,
      status: this.status,
    };
  }

  startNewGame(): ChessGameState {
    this.chess.reset();
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.lastMove = null;
    this.status = 'playing';
    return this.getState();
  }

  makeMove(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): MoveResult {
    if (this.status !== 'playing') {
      return {
        success: false,
        error: 'Game is not in playing state',
        gameState: this.getState(),
      };
    }

    try {
      const move = this.chess.move({ from, to, promotion: promotion || 'q' });

      if (move) {
        this.moveHistory.push(move.san);
        this.lastMove = { from, to };

        // Track captured pieces
        if (move.captured) {
          const pieceSymbol = this.getPieceSymbol(move.captured, move.color === 'w' ? 'b' : 'w');
          if (move.color === 'w') {
            this.capturedPieces.white.push(pieceSymbol);
          } else {
            this.capturedPieces.black.push(pieceSymbol);
          }
        }

        // Update game status
        if (this.chess.isCheckmate()) {
          this.status = 'checkmate';
        } else if (this.chess.isStalemate()) {
          this.status = 'stalemate';
        } else if (this.chess.isDraw()) {
          this.status = 'draw';
        }

        return {
          success: true,
          move,
          gameState: this.getState(),
        };
      }

      return {
        success: false,
        error: 'Invalid move',
        gameState: this.getState(),
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        gameState: this.getState(),
      };
    }
  }

  // Make move using algebraic notation (for LLM moves)
  makeMoveFromSan(san: string): MoveResult {
    if (this.status !== 'playing') {
      return {
        success: false,
        error: 'Game is not in playing state',
        gameState: this.getState(),
      };
    }

    try {
      const move = this.chess.move(san);

      if (move) {
        this.moveHistory.push(move.san);
        this.lastMove = { from: move.from, to: move.to };

        // Track captured pieces
        if (move.captured) {
          const pieceSymbol = this.getPieceSymbol(move.captured, move.color === 'w' ? 'b' : 'w');
          if (move.color === 'w') {
            this.capturedPieces.white.push(pieceSymbol);
          } else {
            this.capturedPieces.black.push(pieceSymbol);
          }
        }

        // Update game status
        if (this.chess.isCheckmate()) {
          this.status = 'checkmate';
        } else if (this.chess.isStalemate()) {
          this.status = 'stalemate';
        } else if (this.chess.isDraw()) {
          this.status = 'draw';
        }

        return {
          success: true,
          move,
          gameState: this.getState(),
        };
      }

      return {
        success: false,
        error: 'Invalid move notation',
        gameState: this.getState(),
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        gameState: this.getState(),
      };
    }
  }

  getLegalMoves(): string[] {
    return this.chess.moves();
  }

  getLegalMovesVerbose(): Move[] {
    return this.chess.moves({ verbose: true });
  }

  isLegalMove(from: Square, to: Square): boolean {
    const moves = this.chess.moves({ verbose: true });
    return moves.some((m) => m.from === from && m.to === to);
  }

  resign(color: 'w' | 'b'): ChessGameState {
    this.status = 'resigned';
    return this.getState();
  }

  getRandomMove(): Move | null {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  getPgn(): string {
    return this.chess.pgn();
  }

  loadPgn(pgn: string): boolean {
    try {
      this.chess.loadPgn(pgn);
      this.status = this.chess.isGameOver() ? 'checkmate' : 'playing';
      return true;
    } catch {
      return false;
    }
  }

  private getPieceSymbol(piece: string, color: 'w' | 'b'): string {
    const symbols: Record<string, { w: string; b: string }> = {
      p: { w: '\u2659', b: '\u265F' },
      n: { w: '\u2658', b: '\u265E' },
      b: { w: '\u2657', b: '\u265D' },
      r: { w: '\u2656', b: '\u265C' },
      q: { w: '\u2655', b: '\u265B' },
      k: { w: '\u2654', b: '\u265A' },
    };
    return symbols[piece]?.[color] || piece;
  }
}

export default ChessEngine;
