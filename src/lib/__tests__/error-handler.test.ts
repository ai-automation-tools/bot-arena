/**
 * Error Handler Tests
 * 
 * Test suite for bot crash and timeout error handling
 */

import {
  classifyError,
  CircuitBreaker,
  ErrorMetricsTracker,
  BotErrorHandler,
  isRecoverable,
  getUserMessage,
  shouldDisqualify,
  type CategorizedError,
  type ErrorCategory,
  type ErrorSeverity
} from '../error-handler';
import type { BotError } from '../match-runner';

// ============================================================================
// Error Classification Tests
// ============================================================================

describe('Error Classification', () => {
  test('classifies timeout error correctly', () => {
    const error: BotError = {
      type: 'timeout',
      message: 'Bot exceeded time limit',
      details: { timeoutMs: 1000, actualTimeMs: 1500 }
    };

    const classified = classifyError(error);

    expect(classified.category).toBe('timeout');
    expect(classified.severity).toBe('medium');
    expect(classified.recoverable).toBe(true);
    expect(classified.userMessage).toBe('Bot took too long to respond');
  });

  test('classifies memory exhaustion error', () => {
    const error: BotError = {
      type: 'runtime-error',
      message: 'JavaScript heap out of memory',
      stack: 'Error: JavaScript heap out of memory\n  at ...'
    };

    const classified = classifyError(error);

    expect(classified.category).toBe('resource-exhaustion');
    expect(classified.severity).toBe('high');
    expect(classified.recoverable).toBe(false);
    expect(classified.userMessage).toBe('Bot exceeded memory limits');
  });

  test('classifies stack overflow error', () => {
    const error: BotError = {
      type: 'runtime-error',
      message: 'Maximum call stack size exceeded',
      stack: 'RangeError: Maximum call stack size exceeded\n  at ...'
    };

    const classified = classifyError(error);

    expect(classified.category).toBe('resource-exhaustion');
    expect(classified.severity).toBe('high');
    expect(classified.userMessage).toBe('Bot caused stack overflow');
  });

  test('classifies generic runtime crash', () => {
    const error: BotError = {
      type: 'runtime-error',
      message: 'Unexpected token',
      stack: 'SyntaxError: Unexpected token\n  at ...'
    };

    const classified = classifyError(error);

    expect(classified.category).toBe('runtime-crash');
    expect(classified.severity).toBe('medium');
    expect(classified.recoverable).toBe(true);
    expect(classified.userMessage).toBe('Bot crashed during execution');
  });

  test('classifies validation error', () => {
    const error: BotError = {
      type: 'validation-error',
      message: 'Invalid bot code format',
      details: { violations: ['Missing export default'] }
    };

    const classified = classifyError(error);

    expect(classified.category).toBe('validation-error');
    expect(classified.severity).toBe('low');
    expect(classified.recoverable).toBe(false);
    expect(classified.userMessage).toBe('Bot code failed validation');
  });

  test('classifies protocol violation', () => {
    const error: BotError = {
      type: 'protocol-violation',
      message: 'Forbidden API detected: fetch',
      details: { violations: ['fetch'] }
    };

    const classified = classifyError(error);

    expect(classified.category).toBe('protocol-violation');
    expect(classified.severity).toBe('high');
    expect(classified.recoverable).toBe(false);
    expect(classified.userMessage).toBe('Bot violated protocol rules');
  });
});

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

describe('CircuitBreaker', () => {
  test('allows operations when circuit is closed', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      successThreshold: 2
    });

    const operation = jest.fn().mockResolvedValue('success');
    const result = await breaker.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(breaker.getState().state).toBe('closed');
  });

  test('opens circuit after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      successThreshold: 2
    });

    const operation = jest.fn().mockRejectedValue(new Error('failure'));
    const fallback = jest.fn().mockReturnValue('fallback');

    // Trigger 3 failures
    await breaker.execute(operation, fallback);
    await breaker.execute(operation, fallback);
    await breaker.execute(operation, fallback);

    expect(breaker.getState().state).toBe('open');
    expect(breaker.getState().failures).toBe(3);
  });

  test('uses fallback when circuit is open', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      successThreshold: 2
    });

    const operation = jest.fn().mockRejectedValue(new Error('failure'));
    const fallback = jest.fn().mockReturnValue('fallback-result');

    // Trigger failures to open circuit
    await breaker.execute(operation, fallback);
    await breaker.execute(operation, fallback);

    expect(breaker.getState().state).toBe('open');

    // Next call should use fallback without calling operation
    operation.mockClear();
    const result = await breaker.execute(operation, fallback);

    expect(result).toBe('fallback-result');
    expect(operation).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalled();
  });

  test('transitions to half-open after timeout', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 100, // Short timeout for testing
      successThreshold: 2
    });

    const operation = jest.fn().mockRejectedValue(new Error('failure'));
    const fallback = jest.fn().mockReturnValue('fallback');

    // Open the circuit
    await breaker.execute(operation, fallback);
    await breaker.execute(operation, fallback);
    expect(breaker.getState().state).toBe('open');

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Next execution should transition to half-open
    operation.mockResolvedValue('success');
    await breaker.execute(operation);

    expect(breaker.getState().state).toBe('half-open');
  });

  test('closes circuit after successful recoveries', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 100,
      successThreshold: 2
    });

    const operation = jest.fn().mockRejectedValue(new Error('failure'));

    // Open circuit
    await breaker.execute(operation, () => 'fallback').catch(() => {});
    await breaker.execute(operation, () => 'fallback').catch(() => {});
    expect(breaker.getState().state).toBe('open');

    // Wait for reset
    await new Promise(resolve => setTimeout(resolve, 150));

    // Succeed twice to close circuit
    operation.mockResolvedValue('success');
    await breaker.execute(operation);
    await breaker.execute(operation);

    expect(breaker.getState().state).toBe('closed');
    expect(breaker.getState().failures).toBe(0);
  });

  test('resets circuit breaker manually', () => {
    const breaker = new CircuitBreaker();

    // Simulate failures
    breaker['state'].failures = 5;
    breaker['state'].state = 'open';

    breaker.reset();

    expect(breaker.getState().failures).toBe(0);
    expect(breaker.getState().state).toBe('closed');
  });
});

// ============================================================================
// Error Metrics Tests
// ============================================================================

describe('ErrorMetricsTracker', () => {
  test('records errors by category', () => {
    const tracker = new ErrorMetricsTracker();

    const timeoutError: CategorizedError = {
      type: 'timeout',
      message: 'Timeout',
      category: 'timeout',
      severity: 'medium',
      recoverable: true,
      userMessage: 'Timeout',
      technicalDetails: {}
    };

    tracker.recordError(timeoutError, 'bot1');

    const metrics = tracker.getMetrics();
    expect(metrics.totalErrors).toBe(1);
    expect(metrics.errorsByCategory.timeout).toBe(1);
  });

  test('records errors by severity', () => {
    const tracker = new ErrorMetricsTracker();

    const highSeverityError: CategorizedError = {
      type: 'runtime-error',
      message: 'Critical error',
      category: 'runtime-crash',
      severity: 'high',
      recoverable: false,
      userMessage: 'Critical error',
      technicalDetails: {}
    };

    tracker.recordError(highSeverityError, 'bot1');

    const metrics = tracker.getMetrics();
    expect(metrics.errorsBySeverity.high).toBe(1);
  });

  test('maintains recent error history (max 100)', () => {
    const tracker = new ErrorMetricsTracker();

    const error: CategorizedError = {
      type: 'timeout',
      message: 'Timeout',
      category: 'timeout',
      severity: 'medium',
      recoverable: true,
      userMessage: 'Timeout',
      technicalDetails: {}
    };

    // Record 150 errors
    for (let i = 0; i < 150; i++) {
      tracker.recordError(error, `bot${i}`);
    }

    const metrics = tracker.getMetrics();
    expect(metrics.totalErrors).toBe(150);
    expect(metrics.recentErrors.length).toBe(100); // Should cap at 100
  });

  test('resets metrics correctly', () => {
    const tracker = new ErrorMetricsTracker();

    const error: CategorizedError = {
      type: 'timeout',
      message: 'Timeout',
      category: 'timeout',
      severity: 'medium',
      recoverable: true,
      userMessage: 'Timeout',
      technicalDetails: {}
    };

    tracker.recordError(error, 'bot1');
    tracker.recordError(error, 'bot2');

    tracker.reset();

    const metrics = tracker.getMetrics();
    expect(metrics.totalErrors).toBe(0);
    expect(metrics.recentErrors.length).toBe(0);
  });
});

// ============================================================================
// BotErrorHandler Integration Tests
// ============================================================================

describe('BotErrorHandler', () => {
  test('initializes with default options', () => {
    const handler = new BotErrorHandler();
    expect(handler).toBeDefined();
  });

  test('records metrics when enabled', async () => {
    const handler = new BotErrorHandler({ enableMetrics: true });

    const error: BotError = {
      type: 'timeout',
      message: 'Timeout'
    };

    await handler.handleError(error, 'bot1');

    const metrics = handler.getMetrics();
    expect(metrics.totalErrors).toBe(1);
  });

  test('respects circuit breaker when open', async () => {
    const handler = new BotErrorHandler({
      enableCircuitBreaker: true,
      circuitBreakerOptions: {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        successThreshold: 2
      }
    });

    const error: BotError = {
      type: 'runtime-error',
      message: 'Crash'
    };

    // Trigger failures to open circuit
    await handler.handleError(error, 'bot1');
    await handler.handleError(error, 'bot1');

    // Next call should be blocked
    const result = await handler.handleError(error, 'bot1');
    expect(result).toBeNull();
  });

  test('resets circuit breaker for specific bot', async () => {
    const handler = new BotErrorHandler({
      circuitBreakerOptions: {
        failureThreshold: 2,
        resetTimeoutMs: 5000,
        successThreshold: 2
      }
    });

    const error: BotError = {
      type: 'runtime-error',
      message: 'Crash'
    };

    // Open circuit
    await handler.handleError(error, 'bot1');
    await handler.handleError(error, 'bot1');

    // Reset manually
    handler.resetCircuitBreaker('bot1');

    // Should work again
    const result = await handler.handleError(error, 'bot1');
    expect(result).toBeNull(); // Still fails, but not blocked by breaker
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  test('isRecoverable identifies recoverable errors', () => {
    const timeoutError: BotError = {
      type: 'timeout',
      message: 'Timeout'
    };

    expect(isRecoverable(timeoutError)).toBe(true);
  });

  test('isRecoverable identifies non-recoverable errors', () => {
    const validationError: BotError = {
      type: 'validation-error',
      message: 'Invalid code'
    };

    expect(isRecoverable(validationError)).toBe(false);
  });

  test('getUserMessage returns user-friendly message', () => {
    const error: BotError = {
      type: 'timeout',
      message: 'Bot execution exceeded 1000ms'
    };

    const message = getUserMessage(error);
    expect(message).toBe('Bot took too long to respond');
  });

  test('shouldDisqualify identifies high-severity errors', () => {
    const highSeverityError: BotError = {
      type: 'protocol-violation',
      message: 'Forbidden API'
    };

    expect(shouldDisqualify(highSeverityError)).toBe(true);
  });

  test('shouldDisqualify allows low-severity errors', () => {
    const lowSeverityError: BotError = {
      type: 'validation-error',
      message: 'Invalid format'
    };

    expect(shouldDisqualify(lowSeverityError)).toBe(false);
  });
});
