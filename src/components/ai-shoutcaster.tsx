'use client';

import { aiShoutcaster } from '@/ai/flows/ai-shoutcaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { AiShoutcasterInput } from '@/ai/flows/ai-shoutcaster';

type CommentaryMode = AiShoutcasterInput['commentaryMode'];

export function AiShoutcaster() {
  const [commentary, setCommentary] = useState('Awaiting match start...');
  const [mode, setMode] = useState<CommentaryMode>('analyst');
  const [isLoading, setIsLoading] = useState(false);
  const eventCounter = useRef(0);
  
  const events = [
      "White's e4 is a classic, solid opening.",
      "Black responds with the Sicilian Defense, a sharp and combative choice.",
      "White develops the knight, preparing to control the center."
  ];

  useEffect(() => {
    const fetchCommentary = async () => {
      setIsLoading(true);
      try {
        const result = await aiShoutcaster({
          gameState: 'FEN: rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          eventLog: `e4, c5, Nf3. Current event: ${events[eventCounter.current % events.length]}`,
          commentaryMode: mode,
        });
        setCommentary(result.commentary);
        eventCounter.current += 1;
      } catch (error) {
        console.error("AI Shoutcaster Error:", error);
        setCommentary("/// AI OFFLINE: Error fetching commentary. ///");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommentary(); 
    const interval = setInterval(fetchCommentary, 10000); 

    return () => clearInterval(interval);
  }, [mode]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-primary text-base">[AI SHOUTCASTER]</CardTitle>
        <RadioGroup defaultValue="analyst" onValueChange={(value: CommentaryMode) => setMode(value)} className="flex items-center space-x-4">
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
          {isLoading && !commentary ? 'Generating...' : commentary}
        </p>
      </CardContent>
    </Card>
  );
}
