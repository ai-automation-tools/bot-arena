/**
 * Starting a match from the form: the seat tokens it shows, the clock field, and the tokens coming back on
 * the match page after "Watch the match".
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { NewMatchForm } from '../new-match-form';
import { LiveMatch } from '../live-match';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-chessboard', () => ({ Chessboard: () => null }));
jest.mock('lucide-react', () => ({ Play: () => null, Pause: () => null, SkipForward: () => null, SkipBack: () => null, Gauge: () => null }));

const json = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
let fetchMock: jest.Mock;
beforeEach(() => {
  sessionStorage.clear();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

describe('NewMatchForm', () => {
  it('shows a seat token after starting, and keeps it for the match page', async () => {
    fetchMock.mockReturnValue(json(201, { match: { id: 'm1' }, tokens: { white: 'tok-white' } }));
    render(<NewMatchForm />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start match' })));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ game: 'chess', white: { kind: 'external' }, black: { kind: 'house' }, turnTimeoutMs: 120_000 });
    expect(screen.getAllByText(/tok-white/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Watch the match/ })).toHaveAttribute('href', '/matches/m1');
    expect(JSON.parse(sessionStorage.getItem('bot-arena:tokens:m1')!)).toEqual({ white: 'tok-white' });
  });

  it('lets the clock field be cleared and retyped', async () => {
    fetchMock.mockReturnValue(json(201, { match: { id: 'm2' }, tokens: {} }));
    render(<NewMatchForm />);
    const clock = screen.getByLabelText('Seconds per move') as HTMLInputElement;
    fireEvent.change(clock, { target: { value: '' } });
    expect(clock.value).toBe('');
    fireEvent.change(clock, { target: { value: '30' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start match' })));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).turnTimeoutMs).toBe(30_000);
  });

  it('shows the API error', async () => {
    fetchMock.mockReturnValue(json(400, { error: 'Bad seat', code: 'MISSING_SEAT' }));
    render(<NewMatchForm />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start match' })));
    expect(screen.getByRole('alert')).toHaveTextContent('Bad seat');
  });
});

describe('LiveMatch', () => {
  const match = (status: string) => ({
    id: 'm1', game: 'tictactoe', status, startPosition: '.........', moves: [], toMove: 'x', turnTimeoutMs: 120_000,
    players: { x: { name: 'Claude', kind: 'external' }, o: { name: 'Minimax', kind: 'house' } },
    result: status === 'in-progress' ? null : { outcome: 'win', winner: 'o', reason: 'resignation' },
  });

  it('shows the saved seat tokens while the game is live', async () => {
    sessionStorage.setItem('bot-arena:tokens:m1', JSON.stringify({ x: 'tok-x' }));
    fetchMock.mockReturnValue(json(200, match('in-progress')));
    const { unmount } = render(<LiveMatch id="m1" />);
    expect(await screen.findByText('Seat tokens for your agents')).toBeInTheDocument();
    expect(screen.getAllByText(/tok-x/).length).toBeGreaterThan(0);
    unmount();
  });

  it('drops them once the game is over', async () => {
    sessionStorage.setItem('bot-arena:tokens:m1', JSON.stringify({ x: 'tok-x' }));
    fetchMock.mockReturnValue(json(200, match('completed')));
    render(<LiveMatch id="m1" />);
    expect(await screen.findByText(/Match report/)).toBeInTheDocument();
    expect(screen.queryByText('Seat tokens for your agents')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('bot-arena:tokens:m1')).toBeNull();
  });
});
