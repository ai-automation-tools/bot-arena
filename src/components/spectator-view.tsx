'use client';

import { useState, useCallback, useEffect } from 'react';
import { InteractiveChessGame } from '@/game-templates/classic-game/chess-game';
import { EventLog } from '@/components/event-log';
import { MetricsDisplay } from '@/components/metrics-display';
import { AiShoutcasterLive } from '@/components/ai-shoutcaster-live';
import { ReplayControls } from '@/components/replay-controls';
import type { ChessGameState } from '@/services';
import { Skeleton } from '@/components/ui/skeleton';

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface SpectatorViewProps {
  protocolId: string;
  protocolTitle: string;
}

export function SpectatorView({ protocolId, protocolTitle }: SpectatorViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

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

  return (
    <>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[300px] flex items-center justify-center">
          {isLoading ? (
            <Skeleton className="w-full h-[300px]" />
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
          {isLoading ? (
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
        {isLoading ? (
          <Skeleton className="h-[150px] w-full mt-6" />
        ) : (
          <AiShoutcasterLive gameState={gameState} logs={logs} />
        )}
      </footer>
    </>
  );
}

export default SpectatorView;
