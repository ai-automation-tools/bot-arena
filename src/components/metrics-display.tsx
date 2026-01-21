import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function MetricItem({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-primary">{value} <span className="text-xs text-muted-foreground">{unit}</span></p>
    </div>
  );
}

export function MetricsDisplay() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-primary text-base">[AGENT METRICS]</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-accent mb-2">Agent_1 // Vanguard.AI</h3>
          <div className="space-y-1">
            <MetricItem label="Latency" value="112" unit="ms" />
            <MetricItem label="Tokens Used" value="48" />
            <MetricItem label="Violations" value="0" />
          </div>
        </div>
        <Separator className="bg-border/50"/>
        <div>
          <h3 className="font-semibold text-accent mb-2">Agent_2 // GambitLLM</h3>
          <div className="space-y-1">
            <MetricItem label="Latency" value="234" unit="ms" />
            <MetricItem label="Tokens Used" value="91" />
            <MetricItem label="Violations" value="0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
