import type { Metadata } from 'next';
import { SpectatorView } from '@/components/spectator-view';
import { MatchReplay } from '@/components/match-replay';
import { protocols } from '@/lib/data';
import { DEMO_REPLAYS, getDemoReplay, resultText, type ReplayMatch } from '@/lib/demo-replay';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookCopy } from 'lucide-react';
import { IS_DEMO } from '@/lib/utils';

type Props = { params: Promise<{ id: string }> };

// `/spectate/<id>` is a demo replay when the id names one, otherwise a protocol's spectator view.
// Tic-tac-toe has no simulated spectator view, so its protocol id shows its first demo game.
const replayFor = (id: string) => getDemoReplay(id) ?? (id === 'tictactoe' ? DEMO_REPLAYS.find((m) => m.game === 'tictactoe') : undefined);
const names = (m: ReplayMatch) => Object.values(m.players).map((p) => p.name).join(' vs ');
const gameName = (m: ReplayMatch) => (m.game === 'tictactoe' ? 'tic-tac-toe' : 'chess');
export function generateStaticParams() {
  return [...DEMO_REPLAYS.map((m) => ({ id: m.id })), ...protocols.map((p) => ({ id: p.id }))];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const replay = replayFor(id);
  if (replay) {
    return {
      title: `Replay — ${names(replay)}`,
      description: `Scrub through a house-bot ${gameName(replay)} match, move by move: ${resultText(replay)} in ${replay.moves.length} plies.`,
    };
  }
  const protocol = protocols.find(p => p.id === id);
  if (!protocol) return { title: 'Spectate' };
  return {
    title: `Spectate — ${protocol.title}`,
    description: `Live spectator mode for protocol: ${protocol.title}`,
  };
}

export default async function SpectatePage({ params }: Props) {
  const { id } = await params;

  const replay = replayFor(id);
  if (replay) {
    return (
      <div className="flex flex-col h-full min-w-0 p-4 md:p-6 gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-primary">MATCH REPLAY</h1>
          <p className="text-muted-foreground">
            {Object.entries(replay.players).map(([seat, p], i) => (
              <span key={seat}>{i > 0 && ' vs '}<span className="text-accent">{p.name}</span> ({seat})</span>
            ))}{' '}
            · house bots, real {gameName(replay)} rules
          </p>
        </header>
        <MatchReplay match={replay} />
      </div>
    );
  }

  const protocol = protocols.find(p => p.id === id);
  if (!protocol) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full min-w-0 p-4 md:p-6 gap-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">SPECTATOR MODE</h1>
          <p className="text-muted-foreground">Engaged with protocol: <span className="text-accent">{protocol.title}</span></p>
        </div>
        {!IS_DEMO && <Button variant="outline" asChild>
            <Link href={`/match-report/${protocol.id}`}>
                View Post-Match Audit
                <BookCopy className="ml-2 h-4 w-4" />
            </Link>
        </Button>}
      </header>
      <SpectatorView />
    </div>
  );
}
