
import { matchPersistence } from '../src/lib/match-persistence';
import { MatchState, MatchResult, MatchStatus, MatchOutcome, MatchPlayer } from '../src/lib/match-runner';

describe('Match Persistence (InMemory)', () => {
  const mockMatchId = 'test-match-123';
  const mockPlayer1: MatchPlayer = { id: 'player1', name: 'Bot Alpha', botCode: '', position: 'white' };
  const mockPlayer2: MatchPlayer = { id: 'player2', name: 'Bot Beta', botCode: '', position: 'black' };

  const mockMatchState: MatchState<any, any> = {
    matchId: mockMatchId,
    protocolId: 'chess',
    players: [mockPlayer1, mockPlayer2],
    status: 'in-progress',
    gameState: { board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    turns: [
      { turnNumber: 0, playerId: mockPlayer1.id, execution: { move: 'e2e4', executionTimeMs: 100, timedOut: false, violations: [] }, stateAfter: {}, timestamp: (Date.now() - 5000).toString(), legal: true, validationMessages: [] },
      { turnNumber: 1, playerId: mockPlayer2.id, execution: { move: 'e7e5', executionTimeMs: 120, timedOut: false, violations: [] }, stateAfter: {}, timestamp: (Date.now() - 4000).toString(), legal: true, validationMessages: [] },
    ],
    currentTurn: 2,
    currentPlayerId: mockPlayer1.id,
    startedAt: (Date.now() - 10000).toString(),
    config: {
      matchId: mockMatchId,
      protocolId: 'chess',
      initialState: { board: 'initial' },
      players: [mockPlayer1, mockPlayer2],
      turnTimeoutMs: 2000,
      maxTurns: 1000,
      matchTimeoutMs: 60000,
    },
  };

  const mockMatchResult: MatchResult = {
    outcome: 'win',
    winnerId: mockPlayer1.id,
    loserId: mockPlayer2.id,
    reason: 'Checkmate',
    scores: {
      player1: 1,
      player2: 0,
    },
    statistics: {
      totalTurns: mockMatchState.turns.length,
      durationMs: Date.now() - parseInt(mockMatchState.startedAt),
      players: {
        player1: { avgExecutionTimeMs: 100, maxExecutionTimeMs: 100, timeoutCount: 0, violationCount: 0, illegalMoveCount: 0, errorCount: 0, totalExecutionTimeMs: 100 },
        player2: { avgExecutionTimeMs: 120, maxExecutionTimeMs: 120, timeoutCount: 0, violationCount: 0, illegalMoveCount: 0, errorCount: 0, totalExecutionTimeMs: 120 },
      },
    },
  };

  beforeEach(async () => {
    // Clear state before each test if necessary (for real persistence layers)
    // For in-memory, we assume it's fresh each time the module is imported in a new test run
  });

  it('should save and load match state', async () => {
    await matchPersistence.saveMatchState(mockMatchId, mockMatchState);
    const loadedState = await matchPersistence.loadMatchState(mockMatchId);

    expect(loadedState).toEqual(mockMatchState);
  });

  it('should return null if match state does not exist', async () => {
    const nonExistentMatchId = 'non-existent-match';
    const loadedState = await matchPersistence.loadMatchState(nonExistentMatchId);

    expect(loadedState).toBeNull();
  });

  it('should save and load match result', async () => {
    await matchPersistence.saveMatchResult(mockMatchId, mockMatchResult);
    const loadedResult = await matchPersistence.loadMatchResult(mockMatchId);

    expect(loadedResult).toEqual(mockMatchResult);
  });

  it('should return null if match result does not exist', async () => {
    const nonExistentMatchId = 'non-existent-result';
    const loadedResult = await matchPersistence.loadMatchResult(nonExistentMatchId);

    expect(loadedResult).toBeNull();
  });

  it('should list all saved match IDs', async () => {
    const matchId2 = 'test-match-456';
    const matchId3 = 'test-match-789';

    await matchPersistence.saveMatchState(mockMatchId, mockMatchState);
    await matchPersistence.saveMatchResult(matchId2, mockMatchResult);
    await matchPersistence.saveMatchState(matchId3, mockMatchState);

    const matchIds = await matchPersistence.listMatchIds();
    expect(matchIds).toEqual(expect.arrayContaining([mockMatchId, matchId2, matchId3]));
    expect(matchIds.length).toBe(3);
  });
});
