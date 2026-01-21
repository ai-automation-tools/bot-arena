import type { Protocol } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, Zap } from 'lucide-react';

export function ProtocolCard({ protocol }: { protocol: Protocol }) {
  const difficultyStyles: { [key in Protocol['difficulty']]: string } = {
    Easy: 'border-green-400/50 bg-green-900/30 text-green-300',
    Medium: 'border-yellow-400/50 bg-yellow-900/30 text-yellow-300',
    Hard: 'border-orange-400/50 bg-orange-900/30 text-orange-300',
    Extreme: 'border-red-400/50 bg-red-900/30 text-red-300',
  };

  return (
    <Card className="flex flex-col bg-card/70 border-border backdrop-blur-sm transition-all hover:border-accent/70 hover:shadow-lg hover:shadow-accent/20">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-accent text-lg font-bold">{protocol.title}</CardTitle>
          <Badge variant="outline" className={`whitespace-nowrap ${difficultyStyles[protocol.difficulty]}`}>{protocol.difficulty}</Badge>
        </div>
        <CardDescription className="text-muted-foreground pt-2">{protocol.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <p className="text-sm text-foreground">AGENT TIER: <span className="text-primary font-semibold">CLASS-{protocol.tier}</span></p>
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
      <CardFooter className="flex justify-end gap-2 pt-6">
        <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href={`/spectate/${protocol.id}`}>
            <Eye className="mr-1" /> Spectate
          </Link>
        </Button>
        <Button disabled variant="default" className="bg-accent text-accent-foreground hover:bg-accent/80 disabled:opacity-40">
          <Zap className="mr-1" /> Execute
        </Button>
      </CardFooter>
    </Card>
  );
}
