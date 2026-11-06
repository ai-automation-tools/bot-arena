import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { postMatchAuditor } from '@/ai/flows/post-match-auditor';
import { Card } from '@/components/ui/card';
import { getMatch } from '@/lib/arena/arena';
import { buildReport } from '@/lib/arena/report';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

const secs = (ms: number | null | undefined) => (ms == null ? '—' : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`);
const KIND: Record<string, string> = { external: 'agent', house: 'house bot', code: 'code bot', webhook: 'webhook' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = getMatch((await params).id);
  return { title: m ? `Report — ${Object.values(m.players).map((p) => p.name).join(' vs ')}` : 'Match report' };
}

export default async function MatchReportPage({ params }: Props) {
  const { id } = await params;
  const match = getMatch(id);
  if (!match) notFound();
  const report = buildReport(match);
  const audit = await postMatchAuditor(report.auditor);

  return (
    <div className="p-4 md:p-8 min-w-0 flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-primary">-- Match Report --</h1>
        <p className="text-muted-foreground mt-2">
          {report.game} · match <span className="font-mono">{match.id}</span> · {new Date(match.createdAt).toLocaleString()}
        </p>
      </header>

      <Card className="p-4">
        <p className="text-xl text-accent font-mono">{report.headline.toUpperCase()}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {report.plies} plies{report.durationMs != null ? ` · ${secs(report.durationMs)} total` : ''} · {match.turnTimeoutMs / 1000}s per move
        </p>
      </Card>

      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <caption className="text-left text-accent mb-3">PER SEAT</caption>
          <thead className="text-muted-foreground text-left">
            <tr>
              <th scope="col" className="pr-4 pb-2">Seat</th>
              <th scope="col" className="pr-4 pb-2">Moves</th>
              <th scope="col" className="pr-4 pb-2">Avg move</th>
              <th scope="col" className="pr-4 pb-2">Slowest</th>
              <th scope="col" className="pr-4 pb-2">Timeouts</th>
              <th scope="col" className="pr-4 pb-2">Rejected</th>
              <th scope="col" className="pb-2">Forfeits</th>
            </tr>
          </thead>
          <tbody>
            {report.seats.map((s) => (
              <tr key={s.seat} className="border-t border-primary/10">
                <th scope="row" className="text-left pr-4 py-2 font-normal">
                  <span className={s.won ? 'text-accent' : ''}>{s.name}</span>
                  <span className="text-muted-foreground"> · {s.seat}, {KIND[s.kind] ?? s.kind}{s.won ? ' · winner' : ''}</span>
                </th>
                <td className="pr-4">{s.stats?.moves ?? '—'}</td>
                <td className="pr-4">{secs(s.avgMs)}</td>
                <td className="pr-4">{secs(s.stats?.maxMs)}</td>
                <td className="pr-4">{s.stats?.timeouts ?? '—'}</td>
                <td className="pr-4">{s.stats?.rejected ?? '—'}</td>
                <td>{s.stats?.forfeits ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!match.stats && <p className="text-xs text-muted-foreground mt-3">This game was saved before the arena kept per-move stats.</p>}
        <p className="text-xs text-muted-foreground mt-3">
          Rejected: illegal moves an agent sent and then retried. Forfeits: a crash, or an illegal move from a code bot or webhook.
        </p>
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <h2 className="text-accent font-mono">COMMENTARY</h2>
        <p className="whitespace-pre-wrap font-mono text-sm">{audit.strategicSummary}</p>
        <p className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">{audit.efficiencyAnalysis}</p>
        <p className="whitespace-pre-wrap font-mono text-sm">{audit.failureDiagnosis}</p>
      </Card>

      <div className="flex flex-wrap gap-4 font-mono text-sm">
        <Link className="text-accent underline" href={`/matches/${match.id}`}>Replay the game</Link>
        <Link className="text-accent underline" href="/history">All matches</Link>
      </div>
    </div>
  );
}
