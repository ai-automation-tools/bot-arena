/**
 * Integration tests for the match runner system
 * Tests the full workflow from match initialization to completion
 */

import { MatchRunnerConfig, MatchState, ProtocolDefinition } from "../match-runner";
import {
  initializeMatch,
  startMatch,
  processTurn,
  isMatchComplete,
} from "../match-state-manager";
import { executeBotSandboxed } from "../bot-executor";
import { completeMatch } from "../match-completion";
import { validateMatchSetup } from "../match-validator";
import { chessProtocol } from "../protocols/chess";

describe("Match Runner Integration Tests", () => {
  // Simple counter protocol for testing
  const counterProtocol: ProtocolDefinition<
    { count: number; maxCount: number },
    number
  > = {
    id: "counter",
    name: "Counter Game",
    description: "Increment a counter until reaching max",

    initializeState: () => ({
      count: 0,
      maxCount: 10,
    }),

    validateMove: (state, move, playerId) => {
      if (move === null || move === undefined) {
        return {
          legal: false,
          message: "Move cannot be null or undefined",
          violations: ["NULL_MOVE"],
        };
      }

      if (typeof move !== "number") {
        return {
          legal: false,
          message: "Move must be a number",
          violations: ["INVALID_TYPE"],
        };
      }

      if (move < 1 || move > 5) {
        return {
          legal: false,
          message: "Move must be between 1 and 5",
          violations: ["OUT_OF_RANGE"],
        };
      }

      return { legal: true };
    },

    applyMove: (state, move, playerId) => {
      return {
        ...state,
        count: state.count + (move as number),
      };
    },

    checkCompletion: (state) => {
      if (state.count >= state.maxCount) {
        return {
          complete: true,
          result: {
            matchId: "",
            outcome: "win" as const,
            winner: "player1",
            loser: "player2",
            scores: { player1: 1.0, player2: 0.0 },
            statistics: {
              totalTurns: 0,
              durationMs: 0,
              players: {
                player1: {
                  avgExecutionTimeMs: 0,
                  maxExecutionTimeMs: 0,
                  totalExecutionTimeMs: 0,
                  timeoutCount: 0,
                  violationCount: 0,
                  illegalMoveCount: 0,
                  errorCount: 0,
                },
                player2: {
                  avgExecutionTimeMs: 0,
                  maxExecutionTimeMs: 0,
                  totalExecutionTimeMs: 0,
                  timeoutCount: 0,
                  violationCount: 0,
                  illegalMoveCount: 0,
                  errorCount: 0,
                },
              },
            },
          },
        };
      }

      return { complete: false };
    },

    getNextPlayer: (state, currentPlayerId) => {
      return currentPlayerId === "player1" ? "player2" : "player1";
    },

    serializeStateForBot: (state) => state,
  };

  describe("Counter Protocol Integration", () => {
    it("should complete a full match with valid bot code", async () => {
      const config: MatchRunnerConfig = {
        matchId: "test-match-1",
        protocolId: "counter",
        initialState: counterProtocol.initializeState(),
        players: [
          {
            id: "player1",
            name: "Bot A",
            botCode: `export default function(state, config) {
              // Always increment by 3
              return 3;
            }`,
          },
          {
            id: "player2",
            name: "Bot B",
            botCode: `export default function(state, config) {
              // Always increment by 2
              return 2;
            }`,
          },
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 300000,
        maxTurns: 20,
      };

      // Validate setup
      const validationResult = validateMatchSetup(config, counterProtocol);
      expect(validationResult.valid).toBe(true);

      // Initialize and start match
      let matchState: MatchState = initializeMatch(config, counterProtocol);
      expect(matchState.status).toBe("initializing");

      matchState = startMatch(matchState);
      expect(matchState.status).toBe("in-progress");

      // Run match loop
      let iterations = 0;
      const MAX_ITERATIONS = 20;

      while (!isMatchComplete(matchState) && iterations < MAX_ITERATIONS) {
        iterations++;

        const currentPlayer = matchState.players.find(
          (p) => p.id === matchState.currentPlayerId
        );
        expect(currentPlayer).toBeDefined();

        // Execute bot
        const botResult = await executeBotSandboxed({
          botCode: currentPlayer!.botCode,
          state: matchState.gameState,
          config: {
            timeoutMs: config.turnTimeoutMs,
            playerId: currentPlayer!.id,
          },
        });

        // Process turn
        matchState = processTurn(matchState, botResult, counterProtocol);

        if (isMatchComplete(matchState)) {
          break;
        }
      }

      // Verify match completed successfully
      expect(matchState.status).toBe("completed");
      expect(iterations).toBeLessThan(MAX_ITERATIONS);

      // Complete match and verify results
      const matchResult = completeMatch(matchState, counterProtocol);
      expect(matchResult.outcome).toBe("win");
      expect(matchResult.statistics.totalTurns).toBeGreaterThan(0);
    });

    it("should handle bot timeout", async () => {
      const config: MatchRunnerConfig = {
        matchId: "test-match-timeout",
        protocolId: "counter",
        initialState: counterProtocol.initializeState(),
        players: [
          {
            id: "player1",
            name: "Fast Bot",
            botCode: `export default function(state, config) { return 1; }`,
          },
          {
            id: "player2",
            name: "Slow Bot",
            botCode: `export default function(state, config) {
              // Infinite loop - will timeout
              while(true) {}
              return 1;
            }`,
          },
        ],
        turnTimeoutMs: 100, // Very short timeout
        matchTimeoutMs: 300000,
        maxTurns: 20,
      };

      let matchState: MatchState = initializeMatch(config, counterProtocol);
      matchState = startMatch(matchState);

      // Execute slow bot
      const slowPlayer = matchState.players[1];
      const botResult = await executeBotSandboxed({
        botCode: slowPlayer.botCode,
        state: matchState.gameState,
        config: {
          timeoutMs: config.turnTimeoutMs,
          playerId: slowPlayer.id,
        },
      });

      // Verify timeout occurred
      expect(botResult.timedOut).toBe(true);
      expect(botResult.success).toBe(false);

      // Process turn and verify disqualification
      matchState = processTurn(matchState, botResult, counterProtocol);

      // Match should be completed due to disqualification
      expect(matchState.status).toBe("completed");

      const matchResult = completeMatch(matchState, counterProtocol);
      expect(matchResult.outcome).toBe("disqualified");
      expect(matchResult.loser).toBe("player2");
    });

    it("should handle illegal moves", async () => {
      const config: MatchRunnerConfig = {
        matchId: "test-match-illegal",
        protocolId: "counter",
        initialState: counterProtocol.initializeState(),
        players: [
          {
            id: "player1",
            name: "Legal Bot",
            botCode: `export default function(state, config) { return 3; }`,
          },
          {
            id: "player2",
            name: "Illegal Bot",
            botCode: `export default function(state, config) {
              // Returns illegal move (out of range)
              return 10;
            }`,
          },
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 300000,
        maxTurns: 20,
      };

      let matchState: MatchState = initializeMatch(config, counterProtocol);
      matchState = startMatch(matchState);

      // Skip to player2's turn
      matchState = { ...matchState, currentPlayerId: "player2" };

      // Execute illegal bot
      const illegalPlayer = matchState.players[1];
      const botResult = await executeBotSandboxed({
        botCode: illegalPlayer.botCode,
        state: matchState.gameState,
        config: {
          timeoutMs: config.turnTimeoutMs,
          playerId: illegalPlayer.id,
        },
      });

      // Process turn - should detect illegal move
      matchState = processTurn(matchState, botResult, counterProtocol);

      // Verify illegal move was detected
      const lastTurn = matchState.turnHistory[matchState.turnHistory.length - 1];
      expect(lastTurn.result.success).toBe(false);

      // Match should be completed due to disqualification
      expect(matchState.status).toBe("completed");

      const matchResult = completeMatch(matchState, counterProtocol);
      expect(matchResult.outcome).toBe("disqualified");
      expect(matchResult.loser).toBe("player2");
    });

    it("should handle max turns limit", async () => {
      const config: MatchRunnerConfig = {
        matchId: "test-match-maxturns",
        protocolId: "counter",
        initialState: counterProtocol.initializeState(),
        players: [
          {
            id: "player1",
            name: "Bot A",
            botCode: `export default function(state, config) {
              // Always increment by 1 (very slow progress)
              return 1;
            }`,
          },
          {
            id: "player2",
            name: "Bot B",
            botCode: `export default function(state, config) {
              return 1;
            }`,
          },
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 300000,
        maxTurns: 3, // Very low limit
      };

      let matchState: MatchState = initializeMatch(config, counterProtocol);
      matchState = startMatch(matchState);

      // Run until max turns
      let iterations = 0;
      const MAX_ITERATIONS = config.maxTurns * 2;

      while (!isMatchComplete(matchState) && iterations < MAX_ITERATIONS) {
        iterations++;

        const currentPlayer = matchState.players.find(
          (p) => p.id === matchState.currentPlayerId
        );

        const botResult = await executeBotSandboxed({
          botCode: currentPlayer!.botCode,
          state: matchState.gameState,
          config: {
            timeoutMs: config.turnTimeoutMs,
            playerId: currentPlayer!.id,
          },
        });

        matchState = processTurn(matchState, botResult, counterProtocol);

        if (isMatchComplete(matchState)) {
          break;
        }
      }

      // Verify match was abandoned due to max turns
      expect(matchState.status).toBe("abandoned");
      expect(matchState.turnHistory.length).toBeLessThanOrEqual(config.maxTurns);

      const matchResult = completeMatch(matchState, counterProtocol);
      expect(matchResult.outcome).toBe("abandoned");
    });
  });

  describe("Chess Protocol Integration", () => {
    it("should validate chess protocol setup", () => {
      const config: MatchRunnerConfig = {
        matchId: "chess-test-1",
        protocolId: "chess",
        initialState: chessProtocol.initializeState(),
        players: [
          {
            id: "white",
            name: "White Bot",
            botCode: `export default function(state, config) {
              // Simple opening: pawn to e4
              if (state.turn === 1) return "e2e4";
              return "e2e3";
            }`,
          },
          {
            id: "black",
            name: "Black Bot",
            botCode: `export default function(state, config) {
              // Simple response: pawn to e5
              if (state.turn === 2) return "e7e5";
              return "e7e6";
            }`,
          },
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 300000,
        maxTurns: 100,
      };

      const validationResult = validateMatchSetup(config, chessProtocol);
      expect(validationResult.valid).toBe(true);
    });

    it("should initialize chess match state correctly", () => {
      const config: MatchRunnerConfig = {
        matchId: "chess-test-2",
        protocolId: "chess",
        initialState: chessProtocol.initializeState(),
        players: [
          {
            id: "white",
            name: "White Bot",
            botCode: `export default function() { return "e2e4"; }`,
          },
          {
            id: "black",
            name: "Black Bot",
            botCode: `export default function() { return "e7e5"; }`,
          },
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 300000,
        maxTurns: 100,
      };

      const matchState = initializeMatch(config, chessProtocol);

      expect(matchState.status).toBe("initializing");
      expect(matchState.gameState).toHaveProperty("board");
      expect(matchState.gameState).toHaveProperty("turn");
      expect(matchState.gameState).toHaveProperty("currentPlayer");
    });
  });
});
