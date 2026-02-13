import { postMatchAuditor } from '@/ai/flows/post-match-auditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { protocols } from '@/lib/data';
import { BookCheck, Activity, Bug } from 'lucide-react';
import { notFound } from 'next/navigation';

export const revalidate = 0;

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
        <h1 className="text-3xl font-semibold text-primary">-- Post-Match Audit --</h1>
        <p className="text-muted-foreground mt-2">Analysis for protocol: <span className="text-accent">{protocol.title}</span></p>
      </header>

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
