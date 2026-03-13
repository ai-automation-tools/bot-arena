import { POST, GET } from "../route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/match-validator");
jest.mock("@/lib/match-state-manager");
jest.mock("@/lib/bot-executor");
jest.mock("@/lib/match-completion");
jest.mock("@/lib/match-persistence");

import { validateMatchSetup } from "@/lib/match-validator";
import {
  initializeMatch,
  startMatch,
  processTurn,
  isMatchComplete,
} from "@/lib/match-state-manager";
import { executeBotSandboxed } from "@/lib/bot-executor";
import { completeMatch } from "@/lib/match-completion";
import { matchPersistence } from "@/lib/match-persistence";

describe("Match Runner API - GET /api/match/run", () => {
  it("should return API documentation", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("endpoint", "/api/match/run");
    expect(data).toHaveProperty("method", "POST");
    expect(data).toHaveProperty("availableProtocols");
    expect(Array.isArray(data.availableProtocols)).toBe(true);
    expect(data.availableProtocols).toContain("chess");
  });
});

describe("Match Runner API - POST /api/match/run", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject request with missing players", async () => {
    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        protocolId: "chess",
        config: {},
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("2 players are required");
  });

  it("should reject request with invalid number of players", async () => {
    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "function() {}" },
        ],
        protocolId: "chess",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("2 players are required");
  });

  it("should reject request with missing protocol ID", async () => {
    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "function() {}" },
          { id: "player2", name: "Bot B", botCode: "function() {}" },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Protocol ID is required");
  });

  it("should reject request with unknown protocol", async () => {
    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "function() {}" },
          { id: "player2", name: "Bot B", botCode: "function() {}" },
        ],
        protocolId: "unknown-protocol",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unknown protocol");
    expect(data.availableProtocols).toContain("chess");
  });

  it("should reject request that fails validation", async () => {
    (validateMatchSetup as jest.Mock).mockReturnValue({
      valid: false,
      errors: [
        {
          code: "INVALID_BOT_CODE",
          message: "Bot code contains forbidden APIs",
          field: "players[0].botCode",
        },
      ],
      warnings: [],
    });

    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "fetch('http://evil.com')" },
          { id: "player2", name: "Bot B", botCode: "function() {}" },
        ],
        protocolId: "chess",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("validation failed");
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].code).toBe("INVALID_BOT_CODE");
  });

  it("should successfully execute a complete match", async () => {
    // Mock validation to pass
    (validateMatchSetup as jest.Mock).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    // Mock match state progression
    const mockInitialState = {
      matchId: "test-match",
      status: "initializing" as const,
      currentPlayerId: "player1",
      gameState: {},
      players: [
        { id: "player1", name: "Bot A", botCode: "function() {}" },
        { id: "player2", name: "Bot B", botCode: "function() {}" },
      ],
      turnHistory: [],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    const mockInProgressState = {
      ...mockInitialState,
      status: "in-progress" as const,
      startedAt: new Date().toISOString(),
    };

    const mockCompletedState = {
      ...mockInProgressState,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
      turnHistory: [
        {
          turn: 1,
          playerId: "player1",
          move: "e2e4",
          result: { success: true, move: "e2e4", executionTimeMs: 10 },
          state: {},
          timestamp: new Date().toISOString(),
        },
      ],
    };

    (initializeMatch as jest.Mock).mockReturnValue(mockInitialState);
    (startMatch as jest.Mock).mockReturnValue(mockInProgressState);
    (processTurn as jest.Mock).mockReturnValue(mockCompletedState);
    (isMatchComplete as jest.Mock)
      .mockReturnValueOnce(false) // First iteration
      .mockReturnValueOnce(true); // After processTurn

    (executeBotSandboxed as jest.Mock).mockResolvedValue({
      success: true,
      move: "e2e4",
      executionTimeMs: 10,
      timedOut: false,
      error: null,
      violations: [],
    });

    const mockMatchResult = {
      matchId: "test-match",
      outcome: "win" as const,
      winner: "player1",
      loser: "player2",
      scores: {
        player1: 1.0,
        player2: 0.0,
      },
      statistics: {
        totalTurns: 1,
        durationMs: 1000,
        players: {
          player1: {
            avgExecutionTimeMs: 10,
            maxExecutionTimeMs: 10,
            totalExecutionTimeMs: 10,
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
    };

    (completeMatch as jest.Mock).mockReturnValue(mockMatchResult);

    (matchPersistence.saveMatchState as jest.Mock).mockResolvedValue(undefined);
    (matchPersistence.saveMatchResult as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "export default function() { return 'e2e4'; }" },
          { id: "player2", name: "Bot B", botCode: "export default function() { return 'e7e5'; }" },
        ],
        protocolId: "chess",
        config: {
          turnTimeoutMs: 5000,
          matchTimeoutMs: 300000,
          maxTurns: 100,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty("matchId");
    expect(data).toHaveProperty("result");
    expect(data).toHaveProperty("state");
    expect(data.result.outcome).toBe("win");
    expect(data.result.winner).toBe("player1");

    // Verify all dependencies were called
    expect(validateMatchSetup).toHaveBeenCalled();
    expect(initializeMatch).toHaveBeenCalled();
    expect(startMatch).toHaveBeenCalled();
    expect(processTurn).toHaveBeenCalled();
    expect(executeBotSandboxed).toHaveBeenCalled();
    expect(completeMatch).toHaveBeenCalled();
    expect(matchPersistence.saveMatchState).toHaveBeenCalled();
    expect(matchPersistence.saveMatchResult).toHaveBeenCalled();
  });

  it("should handle max iteration safety limit", async () => {
    (validateMatchSetup as jest.Mock).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    const mockState = {
      matchId: "test-match",
      status: "in-progress" as const,
      currentPlayerId: "player1",
      gameState: {},
      players: [
        { id: "player1", name: "Bot A", botCode: "function() {}" },
        { id: "player2", name: "Bot B", botCode: "function() {}" },
      ],
      turnHistory: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    (initializeMatch as jest.Mock).mockReturnValue(mockState);
    (startMatch as jest.Mock).mockReturnValue(mockState);
    (processTurn as jest.Mock).mockReturnValue(mockState);
    (isMatchComplete as jest.Mock).mockReturnValue(false); // Never completes

    (executeBotSandboxed as jest.Mock).mockResolvedValue({
      success: true,
      move: "e2e4",
      executionTimeMs: 10,
      timedOut: false,
      error: null,
      violations: [],
    });

    const mockMatchResult = {
      matchId: "test-match",
      outcome: "abandoned" as const,
      winner: null,
      loser: null,
      scores: {
        player1: 0.5,
        player2: 0.5,
      },
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
    };

    (completeMatch as jest.Mock).mockReturnValue(mockMatchResult);

    (matchPersistence.saveMatchState as jest.Mock).mockResolvedValue(undefined);
    (matchPersistence.saveMatchResult as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "export default function() {}" },
          { id: "player2", name: "Bot B", botCode: "export default function() {}" },
        ],
        protocolId: "chess",
        config: {
          maxTurns: 10,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.iterations).toBe(20); // maxTurns * 2
  });

  it("should handle internal errors gracefully", async () => {
    (validateMatchSetup as jest.Mock).mockImplementation(() => {
      throw new Error("Unexpected validation error");
    });

    const request = new NextRequest("http://localhost/api/match/run", {
      method: "POST",
      body: JSON.stringify({
        players: [
          { id: "player1", name: "Bot A", botCode: "function() {}" },
          { id: "player2", name: "Bot B", botCode: "function() {}" },
        ],
        protocolId: "chess",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal server error");
    expect(data.details).toContain("Unexpected validation error");
  });
});
