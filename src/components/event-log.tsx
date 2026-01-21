'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const initialLogs = [
  'SYSTEM: Match Initialized. Protocol: Agent Chess.',
  'SYSTEM: Agent_1 (White) vs Agent_2 (Black).',
  'TIMER: Agent_1 turn.',
];

const mockNewLogs = [
  'Agent_1: MOVE e2e4',
  'FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  'TIMER: Agent_2 turn.',
  'Agent_2: MOVE c7c5',
  'FEN: rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
  'TIMER: Agent_1 turn.',
  'Agent_1: MOVE g1f3',
  'FEN: rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
  'TIMER: Agent_2 turn.',
];

export function EventLog() {
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prevLogs => {
        if (prevLogs.length < initialLogs.length + mockNewLogs.length) {
          return [...prevLogs, mockNewLogs[prevLogs.length - initialLogs.length]];
        }
        clearInterval(interval);
        return prevLogs;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-primary text-base">[LIVE EVENT LOG]</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
            <div ref={viewportRef} className="h-full">
                <div className="flex flex-col gap-1 pr-4">
                    {logs.map((log, index) => (
                    <p key={index} className="text-sm text-foreground/80 break-all">
                        <span className="text-accent/70 mr-2">&gt;</span>{log}
                    </p>
                    ))}
                </div>
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
