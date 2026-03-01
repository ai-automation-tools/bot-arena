import type { Metadata } from 'next';
import { postMatchAuditor } from '@/ai/flows/post-match-auditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareButton } from '@/components/share-button';
import { MatchResultsSummary } from '@/components/match-results-summary';
import { protocols } from '@/lib/data';
import { BookCheck, Activity, Bug } from 'lucide-react';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const protocol = protocols.find(p => p.id === params.id);
  if (!protocol) return { title: 'Match Report' };
  
  const title = `Match Report — ${protocol.title}`;
  const description = `Post-match AI audit and strategic analysis for ${protocol.title}. View bot performance, efficiency metrics, and failure diagnosis.`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/match-report/${params.id}`,
      siteName: 'BotArena Retro',
      images: [
        {
          url: `/match-report/${params.id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${protocol.title} Match Report`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/match-report/${params.id}/opengraph-image`],
    },
  };
}

export default async function MatchReportPage({ params }: { params: { id: string } }) {
  const protocol = protocols.find(p => p.id === params.id);
  if (!protocol) {
    notFound();
  }

  const mockMatchData = {
    matchSummary: `Match of '${protocol.title}' completed. Agent_1 (Vanguard.AI) won against Agent_2 (GambitLLM). Agent_1 played aggressively, controlling the center. Agent_2 made a critical blunder in the mid-game, losing its queen equivalent, and could not recover.`,
    agent1Metrics: 'Latency: avg 112ms. Tokens: 1250 total. Violations: 0. Strategy: King\'s Pawn Opening, aggressive development.',
    agent2Metrics: 'Latency: avg 234ms. Tokens: 2100 total. Violations: 0. Strategy: Sicilian Defense, but failed to counter center control.',
  };

  // Parse match results for summary
  const parseMetrics = (metricsStr: string) => {
    const latencyMatch = metricsStr.match(/avg (\d+ms)/);
    const tokensMatch = metricsStr.match(/Tokens: (\d+)/);
    const violationsMatch = metricsStr.match(/Violations: (\d+)/);
    const strategyMatch = metricsStr.match(/Strategy: (.+)/);

    return {
      avgLatency: latencyMatch ? latencyMatch[1] : 'N/A',
      totalTokens: tokensMatch ? parseInt(tokensMatch[1], 10) : 0,
      violations: violationsMatch ? parseInt(violationsMatch[1], 10) : 0,
      strategy: strategyMatch ? strategyMatch[1] : 'Unknown',
    };
  };

  const winner = 'Vanguard.AI';
  const loser = 'GambitLLM';
  const winnerMetrics = parseMetrics(mockMatchData.agent1Metrics);
  const loserMetrics = parseMetrics(mockMatchData.agent2Metrics);

  let audit;
  try {
    audit = await postMatchAuditor(mockMatchData);
  } catch (error) {
    console.error("Post Match Auditor Error:", error);
    audit = {
      strategicSummary: "AI Auditor Offline. Could not generate summary.",
      efficiencyAnalysis: "AI Auditor Offline. Could not generate analysis.",
      failureDiagnosis: "AI Auditor Offline. Could not generate diagnosis.",
    };
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-primary">-- Post-Match Audit --</h1>
          <ShareButton
            title={`Bot Arena — ${protocol.title} Match Report`}
            text={`Post-match audit for protocol: ${protocol.title}`}
          />
        </div>
        <p className="text-muted-foreground mt-2">Analysis for protocol: <span className="text-accent">{protocol.title}</span></p>
      </header>

      <MatchResultsSummary
        winner={winner}
        loser={loser}
        winnerMetrics={winnerMetrics}
        loserMetrics={loserMetrics}
        matchOutcome={mockMatchData.matchSummary}
      />

      {audit.strategicSummary.includes("AI Auditor Offline") ? (
        <Card className="bg-red-900/50 border-red-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <Bug className="w-5 h-5" />
              <span>AI Audit Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-200/90 whitespace-pre-wrap font-mono">
              The AI post-match auditor encountered an error and could not generate a summary.
              Please try again later or check the system logs for more details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <BookCheck className="w-5 h-5" />
                <span>Strategic Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 whitespace-pre-wrap font-mono">{audit.strategicSummary}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Activity className="w-5 h-5" />
                <span>Efficiency Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 whitespace-pre-wrap font-mono">{audit.efficiencyAnalysis}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Bug className="w-5 h-5" />
                <span>Failure Diagnosis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 whitespace-pre-wrap font-mono">{audit.failureDiagnosis}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
