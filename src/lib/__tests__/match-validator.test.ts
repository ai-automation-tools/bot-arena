/**
 * Match Validator Tests
 * 
 * Test suite for match configuration, bot code, and move validation.
 */

import {
  validateMatchConfig,
  validatePlayer,
  validateMove,
  validateBotExecutionResult,
  validateMatchState,
  mergeValidationResults
} from '../match-validator';
import type {
  MatchRunnerConfig,
  MatchPlayer,
  MatchState,
  ProtocolDefinition,
  BotExecutionResult
} from '../match-runner';

// ============================================================================
// Mock Protocol for Testing
// ============================================================================

interface MockGameState {
  value: number;
  maxValue: number;
}

type MockMove = { increment: number };

const mockProtocol: ProtocolDefinition<MockGameState, MockMove> = {
  id: 'mock-protocol',
  name: 'Mock Protocol',
  initializeState: () => ({ value: 0, maxValue: 10 }),
  validateMove: (state, move) => {
    if (move.increment < 1 || move.increment > 3) {
      return { legal: false, messages: ['Increment must be between 1 and 3'], violations: [] };
    }
    if (state.value + move.increment > state.maxValue) {
      return { legal: false, messages: ['Move would exceed max value'], violations: [] };
    }
    return { legal: true, messages: [], violations: [] };
  },
  applyMove: (state, move) => ({
    ...state,
    value: state.value + move.increment
  }),
  checkCompletion: (state, turns) => {
    if (state.value >= state.maxValue) {
      const lastTurn = turns[turns.length - 1];
      return { 
        complete: true, 
        result: { 
          outcome: 'win', 
          reason: 'Target reached', 
          scores: {}, 
          statistics: {
            totalTurns: turns.length,
            durationMs: 0,
            players: {},
          },
        }
      };
    }
    return { complete: false };
  },
  getNextPlayer: (state, currentPlayerId) => {
    return currentPlayerId === 'player1' ? 'player2' : 'player1';
  },
  serializeStateForBot: (state) => state
};

// ============================================================================
// Match Configuration Validation Tests
// ============================================================================

describe('validateMatchConfig', () => {
  test('valid configuration passes validation', () => {
    const config: MatchRunnerConfig<MockGameState> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      initialState: { value: 0, maxValue: 10 },
      players: [
        {
          id: 'player1',
          name: 'Bot A',
          botCode: 'export default function(state, config) { return { increment: 1 }; }',
          position: 'player1'
        },
        {
          id: 'player2',
          name: 'Bot B',
          botCode: 'export default function(state, config) { return { increment: 2 }; }',
          position: 'player2'
        }
      ],
      turnTimeoutMs: 5000,
      matchTimeoutMs: 60000,
      maxTurns: 100
    };

    const result = validateMatchConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing match ID fails validation', () => {
    const config: MatchRunnerConfig<MockGameState> = {
      matchId: '',
      protocolId: 'mock-protocol',
      initialState: { value: 0, maxValue: 10 },
      players: [],
      turnTimeoutMs: 5000,
      matchTimeoutMs: 60000,
      maxTurns: 100
    };

    const result = validateMatchConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_MATCH_ID' })
    );
  });

  test('no players fails validation', () => {
    const config: MatchRunnerConfig<MockGameState> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      initialState: { value: 0, maxValue: 10 },
      players: [],
      turnTimeoutMs: 5000,
      matchTimeoutMs: 60000,
      maxTurns: 100
    };

    const result = validateMatchConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'NO_PLAYERS' })
    );
  });

  test('duplicate player IDs fail validation', () => {
    const config: MatchRunnerConfig<MockGameState> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      initialState: { value: 0, maxValue: 10 },
      players: [
        {
          id: 'player1',
          name: 'Bot A',
          botCode: 'export default function(state, config) { return { increment: 1 }; }',
          position: 'player1'
        },
        {
          id: 'player1', // duplicate
          name: 'Bot B',
          botCode: 'export default function(state, config) { return { increment: 2 }; }',
          position: 'player2'
        }
      ],
      turnTimeoutMs: 5000,
      matchTimeoutMs: 60000,
      maxTurns: 100
    };

    const result = validateMatchConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_PLAYER_IDS' })
    );
  });

  test('invalid timeouts fail validation', () => {
    const config: MatchRunnerConfig<MockGameState> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      initialState: { value: 0, maxValue: 10 },
      players: [
        {
          id: 'player1',
          name: 'Bot A',
          botCode: 'export default function(state, config) { return { increment: 1 }; }',
          position: 'player1'
        }
      ],
      turnTimeoutMs: -100,
      matchTimeoutMs: 0,
      maxTurns: 100
    };

    const result = validateMatchConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_TURN_TIMEOUT' })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_MATCH_TIMEOUT' })
    );
  });

  test('high max turns generates warning', () => {
    const config: MatchRunnerConfig<MockGameState> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      initialState: { value: 0, maxValue: 10 },
      players: [
        {
          id: 'player1',
          name: 'Bot A',
          botCode: 'export default function(state, config) { return { increment: 1 }; }',
          position: 'player1'
        }
      ],
      turnTimeoutMs: 5000,
      matchTimeoutMs: 60000,
      maxTurns: 50000
    };

    const result = validateMatchConfig(config);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'HIGH_MAX_TURNS' })
    );
  });
});

// ============================================================================
// Player Validation Tests
// ============================================================================

describe('validatePlayer', () => {
  test('valid player passes validation', () => {
    const player: MatchPlayer = {
      id: 'player1',
      name: 'Test Bot',
      botCode: 'export default function(state, config) { return { increment: 1 }; }',
      position: 'player1'
    };

    const errors = validatePlayer(player);
    expect(errors).toHaveLength(0);
  });

  test('missing player ID fails validation', () => {
    const player: MatchPlayer = {
      id: '',
      name: 'Test Bot',
      botCode: 'export default function(state, config) { return { increment: 1 }; }',
      position: 'player1'
    };

    const errors = validatePlayer(player);
    expect(errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_PLAYER_ID' })
    );
  });

  test('missing bot code fails validation', () => {
    const player: MatchPlayer = {
      id: 'player1',
      name: 'Test Bot',
      botCode: '',
      position: 'player1'
    };

    const errors = validatePlayer(player);
    expect(errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_BOT_CODE' })
    );
  });
});

// ============================================================================
// Bot Code Validation Tests
// ============================================================================

describe('validateMove', () => {
  test('legal move passes validation', () => {
    const state: MockGameState = { value: 5, maxValue: 10 };
    const move: MockMove = { increment: 2 };

    const result = validateMove(state, move, 'player1', mockProtocol);
    expect(result.legal).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('null move fails validation', () => {
    const state: MockGameState = { value: 5, maxValue: 10 };

    const result = validateMove(state, null, 'player1', mockProtocol);
    expect(result.legal).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'NULL_MOVE' })
    );
  });

  test('illegal move fails validation', () => {
    const state: MockGameState = { value: 5, maxValue: 10 };
    const move: MockMove = { increment: 10 }; // Too large

    const result = validateMove(state, move, 'player1', mockProtocol);
    expect(result.legal).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'ILLEGAL_MOVE' })
    );
  });

  test('validation includes timing metadata', () => {
    const state: MockGameState = { value: 5, maxValue: 10 };
    const move: MockMove = { increment: 2 };

    const result = validateMove(state, move, 'player1', mockProtocol);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.evaluationTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Bot Execution Result Validation Tests
// ============================================================================

describe('validateBotExecutionResult', () => {
  test('successful execution passes validation', () => {
    const result: BotExecutionResult<MockMove> = {
      move: { increment: 1 },
      executionTimeMs: 50,
      timedOut: false,
      violations: [],
    };

    const validation = validateBotExecutionResult(result);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('execution with error fails validation', () => {
    const result: BotExecutionResult<MockMove> = {
      move: null,
      executionTimeMs: 50,
      timedOut: false,
      violations: [],
      error: {
        type: 'runtime-error',
        message: 'Bot crashed'
      }
    };

    const validation = validateBotExecutionResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContainEqual(
      expect.objectContaining({ code: 'BOT_ERROR_RUNTIME-ERROR' })
    );
  });

  test('slow execution generates warning', () => {
    const result: BotExecutionResult<MockMove> = {
      move: { increment: 1 },
      executionTimeMs: 6000, // > 5 seconds
      timedOut: false,
      violations: [],
    };

    const validation = validateBotExecutionResult(result);
    expect(validation.warnings).toContainEqual(
      expect.objectContaining({ code: 'SLOW_EXECUTION' })
    );
  });
});

// ============================================================================
// Match State Validation Tests
// ============================================================================

describe('validateMatchState', () => {
  test('valid match state passes validation', () => {
    const state: MatchState<MockGameState, MockMove> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      status: 'in-progress',
      gameState: { value: 5, maxValue: 10 },
      players: [
        { id: 'player1', name: 'Bot A', botCode: 'code', position: 'player1' },
        { id: 'player2', name: 'Bot B', botCode: 'code', position: 'player2' }
      ],
      turns: [],
      currentTurn: 0,
      currentPlayerId: 'player1',
      startedAt: new Date().toISOString(),
      config: {
        matchId: 'match-123',
        protocolId: 'mock-protocol',
        initialState: { value: 0, maxValue: 10 },
        players: [
          { id: 'player1', name: 'Bot A', botCode: 'code', position: 'player1' },
          { id: 'player2', name: 'Bot B', botCode: 'code', position: 'player2' }
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 60000,
        maxTurns: 100
      }
    };

    const result = validateMatchState(state);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('invalid current player ID fails validation', () => {
    const state: MatchState<MockGameState, MockMove> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      status: 'in-progress',
      gameState: { value: 5, maxValue: 10 },
      players: [
        { id: 'player1', name: 'Bot A', botCode: 'code', position: 'player1' }
      ],
      turns: [],
      currentTurn: 0,
      currentPlayerId: 'nonexistent-player',
      startedAt: new Date().toISOString(),
      config: {
        matchId: 'match-123',
        protocolId: 'mock-protocol',
        initialState: { value: 0, maxValue: 10 },
        players: [
          { id: 'player1', name: 'Bot A', botCode: 'code', position: 'player1' }
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 60000,
        maxTurns: 100
      }
    };

    const result = validateMatchState(state);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_CURRENT_PLAYER' })
    );
  });

  test('completed match without result fails validation', () => {
    const state: MatchState<MockGameState, MockMove> = {
      matchId: 'match-123',
      protocolId: 'mock-protocol',
      status: 'completed',
      gameState: { value: 10, maxValue: 10 },
      players: [
        { id: 'player1', name: 'Bot A', botCode: 'code', position: 'player1' }
      ],
      turns: [],
      currentTurn: 0,
      currentPlayerId: 'player1',
      startedAt: new Date().toISOString(),
      config: {
        matchId: 'match-123',
        protocolId: 'mock-protocol',
        initialState: { value: 0, maxValue: 10 },
        players: [
          { id: 'player1', name: 'Bot A', botCode: 'code', position: 'player1' }
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 60000,
        maxTurns: 100
      }
      // missing result
    };

    const result = validateMatchState(state);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_RESULT' })
    );
  });
});

// ============================================================================
// Utility Tests
// ============================================================================

describe('mergeValidationResults', () => {
  test('merges multiple validation results', () => {
    const result1 = {
      valid: false,
      errors: [{ code: 'ERROR_1', message: 'Error 1' }],
      warnings: [{ code: 'WARNING_1', message: 'Warning 1' }]
    };

    const result2 = {
      valid: false,
      errors: [{ code: 'ERROR_2', message: 'Error 2' }],
      warnings: []
    };

    const merged = mergeValidationResults(result1, result2);
    expect(merged.valid).toBe(false);
    expect(merged.errors).toHaveLength(2);
    expect(merged.warnings).toHaveLength(1);
  });

  test('merged result is valid only if all inputs are valid', () => {
    const result1 = { valid: true, errors: [], warnings: [] };
    const result2 = { valid: true, errors: [], warnings: [] };

    const merged = mergeValidationResults(result1, result2);
    expect(merged.valid).toBe(true);
  });
});