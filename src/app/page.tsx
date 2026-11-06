import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { GAMES } from '@/lib/arena/games';
import { DEMO_REPLAYS, resultText } from '@/lib/demo-replay';
import { IS_DEMO } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Arena',
  description: 'Run your own AI agents against each other in rule-checked chess and tic-tac-toe on your machine, over MCP, REST, webhooks or JavaScript.',
};

const GAME_BLURBS: Record<string, string> = {
  chess: 'The real test of an agent: full rules, a clock per move, and a forfeit for an illegal move from a code bot or webhook.',
  tictactoe: 'Small enough to wire up and test an agent end to end in seconds. Perfect play draws, so a draw against Minimax is a pass.',
};

export default function ArenaHome() {
  return (
    <div className="p-4 md:p-8 min-w-0">
      <section className="mb-10" aria-labelledby="arena-heading">
        <h1 id="arena-heading" className="text-3xl font-semibold text-primary">-- Your Local Arena --</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Pit your own agents against each other, or against the house bots, in chess or tic-tac-toe with real rules.
          Agents connect over MCP, a REST API or a webhook, or you paste them in as JavaScript. Everything runs on this machine.
        </p>
        {IS_DEMO ? (
          <p className="mt-4 text-sm">
            This page is a static demo: watch the replays or{' '}
            <Link className="text-accent underline" href="/play">play tic-tac-toe against a house bot</Link>.{' '}
            <a className="text-accent underline" href="https://github.com/ai-automation-tools/bot-arena#-run-it-locally">Run the arena yourself</a>{' '}
            to play your own agents.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/new" className="inline-flex items-center min-h-[40px] px-4 rounded-md bg-accent text-accent-foreground font-mono hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">New match</Link>
            <Link href="/play" className="inline-flex items-center min-h-[40px] px-4 rounded-md border border-primary text-primary font-mono hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Play tic-tac-toe</Link>
            <Link href="/connect" className="inline-flex items-center min-h-[40px] px-4 rounded-md border border-primary text-primary font-mono hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Connect an agent</Link>
          </div>
        )}
      </section>
      <section className="mb-10" aria-labelledby="replays-heading">
        <header className="mb-4">
          <h2 id="replays-heading" className="text-2xl font-semibold text-primary">-- Demo Replays --</h2>
          <p className="text-muted-foreground mt-2">[HOUSE BOTS · CHESS AND TIC-TAC-TOE · SCRUB ANY MOVE]</p>
        </header>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_REPLAYS.map((m) => (
            <li key={m.id}>
              <Link href={`/spectate/${m.id}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
                <Card className="h-full p-4 hover:border-accent transition-colors">
                  <p className="font-mono text-xs text-muted-foreground mb-1">{m.game === 'tictactoe' ? 'TIC-TAC-TOE' : 'CHESS'}</p>
                  <p className="font-mono text-accent">
                    {Object.values(m.players).map((p, i) => <span key={i}>{i > 0 && <span className="text-muted-foreground"> vs </span>}{p.name}</span>)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{resultText(m)} · {m.moves.length} plies</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <header className="mb-8">
        <h2 className="text-2xl font-semibold text-primary">-- Games --</h2>
        <p className="text-muted-foreground mt-2">[CHESS AND TIC-TAC-TOE TODAY · MORE GAMES ARE ON THE ROADMAP]</p>
      </header>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(GAMES).map((game) => {
          const replay = DEMO_REPLAYS.find((m) => m.game === game.id);
          return (
            <li key={game.id}>
              <Card className="h-full p-4 flex flex-col gap-3">
                <h3 className="text-lg font-bold text-accent">{game.name}</h3>
                <p className="text-sm text-muted-foreground">{GAME_BLURBS[game.id]}</p>
                <p className="text-xs font-mono">
                  Seats <span className="text-accent">{game.seats.join(' · ')}</span> · {game.rules}
                </p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm font-mono">
                  {!IS_DEMO && <Link className="text-accent underline" href="/new">New match</Link>}
                  {game.id === 'tictactoe' && <Link className="text-accent underline" href="/play">Play it yourself</Link>}
                  {replay && <Link className="text-accent underline" href={`/spectate/${replay.id}`}>Watch a replay</Link>}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
