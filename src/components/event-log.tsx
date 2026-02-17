'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(true);

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-primary text-base">[LIVE EVENT LOG]</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="h-8 w-8 p-0"
          title={isVisible ? 'Hide event log' : 'Show event log'}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {isVisible && (
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
      )}
    </Card>
  );
}
