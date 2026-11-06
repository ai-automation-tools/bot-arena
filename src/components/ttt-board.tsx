'use client';

import { cellName } from '@/lib/protocols/tictactoe';

/** A tic-tac-toe board. Pass `onPlay` to make empty cells clickable. */
export function TttBoard({ board, highlight, onPlay }: { board: string; highlight?: string; onPlay?: (cell: string) => void }) {
  return (
    <div role="grid" aria-label="Tic-tac-toe board" className="grid grid-cols-3 grid-rows-3 gap-2 w-full max-w-[360px] mx-auto aspect-square">
      {[...board].map((c, i) => {
        const name = cellName(i);
        const playable = onPlay && c === '.';
        return (
          <button
            key={name}
            type="button"
            role="gridcell"
            aria-label={`${name}: ${c === '.' ? 'empty' : c}`}
            disabled={!playable}
            onClick={() => playable && onPlay(name)}
            className={`flex items-center justify-center rounded-md border font-mono text-5xl md:text-6xl select-none transition-colors
              ${highlight === name ? 'border-accent bg-accent/15' : 'border-primary/30 bg-black/50'}
              ${playable ? 'hover:border-accent hover:bg-accent/10 cursor-pointer' : 'cursor-default'}
              ${c === 'X' ? 'text-accent' : 'text-primary'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
          >
            {c === '.' ? '' : c}
          </button>
        );
      })}
    </div>
  );
}
