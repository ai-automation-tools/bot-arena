/**
 * Match State Manager
 * 
 * Core logic for managing match state, turn progression, and lifecycle transitions.
 * Works with any protocol that implements the ProtocolDefinition interface.
 */

import {
  MatchState,
  MatchRunnerConfig,
  MatchTurn,
  MatchStatus,
  MatchResult,
  MatchStatistics,
  PlayerStatistics,
  ProtocolDefinition,
  BotExecutionResult,
  MatchOutcome
} from './match-runner';

// ============================================================================
// Match Initialization
// ============================================================================

/**
 * Initialize a new match state from configuration
 */
export function initializeMatch<TState = unknown>(
  config: MatchRunnerConfig<TState>,
  protocol: ProtocolDefinition<TState, unknown>
): MatchState<TState, unknown> {
  // Get initial game state from protocol
  const gameState = config.initialState ?? protocol.initializeState();
  
  // Determine starting player (first in players array by default)
  const firstPlayer = config.players[0];
  if (!firstPlayer) {
    throw new Error('Match configuration must include at least one player');
  }

  return {
    matchId: config.matchId,
    protocolId: config.protocolId,
    status: 'initializing',
    gameState,
    players: config.players,
    turns: [],
    currentTurn: 0,
    currentPlayerId: firstPlayer.id,
    startedAt: new Date().toISOString(),
    config
  };
}

/**
 * Transition match from 'initializing' to 'in-progress'
 */
export function startMatch<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>
): MatchState<TState, TMove> {
  if (state.status !== 'initializing') {
    throw new Error(`Cannot start match in status: ${state.status}`);
  }

  return {
    ...state,
    status: 'in-progress'
  };
}

// ============================================================================
// Turn Processing
// ============================================================================

/**
 * Process a bot execution result and update match state
 * 
 * This is the core turn progression function that:
 * 1. Validates the move
 * 2. Applies it to game state (if legal)
 * 3. Records the turn
 * 4. Checks for match completion
 * 5. Advances to next player
 */
export function processTurn<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  botResult: BotExecutionResult<TMove>,
  protocol: ProtocolDefinition<TState, TMove>
): MatchState<TState, TMove> {
  if (state.status !== 'in-progress') {
    throw new Error(`Cannot process turn in status: ${state.status}`);
  }

  // Handle bot errors (timeout, runtime error, etc.)
  if (botResult.error) {
    return handleBotError(state, botResult, protocol);
  }

  // Validate the move
  const move = botResult.move;
  if (move === null || move === undefined) {
    return handleInvalidMove(state, botResult, 'Bot returned null or undefined move');
  }

  const validation = protocol.validateMove(state.gameState, move, state.currentPlayerId);
  
  // Apply move to state (even if illegal, for replay purposes)
  let newGameState = state.gameState;
  if (validation.legal) {
    newGameState = protocol.applyMove(state.gameState, move, state.currentPlayerId);
  }

  // Record the turn
  const turn: MatchTurn<TMove> = {
    turnNumber: state.currentTurn,
    playerId: state.currentPlayerId,
    execution: botResult,
    stateAfter: newGameState,
    timestamp: new Date().toISOString(),
    legal: validation.legal,
    validationMessages: validation.messages
  };

  const updatedTurns = [...state.turns, turn];

  // Check if illegal move ends the match
  if (!validation.legal) {
    return handleIllegalMove(state, updatedTurns, newGameState, protocol);
  }

  // Check for match completion
  const completionCheck = protocol.checkCompletion(newGameState, updatedTurns);
  
  if (completionCheck.complete && completionCheck.result) {
    return completeMatch(state, updatedTurns, newGameState, completionCheck.result);
  }

  // Check max turns limit
  if (updatedTurns.length >= state.config.maxTurns) {
    return abandonMatch(state, updatedTurns, newGameState, 'Maximum turn limit reached');
  }

  // Advance to next turn
  const nextPlayerId = protocol.getNextPlayer(newGameState, state.currentPlayerId);
  
  return {
    ...state,
    gameState: newGameState,
    turns: updatedTurns,
    currentTurn: state.currentTurn + 1,
    currentPlayerId: nextPlayerId
  };
}

// ============================================================================
// Error and Edge Case Handling
// ============================================================================

/**
 * Handle bot execution errors (timeout, crash, etc.)
 */
function handleBotError<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  botResult: BotExecutionResult<TMove>,
  protocol: ProtocolDefinition<TState, TMove>
): MatchState<TState, TMove> {
  const turn: MatchTurn<TMove> = {
    turnNumber: state.currentTurn,
    playerId: state.currentPlayerId,
    execution: botResult,
    stateAfter: state.gameState,
    timestamp: new Date().toISOString(),
    legal: false,
    validationMessages: [botResult.error?.message ?? 'Unknown error']
  };

  const updatedTurns = [...state.turns, turn];

  // Disqualify player due to error
  const winnerId = state.players.find(p => p.id !== state.currentPlayerId)?.id;
  
  const result: MatchResult = {
    outcome: 'disqualified',
    winnerId,
    loserId: state.currentPlayerId,
    reason: `Bot error: ${botResult.error?.type} - ${botResult.error?.message}`,
    scores: calculateScores(state.players, winnerId),
    statistics: calculateStatistics(state, updatedTurns)
  };

  return completeMatch(state, updatedTurns, state.gameState, result);
}

/**
 * Handle invalid moves (null/undefined returns)
 */
function handleInvalidMove<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  botResult: BotExecutionResult<TMove>,
  message: string
): MatchState<TState, TMove> {
  const turn: MatchTurn<TMove> = {
    turnNumber: state.currentTurn,
    playerId: state.currentPlayerId,
    execution: botResult,
    stateAfter: state.gameState,
    timestamp: new Date().toISOString(),
    legal: false,
    validationMessages: [message]
  };

  const updatedTurns = [...state.turns, turn];

  // Disqualify player for invalid move
  const winnerId = state.players.find(p => p.id !== state.currentPlayerId)?.id;
  
  const result: MatchResult = {
    outcome: 'disqualified',
    winnerId,
    loserId: state.currentPlayerId,
    reason: message,
    scores: calculateScores(state.players, winnerId),
    statistics: calculateStatistics(state, updatedTurns)
  };

  return completeMatch(state, updatedTurns, state.gameState, result);
}

/**
 * Handle illegal moves (protocol rule violations)
 */
function handleIllegalMove<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  turns: MatchTurn<TMove>[],
  gameState: TState,
  protocol: ProtocolDefinition<TState, TMove>
): MatchState<TState, TMove> {
  const winnerId = state.players.find(p => p.id !== state.currentPlayerId)?.id;
  
  const result: MatchResult = {
    outcome: 'disqualified',
    winnerId,
    loserId: state.currentPlayerId,
    reason: 'Illegal move',
    scores: calculateScores(state.players, winnerId),
    statistics: calculateStatistics(state, turns)
  };

  return completeMatch(state, turns, gameState, result);
}

/**
 * Abandon match (max turns exceeded)
 */
function abandonMatch<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  turns: MatchTurn<TMove>[],
  gameState: TState,
  reason: string
): MatchState<TState, TMove> {
  const result: MatchResult = {
    outcome: 'abandoned',
    reason,
    scores: {},
    statistics: calculateStatistics(state, turns)
  };

  return completeMatch(state, turns, gameState, result);
}

// ============================================================================
// Match Completion
// ============================================================================

/**
 * Mark match as completed with final result
 */
function completeMatch<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  turns: MatchTurn<TMove>[],
  finalGameState: TState,
  result: MatchResult
): MatchState<TState, TMove> {
  return {
    ...state,
    status: 'completed',
    gameState: finalGameState,
    turns,
    completedAt: new Date().toISOString(),
    result
  };
}

// ============================================================================
// Statistics Calculation
// ============================================================================

/**
 * Calculate aggregate match statistics
 */
function calculateStatistics<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  turns: MatchTurn<TMove>[]
): MatchStatistics {
  const playerStats: Record<string, PlayerStatistics> = {};
  
  // Initialize stats for each player
  for (const player of state.players) {
    playerStats[player.id] = {
      avgExecutionTimeMs: 0,
      maxExecutionTimeMs: 0,
      totalExecutionTimeMs: 0,
      timeoutCount: 0,
      violationCount: 0,
      illegalMoveCount: 0,
      errorCount: 0
    };
  }

  // Accumulate stats from turns
  for (const turn of turns) {
    const stats = playerStats[turn.playerId];
    if (!stats) continue;

    const execution = turn.execution;
    
    stats.totalExecutionTimeMs += execution.executionTimeMs;
    stats.maxExecutionTimeMs = Math.max(stats.maxExecutionTimeMs, execution.executionTimeMs);
    
    if (execution.timedOut) {
      stats.timeoutCount++;
    }
    
    if (execution.violations.length > 0) {
      stats.violationCount += execution.violations.length;
    }
    
    if (!turn.legal) {
      stats.illegalMoveCount++;
    }
    
    if (execution.error) {
      stats.errorCount++;
    }
  }

  // Calculate averages
  for (const playerId in playerStats) {
    const stats = playerStats[playerId];
    const playerTurns = turns.filter(t => t.playerId === playerId);
    
    if (playerTurns.length > 0) {
      stats.avgExecutionTimeMs = stats.totalExecutionTimeMs / playerTurns.length;
    }
  }

  const startTime = new Date(state.startedAt).getTime();
  const endTime = new Date().getTime();
  
  return {
    totalTurns: turns.length,
    durationMs: endTime - startTime,
    players: playerStats
  };
}

/**
 * Calculate final scores for players
 */
function calculateScores(
  players: { id: string; name: string }[],
  winnerId?: string
): Record<string, number> {
  const scores: Record<string, number> = {};
  
  for (const player of players) {
    scores[player.id] = player.id === winnerId ? 1 : 0;
  }
  
  return scores;
}

// ============================================================================
// State Queries
// ============================================================================

/**
 * Check if match is in a terminal state
 */
export function isMatchComplete(state: MatchState): boolean {
  return ['completed', 'abandoned', 'error'].includes(state.status);
}

/**
 * Get the current player object
 */
export function getCurrentPlayer(state: MatchState) {
  return state.players.find(p => p.id === state.currentPlayerId);
}

/**
 * Get player statistics for a specific player
 */
export function getPlayerStats(
  state: MatchState,
  playerId: string
): PlayerStatistics | null {
  return state.result?.statistics.players[playerId] ?? null;
}

/**
 * Get match duration in milliseconds
 */
export function getMatchDuration(state: MatchState): number {
  const startTime = new Date(state.startedAt).getTime();
  const endTime = state.completedAt 
    ? new Date(state.completedAt).getTime() 
    : new Date().getTime();
  
  return endTime - startTime;
}
