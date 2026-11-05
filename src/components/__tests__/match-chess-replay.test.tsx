/**
 * The demo replay: every fixture replays to its stored final position, and the player steps and scrubs.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MatchChessReplay } from '../match-chess-replay';
import { DEMO_REPLAYS, replayFens } from '@/lib/demo-replay';

// The real board draws through DnD and ResizeObserver; the test only needs the position it was given.
jest.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { position: string } }) => <div data-testid="board">{options.position}</div>,
}));
// lucide-react ships ESM only, which Jest doesn't transform; the icons don't matter here.
jest.mock('lucide-react', () => ({ Play: () => null, Pause: () => null, SkipForward: () => null, SkipBack: () => null, Gauge: () => null }));

// The Radix slider measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

const match =DEMO_REPLAYS.reduce((a, b) => (a.moves.length <= b.moves.length ? a : b));
const fens = replayFens(match);
const board = () => screen.getByTestId('board').textContent;

describe('demo replays', () => {
  it.each(DEMO_REPLAYS.map((m) => [m.id, m] as const))('%s replays to its final position', (_, m) => {
    const all = replayFens(m);
    expect(all).toHaveLength(m.moves.length + 1);
    expect(all.at(-1)).toBe(m.finalFen);
  });
});

describe('MatchChessReplay', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('autoplays, pauses, steps and jumps to a move', () => {
    render(<MatchChessReplay match={match} />);
    expect(board()).toBe(fens[0]);

    act(() => jest.advanceTimersByTime(1000));
    expect(board()).toBe(fens[1]);

    fireEvent.keyDown(window, { key: ' ' }); // pause
    act(() => jest.advanceTimersByTime(5000));
    expect(board()).toBe(fens[1]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(board()).toBe(fens[3]);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(board()).toBe(fens[2]);

    const last = match.moves.length;
    fireEvent.click(screen.getAllByRole('button', { name: match.moves[last - 1].san }).at(-1)!);
    expect(board()).toBe(match.finalFen);
    expect(screen.getByText(/PLY \d+\/\d+/).textContent).toBe(`PLY ${last}/${last}`);
  });

  it('runs to the end and shows the result', () => {
    render(<MatchChessReplay match={match} />);
    fireEvent.keyDown(window, { key: '4' }); // 4x
    // Each ply schedules the next timer after it renders, so advance one ply at a time.
    for (let i = 0; i < match.moves.length; i++) act(() => jest.advanceTimersByTime(250));
    expect(board()).toBe(match.finalFen);
    expect(screen.getByText(new RegExp(`by ${match.result.reason}`, 'i'), { selector: '[aria-live]' })).toBeInTheDocument();
  });
});
