/**
 * Integration tests for the match runner system
 * Tests the full workflow from match initialization to completion
 */

import { MatchRunnerConfig } from "../match-runner";
import { initializeMatch } from "../match-state-manager";
import { validateMatchSetup } from "../match-validator";
import { chessProtocol, type ChessState } from "../protocols/chess";

describe("Match Runner Integration Tests", () => {
  describe("Chess Protocol Integration", () => {
    it("should validate chess protocol setup", () => {
      const config: MatchRunnerConfig<ChessState> = {
        matchId: "chess-test-1",
        protocolId: "chess",
        initialState: chessProtocol.initializeState(),
        players: [
          {
            id: "white",
            name: "White Bot",
            position: "white",
            botCode: `export default function(state, config) {
              // Simple opening: pawn to e4
              if (state.turn === 1) return "e2e4";
              return "e2e3";
            }`,
          },
          {
            id: "black",
            name: "Black Bot",
            position: "black",
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
      const config: MatchRunnerConfig<ChessState> = {
        matchId: "chess-test-2",
        protocolId: "chess",
        initialState: chessProtocol.initializeState(),
        players: [
          {
            id: "white",
            name: "White Bot",
            position: "white",
            botCode: `export default function() { return "e2e4"; }`,
          },
          {
            id: "black",
            name: "Black Bot",
            position: "black",
            botCode: `export default function() { return "e7e5"; }`,
          },
        ],
        turnTimeoutMs: 5000,
        matchTimeoutMs: 300000,
        maxTurns: 100,
      };

      const matchState = initializeMatch(config, chessProtocol);

      expect(matchState.status).toBe("initializing");
      expect(matchState.gameState).toEqual(chessProtocol.initializeState());
      expect(matchState.gameState.currentPlayer).toBe("white");
      expect(matchState.gameState.fullmoveNumber).toBe(1);
      expect(matchState.gameState.moveHistory).toEqual([]);
    });
  });
});
