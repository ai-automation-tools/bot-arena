'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Square } from 'chess';
import { ChessEngine, ChessGameState, StockfishService, FallbackAI } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ChessGameMode = 'pvp' | 'vs_ai' | 'llm_vs_llm' | 'llm_vs_ai';
type AILevel = 'easy' | 'medium' | 'hard' | 'superhuman';

const AI_LEVELS: Record<AILevel, { skill: number; depth: number; moveTime: number; label: string }> = {
  easy: { skill: 3, depth: 5, moveTime: 500, label: 'EASY (ELO ~1000)' },
  medium: { skill: 10, depth: 10, moveTime: 1000, label: 'MEDIUM (ELO ~1800)' },
  hard: { skill: 15, depth: 15, moveTime: 2000, label: 'HARD (ELO ~2400)' },
  superhuman: { skill: 20, depth: 20, moveTime: 3000, label: 'SUPERHUMAN (ELO 3200+)' },
};

interface InteractiveChessGameProps {
  isSpectator?: boolean;
  onLogEvent?: (message: string) => void;
  onGameStateChange?: (state: ChessGameState) => void;
  gameMode?: ChessGameMode;
  aiLevel?: AILevel;
  playbackSpeed?: number;
  onPauseChange?: (isPaused: boolean) => void;
}

export function InteractiveChessGame({
  isSpectator = false,
  onLogEvent,
  onGameStateChange,
  gameMode: initialGameMode = 'vs_ai',
  aiLevel: initialAiLevel = 'medium',
  playbackSpeed = 1,
  onPauseChange,
}: InteractiveChessGameProps) {
  const [gameState, setGameState] = useState<'IDLE' | 'ACTIVE' | 'SPECTATING'>('ACTIVE');

  // Chess state
  // The first game starts at mount; startChessGame restarts it from event handlers.
  const [initialGame] = useState(() => {
    const engine = new ChessEngine();
    return { engine, state: engine.startNewGame() };
  });
  const [chessEngine, setChessEngine] = useState<ChessEngine | null>(initialGame.engine);
  const [chessState, setChessState] = useState<ChessGameState | null>(initialGame.state);
  const [gameMode, setGameMode] = useState<ChessGameMode>(initialGameMode);
  const [aiLevel, setAiLevel] = useState<AILevel>(initialAiLevel);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Services
  const stockfishRef = useRef<StockfishService | null>(null);
  const fallbackAIRef = useRef<FallbackAI>(new FallbackAI());
  const [stockfishReady, setStockfishReady] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const fullMessage = `[${timestamp}] ${message}`;
    onLogEvent?.(fullMessage);
  }, [onLogEvent]);

  // Initialize Stockfish
  useEffect(() => {
    if (gameMode === 'vs_ai' || gameMode === 'llm_vs_ai' || gameState === 'SPECTATING') {
      const initStockfish = async () => {
        const config = AI_LEVELS[aiLevel];
        stockfishRef.current = new StockfishService({
          skillLevel: config.skill as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20,
          depth: config.depth,
          moveTime: config.moveTime,
        });

        const ready = await stockfishRef.current.initialize();
        setStockfishReady(ready);

        if (ready) {
          addLog('STOCKFISH_ENGINE: INITIALIZED');
          addLog(`AI_LEVEL: ${config.label}`);
        } else {
          addLog('STOCKFISH_ENGINE: FALLBACK_MODE');
        }
      };

      initStockfish();

      return () => {
        stockfishRef.current?.destroy();
        stockfishRef.current = null;
      };
    }
  }, [gameMode, aiLevel, addLog, gameState]);

  // Initialize chess engine
  const startChessGame = useCallback(() => {
    const engine = new ChessEngine();
    const state = engine.startNewGame();
    setChessEngine(engine);
    setChessState(state);
    setGameState('ACTIVE');
    addLog('CHESS_ENGINE: INITIALIZED');
    addLog(`FEN: ${state.fen}`);
    addLog('GAME_START: WHITE_TO_MOVE');
    onGameStateChange?.(state);
  }, [addLog, onGameStateChange]);

  // Announce the game started at mount.
  useEffect(() => {
    if (isSpectator) {
      addLog('SPECTATOR_MODE: ENABLED');
      addLog('CONNECTING TO LIVE FEED...');
    }
    addLog('CHESS_ENGINE: INITIALIZED');
    addLog(`FEN: ${initialGame.state.fen}`);
    addLog('GAME_START: WHITE_TO_MOVE');
    onGameStateChange?.(initialGame.state);
  }, [isSpectator, initialGame, addLog, onGameStateChange]);

  // AI move logic
  const makeAIMove = useCallback(async () => {
    if (!chessEngine || !chessState || chessState.isGameOver) return;

    setIsAiThinking(true);
    addLog('AI_PROCESSING...');

    try {
      if (stockfishRef.current && stockfishReady) {
        const analysis = await stockfishRef.current.getBestMove(chessState.fen);
        if (analysis) {
          // Convert UCI move (e2e4) to algebraic
          const from = analysis.bestMove.substring(0, 2) as Square;
          const to = analysis.bestMove.substring(2, 4) as Square;
          const promotion = analysis.bestMove[4] as 'q' | 'r' | 'b' | 'n' | undefined;

          const result = chessEngine.makeMove(from, to, promotion);
          if (result.success) {
            setChessState(result.gameState);
            onGameStateChange?.(result.gameState);
            const evalStr = analysis.evaluation !== undefined
              ? `(EVAL: ${analysis.evaluation > 0 ? '+' : ''}${analysis.evaluation.toFixed(2)})`
              : '';
            addLog(`AI_MOVE: ${result.move?.san} ${evalStr}`);
            addLog(`FEN: ${result.gameState.fen}`);

            if (result.gameState.isCheckmate) {
              addLog(`CHECKMATE! ${result.gameState.turn === 'w' ? 'BLACK' : 'WHITE'} WINS`);
            } else if (result.gameState.isCheck) {
              addLog('CHECK!');
            } else if (result.gameState.isDraw) {
              addLog('GAME DRAWN');
            }
          }
        }
      } else {
        // Fallback AI
        const legalMoves = chessEngine.getLegalMoves();
        const bestMove = fallbackAIRef.current.getBestMove(legalMoves);

        if (bestMove) {
          const result = chessEngine.makeMoveFromSan(bestMove);
          if (result.success) {
            setChessState(result.gameState);
            onGameStateChange?.(result.gameState);
            addLog(`AI_MOVE: ${bestMove} (FALLBACK_MODE)`);
            addLog(`FEN: ${result.gameState.fen}`);
          }
        }
      }
    } catch (e) {
      addLog(`AI_ERROR: ${e}`);
    } finally {
      setIsAiThinking(false);
    }
  }, [chessEngine, chessState, stockfishReady, addLog, onGameStateChange]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (gameMode === 'vs_ai' && chessState && !chessState.isGameOver && !isAiThinking) {
      const isAiTurn = (playerColor === 'white' && chessState.turn === 'b') ||
                       (playerColor === 'black' && chessState.turn === 'w');

      if (isAiTurn) {
        const timeout = setTimeout(makeAIMove, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [gameMode, chessState, playerColor, isAiThinking, makeAIMove]);

  // LLM vs LLM auto-play
  useEffect(() => {
    if ((gameMode === 'llm_vs_llm' || gameState === 'SPECTATING') && chessState && !chessState.isGameOver && !isPaused) {
      const baseDelay = 2000;
      const adjustedDelay = baseDelay / playbackSpeed;
      const timeout = setTimeout(makeAIMove, adjustedDelay);
      return () => clearTimeout(timeout);
    }
  }, [gameMode, gameState, chessState, makeAIMove, isPaused, playbackSpeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (gameState === 'SPECTATING' || gameMode === 'llm_vs_llm') {
            setIsPaused(prev => {
              const newPaused = !prev;
              addLog(newPaused ? 'PLAYBACK_PAUSED' : 'PLAYBACK_RESUMED');
              onPauseChange?.(newPaused);
              return newPaused;
            });
          }
          break;

        case 'n':
          if (chessState?.isGameOver && chessEngine) {
            const newState = chessEngine.startNewGame();
            setChessState(newState);
            onGameStateChange?.(newState);
            addLog('NEW_GAME: INITIALIZED (KEYBOARD_SHORTCUT)');
            setIsPaused(false);
            onPauseChange?.(false);
          }
          break;

        case 'r':
          setGameState('IDLE');
          setChessEngine(null);
          setChessState(null);
          setIsPaused(false);
          onPauseChange?.(false);
          addLog('SESSION_RESET (KEYBOARD_SHORTCUT)');
          // Reinitialize if spectator
          if (isSpectator) {
            setTimeout(() => {
              startChessGame();
            }, 100);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, gameMode, chessState, chessEngine, onGameStateChange, addLog, isSpectator, startChessGame, onPauseChange]);

  // Handle piece drop (player move)
  const onDrop = (sourceSquare: Square, targetSquare: Square, piece: string): boolean => {
    if (!chessEngine || !chessState || chessState.isGameOver || isAiThinking) {
      return false;
    }

    // Check if it's player's turn in vs_ai mode
    if (gameMode === 'vs_ai') {
      const isPlayerTurn = (playerColor === 'white' && chessState.turn === 'w') ||
                           (playerColor === 'black' && chessState.turn === 'b');
      if (!isPlayerTurn) return false;
    }

    // Check for pawn promotion
    const isPawnPromotion = piece[1] === 'P' &&
      ((piece[0] === 'w' && targetSquare[1] === '8') ||
       (piece[0] === 'b' && targetSquare[1] === '1'));

    const result = chessEngine.makeMove(
      sourceSquare,
      targetSquare,
      isPawnPromotion ? 'q' : undefined
    );

    if (result.success) {
      setChessState(result.gameState);
      onGameStateChange?.(result.gameState);
      addLog(`PLAYER_MOVE: ${result.move?.san}`);
      addLog(`FEN: ${result.gameState.fen}`);

      if (result.gameState.isCheckmate) {
        addLog(`CHECKMATE! ${result.gameState.turn === 'w' ? 'BLACK' : 'WHITE'} WINS`);
      } else if (result.gameState.isCheck) {
        addLog('CHECK!');
      } else if (result.gameState.isDraw) {
        addLog('GAME DRAWN');
      }
      return true;
    }

    addLog(`INVALID_MOVE: ${sourceSquare}-${targetSquare}`);
    return false;
  };

  const getBoardOrientation = (): 'white' | 'black' => {
    if (gameMode === 'vs_ai') return playerColor;
    return 'white';
  };

  const getGameStatusText = (): string => {
    if (!chessState) return 'INITIALIZING...';
    if (chessState.isCheckmate) return `CHECKMATE - ${chessState.turn === 'w' ? 'BLACK' : 'WHITE'} WINS`;
    if (chessState.isStalemate) return 'STALEMATE - DRAW';
    if (chessState.isDraw) return 'DRAW';
    if (isAiThinking) return 'AI_COMPUTING...';
    return `${chessState.turn === 'w' ? 'WHITE' : 'BLACK'} TO MOVE${chessState.isCheck ? ' (CHECK!)' : ''}`;
  };

  return (
    <Card className="flex flex-col h-full bg-black/50 border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-accent text-sm">[//] PROTOCOL CANVAS: Agent Chess</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center p-4">
        
        {(gameState === 'ACTIVE' || gameState === 'SPECTATING') && chessState && (
          <div className="w-full flex flex-col items-center">
            {gameState === 'SPECTATING' && (
              <div className="flex flex-col gap-1 mb-2 w-full max-w-[400px]">
                <div className={`px-4 py-1 font-mono text-xs font-bold rounded ${
                  isPaused 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-yellow-500 text-black animate-pulse'
                }`}>
                  {isPaused ? 'PAUSED // SPACE_TO_RESUME' : 'SPECTATOR_MODE // READ_ONLY'}
                </div>
                <div className="text-xs text-primary/50 font-mono text-center">
                  [SPACE] Pause/Resume • [N] New Game • [R] Reset
                </div>
              </div>
            )}
            {(gameMode === 'llm_vs_llm' && gameState === 'ACTIVE') && (
              <div className="flex flex-col gap-1 mb-2 w-full max-w-[400px]">
                {isPaused && (
                  <div className="bg-red-500 text-white px-4 py-1 font-mono text-xs font-bold animate-pulse rounded text-center">
                    PAUSED // SPACE_TO_RESUME
                  </div>
                )}
                <div className="text-xs text-primary/50 font-mono text-center">
                  [SPACE] Pause/Resume • [N] New Game • [R] Reset
                </div>
              </div>
            )}

            {/* Game Status */}
            <div className="mb-2 font-mono text-sm text-primary">
              {getGameStatusText()}
            </div>

            {/* Chess Board */}
            <div className="w-full max-w-[400px] aspect-square">
              <Chessboard
                options={{
                  position: chessState.fen,
                  onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
                    // piece.pieceType is the piece string like "wP" for white pawn
                    return onDrop(sourceSquare as Square, targetSquare as Square, piece.pieceType);
                  },
                  boardOrientation: getBoardOrientation(),
                  allowDragging: gameState === 'ACTIVE' && !isAiThinking && !chessState.isGameOver,
                  boardStyle: {
                    borderRadius: '4px',
                    boxShadow: '0 0 20px rgba(125, 249, 255, 0.3)',
                  },
                  darkSquareStyle: { backgroundColor: '#1a1a2e' },
                  lightSquareStyle: { backgroundColor: '#16213e' },
                  dropSquareStyle: { boxShadow: 'inset 0 0 1px 4px rgba(125, 249, 255, 0.5)' },
                }}
              />
            </div>

            {/* Captured Pieces */}
            <div className="mt-4 flex justify-between w-full max-w-[400px] text-lg">
              <div className="flex gap-1">
                {chessState.capturedPieces.white.map((p, i) => (
                  <span key={i} className="text-white drop-shadow-sm">{p}</span>
                ))}
              </div>
              <div className="flex gap-1">
                {chessState.capturedPieces.black.map((p, i) => (
                  <span key={i} className="text-gray-400">{p}</span>
                ))}
              </div>
            </div>

            {/* Move History */}
            <div className="mt-2 font-mono text-xs text-primary/70 max-w-[400px] w-full">
              MOVES: {chessState.moveHistory.slice(-10).join(' ')}
            </div>

            {/* New Game Button */}
            {chessState.isGameOver && (
              <Button
                onClick={() => {
                  if (chessEngine) {
                    const newState = chessEngine.startNewGame();
                    setChessState(newState);
                    onGameStateChange?.(newState);
                    addLog('NEW_GAME: INITIALIZED');
                  }
                }}
                className="mt-4 bg-accent text-black font-bold"
              >
                NEW_GAME
              </Button>
            )}

            {/* Reset Button */}
            <Button
              onClick={() => {
                setGameState('IDLE');
                setChessEngine(null);
                setChessState(null);
                addLog('SESSION_RESET');
              }}
              variant="outline"
              className="mt-2 border-primary text-primary"
            >
              HARD_RESET
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InteractiveChessGame;
