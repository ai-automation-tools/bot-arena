import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MatchReplay } from '@/components/match-replay';
import { DEMO_REPLAYS, getDemoReplay, resultText, type ReplayMatch } from '@/lib/demo-replay';

type Props = { params: Promise<{ id: string }> };

const names = (m: ReplayMatch) => Object.values(m.players).map((p) => p.name).join(' vs ');
const gameName = (m: ReplayMatch) => (m.game === 'tictactoe' ? 'tic-tac-toe' : 'chess');

/** `/spectate/<id>` replays one of the house-bot demo games. */
export function generateStaticParams() {
  return DEMO_REPLAYS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const replay = getDemoReplay((await params).id);
  if (!replay) return { title: 'Replay' };
  return {
    title: `Replay — ${names(replay)}`,
    description: `Scrub through a house-bot ${gameName(replay)} match, move by move: ${resultText(replay)} in ${replay.moves.length} plies.`,
  };
}

export default async function SpectatePage({ params }: Props) {
  const replay = getDemoReplay((await params).id);
  if (!replay) notFound();
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
