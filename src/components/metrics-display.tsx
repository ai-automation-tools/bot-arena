'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ChessGameState } from '@/services';

interface MetricsDisplayProps {
  gameState?: ChessGameState | null;
}

function MetricItem({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-primary">{value} <span className="text-xs text-muted-foreground">{unit}</span></p>
    </div>
  );
}

export function MetricsDisplay({ gameState }: MetricsDisplayProps) {
  const whiteMoves = gameState?.moveHistory.filter((_, i) => i % 2 === 0).length ?? 0;
  const blackMoves = gameState?.moveHistory.filter((_, i) => i % 2 === 1).length ?? 0;
  const whiteCaptured = gameState?.capturedPieces.white.length ?? 0;
  const blackCaptured = gameState?.capturedPieces.black.length ?? 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-primary text-base">[AGENT METRICS]</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-accent mb-2">Agent_1 // STOCKFISH_WHITE</h3>
          <div className="space-y-1">
            <MetricItem label="Moves Made" value={whiteMoves} />
            <MetricItem label="Captures" value={whiteCaptured} />
            <MetricItem label="Violations" value="0" />
          </div>
        </div>
        <Separator className="bg-border/50"/>
        <div>
          <h3 className="font-semibold text-accent mb-2">Agent_2 // STOCKFISH_BLACK</h3>
          <div className="space-y-1">
            <MetricItem label="Moves Made" value={blackMoves} />
            <MetricItem label="Captures" value={blackCaptured} />
            <MetricItem label="Violations" value="0" />
          </div>
        </div>
        {gameState && (
          <>
            <Separator className="bg-border/50"/>
            <div className="text-xs text-muted-foreground">
              <p>Turn: {gameState.turn === 'w' ? 'WHITE' : 'BLACK'}</p>
              <p>Status: {gameState.status.toUpperCase()}</p>
              {gameState.isCheck && <p className="text-red-400">CHECK!</p>}
              {gameState.isCheckmate && <p className="text-yellow-400 font-bold">CHECKMATE!</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
