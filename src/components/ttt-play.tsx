'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TttBoard } from '@/components/ttt-board';
import { seededRng } from '@/lib/house-bots';
import { TTT_HOUSE_BOTS, applyTttMove, createTttState, tttWinner, type TttMark, type TttState } from '@/lib/protocols/tictactoe';

type Bot = keyof typeof TTT_HOUSE_BOTS;

/** You against a house bot, entirely in the browser: the same rules and bots the arena runs. */
export function TttPlay() {
  const [you, setYou] = useState<TttMark>('x');
  const [bot, setBot] = useState<Bot>('search-engine');
  const [state, setState] = useState<TttState>(createTttState);
  const [score, setScore] = useState({ you: 0, bot: 0, draw: 0 });

  const winner = tttWinner(state.board);
  const over = !!winner || !state.board.includes('.');
  const botTurn = !over && state.currentPlayer !== you;

  /** Plays a cell and, if that ends the game, scores it. */
  const play = (cell: string) => {
    const next = applyTttMove(state, cell);
    setState(next);
    const w = tttWinner(next.board);
    if (w || !next.board.includes('.')) setScore((s) => (!w ? { ...s, draw: s.draw + 1 } : w === you ? { ...s, you: s.you + 1 } : { ...s, bot: s.bot + 1 }));
  };

  useEffect(() => {
    if (!botTurn) return;
    const t = setTimeout(() => play(TTT_HOUSE_BOTS[bot].create(seededRng(Date.now()))(state).cell), 400);
    return () => clearTimeout(t);
    // `play` is rebuilt every render; `state` already covers what it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, bot, state]);

  const restart = (mark = you) => {
    setYou(mark);
    setState(createTttState());
  };

  const status = winner
    ? winner === you ? 'You win: three in a row' : `${TTT_HOUSE_BOTS[bot].name} wins`
    : over ? 'Draw: full board' : botTurn ? `${TTT_HOUSE_BOTS[bot].name} is thinking…` : `Your move (${you.toUpperCase()})`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
      <Card className="lg:col-span-2 p-4 flex flex-col gap-4 min-w-0">
        <p aria-live="polite" className="font-mono text-accent text-center">{status.toUpperCase()}</p>
        <TttBoard board={state.board} highlight={state.moveHistory.at(-1)} onPlay={botTurn || over ? undefined : play} />
        <Button onClick={() => restart()} className="self-center bg-accent text-accent-foreground hover:bg-accent/80 min-h-[40px]">
          {over ? 'Play again' : 'Restart'}
        </Button>
      </Card>
      <Card className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="ttt-bot" className="text-sm text-muted-foreground">Opponent</label>
          <select
            id="ttt-bot"
            value={bot}
            onChange={(e) => { setBot(e.target.value as Bot); restart(); }}
            className="w-full bg-black/60 border border-primary/30 rounded px-3 py-2 text-base md:text-sm font-mono"
          >
            <option value="search-engine">Minimax (never loses)</option>
            <option value="random-mover">Random Mover</option>
          </select>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm text-muted-foreground mb-1">You play</legend>
          <div className="flex gap-2">
            {(['x', 'o'] as const).map((m) => (
              <Button key={m} variant={you === m ? 'default' : 'outline'} onClick={() => restart(m)} aria-pressed={you === m} className="min-h-[40px] flex-1">
                {m.toUpperCase()}{m === 'x' ? ' (first)' : ''}
              </Button>
            ))}
          </div>
        </fieldset>
        <p className="font-mono text-sm">
          You {score.you} · {TTT_HOUSE_BOTS[bot].name} {score.bot} · Draws {score.draw}
        </p>
        <p className="text-xs text-muted-foreground">
          Your agents play the same game in the local arena over MCP or REST: cells are named a1–c3 like chess squares, b2 is the centre.
        </p>
      </Card>
    </div>
  );
}
