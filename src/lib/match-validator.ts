/**
 * Match Validator
 * 
 * Comprehensive validation for match configuration, bot submissions, and move legality.
 * Used for pre-match validation and runtime checks.
 */

import {
  MatchRunnerConfig,
  MatchPlayer,
  MatchState,
  ProtocolDefinition,
  BotExecutionResult,
  MatchStatus
} from './match-runner';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface MoveValidationResult<TMove = unknown> {
  legal: boolean;
  move: TMove | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: {
    evaluationTimeMs: number;
    alternativeMoves?: TMove[];
  };
}

// ============================================================================
// Match Configuration Validation
// ============================================================================

/**
 * Validate match configuration before initialization
 */
export function validateMatchConfig<TState = unknown>(
  config: MatchRunnerConfig<TState>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate match ID
  if (!config.matchId || config.matchId.trim() === '') {
    errors.push({
      code: 'INVALID_MATCH_ID',
      message: 'Match ID is required and cannot be empty',
      field: 'matchId'
    });
  }

  // Validate protocol ID
  if (!config.protocolId || config.protocolId.trim() === '') {
    errors.push({
      code: 'INVALID_PROTOCOL_ID',
      message: 'Protocol ID is required and cannot be empty',
      field: 'protocolId'
    });
  }

  // Validate players
  if (!config.players || config.players.length === 0) {
    errors.push({
      code: 'NO_PLAYERS',
      message: 'Match must have at least one player',
      field: 'players'
    });
  } else {
    // Check for duplicate player IDs
    const playerIds = config.players.map(p => p.id);
    const uniqueIds = new Set(playerIds);
    if (playerIds.length !== uniqueIds.size) {
      errors.push({
        code: 'DUPLICATE_PLAYER_IDS',
        message: 'All player IDs must be unique',
        field: 'players',
        details: { playerIds }
      });
    }

    // Validate each player
    config.players.forEach((player, idx) => {
      const playerErrors = validatePlayer(player);
      errors.push(...playerErrors.map(err => ({
        ...err,
        field: `players[${idx}].${err.field ?? ''}`
      })));
    });
  }

  // Validate timeouts
  if (config.turnTimeoutMs !== undefined && config.turnTimeoutMs <= 0) {
    errors.push({
      code: 'INVALID_TURN_TIMEOUT',
      message: 'Turn timeout must be a positive number',
      field: 'turnTimeoutMs',
      details: { value: config.turnTimeoutMs }
    });
  }

  if (config.matchTimeoutMs !== undefined && config.matchTimeoutMs <= 0) {
    errors.push({
      code: 'INVALID_MATCH_TIMEOUT',
      message: 'Match timeout must be a positive number',
      field: 'matchTimeoutMs',
      details: { value: config.matchTimeoutMs }
    });
  }

  // Validate max turns
  if (config.maxTurns <= 0) {
    errors.push({
      code: 'INVALID_MAX_TURNS',
      message: 'Max turns must be a positive number',
      field: 'maxTurns',
      details: { value: config.maxTurns }
    });
  }

  // Warnings for potentially problematic configurations
  if (config.maxTurns > 10000) {
    warnings.push({
      code: 'HIGH_MAX_TURNS',
      message: 'Max turns is very high and may lead to long matches',
      field: 'maxTurns'
    });
  }

  if (config.turnTimeoutMs && config.turnTimeoutMs < 100) {
    warnings.push({
      code: 'LOW_TURN_TIMEOUT',
      message: 'Turn timeout is very low and may cause frequent timeouts',
      field: 'turnTimeoutMs'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate individual player configuration
 */
export function validatePlayer(player: MatchPlayer): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!player.id || player.id.trim() === '') {
    errors.push({
      code: 'INVALID_PLAYER_ID',
      message: 'Player ID is required and cannot be empty',
      field: 'id'
    });
  }

  if (!player.name || player.name.trim() === '') {
    errors.push({
      code: 'INVALID_PLAYER_NAME',
      message: 'Player name is required and cannot be empty',
      field: 'name'
    });
  }

  if (!player.botCode || player.botCode.trim() === '') {
    errors.push({
      code: 'INVALID_BOT_CODE',
      message: 'Bot code is required and cannot be empty',
      field: 'botCode'
    });
  }

  return errors;
}

// ============================================================================
// Move Validation
// ============================================================================

/**
 * Validate a move against protocol rules
 */
export function validateMove<TState = unknown, TMove = unknown>(
  state: TState,
  move: TMove | null | undefined,
  playerId: string,
  protocol: ProtocolDefinition<TState, TMove>
): MoveValidationResult<TMove> {
  const startTime = performance.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for null/undefined move
  if (move === null || move === undefined) {
    errors.push({
      code: 'NULL_MOVE',
      message: 'Bot returned null or undefined move',
      details: { playerId }
    });

    return {
      legal: false,
      move: null,
      errors,
      warnings,
      metadata: {
        evaluationTimeMs: performance.now() - startTime
      }
    };
  }

  // Use protocol's validation
  const protocolValidation = protocol.validateMove(state, move, playerId);

  if (!protocolValidation.legal) {
    errors.push({
      code: 'ILLEGAL_MOVE',
      message: protocolValidation.messages.join('; '),
      details: { 
        playerId, 
        move,
        validationMessages: protocolValidation.messages 
      }
    });
  }

  return {
    legal: protocolValidation.legal,
    move,
    errors,
    warnings,
    metadata: {
      evaluationTimeMs: performance.now() - startTime
    }
  };
}

/**
 * Validate bot execution result
 */
export function validateBotExecutionResult<TMove = unknown>(
  result: BotExecutionResult<TMove>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for execution errors
  if (result.error) {
    errors.push({
      code: `BOT_ERROR_${result.error.type.toUpperCase()}`,
      message: result.error.message,
      details: {
        errorType: result.error.type,
        stack: result.error.stack
      }
    });
  }

  // Check execution time
  if (result.executionTimeMs < 0) {
    errors.push({
      code: 'INVALID_EXECUTION_TIME',
      message: 'Execution time cannot be negative',
      details: { executionTimeMs: result.executionTimeMs }
    });
  }

  // Warnings for slow execution
  if (result.executionTimeMs > 5000) {
    warnings.push({
      code: 'SLOW_EXECUTION',
      message: 'Bot execution took longer than 5 seconds',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Match State Validation
// ============================================================================

/**
 * Validate current match state consistency
 */
export function validateMatchState<TState = unknown, TMove = unknown>(
  state: MatchState<TState, TMove>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate current player ID exists in players list
  const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
  if (!currentPlayer) {
    errors.push({
      code: 'INVALID_CURRENT_PLAYER',
      message: 'Current player ID does not exist in players list',
      field: 'currentPlayerId',
      details: { 
        currentPlayerId: state.currentPlayerId,
        playerIds: state.players.map(p => p.id)
      }
    });
  }

  // Validate turn count consistency
  if (state.currentTurn < 0) {
    errors.push({
      code: 'INVALID_TURN_NUMBER',
      message: 'Current turn cannot be negative',
      field: 'currentTurn',
      details: { currentTurn: state.currentTurn }
    });
  }

  if (state.turns.length !== state.currentTurn) {
    warnings.push({
      code: 'TURN_MISMATCH',
      message: 'Turn history length does not match current turn number',
      field: 'currentTurn'
    });
  }

  // Validate status transitions
  const validStatuses: MatchStatus[] = ['initializing', 'in-progress', 'completed', 'abandoned', 'error'];
  if (!validStatuses.includes(state.status)) {
    errors.push({
      code: 'INVALID_STATUS',
      message: `Invalid match status: ${state.status}`,
      field: 'status',
      details: { status: state.status, validStatuses }
    });
  }

  // Terminal states should have result
  if ((state.status === 'completed' || state.status === 'abandoned') && !state.result) {
    errors.push({
      code: 'MISSING_RESULT',
      message: 'Match in terminal state must have a result',
      field: 'result',
      details: { status: state.status }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate multiple aspects of match setup at once
 */
export function validateMatchSetup<TState = unknown, TMove = unknown>(
  config: MatchRunnerConfig<TState>,
  protocol: ProtocolDefinition<TState, TMove>
): ValidationResult {
  const configValidation = validateMatchConfig(config);
  
  // Additional protocol-specific validation could go here
  // For now, we just return config validation
  
  return configValidation;
}

/**
 * Helper: Merge multiple validation results
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}
