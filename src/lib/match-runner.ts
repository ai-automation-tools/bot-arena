/**
 * Match Runner Core Types and Interfaces
 * 
 * Defines the foundational types for the match execution system.
 * These types support protocol-agnostic match running with Chess as the initial implementation.
 */

// ============================================================================
// Bot Execution Types
// ============================================================================

/**
 * Bot function signature - the interface that all submitted bots must implement
 */
export type BotFunction<TState = unknown, TMove = unknown> = (
  state: TState,
  config: BotExecutionConfig
) => TMove | Promise<TMove>;

/**
 * Configuration passed to bots during execution
 */
export type BotExecutionConfig = {
  /** Maximum time allowed for this turn (ms) */
  timeoutMs: number;
  /** Player identifier (e.g., 'white', 'black', 'player1') */
  playerId: string;
  /** Protocol-specific metadata */
  protocolMeta?: Record<string, unknown>;
};

/**
 * Result of executing a bot for a single turn
 */
export type BotExecutionResult<TMove = unknown> = {
  /** The move returned by the bot */
  move: TMove | null;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Whether the bot timed out */
  timedOut: boolean;
  /** Error information if execution failed */
  error?: BotError;
  /** Protocol violations detected during execution */
  violations: string[];
};

/**
 * Error information for bot execution failures
 */
export type BotError = {
  /** Error type classification */
  type: 'timeout' | 'runtime-error' | 'validation-error' | 'protocol-violation';
  /** Human-readable error message */
  message: string;
  /** Stack trace (if available) */
  stack?: string;
  /** Additional context */
  details?: Record<string, unknown>;
};

// ============================================================================
// Match Configuration Types
// ============================================================================

/**
 * Configuration for starting a new match
 */
export type MatchRunnerConfig<TState = unknown> = {
  /** Unique match identifier */
  matchId: string;
  /** Protocol this match follows */
  protocolId: string;
  /** Initial state for the match */
  initialState: TState;
  /** Player configurations */
  players: MatchPlayer[];
  /** Time limit per turn (ms) */
  turnTimeoutMs: number;
  /** Maximum number of turns before match is abandoned */
  maxTurns: number;
  /** Maximum total time for the match (ms) */
  matchTimeoutMs: number;
  /** Protocol-specific configuration */
  protocolConfig?: Record<string, unknown>;
};

/**
 * Player configuration for a match
 */
export type MatchPlayer = {
  /** Unique player identifier */
  id: string;
  /** Display name */
  name: string;
  /** Bot code (serialized function) */
  botCode: string;
  /** Player position (e.g., 'white', 'black', 'player1') */
  position: string;
};

// ============================================================================
// Match State Types
// ============================================================================

/**
 * Complete state of an ongoing or completed match
 */
export type MatchState<TState = unknown, TMove = unknown> = {
  /** Unique match identifier */
  matchId: string;
  /** Protocol this match follows */
  protocolId: string;
  /** Current status of the match */
  status: MatchStatus;
  /** Current game state (protocol-specific) */
  gameState: TState;
  /** Players in this match */
  players: MatchPlayer[];
  /** History of all turns executed */
  turns: MatchTurn<TMove>[];
  /** Current turn number (0-indexed) */
  currentTurn: number;
  /** Identifier of the player whose turn it is */
  currentPlayerId: string;
  /** Match start timestamp */
  startedAt: string;
  /** Match end timestamp (if completed) */
  completedAt?: string;
  /** Match result (if completed) */
  result?: MatchResult;
  /** Configuration used for this match */
  config: MatchRunnerConfig<TState>;
};

/**
 * Match status enumeration
 */
export type MatchStatus =
  | 'initializing'
  | 'in-progress'
  | 'completed'
  | 'abandoned'
  | 'error';

/**
 * Data for a single turn in a match
 */
export type MatchTurn<TMove = unknown> = {
  /** Turn number (0-indexed) */
  turnNumber: number;
  /** Player who made this move */
  playerId: string;
  /** Bot execution result */
  execution: BotExecutionResult<TMove>;
  /** State after this turn was applied */
  stateAfter: unknown;
  /** Timestamp when turn was executed */
  timestamp: string;
  /** Whether this move was legal */
  legal: boolean;
  /** Validation messages (if any) */
  validationMessages: string[];
};

// ============================================================================
// Match Result Types
// ============================================================================

/**
 * Final outcome of a completed match
 */
export type MatchResult = {
  /** Match outcome type */
  outcome: MatchOutcome;
  /** Winner player ID (if applicable) */
  winnerId?: string;
  /** Loser player ID (if applicable) */
  loserId?: string;
  /** Reason for match outcome */
  reason: string;
  /** Final scores by player ID */
  scores: Record<string, number>;
  /** Aggregate statistics */
  statistics: MatchStatistics;
};

/**
 * Match outcome classification
 */
export type MatchOutcome =
  | 'win'           // One player won
  | 'draw'          // Match ended in a draw
  | 'abandoned'     // Match exceeded max turns
  | 'disqualified'  // Player violated rules
  | 'error';        // Technical error prevented completion

/**
 * Aggregate match statistics
 */
export type MatchStatistics = {
  /** Total number of turns executed */
  totalTurns: number;
  /** Total match duration (ms) */
  durationMs: number;
  /** Per-player statistics */
  players: Record<string, PlayerStatistics>;
};

/**
 * Per-player match statistics
 */
export type PlayerStatistics = {
  /** Average execution time per turn (ms) */
  avgExecutionTimeMs: number;
  /** Maximum execution time for any turn (ms) */
  maxExecutionTimeMs: number;
  /** Total execution time across all turns (ms) */
  totalExecutionTimeMs: number;
  /** Number of timeouts */
  timeoutCount: number;
  /** Number of protocol violations */
  violationCount: number;
  /** Number of illegal moves */
  illegalMoveCount: number;
  /** Number of errors */
  errorCount: number;
};

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * Protocol definition - defines how a specific game/challenge is run
 */
export type ProtocolDefinition<TState = unknown, TMove = unknown> = {
  /** Protocol identifier */
  id: string;
  /** Protocol display name */
  name: string;
  /** Initialize a new game state */
  initializeState: () => TState;
  /** Validate a move is legal in the current state */
  validateMove: (state: TState, move: TMove, playerId: string) => MoveValidation;
  /** Apply a move to the state, returning the new state */
  applyMove: (state: TState, move: TMove, playerId: string) => TState;
  /** Check if the match is complete and determine the result */
  checkCompletion: (state: TState, turns: MatchTurn<TMove>[]) => CompletionCheck;
  /** Get the next player ID based on current state */
  getNextPlayer: (state: TState, currentPlayerId: string) => string;
  /** Serialize state for bot execution (may hide information) */
  serializeStateForBot: (state: TState, playerId: string) => unknown;
};

/**
 * Result of move validation
 */
export type MoveValidation = {
  /** Whether the move is legal */
  legal: boolean;
  /** Validation messages (errors or warnings) */
  messages: string[];
  /** Protocol violations detected */
  violations: string[];
};

/**
 * Result of checking if match is complete
 */
export type CompletionCheck = {
  /** Whether the match is complete */
  complete: boolean;
  /** Match result (if complete) */
  result?: MatchResult;
};
