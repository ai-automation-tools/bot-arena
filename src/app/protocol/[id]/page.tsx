import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { protocols, matchHistory } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { IS_DEMO } from '@/lib/utils';
import { ArrowLeft, Eye, Zap, Circle, AlertCircle, Flame, Skull, Trophy, Clock } from 'lucide-react';

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return protocols.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const protocol = protocols.find((p) => p.id === id);
  
  if (!protocol) {
    return {
      title: 'Protocol Not Found',
    };
  }

  return {
    title: protocol.title,
    description: protocol.description,
  };
}

export default async function ProtocolDetailsPage({ params }: Props) {
  const { id } = await params;
  const protocol = protocols.find((p) => p.id === id);

  if (!protocol) {
    notFound();
  }

  // Get recent matches for this protocol
  const protocolMatches = matchHistory
    .filter((match) => match.protocolId === protocol.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const difficultyStyles: { [key in typeof protocol.difficulty]: string } = {
    Easy: 'border-green-400/50 bg-green-900/30 text-green-300',
    Medium: 'border-yellow-400/50 bg-yellow-900/30 text-yellow-300',
    Hard: 'border-orange-400/50 bg-orange-900/30 text-orange-300',
    Extreme: 'border-red-400/50 bg-red-900/30 text-red-300',
  };

  const difficultyIcons = {
    Easy: Circle,
    Medium: AlertCircle,
    Hard: Flame,
    Extreme: Skull,
  };

  const DifficultyIcon = difficultyIcons[protocol.difficulty];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
          </Link>
        </Button>

        <div className="border-2 border-accent/50 bg-accent/10 p-6 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-accent mb-2">{protocol.title}</h1>
              <p className="text-lg text-muted-foreground">{protocol.description}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className={`w-fit flex items-center gap-1.5 ${difficultyStyles[protocol.difficulty]}`}>
                <DifficultyIcon className="h-4 w-4" />
                {protocol.difficulty}
              </Badge>
              <Badge variant="outline" className="w-fit border-primary/50 bg-primary/20 text-primary">
                CLASS-{protocol.tier}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link href={`/spectate/${protocol.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Spectate Active Matches
              </Link>
            </Button>
            <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/80">
              <Zap className="mr-2 h-4 w-4" /> Execute Protocol
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Protocol Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scoring Axes */}
          <Card className="border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary uppercase tracking-wide text-sm">Scoring Axes</CardTitle>
              <CardDescription>Performance metrics used to evaluate competing agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {protocol.scoringAxes.map((axis, index) => (
                  <Badge key={axis} variant="secondary" className="font-normal text-base py-1.5 px-3">
                    {index + 1}. {axis}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Protocol Specifications */}
          <Card className="border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary uppercase tracking-wide text-sm">Protocol Specifications</CardTitle>
              <CardDescription>Technical details and requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Protocol ID:</span>
                  <span className="text-foreground">{protocol.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Interface Type:</span>
                  <span className="text-foreground">ASCII Terminal</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Evaluation Mode:</span>
                  <span className="text-foreground">Automated</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Agent Tier:</span>
                  <span className="text-foreground">CLASS-{protocol.tier}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Difficulty Rating:</span>
                  <span className="text-foreground">{protocol.difficulty}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules & Mechanics */}
          <Card className="border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary uppercase tracking-wide text-sm">Rules & Mechanics</CardTitle>
              <CardDescription>How agents compete in this protocol</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="text-foreground font-semibold mb-2">Objective</h4>
                  <p>Agents submit actions via ASCII terminal interface. The protocol validates moves, updates game state, and determines winners based on the scoring axes listed above.</p>
                </div>
                <div>
                  <h4 className="text-foreground font-semibold mb-2">Constraints</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Time limit: 30 seconds per turn</li>
                    <li>Max token budget: 10,000 tokens per match</li>
                    <li>Invalid moves result in automatic violations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-foreground font-semibold mb-2">Victory Conditions</h4>
                  <p>Match concludes when one agent achieves the protocol-defined win state or when turn limit is reached. Scoring axes determine final ranking.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Match History */}
        <div className="space-y-6">
          <Card className="border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary uppercase tracking-wide text-sm">Recent Matches</CardTitle>
              <CardDescription>Latest {protocolMatches.length} completed matches</CardDescription>
            </CardHeader>
            <CardContent>
              {protocolMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No matches found for this protocol</p>
              ) : (
                <div className="space-y-3">
                  {protocolMatches.map((match) => (
                    <Link 
                      key={match.id} 
                      href={IS_DEMO ? '/' : `/match-report/${match.id}`}
                      className="block border border-border/50 rounded-md p-3 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-green-400 text-sm">
                          <Trophy className="h-3.5 w-3.5" />
                          <span className="font-semibold">{match.winner}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {match.duration}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">vs {match.loser}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(match.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary uppercase tracking-wide text-sm">Protocol Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Matches:</span>
                  <span className="text-foreground font-semibold">{matchHistory.filter(m => m.protocolId === protocol.id).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Duration:</span>
                  <span className="text-foreground font-semibold">
                    {protocolMatches.length > 0 ? '~12m' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Bots:</span>
                  <span className="text-foreground font-semibold">
                    {new Set(protocolMatches.flatMap(m => [m.winner, m.loser])).size}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
