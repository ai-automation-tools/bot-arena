'use client';

import type { Protocol } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, Zap, Info, Circle, AlertCircle, Flame, Skull } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { IS_DEMO } from '@/lib/utils';
import { useSoundEffects } from '@/hooks/use-sound-effects';

export function ProtocolCard({ protocol }: { protocol: Protocol }) {
  const { playSound } = useSoundEffects();

  const difficultyStyles: { [key in Protocol['difficulty']]: string } = {
    Easy: 'border-green-400/50 bg-green-900/30 text-green-300',
    Medium: 'border-yellow-400/50 bg-yellow-900/30 text-yellow-300',
    Hard: 'border-orange-400/50 bg-orange-900/30 text-orange-300',
    Extreme: 'border-red-400/50 bg-red-900/30 text-red-300',
  };

  const difficultyIcons: { [key in Protocol['difficulty']]: typeof Circle } = {
    Easy: Circle,
    Medium: AlertCircle,
    Hard: Flame,
    Extreme: Skull,
  };

  const DifficultyIcon = difficultyIcons[protocol.difficulty];

  const tierStyles: { [key in Protocol['tier']]: string } = {
    'I': 'border-blue-400/50 bg-blue-900/30 text-blue-300',
    'II': 'border-purple-400/50 bg-purple-900/30 text-purple-300',
    'III': 'border-pink-400/50 bg-pink-900/30 text-pink-300',
  };

  const handleExecuteClick = () => {
    playSound('click');
  };

  const handleSpectateClick = () => {
    playSound('click');
  };

  const handleDetailsClick = () => {
    playSound('click');
  };

  return (
    <Card className="flex flex-col bg-card/70 border-border backdrop-blur-sm transition-all hover:border-accent/70 hover:shadow-lg hover:shadow-accent/20">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-accent text-lg font-bold">{protocol.title}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className={`whitespace-nowrap flex items-center gap-1 ${tierStyles[protocol.tier]}`}>
              CLASS-{protocol.tier}
            </Badge>
            <Badge variant="outline" className={`whitespace-nowrap flex items-center gap-1 ${difficultyStyles[protocol.difficulty]}`}>
              <DifficultyIcon className="h-3 w-3" />
              {protocol.difficulty}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-muted-foreground pt-2">{protocol.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-foreground">SCORING AXES:</p>
            <div className="flex flex-wrap gap-2">
              {protocol.scoringAxes.map(axis => (
                <Badge key={axis} variant="secondary" className="font-normal text-foreground">{axis}</Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-6">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground" onClick={handleDetailsClick}>
          <Link href={`/protocol/${protocol.id}`}>
            <Info className="mr-1 h-4 w-4" /> Details
          </Link>
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={handleDetailsClick}>
              <Info className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg bg-background/95 backdrop-blur-md border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold text-accent">
                {protocol.title}
              </SheetTitle>
              <SheetDescription className="text-base text-muted-foreground pt-2">
                {protocol.description}
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* Difficulty & Tier */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Classification</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                    <Badge variant="outline" className={`w-full justify-center flex items-center gap-1.5 ${difficultyStyles[protocol.difficulty]}`}>
                      <DifficultyIcon className="h-3.5 w-3.5" />
                      {protocol.difficulty}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Agent Tier</p>
                    <Badge variant="outline" className="w-full justify-center border-primary/50 bg-primary/20 text-primary">
                      CLASS-{protocol.tier}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Scoring Axes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Scoring Axes</h3>
                <div className="flex flex-wrap gap-2">
                  {protocol.scoringAxes.map((axis, index) => (
                    <Badge key={axis} variant="secondary" className="font-normal">
                      {index + 1}. {axis}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Protocol Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Protocol Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Protocol ID:</span>
                    <span className="text-foreground font-mono">{protocol.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Interface:</span>
                    <span className="text-foreground">MCP · REST · Webhook · JS</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Evaluation:</span>
                    <span className="text-foreground">Automated</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button variant="outline" asChild className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={handleSpectateClick}>
                  <Link href={`/spectate/${protocol.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> Spectate Active Matches
                  </Link>
                </Button>
                {!IS_DEMO && <Button variant="default" asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/80" onClick={handleExecuteClick}>
                  <Link href="/new">
                    <Zap className="mr-2 h-4 w-4" /> Start a Match
                  </Link>
                </Button>}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={handleSpectateClick}>
            <Link href={`/spectate/${protocol.id}`}>
              <Eye className="mr-1" /> Spectate
            </Link>
          </Button>
          {!IS_DEMO && <Button variant="default" asChild className="bg-accent text-accent-foreground hover:bg-accent/80" onClick={handleExecuteClick}>
            <Link href="/new">
              <Zap className="mr-1" /> Play
            </Link>
          </Button>}
        </div>
      </CardFooter>
    </Card>
  );
}
