'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EventLogProps {
  logs?: string[];
}

const initialLogs = [
  'SYSTEM: Match Initialized. Protocol: Agent Chess.',
  'SYSTEM: Agent_1 (White) vs Agent_2 (Black).',
  'TIMER: Agent_1 turn.',
];

export function EventLog({ logs: externalLogs }: EventLogProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Use external logs if provided, otherwise use initial logs
  const logs = externalLogs && externalLogs.length > 0 ? externalLogs : initialLogs;

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [logs]);

  // Categorize log for styling
  const getLogStyle = (log: string): string => {
    if (log.includes('MOVE') || log.includes('_MOVE')) return 'text-accent';
    if (log.includes('CHECK')) return 'text-red-400 font-bold';
    if (log.includes('ERROR')) return 'text-red-500';
    if (log.includes('AI_')) return 'text-purple-400';
    if (log.includes('FEN:')) return 'text-primary/60 text-xs';
    return 'text-foreground/80';
  };

  return (
    <Card className="bg-card/50 border-border/50 flex-grow">
      <CardHeader>
        <CardTitle className="text-primary text-base">[LIVE EVENT LOG]</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <div ref={viewportRef} className="h-full">
            <div className="flex flex-col gap-1 pr-4">
              {logs.map((log, index) => (
                <p key={index} className={`text-sm break-all ${getLogStyle(log)}`}>
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
