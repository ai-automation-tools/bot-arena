import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Zap, Clock, MessageSquare } from 'lucide-react';

interface MatchResultsSummaryProps {
  winner: string;
  loser: string;
  winnerMetrics: {
    avgLatency: string;
    totalTokens: number;
    violations: number;
    strategy: string;
  };
  loserMetrics: {
    avgLatency: string;
    totalTokens: number;
    violations: number;
    strategy: string;
  };
  matchOutcome: string;
}

export function MatchResultsSummary({
  winner,
  loser,
  winnerMetrics,
  loserMetrics,
  matchOutcome,
}: MatchResultsSummaryProps) {
  return (
    <Card className="bg-gradient-to-br from-accent/20 to-primary/10 border-accent/50 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-accent">
          <Trophy className="w-6 h-6" />
          <span>Match Results</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Winner/Loser Display */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
            <div className="text-green-400 text-sm font-semibold mb-1">WINNER</div>
            <div className="text-2xl font-bold text-green-300">{winner}</div>
          </div>
          <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
            <div className="text-red-400 text-sm font-semibold mb-1">LOSER</div>
            <div className="text-2xl font-bold text-red-300">{loser}</div>
          </div>
        </div>

        {/* Match Outcome */}
        <div className="p-4 bg-card/50 border border-border rounded-lg">
          <div className="text-muted-foreground text-sm mb-2">Match Outcome</div>
          <p className="text-foreground font-mono text-sm">{matchOutcome}</p>
        </div>

        {/* Stats Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Winner Stats */}
          <div className="space-y-3">
            <div className="text-green-400 font-semibold mb-3">{winner} — Stats</div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Latency:</span>
              <span className="text-foreground font-mono">{winnerMetrics.avgLatency}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Tokens:</span>
              <span className="text-foreground font-mono">{winnerMetrics.totalTokens.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Violations:</span>
              <span className={`font-mono ${winnerMetrics.violations === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {winnerMetrics.violations}
              </span>
            </div>

            <div className="mt-3 p-3 bg-card/30 border border-border/50 rounded">
              <div className="text-xs text-muted-foreground mb-1">Strategy</div>
              <div className="text-sm font-mono text-foreground/90">{winnerMetrics.strategy}</div>
            </div>
          </div>

          {/* Loser Stats */}
          <div className="space-y-3">
            <div className="text-red-400 font-semibold mb-3">{loser} — Stats</div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Latency:</span>
              <span className="text-foreground font-mono">{loserMetrics.avgLatency}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Tokens:</span>
              <span className="text-foreground font-mono">{loserMetrics.totalTokens.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Violations:</span>
              <span className={`font-mono ${loserMetrics.violations === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {loserMetrics.violations}
              </span>
            </div>

            <div className="mt-3 p-3 bg-card/30 border border-border/50 rounded">
              <div className="text-xs text-muted-foreground mb-1">Strategy</div>
              <div className="text-sm font-mono text-foreground/90">{loserMetrics.strategy}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
