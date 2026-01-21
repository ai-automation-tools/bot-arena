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
}

export function InteractiveChessGame({
  isSpectator = false,
  onLogEvent,
  onGameStateChange
}: InteractiveChessGameProps) {
  const [gameState, setGameState] = useState<'IDLE' | 'MODE_SELECT' | 'HOSTING' | 'JOINING' | 'ACTIVE' | 'SPECTATING'>('IDLE');
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  // Chess state
  const [chessEngine, setChessEngine] = useState<ChessEngine | null>(null);
  const [chessState, setChessState] = useState<ChessGameState | null>(null);
  const [gameMode, setGameMode] = useState<ChessGameMode>('pvp');
  const [aiLevel, setAiLevel] = useState<AILevel>('medium');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isAiThinking, setIsAiThinking] = useState(false);

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

  useEffect(() => {
    if (isSpectator) {
      addLog('SPECTATOR_MODE: ENABLED');
      addLog('CONNECTING TO LIVE FEED...');
      setGameState('SPECTATING');
      startChessGame();
    }
  }, [isSpectator, startChessGame, addLog]);

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
    if ((gameMode === 'llm_vs_llm' || gameState === 'SPECTATING') && chessState && !chessState.isGameOver) {
      const timeout = setTimeout(makeAIMove, 2000);
      return () => clearTimeout(timeout);
    }
  }, [gameMode, gameState, chessState, makeAIMove]);

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

  const startHosting = () => {
    const code = Math.random().toString(16).substring(2, 8).toUpperCase();
    setInviteCode(code);
    setGameState('HOSTING');
    addLog(`GENERATED INVITE_CODE: ${code}`);
    addLog('LISTENING FOR PEER_AGENT...');
  };

  const joinGame = () => {
    if (inputCode.length === 6) {
      addLog(`CONNECTING TO SESSION: ${inputCode}`);
      addLog('HANDSHAKE SUCCESSFUL');
      startChessGame();
    }
  };

  const selectGameMode = (mode: ChessGameMode) => {
    setGameMode(mode);
    addLog(`MODE_SELECTED: ${mode.toUpperCase()}`);

    if (mode === 'pvp') {
      setGameState('IDLE');
    } else if (mode === 'vs_ai') {
      startChessGame();
    } else if (mode === 'llm_vs_llm') {
      startChessGame();
    }
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
        {/* Mode Selection */}
        {gameState === 'IDLE' && (
          <div className="text-center p-6 bg-black/60 border border-primary/50 backdrop-blur-md rounded-xl max-w-lg w-full">
            <h3 className="font-mono text-lg mb-6 text-primary">SELECT_GAME_MODE</h3>
            <div className="grid grid-cols-1 gap-3 mb-6">
              <Button
                onClick={() => selectGameMode('vs_ai')}
                className="bg-primary text-black hover:bg-white"
              >
                HUMAN vs STOCKFISH_AI
              </Button>
              <Button
                onClick={() => setGameState('MODE_SELECT')}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/20"
              >
                AGENT vs AGENT (MULTIPLAYER)
              </Button>
              <Button
                onClick={() => selectGameMode('llm_vs_llm')}
                variant="outline"
                className="border-accent text-accent hover:bg-accent/20"
              >
                LLM vs LLM (AUTO_PLAY)
              </Button>
            </div>

            {/* AI Level Selection */}
            <div className="border-t border-primary/30 pt-4">
              <p className="font-mono text-xs text-primary/70 mb-3">AI_DIFFICULTY:</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(AI_LEVELS) as AILevel[]).map((level) => (
                  <Button
                    key={level}
                    onClick={() => setAiLevel(level)}
                    variant={aiLevel === level ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs ${aiLevel === level ? 'bg-primary text-black' : 'border-primary/50 text-primary/70'}`}
                  >
                    {AI_LEVELS[level].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Selection for vs AI */}
            <div className="border-t border-primary/30 pt-4 mt-4">
              <p className="font-mono text-xs text-primary/70 mb-3">PLAY_AS:</p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setPlayerColor('white')}
                  variant={playerColor === 'white' ? 'default' : 'outline'}
                  className={playerColor === 'white' ? 'bg-white text-black' : 'border-white/50 text-white/70'}
                >
                  WHITE
                </Button>
                <Button
                  onClick={() => setPlayerColor('black')}
                  variant={playerColor === 'black' ? 'default' : 'outline'}
                  className={playerColor === 'black' ? 'bg-gray-800 text-white border border-white' : 'border-gray-500 text-gray-400'}
                >
                  BLACK
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Multiplayer Mode Selection */}
        {gameState === 'MODE_SELECT' && (
          <div className="text-center p-6 bg-black/40 border border-primary/50 backdrop-blur-md rounded-xl max-w-md w-full">
            <h3 className="font-mono text-lg mb-6 text-primary">ESTABLISH_SESSION</h3>
            <div className="flex flex-col gap-4">
              <Button onClick={startHosting} className="bg-primary text-black hover:bg-white">
                INITIALIZE_HOST_MODE
              </Button>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="ENTER_CODE"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="bg-black/50 border border-primary/50 p-2 text-primary outline-none font-mono flex-grow focus:border-primary rounded"
                />
                <Button onClick={joinGame} variant="outline" className="border-primary text-primary">
                  JOIN
                </Button>
              </div>
              <Button
                onClick={() => setGameState('IDLE')}
                variant="ghost"
                className="text-primary/50 hover:text-primary"
              >
                &lt; BACK
              </Button>
            </div>
          </div>
        )}

        {gameState === 'HOSTING' && (
          <div className="text-center">
            <div className="text-6xl font-mono text-accent mb-4 animate-pulse">{inviteCode}</div>
            <p className="opacity-70 mb-8">BROADCAST THIS CODE TO PEER AGENT</p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-4 h-4 bg-accent rounded-full animate-ping"></div>
              <span className="font-mono text-xs">WAITING_FOR_CONNECTION...</span>
            </div>
            <Button
              onClick={startChessGame}
              variant="ghost"
              className="mt-8 text-xs opacity-30 hover:opacity-100"
            >
              (DEBUG: BYPASS_WAIT)
            </Button>
          </div>
        )}

        {/* Active Chess Game */}
        {(gameState === 'ACTIVE' || gameState === 'SPECTATING') && chessState && (
          <div className="w-full flex flex-col items-center">
            {gameState === 'SPECTATING' && (
              <div className="bg-yellow-500 text-black px-4 py-1 font-mono text-xs font-bold animate-pulse mb-2 rounded">
                SPECTATOR_MODE // READ_ONLY
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
