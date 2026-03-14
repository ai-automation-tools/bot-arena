'use client';

import { useState, useCallback, useEffect } from 'react';
import { InteractiveChessGame } from '@/game-templates/classic-game/chess-game';
import { EventLog } from '@/components/event-log';
import { MetricsDisplay } from '@/components/metrics-display';
import { AiShoutcasterLive } from '@/components/ai-shoutcaster-live';
import { ReplayControls } from '@/components/replay-controls';
import { MatchChessReplay } from '@/components/match-chess-replay';
import { useMatchData } from '@/hooks/use-match-data';
import type { ChessGameState } from '@/services';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface SpectatorViewProps {
  protocolId: string;
  protocolTitle: string;
  matchId?: string | null;
}

export function SpectatorView({ protocolId, protocolTitle, matchId = null }: SpectatorViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // Fetch match data if matchId is provided
  const { matchState, matchResult, isLoading: isLoadingMatch, error: matchError } = useMatchData(matchId);

  const handleLogEvent = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-50), message]);
  }, []);

  const handleGameStateChange = useCallback((state: ChessGameState) => {
    setGameState(state);
    if (isLoading) {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
  }, []);

  const handlePauseChange = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  // Keyboard shortcuts for speed control
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const speedMap: Record<string, PlaybackSpeed> = {
        '1': 0.5,
        '2': 1,
        '3': 2,
        '4': 4,
      };

      if (speedMap[e.key]) {
        setPlaybackSpeed(speedMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const isChessProtocol = protocolId === 'agent-chess' || protocolTitle.toLowerCase().includes('chess');

  // Determine if we should show match replay or demo mode
  const showMatchReplay = matchId && matchState && !matchError;
  const effectiveLoading = matchId ? isLoadingMatch : isLoading;

  return (
    <>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[300px] flex items-center justify-center">
          {matchError ? (
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load match: {matchError}
              </AlertDescription>
            </Alert>
          ) : effectiveLoading ? (
            <Skeleton className="w-full h-[300px]" />
          ) : showMatchReplay && isChessProtocol ? (
            <MatchChessReplay
              matchState={matchState}
              playbackSpeed={playbackSpeed}
              isPaused={isPaused}
              onLogEvent={handleLogEvent}
              onGameStateChange={handleGameStateChange}
              onPauseChange={handlePauseChange}
            />
          ) : isChessProtocol ? (
            <InteractiveChessGame
              isSpectator={true}
              onLogEvent={handleLogEvent}
              onGameStateChange={handleGameStateChange}
              playbackSpeed={playbackSpeed}
              onPauseChange={handlePauseChange}
            />
          ) : (
            <InteractiveChessGame
              isSpectator={true}
              onLogEvent={handleLogEvent}
              onGameStateChange={handleGameStateChange}
              playbackSpeed={playbackSpeed}
              onPauseChange={handlePauseChange}
            />
          )}
        </div>
        <div className="flex flex-col gap-6">
          {effectiveLoading ? (
            <>
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </>
          ) : (
            <>
              <ReplayControls
                isPaused={isPaused}
                playbackSpeed={playbackSpeed}
                onTogglePause={handleTogglePause}
                onChangeSpeed={handleSpeedChange}
              />
              <MetricsDisplay gameState={gameState} />
              <EventLog logs={logs} />
            </>
          )}
        </div>
      </main>
      <footer className="w-full">
        {effectiveLoading ? (
          <Skeleton className="h-[150px] w-full mt-6" />
        ) : (
          <AiShoutcasterLive gameState={gameState} logs={logs} />
        )}
      </footer>
    </>
  );
}

export default SpectatorView;
