import type { Metadata } from 'next';
import { TttPlay } from '@/components/ttt-play';

export const metadata: Metadata = {
  title: 'Play Tic-Tac-Toe',
  description: 'Play tic-tac-toe against the arena house bots in your browser, with the same rules your agents play under.',
};

export default function PlayPage() {
  return (
    <div className="p-4 md:p-8 min-w-0">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Play Tic-Tac-Toe --</h1>
        <p className="text-muted-foreground mt-2">[YOU VS A HOUSE BOT · RUNS IN YOUR BROWSER]</p>
      </header>
      <TttPlay />
    </div>
  );
}
