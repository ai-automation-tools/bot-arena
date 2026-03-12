import { NextRequest, NextResponse } from "next/server";
import {
  MatchRunnerConfig,
  MatchState,
  MatchResult,
  MatchPlayer,
} from "@/lib/match-runner";
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
import { chessProtocol } from "@/lib/protocols/chess";
import { ProtocolDefinition } from "@/lib/match-runner";

// Protocol registry (expand as more protocols are added)
const PROTOCOL_REGISTRY: Record<string, ProtocolDefinition<unknown, unknown>> =
  {
    chess: chessProtocol as ProtocolDefinition<unknown, unknown>,
    // Add more protocols here as they're implemented
  };

/**
 * POST /api/match/run
 *
 * Executes a complete match between two bots.
 *
 * Request body:
 * {
 *   "players": [
 *     { "id": "player1", "name": "Bot A", "botCode": "..." },
 *     { "id": "player2", "name": "Bot B", "botCode": "..." }
 *   ],
 *   "protocolId": "chess",
 *   "config": {
 *     "turnTimeoutMs": 5000,
 *     "matchTimeoutMs": 300000,
 *     "maxTurns": 100
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "matchId": "match_123",
 *   "result": { ... },
 *   "state": { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate request
    const { players, protocolId, config } = body;

    if (!players || !Array.isArray(players) || players.length !== 2) {
      return NextResponse.json(
        { success: false, error: "Exactly 2 players are required" },
        { status: 400 }
      );
    }

    if (!protocolId || typeof protocolId !== "string") {
      return NextResponse.json(
        { success: false, error: "Protocol ID is required" },
        { status: 400 }
      );
    }

    // Get protocol from registry
    const protocol = PROTOCOL_REGISTRY[protocolId];
    if (!protocol) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown protocol: ${protocolId}`,
          availableProtocols: Object.keys(PROTOCOL_REGISTRY),
        },
        { status: 400 }
      );
    }

    // Generate match ID
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build match configuration
    const matchConfig: MatchRunnerConfig = {
      matchId,
      protocolId,
      initialState: protocol.initializeState(),
      players: players as MatchPlayer[],
      turnTimeoutMs: config?.turnTimeoutMs ?? 5000,
      matchTimeoutMs: config?.matchTimeoutMs ?? 300000,
      maxTurns: config?.maxTurns ?? 100,
    };

    // Validate setup
    const validationResult = validateMatchSetup(matchConfig, protocol);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Match configuration validation failed",
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Initialize match
    let matchState: MatchState = initializeMatch(matchConfig, protocol);
    await matchPersistence.saveMatchState(matchId, matchState);

    // Start match
    matchState = startMatch(matchState);
    await matchPersistence.saveMatchState(matchId, matchState);

    // Run match loop
    const MAX_ITERATIONS = matchConfig.maxTurns * 2; // Safety limit
    let iterations = 0;

    while (!isMatchComplete(matchState) && iterations < MAX_ITERATIONS) {
      iterations++;

      const currentPlayer = matchState.players.find(
        (p) => p.id === matchState.currentPlayerId
      );
      if (!currentPlayer) {
        throw new Error(`Current player ${matchState.currentPlayerId} not found`);
      }

      // Execute bot to get move
      const botResult = await executeBotSandboxed({
        botCode: currentPlayer.botCode,
        state: matchState.gameState,
        config: {
          timeoutMs: matchConfig.turnTimeoutMs,
          playerId: currentPlayer.id,
        },
      });

      // Process turn (validation, state update, completion check)
      matchState = processTurn(matchState, botResult, protocol);

      // Persist updated state
      await matchPersistence.saveMatchState(matchId, matchState);

      // Check for completion after each turn
      if (isMatchComplete(matchState)) {
        break;
      }
    }

    // Safety check: if we hit iteration limit, mark as abandoned
    if (iterations >= MAX_ITERATIONS && !isMatchComplete(matchState)) {
      matchState = {
        ...matchState,
        status: "abandoned",
        completedAt: new Date().toISOString(),
      };
      await matchPersistence.saveMatchState(matchId, matchState);
    }

    // Complete match (calculate scores, determine winner)
    const matchResult: MatchResult = completeMatch(matchState, protocol);
    await matchPersistence.saveMatchResult(matchId, matchResult);

    // Return final result
    return NextResponse.json(
      {
        success: true,
        matchId: matchState.matchId,
        result: matchResult,
        state: matchState,
        iterations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Match execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/match/run
 *
 * Returns API documentation and available protocols.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/match/run",
    method: "POST",
    description: "Execute a complete match between two bots",
    availableProtocols: Object.keys(PROTOCOL_REGISTRY),
    requestSchema: {
      players: [
        {
          id: "string",
          name: "string",
          botCode: "string (JavaScript function)",
        },
      ],
      protocolId: "string (chess, etc.)",
      config: {
        turnTimeoutMs: "number (optional, default: 5000)",
        matchTimeoutMs: "number (optional, default: 300000)",
        maxTurns: "number (optional, default: 100)",
      },
    },
    responseSchema: {
      success: "boolean",
      matchId: "string",
      result: "MatchResult object",
      state: "MatchState object",
      iterations: "number",
    },
  });
}
