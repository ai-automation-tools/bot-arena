import { InteractiveChessGame } from '@/game-templates/classic-game/chess-game';

export default function ClassicGamePage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Classic Game --</h1>
        <p className="text-muted-foreground mt-2">[BUILD YOUR OWN TURN-BASED GAME]</p>
      </header>
      <div className="grid grid-cols-1 gap-6">
        <InteractiveChessGame />
      </div>
    </div>
  );
}
