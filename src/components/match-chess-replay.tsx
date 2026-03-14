'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Card } from '@/components/ui/card';
import type { ChessGameState } from '@/services';
import type { MatchState, MatchTurn } from '@/lib/match-runner';

interface MatchChessReplayProps {
  matchState: MatchState;
  playbackSpeed: number;
  isPaused: boolean;
  onLogEvent: (message: string) => void;
  onGameStateChange: (state: ChessGameState) => void;
  onPauseChange: (paused: boolean) => void;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Chess game component that replays match turns from MatchState
 */
export function MatchChessReplay({
  matchState,
  playbackSpeed,
  isPaused,
  onLogEvent,
  onGameStateChange,
}: MatchChessReplayProps) {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentFen, setCurrentFen] = useState(INITIAL_FEN);

  const turns = matchState.turns;
  const totalTurns = turns.length;

  // Convert chess board array to FEN position string
  const boardToFen = useCallback((board: string[][]): string => {
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece === null || piece === '') {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          // Convert piece notation (wP, bN) to FEN notation (P, n)
          const color = piece[0];
          const type = piece[1];
          fen += color === 'w' ? type.toUpperCase() : type.toLowerCase();
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (row < 7) {
        fen += '/';
      }
    }
    return fen + ' w KQkq - 0 1'; // Add basic FEN metadata
  }, []);

  // Auto-advance through turns based on playback speed
  useEffect(() => {
    if (isPaused || currentTurnIndex >= totalTurns) {
      return;
    }

    const baseDelay = 2000; // 2 seconds per turn at 1x speed
    const delay = baseDelay / playbackSpeed;

    const timer = setTimeout(() => {
      setCurrentTurnIndex(prev => Math.min(prev + 1, totalTurns));
    }, delay);

    return () => clearTimeout(timer);
  }, [currentTurnIndex, totalTurns, playbackSpeed, isPaused]);

  // Update FEN and log when turn changes
  useEffect(() => {
    if (currentTurnIndex === 0) {
      setCurrentFen(INITIAL_FEN);
      onLogEvent(`Match started: ${matchState.players[0].name} vs ${matchState.players[1].name}`);
    } else if (currentTurnIndex > 0 && currentTurnIndex <= turns.length) {
      const turn = turns[currentTurnIndex - 1];
      const state = turn.stateAfter as any;

      // Extract FEN from state (if available) or generate from board
      let fen = INITIAL_FEN;
      if (state.board) {
        fen = boardToFen(state.board);
      }
      setCurrentFen(fen);

      const player = matchState.players.find(p => p.id === turn.playerId);
      const playerName = player?.name || turn.playerId;

      if (turn.execution.error) {
        onLogEvent(`Turn ${turn.turnNumber}: ${playerName} ERROR - ${turn.execution.error.message}`);
      } else {
        const move = JSON.stringify(turn.execution.move);
        onLogEvent(`Turn ${turn.turnNumber}: ${playerName} played ${move} (${turn.execution.executionTimeMs}ms)`);
      }
    }
  }, [currentTurnIndex, turns, matchState, boardToFen, onLogEvent]);

  // Reset to beginning when match state changes
  useEffect(() => {
    setCurrentTurnIndex(0);
  }, [matchState.matchId]);

  return (
    <Card className="relative p-4">
      <div className="max-w-[600px] mx-auto">
        <Chessboard
          position={currentFen}
          arePiecesDraggable={false}
          boardOrientation="white"
        />
      </div>
      <div className="absolute bottom-6 left-6 bg-black/80 px-3 py-1 rounded border border-accent/30 text-xs font-mono">
        Turn {currentTurnIndex} / {totalTurns}
        {matchState.status === 'completed' && currentTurnIndex === totalTurns && (
          <span className="ml-2 text-accent">COMPLETED</span>
        )}
      </div>
    </Card>
  );
}
