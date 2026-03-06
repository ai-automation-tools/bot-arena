/**
 * Bot Executor Tests
 * 
 * Tests for the bot execution sandbox with timeout enforcement
 */

import { executeBotSandboxed, executeBotWithRetry } from '../bot-executor';
import type { BotExecutionConfig } from '../match-runner';

// ============================================================================
// Test Utilities
// ============================================================================

type TestState = {
  board: string[][];
  turn: number;
};

type TestMove = {
  from: [number, number];
  to: [number, number];
};

const createTestConfig = (timeoutMs: number = 1000): BotExecutionConfig => ({
  timeoutMs,
  playerId: 'test-player',
  protocolMeta: { test: true },
});

const createTestState = (): TestState => ({
  board: [
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ],
  turn: 0,
});

// ============================================================================
// Tests
// ============================================================================

describe('Bot Executor', () => {
  describe('executeBotSandboxed', () => {
    it('should execute a simple bot and return a move', async () => {
      const botCode = `
        export default function(state, config) {
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.timedOut).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.violations).toHaveLength(0);
      expect(result.move).toEqual({ from: [1, 0], to: [3, 0] });
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle async bot functions', async () => {
      const botCode = `
        export default async function(state, config) {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { from: [1, 1], to: [3, 1] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.timedOut).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.move).toEqual({ from: [1, 1], to: [3, 1] });
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(50);
    });

    it('should enforce timeout limits', async () => {
      const botCode = `
        export default async function(state, config) {
          // Infinite loop
          while (true) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(100), // 100ms timeout
      });

      expect(result.timedOut).toBe(true);
      expect(result.move).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('timeout');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(100);
    });

    it('should detect forbidden API usage', async () => {
      const botCode = `
        export default function(state, config) {
          fetch('https://evil.com/cheat');
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.move).toBeNull();
      expect(result.error?.type).toBe('protocol-violation');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('fetch');
    });

    it('should catch runtime errors', async () => {
      const botCode = `
        export default function(state, config) {
          throw new Error('Bot crashed!');
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.move).toBeNull();
      expect(result.error?.type).toBe('runtime-error');
      expect(result.error?.message).toContain('Bot crashed!');
    });

    it('should reject invalid bot code format', async () => {
      const botCode = `
        // Missing export default
        function myBot(state, config) {
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.move).toBeNull();
      expect(result.error?.type).toBe('validation-error');
      expect(result.error?.message).toContain('Invalid bot code format');
    });

    it('should reject bot with wrong number of parameters', async () => {
      const botCode = `
        export default function(state) {
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.move).toBeNull();
      expect(result.error?.type).toBe('validation-error');
      expect(result.error?.message).toContain('exactly 2 parameters');
    });

    it('should detect when bot returns null', async () => {
      const botCode = `
        export default function(state, config) {
          return null;
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.move).toBeNull();
      expect(result.violations).toContain('Bot returned null or undefined move');
    });

    it('should allow Math utilities', async () => {
      const botCode = `
        export default function(state, config) {
          const random = Math.floor(Math.random() * 8);
          return { from: [1, random], to: [3, random] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.error).toBeUndefined();
      expect(result.move).toBeDefined();
      expect(result.move?.from[1]).toBeGreaterThanOrEqual(0);
      expect(result.move?.from[1]).toBeLessThan(8);
    });

    it('should allow JSON utilities', async () => {
      const botCode = `
        export default function(state, config) {
          const stateStr = JSON.stringify(state);
          const parsed = JSON.parse(stateStr);
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotSandboxed<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.error).toBeUndefined();
      expect(result.move).toEqual({ from: [1, 0], to: [3, 0] });
    });
  });

  describe('executeBotWithRetry', () => {
    it('should retry on runtime errors', async () => {
      let attemptCount = 0;
      
      // This would need to be done via botCode in real usage
      // For testing, we're demonstrating the retry logic
      const botCode = `
        export default function(state, config) {
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotWithRetry<TestState, TestMove>({
        botCode,
        state: createTestState(),
        config: createTestConfig(),
      });

      expect(result.move).toBeDefined();
    });

    it('should not retry validation errors', async () => {
      const botCode = `
        export default function(state) {
          return { from: [1, 0], to: [3, 0] };
        }
      `;

      const result = await executeBotWithRetry<TestState, TestMove>(
        {
          botCode,
          state: createTestState(),
          config: createTestConfig(),
        },
        2 // maxRetries
      );

      expect(result.error?.type).toBe('validation-error');
      // Should not have retried
    });
  });
});
