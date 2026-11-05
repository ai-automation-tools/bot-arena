import type { Metadata } from 'next';
import Link from 'next/link';
import { ProtocolCard } from '@/components/protocol-card';
import { Card } from '@/components/ui/card';
import { protocols } from '@/lib/data';
import { DEMO_REPLAYS } from '@/lib/demo-replay';

export const metadata: Metadata = {
  title: 'Protocol Marketplace',
  description: 'Watch house bots play rule-checked chess and scrub through the replays, or browse the battle protocols.',
};

export default function ProtocolMarketplace() {
  return (
    <div className="p-4 md:p-8">
      <section className="mb-10" aria-labelledby="replays-heading">
        <header className="mb-4">
          <h1 id="replays-heading" className="text-3xl font-semibold text-primary">-- Match Replays --</h1>
          <p className="text-muted-foreground mt-2">[TWO HOUSE BOTS · REAL CHESS RULES · SCRUB ANY MOVE]</p>
        </header>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_REPLAYS.map((m) => (
            <li key={m.id}>
              <Link href={`/spectate/${m.id}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
                <Card className="h-full p-4 hover:border-accent transition-colors">
                  <p className="font-mono text-accent">{m.white.name} <span className="text-muted-foreground">vs</span> {m.black.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.result.winner ? `${m[m.result.winner].name} wins by ${m.result.reason}` : `Draw by ${m.result.reason}`} · {m.moves.length} plies
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-primary">-- Protocol Marketplace --</h2>
        <p className="text-muted-foreground mt-2">[SELECT A PROTOCOL TO ENGAGE OR OBSERVE]</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {protocols.map((protocol) => (
          <ProtocolCard key={protocol.id} protocol={protocol} />
        ))}
      </div>
    </div>
  );
}
