/**
 * Tests for match completion detection and scoring
 */

import {
  detectMatchCompletion,
  calculateFinalScores,
  calculateScoresFromStatistics,
  calculateMatchStatistics,
  determineWinnerAndLoser,
  completeMatch,
} from '../match-completion';
import type {
  MatchState,
  MatchResult,
  MatchStatistics,
  ProtocolDefinition,
  CompletionCheck,
  MatchTurn,
  BotExecutionResult,
  MatchPlayer,
  MatchRunnerConfig,
} from '../match-runner';

// ============================================================================
// Mock Protocol and Helper Functions
// ============================================================================

const createMockProtocol = (): ProtocolDefinition<number, string> => ({
  id: 'test-protocol',
  name: 'Test Protocol',
  initializeState: () => 0,
  validateMove: () => ({ legal: true, messages: [], violations: [] }),
  applyMove: (state, move) => state + 1,
  checkCompletion: (state, turns) => {
    // Complete when state reaches 10 (player with even turn count wins)
    if (state >= 10) {
      const evenTurnPlayer = turns[0]?.playerId || 'player1';
      return {
        complete: true,
        result: {
          outcome: 'win',
          winnerId: evenTurnPlayer,
          loserId: 'player2',
          reason: 'Reached state 10',
          scores: { [evenTurnPlayer]: 1.0, player2: 0.0 },
          statistics: {
            totalTurns: turns.length,
            durationMs: 0,
            players: {},
          },
        },
      };
    }
    return { complete: false };
  },
  getNextPlayer: (state, current) => (current === 'player1' ? 'player2' : 'player1'),
  serializeStateForBot: (state) => state,
});

const createMockMatchState = (overrides?: Partial<MatchState<number, string>>): MatchState<number, string> => {
  const baseConfig: MatchRunnerConfig<number> = {
    matchId: 'test-match',
    protocolId: 'test-protocol',
    initialState: 0,
    players: [
      { id: 'player1', name: 'Player 1', botCode: 'function() {}', position: 'p1' },
      { id: 'player2', name: 'Player 2', botCode: 'function() {}', position: 'p2' },
    ],
    turnTimeoutMs: 5000,
    maxTurns: 100,
    matchTimeoutMs: 300000,
  };

  return {
    matchId: 'test-match',
    protocolId: 'test-protocol',
    status: 'in-progress',
    gameState: 0,
    players: baseConfig.players,
    turns: [],
    currentTurn: 0,
    currentPlayerId: 'player1',
    startedAt: new Date().toISOString(),
    config: baseConfig,
    ...overrides,
  };
};

const createMockTurn = (
  turnNumber: number,
  playerId: string,
  overrides?: Partial<MatchTurn<string>>
): MatchTurn<string> => ({
  turnNumber,
  playerId,
  execution: {
    move: 'move',
    executionTimeMs: 100,
    timedOut: false,
    violations: [],
  },
  stateAfter: turnNumber + 1,
  timestamp: new Date().toISOString(),
  legal: true,
  validationMessages: [],
  ...overrides,
});

// ============================================================================
// Tests: detectMatchCompletion
// ============================================================================

describe('detectMatchCompletion', () => {
  const protocol = createMockProtocol();

  test('detects already completed match', () => {
    const state = createMockMatchState({ status: 'completed' });
    const result = detectMatchCompletion(state, protocol);
    expect(result.complete).toBe(true);
  });

  test('detects abandoned match', () => {
    const state = createMockMatchState({ status: 'abandoned' });
    const result = detectMatchCompletion(state, protocol);
    expect(result.complete).toBe(true);
  });

  test('detects match exceeding max turns', () => {
    const state = createMockMatchState({
      currentTurn: 100,
      config: { ...createMockMatchState().config, maxTurns: 100 },
    });
    const result = detectMatchCompletion(state, protocol);
    expect(result.complete).toBe(true);
    expect(result.result?.outcome).toBe('abandoned');
    expect(result.result?.reason).toContain('maximum turn limit');
  });

  test('detects match exceeding time limit', () => {
    const pastTime = new Date(Date.now() - 400000).toISOString(); // 400s ago
    const state = createMockMatchState({
      startedAt: pastTime,
      config: { ...createMockMatchState().config, matchTimeoutMs: 300000 }, // 300s max
    });
    const result = detectMatchCompletion(state, protocol);
    expect(result.complete).toBe(true);
    expect(result.result?.outcome).toBe('abandoned');
    expect(result.result?.reason).toContain('maximum time limit');
  });

  test('delegates to protocol completion check for in-progress match', () => {
    const state = createMockMatchState({ gameState: 5 });
    const result = detectMatchCompletion(state, protocol);
    expect(result.complete).toBe(false);
  });

  test('protocol detects natural completion', () => {
    const state = createMockMatchState({
      gameState: 10,
      turns: [createMockTurn(0, 'player1')],
    });
    const result = detectMatchCompletion(state, protocol);
    expect(result.complete).toBe(true);
    expect(result.result?.outcome).toBe('win');
  });
});

// ============================================================================
// Tests: calculateMatchStatistics
// ============================================================================

describe('calculateMatchStatistics', () => {
  test('calculates statistics for match with no turns', () => {
    const state = createMockMatchState();
    const stats = calculateMatchStatistics(state);

    expect(stats.totalTurns).toBe(0);
    expect(stats.players.player1.avgExecutionTimeMs).toBe(0);
    expect(stats.players.player2.avgExecutionTimeMs).toBe(0);
  });

  test('calculates statistics for match with turns', () => {
    const turns = [
      createMockTurn(0, 'player1', { execution: { move: 'move', executionTimeMs: 100, timedOut: false, violations: [] } }),
      createMockTurn(1, 'player2', { execution: { move: 'move', executionTimeMs: 200, timedOut: false, violations: [] } }),
      createMockTurn(2, 'player1', { execution: { move: 'move', executionTimeMs: 150, timedOut: false, violations: [] } }),
    ];
    const state = createMockMatchState({ turns });
    const stats = calculateMatchStatistics(state);

    expect(stats.totalTurns).toBe(3);
    expect(stats.players.player1.avgExecutionTimeMs).toBe(125); // (100+150)/2
    expect(stats.players.player1.maxExecutionTimeMs).toBe(150);
    expect(stats.players.player2.avgExecutionTimeMs).toBe(200);
  });

  test('counts timeouts and errors', () => {
    const turns = [
      createMockTurn(0, 'player1', {
        execution: { move: null, executionTimeMs: 5000, timedOut: true, violations: [] },
      }),
      createMockTurn(1, 'player2', {
        execution: {
          move: null,
          executionTimeMs: 100,
          timedOut: false,
          violations: [],
          error: { type: 'runtime-error', message: 'Error' },
        },
      }),
    ];
    const state = createMockMatchState({ turns });
    const stats = calculateMatchStatistics(state);

    expect(stats.players.player1.timeoutCount).toBe(1);
    expect(stats.players.player2.errorCount).toBe(1);
  });

  test('counts illegal moves and violations', () => {
    const turns = [
      createMockTurn(0, 'player1', { legal: false }),
      createMockTurn(1, 'player2', {
        execution: { move: 'move', executionTimeMs: 100, timedOut: false, violations: ['violation1', 'violation2'] },
      }),
    ];
    const state = createMockMatchState({ turns });
    const stats = calculateMatchStatistics(state);

    expect(stats.players.player1.illegalMoveCount).toBe(1);
    expect(stats.players.player2.violationCount).toBe(2);
  });
});

// ============================================================================
// Tests: calculateScoresFromStatistics
// ============================================================================

describe('calculateScoresFromStatistics', () => {
  test('calculates scores for empty statistics', () => {
    const stats: MatchStatistics = {
      totalTurns: 0,
      durationMs: 0,
      players: {},
    };
    const scores = calculateScoresFromStatistics(stats);
    expect(Object.keys(scores)).toHaveLength(0);
  });

  test('calculates scores based on performance', () => {
    const stats: MatchStatistics = {
      totalTurns: 4,
      durationMs: 5000,
      players: {
        player1: {
          avgExecutionTimeMs: 100,
          maxExecutionTimeMs: 150,
          totalExecutionTimeMs: 200,
          timeoutCount: 0,
          violationCount: 0,
          illegalMoveCount: 0,
          errorCount: 0,
        },
        player2: {
          avgExecutionTimeMs: 200,
          maxExecutionTimeMs: 250,
          totalExecutionTimeMs: 400,
          timeoutCount: 1,
          violationCount: 2,
          illegalMoveCount: 1,
          errorCount: 0,
        },
      },
    };
    const scores = calculateScoresFromStatistics(stats);

    // Player1 should have higher score (better performance)
    expect(scores.player1).toBeGreaterThan(scores.player2);
    expect(scores.player1 + scores.player2).toBeCloseTo(1.0, 5);
  });

  test('normalizes scores to sum to 1.0', () => {
    const stats: MatchStatistics = {
      totalTurns: 2,
      durationMs: 1000,
      players: {
        player1: {
          avgExecutionTimeMs: 100,
          maxExecutionTimeMs: 100,
          totalExecutionTimeMs: 100,
          timeoutCount: 0,
          violationCount: 0,
          illegalMoveCount: 0,
          errorCount: 0,
        },
        player2: {
          avgExecutionTimeMs: 100,
          maxExecutionTimeMs: 100,
          totalExecutionTimeMs: 100,
          timeoutCount: 0,
          violationCount: 0,
          illegalMoveCount: 0,
          errorCount: 0,
        },
      },
    };
    const scores = calculateScoresFromStatistics(stats);
    expect(scores.player1 + scores.player2).toBeCloseTo(1.0, 5);
  });
});

// ============================================================================
// Tests: calculateFinalScores
// ============================================================================

describe('calculateFinalScores', () => {
  const mockStats: MatchStatistics = {
    totalTurns: 10,
    durationMs: 5000,
    players: {
      player1: {
        avgExecutionTimeMs: 100,
        maxExecutionTimeMs: 150,
        totalExecutionTimeMs: 1000,
        timeoutCount: 0,
        violationCount: 0,
        illegalMoveCount: 0,
        errorCount: 0,
      },
      player2: {
        avgExecutionTimeMs: 120,
        maxExecutionTimeMs: 180,
        totalExecutionTimeMs: 1200,
        timeoutCount: 0,
        violationCount: 0,
        illegalMoveCount: 0,
        errorCount: 0,
      },
    },
  };

  test('uses existing scores if provided', () => {
    const result: MatchResult = {
      outcome: 'win',
      winnerId: 'player1',
      loserId: 'player2',
      reason: 'Test',
      scores: { player1: 1.0, player2: 0.0 },
      statistics: mockStats,
    };
    const state = createMockMatchState();
    const scored = calculateFinalScores(result, state);
    expect(scored.scores).toEqual({ player1: 1.0, player2: 0.0 });
  });

  test('calculates scores for win outcome', () => {
    const result: MatchResult = {
      outcome: 'win',
      winnerId: 'player1',
      loserId: 'player2',
      reason: 'Test',
      scores: {},
      statistics: mockStats,
    };
    const state = createMockMatchState();
    const scored = calculateFinalScores(result, state);
    expect(scored.scores.player1).toBe(1.0);
    expect(scored.scores.player2).toBe(0.0);
  });

  test('calculates scores for draw outcome', () => {
    const result: MatchResult = {
      outcome: 'draw',
      reason: 'Test',
      scores: {},
      statistics: mockStats,
    };
    const state = createMockMatchState();
    const scored = calculateFinalScores(result, state);
    expect(scored.scores.player1).toBe(0.5);
    expect(scored.scores.player2).toBe(0.5);
  });

  test('calculates scores for disqualified outcome', () => {
    const result: MatchResult = {
      outcome: 'disqualified',
      winnerId: 'player1',
      loserId: 'player2',
      reason: 'Test',
      scores: {},
      statistics: mockStats,
    };
    const state = createMockMatchState();
    const scored = calculateFinalScores(result, state);
    expect(scored.scores.player1).toBe(1.0);
    expect(scored.scores.player2).toBe(0.0);
  });

  test('uses performance-based scoring for abandoned outcome', () => {
    const result: MatchResult = {
      outcome: 'abandoned',
      reason: 'Test',
      scores: {},
      statistics: mockStats,
    };
    const state = createMockMatchState();
    const scored = calculateFinalScores(result, state);
    // Should have calculated scores
    expect(scored.scores.player1).toBeGreaterThan(0);
    expect(scored.scores.player2).toBeGreaterThan(0);
    expect(scored.scores.player1 + scored.scores.player2).toBeCloseTo(1.0, 5);
  });
});

// ============================================================================
// Tests: determineWinnerAndLoser
// ============================================================================

describe('determineWinnerAndLoser', () => {
  test('determines winner and loser from scores', () => {
    const scores = { player1: 0.7, player2: 0.3 };
    const [winner, loser] = determineWinnerAndLoser(scores);
    expect(winner).toBe('player1');
    expect(loser).toBe('player2');
  });

  test('returns undefined for draw', () => {
    const scores = { player1: 0.5, player2: 0.5 };
    const [winner, loser] = determineWinnerAndLoser(scores);
    expect(winner).toBeUndefined();
    expect(loser).toBeUndefined();
  });

  test('returns undefined for single player', () => {
    const scores = { player1: 1.0 };
    const [winner, loser] = determineWinnerAndLoser(scores);
    expect(winner).toBeUndefined();
    expect(loser).toBeUndefined();
  });

  test('returns undefined for no players', () => {
    const scores = {};
    const [winner, loser] = determineWinnerAndLoser(scores);
    expect(winner).toBeUndefined();
    expect(loser).toBeUndefined();
  });
});

// ============================================================================
// Tests: completeMatch
// ============================================================================

describe('completeMatch', () => {
  const protocol = createMockProtocol();

  test('completes match with natural protocol completion', () => {
    const state = createMockMatchState({
      gameState: 10,
      turns: [
        createMockTurn(0, 'player1'),
        createMockTurn(1, 'player2'),
      ],
    });
    const result = completeMatch(state, protocol);

    expect(result.outcome).toBe('win');
    expect(result.winnerId).toBeDefined();
    expect(result.loserId).toBeDefined();
    expect(result.statistics).toBeDefined();
    expect(result.scores).toBeDefined();
  });

  test('throws error for incomplete match', () => {
    const state = createMockMatchState({ gameState: 5 });
    expect(() => completeMatch(state, protocol)).toThrow('not yet complete');
  });

  test('completes abandoned match with statistics', () => {
    const state = createMockMatchState({
      currentTurn: 100,
      config: { ...createMockMatchState().config, maxTurns: 100 },
      turns: [
        createMockTurn(0, 'player1', { execution: { move: 'move', executionTimeMs: 100, timedOut: false, violations: [] } }),
        createMockTurn(1, 'player2', { execution: { move: 'move', executionTimeMs: 200, timedOut: false, violations: [] } }),
      ],
    });
    const result = completeMatch(state, protocol);

    expect(result.outcome).toBe('abandoned');
    expect(result.statistics.totalTurns).toBe(2);
    expect(result.scores.player1).toBeDefined();
    expect(result.scores.player2).toBeDefined();
  });

  test('determines winner and loser when not provided by protocol', () => {
    const mockProtocolWithoutWinner = createMockProtocol();
    mockProtocolWithoutWinner.checkCompletion = (state, turns) => ({
      complete: state >= 10,
      result: state >= 10
        ? {
            outcome: 'win',
            reason: 'Reached state 10',
            scores: { player1: 0.8, player2: 0.2 },
            statistics: {
              totalTurns: turns.length,
              durationMs: 0,
              players: {},
            },
          }
        : undefined,
    });

    const state = createMockMatchState({
      gameState: 10,
      turns: [createMockTurn(0, 'player1')],
    });
    const result = completeMatch(state, mockProtocolWithoutWinner);

    expect(result.winnerId).toBe('player1');
    expect(result.loserId).toBe('player2');
  });
});
