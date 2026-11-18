/**
 * Tic-tac-toe in the browser: the house bot answers each move, and the score counts the finished game.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TttPlay } from '../ttt-play';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const empty = () => screen.queryAllByRole('button', { name: /: empty$/ }).filter((b) => !(b as HTMLButtonElement).disabled);

it('plays a whole game against Minimax and scores it', () => {
  render(<TttPlay />);
  expect(screen.getByText('You 0 · Minimax 0 · Draws 0')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'b2: empty' }));
  expect(screen.getByRole('button', { name: 'b2: X' })).toBeInTheDocument();
  expect(empty()).toHaveLength(0); // the bot's turn: the board is locked
  act(() => jest.advanceTimersByTime(400));
  expect(screen.getAllByRole('button', { name: /: O$/ })).toHaveLength(1);

  // Keep taking the first free cell until the game ends. Minimax never loses, so it's a loss or a draw.
  for (let i = 0; i < 4 && empty().length; i++) {
    fireEvent.click(empty()[0]);
    act(() => jest.advanceTimersByTime(400));
  }
  expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  expect(screen.getByText(/^You 0 · Minimax (1 · Draws 0|0 · Draws 1)$/)).toBeInTheDocument();
});
