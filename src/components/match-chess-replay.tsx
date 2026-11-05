'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ReplayControls } from '@/components/replay-controls';
import { replayFens, type ReplayMatch } from '@/lib/demo-replay';

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

const BASE_DELAY_MS = 1000; // one ply per second at 1x
const SPEED_KEYS: Record<string, PlaybackSpeed> = { '1': 0.5, '2': 1, '3': 2, '4': 4 };

/**
 * Replays a match ply by ply: autoplay, pause, step, speed, and a scrubber over every position.
 * Pass a live match again as its moves arrive: playback keeps going into the new moves.
 */
export function MatchChessReplay({ match }: { match: ReplayMatch }) {
  const fens = useMemo(() => replayFens(match), [match]);
  const total = match.moves.length;
  const [ply, setPly] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [shownId, setShownId] = useState(match.id);

  // A different match starts from the top (adjusting state during render).
  if (shownId !== match.id) {
    setShownId(match.id);
    setPly(0);
    setIsPaused(false);
  }

  const atEnd = ply >= total;

  useEffect(() => {
    if (isPaused || atEnd) return;
    const timer = setTimeout(() => setPly((p) => Math.min(p + 1, total)), BASE_DELAY_MS / speed);
    return () => clearTimeout(timer);
  }, [ply, isPaused, atEnd, speed, total]);

  const seek = (next: number) => {
    setIsPaused(true);
    setPly(Math.max(0, Math.min(total, next)));
  };
  const togglePause = () => {
    if (atEnd) {
      setPly(0); // play again from the start
      setIsPaused(false);
    } else {
      setIsPaused((p) => !p);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Fields and the slider handle their own keys; a focused button already handles Space.
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('input, textarea, [role="slider"]')) return;
      if (e.key === ' ' && el?.closest('button')) return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'ArrowLeft') seek(ply - 1);
      else if (e.key === 'ArrowRight') seek(ply + 1);
      else if (SPEED_KEYS[e.key]) setSpeed(SPEED_KEYS[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lastMove = ply > 0 ? match.moves[ply - 1] : undefined;
  const winnerName = match.result?.winner ? match[match.result.winner].name : null;
  const resultText = !match.result
    ? `${total % 2 ? match.black.name : match.white.name} to move`
    : winnerName ? `${winnerName} wins by ${match.result.reason}` : `${match.result.reason === 'resignation' ? 'Ended' : 'Draw'} by ${match.result.reason}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
      <Card className="lg:col-span-2 min-w-0 p-4 flex flex-col gap-4">
        <div className="flex justify-between gap-2 font-mono text-sm">
          <span><span className="text-muted-foreground">BLACK</span> {match.black.name}</span>
          <span aria-live="polite" className="text-accent">
            {atEnd ? resultText.toUpperCase() : lastMove ? `${Math.ceil(ply / 2)}. ${ply % 2 ? '' : '… '}${lastMove.san}` : 'START'}
          </span>
        </div>
        <div className="w-full max-w-[600px] mx-auto" data-testid="replay-board" data-fen={fens[ply]}>
          <Chessboard
            options={{
              position: fens[ply],
              allowDragging: false,
              boardOrientation: 'white',
              squareStyles: lastMove
                ? { [lastMove.from]: { background: 'rgba(163,230,53,.35)' }, [lastMove.to]: { background: 'rgba(163,230,53,.55)' } }
                : {},
            }}
          />
        </div>
        <div className="font-mono text-sm"><span className="text-muted-foreground">WHITE</span> {match.white.name}</div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs w-20 shrink-0">PLY {ply}/{total}</span>
          <Slider
            aria-label="Scrub through the match"
            min={0}
            max={total}
            step={1}
            value={[ply]}
            onValueChange={([v]) => seek(v)}
          />
        </div>
      </Card>
      <div className="flex flex-col gap-6 min-w-0">
        <ReplayControls
          isPaused={isPaused || atEnd}
          playbackSpeed={speed}
          onTogglePause={togglePause}
          onChangeSpeed={setSpeed}
          onStepBackward={() => seek(ply - 1)}
          onStepForward={() => seek(ply + 1)}
          showStepControls
        />
        <Card className="p-4">
          <h2 className="font-mono text-sm text-accent mb-2">MOVES</h2>
          <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 font-mono text-xs max-h-72 overflow-y-auto">
            {Array.from({ length: Math.ceil(total / 2) }, (_, row) => (
              <li key={row} className="contents">
                <span className="text-muted-foreground">{row + 1}.</span>
                {[row * 2, row * 2 + 1].map((i) =>
                  i < total ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => seek(i + 1)}
                      aria-current={ply === i + 1 ? 'step' : undefined}
                      className={`text-left rounded px-1 ${ply === i + 1 ? 'bg-accent text-black' : 'hover:text-accent'}`}
                    >
                      {match.moves[i].san}
                    </button>
                  ) : (
                    <span key={i} />
                  ),
                )}
              </li>
            ))}
          </ol>
          <p className="font-mono text-xs text-muted-foreground mt-3 border-t border-primary/10 pt-2">
            {match.result ? 'Result' : 'Live'}: {resultText} · {total} plies{match.seed !== undefined ? ` · seed ${match.seed}` : ''}
          </p>
        </Card>
      </div>
    </div>
  );
}
