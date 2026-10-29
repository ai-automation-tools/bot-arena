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
  const [shownMatchId, setShownMatchId] = useState(matchState.matchId);

  // Reset to the beginning when a different match comes in (adjusting state during render).
  if (shownMatchId !== matchState.matchId) {
    setShownMatchId(matchState.matchId);
    setCurrentTurnIndex(0);
  }

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

  const shownBoard = currentTurnIndex > 0
    ? (turns[currentTurnIndex - 1]?.stateAfter as { board?: string[][] } | undefined)?.board
    : undefined;
  const currentFen = shownBoard ? boardToFen(shownBoard) : INITIAL_FEN;

  // Log when turn changes
  useEffect(() => {
    if (currentTurnIndex === 0) {
      onLogEvent(`Match started: ${matchState.players[0].name} vs ${matchState.players[1].name}`);
    } else if (currentTurnIndex > 0 && currentTurnIndex <= turns.length) {
      const turn = turns[currentTurnIndex - 1];
      const player = matchState.players.find(p => p.id === turn.playerId);
      const playerName = player?.name || turn.playerId;

      if (turn.execution.error) {
        onLogEvent(`Turn ${turn.turnNumber}: ${playerName} ERROR - ${turn.execution.error.message}`);
      } else {
        const move = JSON.stringify(turn.execution.move);
        onLogEvent(`Turn ${turn.turnNumber}: ${playerName} played ${move} (${turn.execution.executionTimeMs}ms)`);
      }
    }
  }, [currentTurnIndex, turns, matchState, onLogEvent]);

  return (
    <Card className="relative p-4">
      <div className="max-w-[600px] mx-auto">
        <Chessboard
          options={{
            position: currentFen,
            allowDragging: false,
            boardOrientation: 'white',
          }}
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
