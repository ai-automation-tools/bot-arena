import { COLS } from '@/lib/protocols/connect4';

/** A Connect Four board for the replay: 7 columns, 6 rows, numbered columns underneath. `highlight` is a cell index. */
export function C4Board({ board, highlight }: { board: string; highlight?: number }) {
  const reds = [...board].filter((c) => c === 'R').length;
  const yellows = [...board].filter((c) => c === 'Y').length;
  return (
    <figure className="w-full max-w-[480px] mx-auto">
      <div
        role="img"
        aria-label={`Connect Four board: ${reds} red and ${yellows} yellow discs`}
        className="grid grid-cols-7 gap-1.5 rounded-lg border border-primary/30 bg-black/50 p-2"
      >
        {[...board].map((c, i) => (
          <span
            key={i}
            className={`aspect-square rounded-full border
              ${c === 'R' ? 'bg-destructive border-destructive' : c === 'Y' ? 'bg-yellow-400 border-yellow-400' : 'bg-background border-primary/20'}
              ${highlight === i ? 'ring-2 ring-accent ring-offset-2 ring-offset-black' : ''}`}
          />
        ))}
      </div>
      <figcaption aria-hidden="true" className="grid grid-cols-7 gap-1.5 px-2 pt-1 text-center font-mono text-xs text-muted-foreground">
        {Array.from({ length: COLS }, (_, i) => <span key={i}>{i + 1}</span>)}
      </figcaption>
    </figure>
  );
}
