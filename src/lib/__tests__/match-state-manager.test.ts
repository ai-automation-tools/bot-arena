/**
 * Tests for Match State Manager
 */

import {
  initializeMatch,
  startMatch,
  processTurn,
  isMatchComplete,
  getCurrentPlayer,
  getMatchDuration
} from '../match-state-manager';
import {
  MatchRunnerConfig,
  ProtocolDefinition,
  BotExecutionResult,
  MoveValidation,
  CompletionCheck
} from '../match-runner';

// ============================================================================
// Mock Protocol (Simple Counter Game)
// ============================================================================

type CounterState = {
  count: number;
  target: number;
};

type CounterMove = {
  increment: number;
};

const mockProtocol: ProtocolDefinition<CounterState, CounterMove> = {
  id: 'counter',
  name: 'Counter Game',
  
  initializeState: () => ({
    count: 0,
    target: 10
  }),
  
  validateMove: (state, move) => {
    const validation: MoveValidation = {
      legal: true,
      messages: [],
      violations: []
    };
    
    // Move must increment by 1 or 2
    if (move.increment !== 1 && move.increment !== 2) {
      validation.legal = false;
      validation.messages.push('Increment must be 1 or 2');
    }
    
    // Can't go over target
    if (state.count + move.increment > state.target) {
      validation.legal = false;
      validation.messages.push('Would exceed target');
    }
    
    return validation;
  },
  
  applyMove: (state, move) => ({
    ...state,
    count: state.count + move.increment
  }),
  
  checkCompletion: (state, turns) => {
    if (state.count >= state.target) {
      const lastTurn = turns[turns.length - 1];
      return {
        complete: true,
        result: {
          outcome: 'win',
          winnerId: lastTurn?.playerId,
          reason: 'Reached target',
          scores: { [lastTurn?.playerId ?? '']: 1 },
          statistics: {
            totalTurns: turns.length,
            durationMs: 0,
            players: {}
          }
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
// Helper Functions
// ============================================================================

function createMockConfig(): MatchRunnerConfig<CounterState> {
  return {
    matchId: 'test-match-1',
    protocolId: 'counter',
    initialState: { count: 0, target: 10 },
    players: [
      {
        id: 'player1',
        name: 'Bot A',
        botCode: 'function() {}',
        position: 'player1'
      },
      {
        id: 'player2',
        name: 'Bot B',
        botCode: 'function() {}',
        position: 'player2'
      }
    ],
    turnTimeoutMs: 1000,
    maxTurns: 100
  };
}

function createValidMove(increment: number): BotExecutionResult<CounterMove> {
  return {
    move: { increment },
    executionTimeMs: 50,
    timedOut: false,
    violations: []
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Match State Manager', () => {
  describe('initializeMatch', () => {
    it('should create initial match state', () => {
      const config = createMockConfig();
      const state = initializeMatch(config, mockProtocol);
      
      expect(state.matchId).toBe('test-match-1');
      expect(state.status).toBe('initializing');
      expect(state.gameState.count).toBe(0);
      expect(state.currentPlayerId).toBe('player1');
      expect(state.turns).toHaveLength(0);
      expect(state.currentTurn).toBe(0);
    });
    
    it('should throw if no players provided', () => {
      const config = createMockConfig();
      config.players = [];
      
      expect(() => initializeMatch(config, mockProtocol)).toThrow(
        'Match configuration must include at least one player'
      );
    });
  });
  
  describe('startMatch', () => {
    it('should transition from initializing to in-progress', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      
      state = startMatch(state);
      
      expect(state.status).toBe('in-progress');
    });
    
    it('should throw if match is not in initializing status', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      expect(() => startMatch(state)).toThrow(
        'Cannot start match in status: in-progress'
      );
    });
  });
  
  describe('processTurn', () => {
    it('should process a valid move and advance turn', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      const botResult = createValidMove(1);
      state = processTurn(state, botResult, mockProtocol);
      
      expect(state.gameState.count).toBe(1);
      expect(state.currentTurn).toBe(1);
      expect(state.currentPlayerId).toBe('player2');
      expect(state.turns).toHaveLength(1);
      expect(state.turns[0]!.legal).toBe(true);
    });
    
    it('should alternate between players', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      // Player 1 moves
      state = processTurn(state, createValidMove(1), mockProtocol);
      expect(state.currentPlayerId).toBe('player2');
      
      // Player 2 moves
      state = processTurn(state, createValidMove(1), mockProtocol);
      expect(state.currentPlayerId).toBe('player1');
    });
    
    it('should detect and handle illegal moves', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      // Try to increment by 5 (illegal - must be 1 or 2)
      const botResult = createValidMove(5);
      state = processTurn(state, botResult, mockProtocol);
      
      expect(state.status).toBe('completed');
      expect(state.result?.outcome).toBe('disqualified');
      expect(state.result?.loserId).toBe('player1');
      expect(state.result?.winnerId).toBe('player2');
    });
    
    it('should handle bot errors and disqualify player', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      const botResult: BotExecutionResult<CounterMove> = {
        move: null,
        executionTimeMs: 50,
        timedOut: false,
        violations: [],
        error: {
          type: 'runtime-error',
          message: 'Bot crashed'
        }
      };
      
      state = processTurn(state, botResult, mockProtocol);
      
      expect(state.status).toBe('completed');
      expect(state.result?.outcome).toBe('disqualified');
      expect(state.result?.loserId).toBe('player1');
    });
    
    it('should handle bot timeout', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      const botResult: BotExecutionResult<CounterMove> = {
        move: null,
        executionTimeMs: 1500,
        timedOut: true,
        violations: [],
        error: {
          type: 'timeout',
          message: 'Bot exceeded time limit'
        }
      };
      
      state = processTurn(state, botResult, mockProtocol);
      
      expect(state.status).toBe('completed');
      expect(state.result?.outcome).toBe('disqualified');
      expect(state.result?.reason).toContain('timeout');
    });
    
    it('should detect match completion', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      // Move to count = 10 (target)
      for (let i = 0; i < 5; i++) {
        state = processTurn(state, createValidMove(2), mockProtocol);
        if (state.status === 'completed') break;
      }
      
      expect(state.status).toBe('completed');
      expect(state.result?.outcome).toBe('win');
      expect(state.gameState.count).toBe(10);
    });
    
    it('should abandon match after max turns', () => {
      const config = createMockConfig();
      config.maxTurns = 5;
      
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      // Execute 5 turns without reaching target
      for (let i = 0; i < 5; i++) {
        state = processTurn(state, createValidMove(1), mockProtocol);
      }
      
      expect(state.status).toBe('completed');
      expect(state.result?.outcome).toBe('abandoned');
      expect(state.result?.reason).toContain('Maximum turn limit');
    });
    
    it('should track execution statistics', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      // Player 1: 50ms
      state = processTurn(state, createValidMove(1), mockProtocol);
      
      // Player 2: 100ms
      const slowMove = createValidMove(1);
      slowMove.executionTimeMs = 100;
      state = processTurn(state, slowMove, mockProtocol);
      
      // Player 1: 75ms
      const mediumMove = createValidMove(1);
      mediumMove.executionTimeMs = 75;
      state = processTurn(state, mediumMove, mockProtocol);
      
      expect(state.turns).toHaveLength(3);
      
      // Complete the match to calculate stats
      for (let i = 0; i < 10; i++) {
        if (state.status === 'completed') break;
        state = processTurn(state, createValidMove(2), mockProtocol);
      }
      
      const player1Stats = state.result?.statistics.players['player1'];
      expect(player1Stats).toBeDefined();
      expect(player1Stats!.totalExecutionTimeMs).toBeGreaterThan(0);
      expect(player1Stats!.maxExecutionTimeMs).toBeGreaterThan(0);
    });
  });
  
  describe('isMatchComplete', () => {
    it('should return false for in-progress match', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      expect(isMatchComplete(state)).toBe(false);
    });
    
    it('should return true for completed match', () => {
      const config = createMockConfig();
      let state = initializeMatch(config, mockProtocol);
      state = startMatch(state);
      
      // Complete the match
      for (let i = 0; i < 10; i++) {
        state = processTurn(state, createValidMove(2), mockProtocol);
        if (state.status === 'completed') break;
      }
      
      expect(isMatchComplete(state)).toBe(true);
    });
  });
  
  describe('getCurrentPlayer', () => {
    it('should return the current player object', () => {
      const config = createMockConfig();
      const state = initializeMatch(config, mockProtocol);
      
      const currentPlayer = getCurrentPlayer(state);
      
      expect(currentPlayer?.id).toBe('player1');
      expect(currentPlayer?.name).toBe('Bot A');
    });
  });
  
  describe('getMatchDuration', () => {
    it('should calculate match duration', () => {
      const config = createMockConfig();
      const state = initializeMatch(config, mockProtocol);
      
      const duration = getMatchDuration(state);
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
