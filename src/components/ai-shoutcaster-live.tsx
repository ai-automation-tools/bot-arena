'use client';

import { aiShoutcaster } from '@/ai/flows/ai-shoutcaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { AiShoutcasterInput } from '@/ai/flows/ai-shoutcaster';
import type { ChessGameState } from '@/services';

type CommentaryMode = AiShoutcasterInput['commentaryMode'];

interface AiShoutcasterLiveProps {
  gameState?: ChessGameState | null;
  logs?: string[];
}

export function AiShoutcasterLive({ gameState, logs }: AiShoutcasterLiveProps) {
  const [commentary, setCommentary] = useState('Awaiting match start...');
  const [mode, setMode] = useState<CommentaryMode>('analyst');
  const [isLoading, setIsLoading] = useState(false);
  const lastFenRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchCommentary = async () => {
      // Only fetch if game state has changed
      if (gameState?.fen === lastFenRef.current) return;
      lastFenRef.current = gameState?.fen ?? null;

      if (!gameState) {
        setCommentary('/// WAITING FOR GAME TO START... ///');
        return;
      }

      setIsLoading(true);
      try {
        const recentLogs = logs?.slice(-10).join('\n') ?? 'No recent events';
        const turnInfo = gameState.turn === 'w' ? 'White to move' : 'Black to move';
        const checkInfo = gameState.isCheck ? ' - CHECK!' : '';
        const mateInfo = gameState.isCheckmate ? ' - CHECKMATE!' : '';

        const result = await aiShoutcaster({
          gameState: `FEN: ${gameState.fen}\n${turnInfo}${checkInfo}${mateInfo}\nMoves played: ${gameState.moveHistory.length}`,
          eventLog: recentLogs,
          commentaryMode: mode,
        });
        setCommentary(result.commentary);
      } catch (error) {
        console.error("AI Shoutcaster Error:", error);
        // Provide fallback commentary based on game state
        if (gameState.isCheckmate) {
          setCommentary(`/// CHECKMATE! ${gameState.turn === 'w' ? 'BLACK' : 'WHITE'} WINS THE MATCH! An incredible display of silicon supremacy! ///`);
        } else if (gameState.isCheck) {
          setCommentary(`/// CHECK! The pressure mounts as ${gameState.turn === 'w' ? 'White' : 'Black'} must respond to the threat! ///`);
        } else {
          setCommentary(`/// LIVE: Move ${gameState.moveHistory.length} completed. ${gameState.turn === 'w' ? 'White' : 'Black'} contemplating next strategy... ///`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommentary();

    // Periodically refresh commentary
    const interval = setInterval(fetchCommentary, 15000);
    return () => clearInterval(interval);
  }, [gameState, logs, mode]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-primary text-base">[AI SHOUTCASTER - LIVE]</CardTitle>
        <RadioGroup
          defaultValue="analyst"
          onValueChange={(value: CommentaryMode) => setMode(value)}
          className="flex items-center space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="analyst" id="r1" />
            <Label htmlFor="r1" className="text-xs">Analyst</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hype" id="r2" />
            <Label htmlFor="r2" className="text-xs">Hype</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="debug" id="r3" />
            <Label htmlFor="r3" className="text-xs">Debug</Label>
          </div>
        </RadioGroup>
      </CardHeader>
      <CardContent className="h-36 overflow-y-auto">
        <p className={`whitespace-pre-wrap text-sm ${isLoading ? 'animate-pulse' : ''} text-foreground/90`}>
          {isLoading && !commentary ? 'Generating commentary...' : commentary}
        </p>
      </CardContent>
    </Card>
  );
}

export default AiShoutcasterLive;
