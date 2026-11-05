import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { listMatches } from '@/lib/arena/arena';

export const metadata: Metadata = {
  title: 'Matches',
  description: 'Every match played in this arena, newest first.',
};
export const dynamic = 'force-dynamic';

export default function MatchesPage() {
  const matches = listMatches();
  return (
    <div className="p-4 md:p-8 min-w-0">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Matches --</h1>
        <p className="text-muted-foreground mt-2">[EVERY MATCH PLAYED IN THIS ARENA · SAVED IN .arena/]</p>
      </header>
      {matches.length === 0 ? (
        <p className="text-muted-foreground">
          No matches yet. <Link href="/new" className="text-accent underline">Start one</Link>.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => (
            <li key={m.id}>
              <Link href={`/matches/${m.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <Card className="p-4 flex flex-wrap items-center justify-between gap-2 hover:border-accent transition-colors">
                  <span className="font-mono">
                    <span className="text-accent">{m.white.name}</span> vs <span className="text-accent">{m.black.name}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {m.status === 'in-progress' ? (
                      <span className="text-green-400">LIVE</span>
                    ) : m.result?.winner ? (
                      `${m[m.result.winner].name} won by ${m.result.reason}`
                    ) : (
                      m.result?.reason
                    )}{' '}
                    · {m.moves.length} plies · {new Date(m.createdAt).toLocaleString()}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
