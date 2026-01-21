'use client';

import { useState, useCallback } from 'react';
import { InteractiveChessGame } from '@/components/interactive-chess-game';
import { EventLog } from '@/components/event-log';
import { MetricsDisplay } from '@/components/metrics-display';
import { AiShoutcasterLive } from '@/components/ai-shoutcaster-live';
import type { ChessGameState } from '@/services';

interface SpectatorViewProps {
  protocolId: string;
  protocolTitle: string;
}

export function SpectatorView({ protocolId, protocolTitle }: SpectatorViewProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);

  const handleLogEvent = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-50), message]);
  }, []);

  const handleGameStateChange = useCallback((state: ChessGameState) => {
    setGameState(state);
  }, []);

  const isChessProtocol = protocolId === 'agent-chess' || protocolTitle.toLowerCase().includes('chess');

  return (
    <>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[300px]">
          {isChessProtocol ? (
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
          <MetricsDisplay gameState={gameState} />
          <EventLog logs={logs} />
        </div>
      </main>
      <footer className="w-full">
        <AiShoutcasterLive gameState={gameState} logs={logs} />
      </footer>
    </>
  );
}

export default SpectatorView;
