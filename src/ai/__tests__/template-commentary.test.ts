import { aiShoutcaster } from '@/ai/flows/ai-shoutcaster';
import { postMatchAuditor } from '@/ai/flows/post-match-auditor';

const state = (status: string, moves: number) =>
  `FEN: 8/8/8/8/8/8/8/8 w - - 0 1\n${status}\nMoves played: ${moves}`;

describe('template commentary (no model call)', () => {
  it('names the side that just delivered checkmate', async () => {
    const { commentary } = await aiShoutcaster({
      gameState: state('White to move - CHECKMATE!', 41), eventLog: '', commentaryMode: 'analyst',
    });
    expect(commentary).toBe('/// CHECKMATE. Black wins after 41 moves. ///');
  });

  it('reports check for the side to move', async () => {
    const { commentary } = await aiShoutcaster({
      gameState: state('Black to move - CHECK!', 12), eventLog: '', commentaryMode: 'analyst',
    });
    expect(commentary).toContain('Black is in check after move 12');
  });

  it('debug mode echoes the state and the last event', async () => {
    const { commentary } = await aiShoutcaster({
      gameState: state('White to move', 3), eventLog: 'e4\ne5\nNf3', commentaryMode: 'debug',
    });
    expect(commentary).toContain('Moves played: 3');
    expect(commentary).toContain('Last event: Nf3');
  });

  it('post-match audit counts rule violations from the metrics', async () => {
    const audit = await postMatchAuditor({
      matchSummary: ' A won. ', agent1Metrics: 'Violations: 0.', agent2Metrics: 'Violations: 2.',
    });
    expect(audit.strategicSummary).toBe('A won.');
    expect(audit.failureDiagnosis).toBe('Rule violations recorded: Agent 1 0, Agent 2 2.');
  });
});
