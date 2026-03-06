/**
 * Bot Execution Sandbox
 * 
 * Safely executes bot code with timeout enforcement, error handling,
 * and protocol violation detection.
 */

import type {
  BotFunction,
  BotExecutionConfig,
  BotExecutionResult,
  BotError,
} from './match-runner';

// ============================================================================
// Execution Options
// ============================================================================

export type ExecutionOptions<TState = unknown> = {
  /** Bot code string to execute */
  botCode: string;
  /** Current game state */
  state: TState;
  /** Execution configuration */
  config: BotExecutionConfig;
  /** Whether to enable strict sandboxing (default: true) */
  strictSandbox?: boolean;
};

// ============================================================================
// Sandbox Utilities
// ============================================================================

/**
 * List of forbidden globals that bots should not access
 * These represent potential security risks or rule violations
 */
const FORBIDDEN_GLOBALS = [
  'fetch',           // Network requests
  'XMLHttpRequest',  // Network requests
  'WebSocket',       // Network connections
  'require',         // Node module loading
  'import',          // ES module loading
  'eval',            // Dynamic code execution
  'Function',        // Dynamic function creation
  'process',         // Node process access
  'global',          // Global scope access
  'window',          // Browser global (if applicable)
];

/**
 * Create a sandboxed execution context with restricted globals
 */
function createSandboxedContext<TState>(
  state: TState,
  config: BotExecutionConfig
): Record<string, unknown> {
  // Provide safe utilities
  const context: Record<string, unknown> = {
    // Game context
    state,
    config,
    playerId: config.playerId,
    timeoutMs: config.timeoutMs,
    
    // Safe utilities (read-only)
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    
    // Console for debugging (could be logged/captured)
    console: {
      log: (...args: unknown[]) => console.log('[Bot]', ...args),
      warn: (...args: unknown[]) => console.warn('[Bot]', ...args),
      error: (...args: unknown[]) => console.error('[Bot]', ...args),
    },
  };

  return context;
}

/**
 * Check bot code for forbidden API usage
 * Returns array of detected violations
 */
function detectCodeViolations(botCode: string): string[] {
  const violations: string[] = [];

  for (const forbidden of FORBIDDEN_GLOBALS) {
    // Check for direct usage
    const directRegex = new RegExp(`\\b${forbidden}\\s*\\(`, 'g');
    if (directRegex.test(botCode)) {
      violations.push(`Forbidden API detected: ${forbidden}`);
    }

    // Check for property access
    const propertyRegex = new RegExp(`\\.${forbidden}\\s*\\(`, 'g');
    if (propertyRegex.test(botCode)) {
      violations.push(`Forbidden API detected via property: .${forbidden}`);
    }
  }

  // Check for dynamic imports
  if (/import\s*\(/.test(botCode)) {
    violations.push('Dynamic import() detected');
  }

  return violations;
}

// ============================================================================
// Execution with Timeout
// ============================================================================

/**
 * Execute a promise with a timeout
 * Returns result or throws TimeoutError
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      onTimeout();
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute bot code in a sandboxed environment with timeout enforcement
 * 
 * @param options - Execution options including bot code, state, and config
 * @returns BotExecutionResult with move, timing, and error information
 */
export async function executeBotSandboxed<TState, TMove>(
  options: ExecutionOptions<TState>
): Promise<BotExecutionResult<TMove>> {
  const { botCode, state, config, strictSandbox = true } = options;
  
  const startTime = performance.now();
  let timedOut = false;
  const violations: string[] = [];
  
  try {
    // Step 1: Pre-execution validation
    if (strictSandbox) {
      const codeViolations = detectCodeViolations(botCode);
      if (codeViolations.length > 0) {
        violations.push(...codeViolations);
        
        // In strict mode, code violations are fatal
        return {
          move: null,
          executionTimeMs: performance.now() - startTime,
          timedOut: false,
          error: {
            type: 'protocol-violation',
            message: 'Bot code contains forbidden APIs',
            details: { violations: codeViolations },
          },
          violations,
        };
      }
    }

    // Step 2: Create sandboxed context
    const context = createSandboxedContext(state, config);
    
    // Step 3: Compile bot function
    // In a real implementation, you'd want to use vm2 or isolated-vm
    // For now, we use Function constructor with sandboxed scope
    let botFunction: BotFunction<TState, TMove>;
    
    try {
      // Extract function body from botCode
      // Expected format: export default function(state, config) { ... }
      // or: export default (state, config) => { ... }
      const functionMatch = botCode.match(
        /export\s+default\s+(?:function\s*)?\(([^)]*)\)\s*(?:=>)?\s*\{([\s\S]*)\}/
      );
      
      if (!functionMatch) {
        throw new Error('Invalid bot code format. Expected: export default function(state, config) { ... }');
      }
      
      const [, params, body] = functionMatch;
      const paramNames = params.split(',').map(p => p.trim());
      
      if (paramNames.length !== 2) {
        throw new Error('Bot function must accept exactly 2 parameters: (state, config)');
      }
      
      // Create function with sandboxed context
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      
      // Build function with restricted scope
      const fn = new Function(
        ...contextKeys,
        ...paramNames,
        `"use strict";\n${body}`
      );
      
      botFunction = (s: TState, c: BotExecutionConfig) => {
        return fn(...contextValues, s, c) as TMove | Promise<TMove>;
      };
      
    } catch (compileError) {
      return {
        move: null,
        executionTimeMs: performance.now() - startTime,
        timedOut: false,
        error: {
          type: 'validation-error',
          message: compileError instanceof Error ? compileError.message : 'Failed to compile bot code',
          stack: compileError instanceof Error ? compileError.stack : undefined,
        },
        violations,
      };
    }

    // Step 4: Execute with timeout
    let move: TMove | null = null;
    
    try {
      const result = await executeWithTimeout(
        Promise.resolve(botFunction(state, config)),
        config.timeoutMs,
        () => { timedOut = true; }
      );
      
      move = result;
      
    } catch (execError) {
      const executionTimeMs = performance.now() - startTime;
      
      // Check if it was a timeout
      if (execError instanceof Error && execError.message === 'TIMEOUT') {
        return {
          move: null,
          executionTimeMs,
          timedOut: true,
          error: {
            type: 'timeout',
            message: `Bot exceeded time limit of ${config.timeoutMs}ms`,
          },
          violations,
        };
      }
      
      // Other runtime error
      return {
        move: null,
        executionTimeMs,
        timedOut: false,
        error: {
          type: 'runtime-error',
          message: execError instanceof Error ? execError.message : 'Unknown runtime error',
          stack: execError instanceof Error ? execError.stack : undefined,
        },
        violations,
      };
    }

    // Step 5: Validate move result
    if (move === null || move === undefined) {
      violations.push('Bot returned null or undefined move');
    }

    const executionTimeMs = performance.now() - startTime;
    
    return {
      move,
      executionTimeMs,
      timedOut: false,
      violations,
    };
    
  } catch (unexpectedError) {
    // Catch-all for unexpected errors
    const executionTimeMs = performance.now() - startTime;
    
    return {
      move: null,
      executionTimeMs,
      timedOut: false,
      error: {
        type: 'runtime-error',
        message: unexpectedError instanceof Error
          ? unexpectedError.message
          : 'Unexpected error during bot execution',
        stack: unexpectedError instanceof Error ? unexpectedError.stack : undefined,
      },
      violations,
    };
  }
}

// ============================================================================
// Batch Execution Utilities
// ============================================================================

/**
 * Execute multiple bot moves in parallel (useful for testing/analysis)
 */
export async function executeBotsBatch<TState, TMove>(
  options: ExecutionOptions<TState>[]
): Promise<BotExecutionResult<TMove>[]> {
  return Promise.all(options.map(opt => executeBotSandboxed<TState, TMove>(opt)));
}

/**
 * Execute bot with retry logic (useful for transient failures)
 */
export async function executeBotWithRetry<TState, TMove>(
  options: ExecutionOptions<TState>,
  maxRetries: number = 2
): Promise<BotExecutionResult<TMove>> {
  let lastResult: BotExecutionResult<TMove> | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await executeBotSandboxed<TState, TMove>(options);
    
    // Only retry on certain error types
    if (!lastResult.error || lastResult.error.type === 'timeout') {
      return lastResult;
    }
    
    // Don't retry validation or protocol violations
    if (
      lastResult.error.type === 'validation-error' ||
      lastResult.error.type === 'protocol-violation'
    ) {
      return lastResult;
    }
    
    // For runtime errors, retry with slight delay
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return lastResult!;
}
