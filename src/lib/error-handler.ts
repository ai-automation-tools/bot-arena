/**
 * Error Handler
 * 
 * Comprehensive error handling, recovery strategies, and monitoring
 * for bot execution failures, timeouts, and system crashes.
 */

import type { BotError, BotExecutionResult } from './match-runner';

// ============================================================================
// Error Categories and Severity
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCategory = 
  | 'timeout'              // Execution exceeded time limit
  | 'runtime-crash'        // Unexpected crash/exception
  | 'resource-exhaustion'  // Memory/CPU limits exceeded
  | 'protocol-violation'   // Rule violation
  | 'validation-error'     // Pre-execution validation failure
  | 'network-error'        // Network-related (if applicable)
  | 'system-error';        // Infrastructure/system failure

export interface CategorizedError extends BotError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  technicalDetails: Record<string, unknown>;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify bot error into category and severity
 */
export function classifyError(error: BotError): CategorizedError {
  const baseError: CategorizedError = {
    ...error,
    category: 'runtime-crash',
    severity: 'medium',
    recoverable: false,
    userMessage: 'Bot execution failed',
    technicalDetails: {}
  };

  switch (error.type) {
    case 'timeout':
      return {
        ...baseError,
        category: 'timeout',
        severity: 'medium',
        recoverable: true,
        userMessage: 'Bot took too long to respond',
        technicalDetails: {
          timeoutMs: error.details?.timeoutMs,
          actualTimeMs: error.details?.actualTimeMs
        }
      };

    case 'runtime-error':
      // Analyze error message to determine specifics
      const message = error.message.toLowerCase();
      
      if (message.includes('memory') || message.includes('heap')) {
        return {
          ...baseError,
          category: 'resource-exhaustion',
          severity: 'high',
          recoverable: false,
          userMessage: 'Bot exceeded memory limits',
          technicalDetails: {
            errorType: 'memory',
            stack: error.stack
          }
        };
      }
      
      if (message.includes('stack') || message.includes('recursion')) {
        return {
          ...baseError,
          category: 'resource-exhaustion',
          severity: 'high',
          recoverable: false,
          userMessage: 'Bot caused stack overflow',
          technicalDetails: {
            errorType: 'stack-overflow',
            stack: error.stack
          }
        };
      }

      return {
        ...baseError,
        category: 'runtime-crash',
        severity: 'medium',
        recoverable: true,
        userMessage: 'Bot crashed during execution',
        technicalDetails: {
          errorMessage: error.message,
          stack: error.stack
        }
      };

    case 'validation-error':
      return {
        ...baseError,
        category: 'validation-error',
        severity: 'low',
        recoverable: false,
        userMessage: 'Bot code failed validation',
        technicalDetails: {
          validationErrors: error.details
        }
      };

    case 'protocol-violation':
      return {
        ...baseError,
        category: 'protocol-violation',
        severity: 'high',
        recoverable: false,
        userMessage: 'Bot violated protocol rules',
        technicalDetails: {
          violations: error.details?.violations
        }
      };

    default:
      return baseError;
  }
}

// ============================================================================
// Circuit Breaker Pattern
// ============================================================================

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  successCount: number;
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery */
  resetTimeoutMs: number;
  /** Number of successes needed to close circuit */
  successThreshold: number;
}

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
    successCount: 0
  };

  constructor(
    private options: CircuitBreakerOptions = {
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      successThreshold: 2
    }
  ) {}

  /**
   * Check if request should be allowed through
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    // Check circuit state
    if (this.state.state === 'open') {
      const now = Date.now();
      const timeSinceLastFailure = now - this.state.lastFailureTime;
      
      // Check if we should attempt recovery
      if (timeSinceLastFailure >= this.options.resetTimeoutMs) {
        this.state.state = 'half-open';
        this.state.successCount = 0;
      } else {
        // Circuit is open, use fallback
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      
      // Success - update state
      this.onSuccess();
      
      return result;
    } catch (error) {
      // Failure - update state
      this.onFailure();
      
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.successCount++;
      
      if (this.state.successCount >= this.options.successThreshold) {
        // Close the circuit
        this.state.state = 'closed';
        this.state.failures = 0;
        this.state.successCount = 0;
      }
    } else if (this.state.state === 'closed') {
      // Reset failure count on success
      this.state.failures = 0;
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.options.failureThreshold) {
      this.state.state = 'open';
    }
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
      successCount: 0
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// ============================================================================
// Error Metrics and Logging
// ============================================================================

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: Array<{
    timestamp: string;
    error: CategorizedError;
    botId?: string;
  }>;
}

/**
 * Error metrics tracker
 */
export class ErrorMetricsTracker {
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByCategory: {
      'timeout': 0,
      'runtime-crash': 0,
      'resource-exhaustion': 0,
      'protocol-violation': 0,
      'validation-error': 0,
      'network-error': 0,
      'system-error': 0
    },
    errorsBySeverity: {
      'low': 0,
      'medium': 0,
      'high': 0,
      'critical': 0
    },
    recentErrors: []
  };

  /**
   * Record an error occurrence
   */
  recordError(error: CategorizedError, botId?: string): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category]++;
    this.metrics.errorsBySeverity[error.severity]++;

    // Keep last 100 errors
    this.metrics.recentErrors.push({
      timestamp: new Date().toISOString(),
      error,
      botId
    });

    if (this.metrics.recentErrors.length > 100) {
      this.metrics.recentErrors.shift();
    }

    // Log to console (could be replaced with structured logging)
    this.logError(error, botId);
  }

  /**
   * Get current metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {
        'timeout': 0,
        'runtime-crash': 0,
        'resource-exhaustion': 0,
        'protocol-violation': 0,
        'validation-error': 0,
        'network-error': 0,
        'system-error': 0
      },
      errorsBySeverity: {
        'low': 0,
        'medium': 0,
        'high': 0,
        'critical': 0
      },
      recentErrors: []
    };
  }

  /**
   * Log error to console with appropriate severity
   */
  private logError(error: CategorizedError, botId?: string): void {
    const prefix = botId ? `[Bot ${botId}]` : '[System]';
    const message = `${prefix} ${error.category.toUpperCase()}: ${error.userMessage}`;

    switch (error.severity) {
      case 'low':
        console.info(message, error.technicalDetails);
        break;
      case 'medium':
        console.warn(message, error.technicalDetails);
        break;
      case 'high':
      case 'critical':
        console.error(message, error.technicalDetails);
        break;
    }
  }
}

// ============================================================================
// Recovery Strategies
// ============================================================================

export interface RecoveryContext<TState = unknown, TMove = unknown> {
  botId: string;
  error: CategorizedError;
  state: TState;
  attempt: number;
}

export type RecoveryStrategy<TState = unknown, TMove = unknown> = (
  context: RecoveryContext<TState, TMove>
) => Promise<BotExecutionResult<TMove> | null>;

/**
 * Timeout recovery - try with extended time limit
 */
export function timeoutRecoveryStrategy<TState, TMove>(
  maxAttempts: number = 2,
  timeMultiplier: number = 1.5
): RecoveryStrategy<TState, TMove> {
  return async (context) => {
    if (context.attempt >= maxAttempts) {
      return null; // No more attempts
    }

    // This would trigger a re-execution with increased timeout
    // Implementation would depend on executor interface
    return null;
  };
}

/**
 * Crash recovery - retry with same parameters
 */
export function crashRecoveryStrategy<TState, TMove>(
  maxAttempts: number = 1
): RecoveryStrategy<TState, TMove> {
  return async (context) => {
    if (context.attempt >= maxAttempts) {
      return null;
    }

    // For runtime crashes, a simple retry might work
    // if it was a transient issue
    return null;
  };
}

/**
 * No recovery - immediate failure
 */
export function noRecoveryStrategy<TState, TMove>(): RecoveryStrategy<TState, TMove> {
  return async () => null;
}

// ============================================================================
// Error Handler Coordinator
// ============================================================================

export interface ErrorHandlerOptions {
  enableCircuitBreaker: boolean;
  enableMetrics: boolean;
  circuitBreakerOptions?: CircuitBreakerOptions;
}

/**
 * Main error handler coordinator
 */
export class BotErrorHandler {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private metricsTracker: ErrorMetricsTracker;
  private options: ErrorHandlerOptions;

  constructor(options: Partial<ErrorHandlerOptions> = {}) {
    this.options = {
      enableCircuitBreaker: options.enableCircuitBreaker ?? true,
      enableMetrics: options.enableMetrics ?? true,
      circuitBreakerOptions: options.circuitBreakerOptions
    };

    this.metricsTracker = new ErrorMetricsTracker();
  }

  /**
   * Handle bot execution error
   */
  async handleError<TState = unknown, TMove = unknown>(
    error: BotError,
    botId: string,
    recoveryStrategy?: RecoveryStrategy<TState, TMove>,
    state?: TState
  ): Promise<BotExecutionResult<TMove> | null> {
    // Classify the error
    const categorizedError = classifyError(error);

    // Record metrics
    if (this.options.enableMetrics) {
      this.metricsTracker.recordError(categorizedError, botId);
    }

    // Check circuit breaker
    if (this.options.enableCircuitBreaker) {
      const breaker = this.getCircuitBreaker(botId);
      const circuitState = breaker.getState();

      if (circuitState.state === 'open') {
        console.warn(`[Bot ${botId}] Circuit breaker is open, skipping execution`);
        return null;
      }
    }

    // Attempt recovery if strategy provided
    if (recoveryStrategy && categorizedError.recoverable && state !== undefined) {
      try {
        const recovered = await recoveryStrategy({
          botId,
          error: categorizedError,
          state,
          attempt: 1
        });

        if (recovered) {
          return recovered as BotExecutionResult<TMove>;
        }
      } catch (recoveryError) {
        console.error(`[Bot ${botId}] Recovery failed:`, recoveryError);
      }
    }

    return null;
  }

  /**
   * Get or create circuit breaker for bot
   */
  private getCircuitBreaker(botId: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(botId);
    
    if (!breaker) {
      breaker = new CircuitBreaker(this.options.circuitBreakerOptions);
      this.circuitBreakers.set(botId, breaker);
    }

    return breaker;
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    return this.metricsTracker.getMetrics();
  }

  /**
   * Reset circuit breaker for specific bot
   */
  resetCircuitBreaker(botId: string): void {
    const breaker = this.circuitBreakers.get(botId);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: BotError): boolean {
  const categorized = classifyError(error);
  return categorized.recoverable;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: BotError): string {
  const categorized = classifyError(error);
  return categorized.userMessage;
}

/**
 * Check if error requires immediate disqualification
 */
export function shouldDisqualify(error: BotError): boolean {
  const categorized = classifyError(error);
  return categorized.severity === 'high' || categorized.severity === 'critical';
}
