/**
 * Match Completion Detection and Scoring
 * 
 * Handles match completion detection, final scoring, winner determination,
 * and statistics aggregation.
 */

import type {
  MatchState,
  MatchResult,
  MatchOutcome,
  MatchStatistics,
  PlayerStatistics,
  MatchTurn,
  ProtocolDefinition,
  CompletionCheck,
} from './match-runner';

// ============================================================================
// Completion Detection
// ============================================================================

/**
 * Check if a match is complete based on protocol rules and match state
 * 
 * @param state - Current match state
 * @param protocol - Protocol definition with completion rules
 * @returns CompletionCheck with completion status and optional result
 */
export function detectMatchCompletion<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  protocol: ProtocolDefinition<TState, TMove>
): CompletionCheck {
  // Check if match is already in a terminal state
  if (state.status === 'completed' || state.status === 'abandoned' || state.status === 'error') {
    return {
      complete: true,
      result: state.result,
    };
  }

  // Check if match exceeded max turns (abandonment)
  if (state.currentTurn >= state.config.maxTurns) {
    return {
      complete: true,
      result: createAbandonedResult(state, 'Match exceeded maximum turn limit'),
    };
  }

  // Check if match exceeded total time limit
  const matchDuration = Date.now() - new Date(state.startedAt).getTime();
  if (matchDuration >= state.config.matchTimeoutMs) {
    return {
      complete: true,
      result: createAbandonedResult(state, 'Match exceeded maximum time limit'),
    };
  }

  // Delegate to protocol-specific completion check
  return protocol.checkCompletion(state.gameState, state.turns);
}

/**
 * Create an abandoned match result
 */
function createAbandonedResult<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  reason: string
): MatchResult {
  const statistics = calculateMatchStatistics(state);
  const scores = calculateScoresFromStatistics(statistics);

  return {
    outcome: 'abandoned',
    reason,
    scores,
    statistics,
  };
}

// ============================================================================
// Scoring Logic
// ============================================================================

/**
 * Calculate final scores based on match outcome and statistics
 * 
 * For natural wins/losses, uses the protocol's provided scores.
 * For disqualifications, assigns 0 to disqualified player.
 * For abandoned matches, uses performance-based scoring.
 * 
 * @param result - Match result from protocol or error handling
 * @param state - Current match state
 * @returns Updated match result with calculated scores
 */
export function calculateFinalScores<TState = unknown, TMove = unknown>(
  result: MatchResult,
  state: MatchState<TState, TMove>
): MatchResult {
  // If scores already provided (e.g., from protocol), return as-is
  if (result.scores && Object.keys(result.scores).length > 0) {
    return result;
  }

  const statistics = result.statistics;

  switch (result.outcome) {
    case 'win':
      // Winner gets 1.0, loser gets 0.0
      return {
        ...result,
        scores: {
          [result.winnerId!]: 1.0,
          [result.loserId!]: 0.0,
        },
      };

    case 'draw':
      // Both players get 0.5
      return {
        ...result,
        scores: Object.fromEntries(
          Object.keys(statistics.players).map((playerId) => [playerId, 0.5])
        ),
      };

    case 'disqualified':
      // Disqualified player gets 0, winner gets 1.0
      return {
        ...result,
        scores: {
          [result.winnerId!]: 1.0,
          [result.loserId!]: 0.0,
        },
      };

    case 'abandoned':
    case 'error':
      // Performance-based scoring for abandoned/error matches
      return {
        ...result,
        scores: calculateScoresFromStatistics(statistics),
      };

    default:
      return result;
  }
}

/**
 * Calculate performance-based scores from statistics
 * 
 * Scoring criteria (all normalized 0-1):
 * - Lower average execution time (30% weight)
 * - Fewer errors (25% weight)
 * - Fewer timeouts (20% weight)
 * - Fewer illegal moves (15% weight)
 * - Fewer violations (10% weight)
 * 
 * @param statistics - Match statistics
 * @returns Score mapping by player ID (0.0 to 1.0)
 */
export function calculateScoresFromStatistics(statistics: MatchStatistics): Record<string, number> {
  const playerIds = Object.keys(statistics.players);
  const scores: Record<string, number> = {};

  // Edge case: no players
  if (playerIds.length === 0) {
    return scores;
  }

  // Calculate raw scores for each player
  const rawScores = playerIds.map((playerId) => {
    const stats = statistics.players[playerId];

    // Normalize execution time (lower is better)
    const maxExecTime = Math.max(...playerIds.map((id) => statistics.players[id].avgExecutionTimeMs));
    const execScore = maxExecTime > 0 ? 1 - stats.avgExecutionTimeMs / maxExecTime : 0.5;

    // Error penalties (lower is better)
    const errorScore = 1 / (1 + stats.errorCount);
    const timeoutScore = 1 / (1 + stats.timeoutCount);
    const illegalMoveScore = 1 / (1 + stats.illegalMoveCount);
    const violationScore = 1 / (1 + stats.violationCount);

    // Weighted composite score
    const compositeScore =
      execScore * 0.3 +
      errorScore * 0.25 +
      timeoutScore * 0.2 +
      illegalMoveScore * 0.15 +
      violationScore * 0.1;

    return { playerId, score: compositeScore };
  });

  // Normalize scores to sum to 1.0 (for multi-player support)
  const totalScore = rawScores.reduce((sum, { score }) => sum + score, 0);
  rawScores.forEach(({ playerId, score }) => {
    scores[playerId] = totalScore > 0 ? score / totalScore : 1.0 / playerIds.length;
  });

  return scores;
}

// ============================================================================
// Statistics Aggregation
// ============================================================================

/**
 * Calculate aggregate match statistics from match state
 * 
 * @param state - Current match state
 * @returns Complete match statistics
 */
export function calculateMatchStatistics<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>
): MatchStatistics {
  const playerStats: Record<string, PlayerStatistics> = {};

  // Initialize stats for each player
  state.players.forEach((player) => {
    playerStats[player.id] = {
      avgExecutionTimeMs: 0,
      maxExecutionTimeMs: 0,
      totalExecutionTimeMs: 0,
      timeoutCount: 0,
      violationCount: 0,
      illegalMoveCount: 0,
      errorCount: 0,
    };
  });

  // Aggregate statistics from turns
  state.turns.forEach((turn) => {
    const stats = playerStats[turn.playerId];
    if (!stats) return; // Skip if player not found

    const execTime = turn.execution.executionTimeMs;
    stats.totalExecutionTimeMs += execTime;
    stats.maxExecutionTimeMs = Math.max(stats.maxExecutionTimeMs, execTime);

    if (turn.execution.timedOut) {
      stats.timeoutCount++;
    }

    if (turn.execution.error) {
      stats.errorCount++;
    }

    if (turn.execution.violations.length > 0) {
      stats.violationCount += turn.execution.violations.length;
    }

    if (!turn.legal) {
      stats.illegalMoveCount++;
    }
  });

  // Calculate averages
  Object.keys(playerStats).forEach((playerId) => {
    const stats = playerStats[playerId];
    const playerTurns = state.turns.filter((t) => t.playerId === playerId).length;
    stats.avgExecutionTimeMs =
      playerTurns > 0 ? stats.totalExecutionTimeMs / playerTurns : 0;
  });

  // Calculate total match duration
  const durationMs = state.completedAt
    ? new Date(state.completedAt).getTime() - new Date(state.startedAt).getTime()
    : Date.now() - new Date(state.startedAt).getTime();

  return {
    totalTurns: state.turns.length,
    durationMs,
    players: playerStats,
  };
}

/**
 * Determine winner and loser from scores
 * 
 * @param scores - Score mapping by player ID
 * @returns Tuple of [winnerId, loserId] or [undefined, undefined] for draws/errors
 */
export function determineWinnerAndLoser(
  scores: Record<string, number>
): [string | undefined, string | undefined] {
  const entries = Object.entries(scores);

  // Edge case: no players or only one player
  if (entries.length < 2) {
    return [undefined, undefined];
  }

  // Sort by score descending
  entries.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  const [winnerId, winnerScore] = entries[0];
  const [loserId, loserScore] = entries[1];

  // Check for draw (within 0.01 tolerance)
  if (Math.abs(winnerScore - loserScore) < 0.01) {
    return [undefined, undefined];
  }

  return [winnerId, loserId];
}

/**
 * Complete the match and generate the final result
 * 
 * This is the main entry point that orchestrates completion detection,
 * scoring, and statistics aggregation.
 * 
 * @param state - Current match state
 * @param protocol - Protocol definition
 * @returns Complete match result with scores and statistics
 */
export function completeMatch<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>,
  protocol: ProtocolDefinition<TState, TMove>
): MatchResult {
  // Detect completion
  const completionCheck = detectMatchCompletion(state, protocol);

  if (!completionCheck.complete) {
    throw new Error('Cannot complete match: match is not yet complete');
  }

  // Calculate statistics
  const statistics = calculateMatchStatistics(state);

  // Start with protocol-provided result or create default
  let result: MatchResult = completionCheck.result || {
    outcome: 'error',
    reason: 'Unknown completion state',
    scores: {},
    statistics,
  };

  // Ensure statistics are included
  result = { ...result, statistics };

  // Calculate final scores
  result = calculateFinalScores(result, state);

  // Determine winner and loser if not already set
  if (!result.winnerId && !result.loserId) {
    const [winnerId, loserId] = determineWinnerAndLoser(result.scores);
    if (winnerId && loserId) {
      result = { ...result, winnerId, loserId };
    }
  }

  return result;
}
