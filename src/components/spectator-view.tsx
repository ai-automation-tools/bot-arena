'use client';

import { useState, useCallback, useEffect } from 'react';
import { InteractiveChessGame } from '@/game-templates/classic-game/chess-game';
import { EventLog } from '@/components/event-log';
import { MetricsDisplay } from '@/components/metrics-display';
import { AiShoutcasterLive } from '@/components/ai-shoutcaster-live';
import type { ChessGameState } from '@/services';
import { Skeleton } from '@/components/ui/skeleton';


interface SpectatorViewProps {
  protocolId: string;
  protocolTitle: string;
}

export function SpectatorView({ protocolId, protocolTitle }: SpectatorViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogEvent = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-50), message]);
  }, []);

  const handleGameStateChange = useCallback((state: ChessGameState) => {
    setGameState(state);
    if (isLoading) {
      setIsLoading(false);
    }
  }, [isLoading]);

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
            />
          ) : (
            <InteractiveChessGame
              isSpectator={true}
              onLogEvent={handleLogEvent}
              onGameStateChange={handleGameStateChange}
            />
          )}
        </div>
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </>
          ) : (
            <>
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
