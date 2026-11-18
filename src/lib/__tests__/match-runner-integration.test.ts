/**
 * Integration tests for the match runner system
 * Tests the full workflow from match initialization to completion
 */

import { MatchRunnerConfig } from "../match-runner";
import { initializeMatch } from "../match-state-manager";
import { chessProtocol, type ChessState } from "../protocols/chess";

describe("Match Runner Integration Tests", () => {
  describe("Chess Protocol Integration", () => {
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
      expect(matchState.gameState.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      expect(matchState.gameState.moveHistory).toEqual([]);
    });
  });
});
