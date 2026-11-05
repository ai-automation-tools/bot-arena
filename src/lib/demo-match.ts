import type { ChessMove, ChessState } from "./protocols/chess";
import { chessProtocol, createChessState } from "./protocols/chess";
import type { MatchOutcome, MatchRunnerConfig } from "./match-runner";
import { initializeMatch, processTurn, startMatch } from "./match-state-manager";
import { HOUSE_BOTS, seededRng, type HouseBotId } from "./house-bots";

/** A finished house-bot match, as committed under `src/data/demo-matches/`. Plain JSON, no timestamps. */
export interface DemoMatch {
  id: string;
  seed: number;
  white: { botId: HouseBotId; name: string };
  black: { botId: HouseBotId; name: string };
  startFen: string;
  moves: (ChessMove & { san: string })[];
  finalFen: string;
  result: { outcome: MatchOutcome; winner?: "white" | "black"; reason: string };
}

/** Longest a demo game may run before the match manager abandons it (in plies). */
export const DEMO_MAX_PLIES = 400;

/**
 * Plays two house bots through the chess protocol and the match state manager.
 * Both bots draw from one RNG seeded with `seed`, so the same arguments always give the same game.
 */
export function playDemoMatch(id: string, seed: number, white: HouseBotId, black: HouseBotId): DemoMatch {
  const rng = seededRng(seed);
  const bots = { white: HOUSE_BOTS[white].create(rng), black: HOUSE_BOTS[black].create(rng) };
  const config: MatchRunnerConfig<ChessState> = {
    matchId: id,
    protocolId: chessProtocol.id,
    initialState: createChessState(),
    players: [
      { id: "white", name: HOUSE_BOTS[white].name, botCode: `house:${white}`, position: "white" },
      { id: "black", name: HOUSE_BOTS[black].name, botCode: `house:${black}`, position: "black" },
    ],
    turnTimeoutMs: 1000,
    maxTurns: DEMO_MAX_PLIES,
    matchTimeoutMs: 0,
  };

  let match = startMatch(initializeMatch<ChessState, ChessMove>(config, chessProtocol));
  while (match.status === "in-progress") {
    const side = match.gameState.currentPlayer;
    const move = bots[side](chessProtocol.serializeStateForBot(match.gameState, side) as ChessState, {
      timeoutMs: config.turnTimeoutMs,
      playerId: side,
    }) as ChessMove;
    match = processTurn(match, { move, executionTimeMs: 0, timedOut: false, violations: [] }, chessProtocol);
  }

  const { gameState, turns, result } = match;
  if (!result) throw new Error(`Match ${id} ended in status ${match.status} with no result`);
  return {
    id,
    seed,
    white: { botId: white, name: HOUSE_BOTS[white].name },
    black: { botId: black, name: HOUSE_BOTS[black].name },
    startFen: config.initialState.startFen,
    moves: turns.map((t, i) => ({ ...(t.execution.move as ChessMove), san: gameState.moveHistory[i] })),
    finalFen: gameState.fen,
    result: {
      outcome: result.outcome,
      ...(result.winnerId ? { winner: result.winnerId as "white" | "black" } : {}),
      reason: result.reason,
    },
  };
}

/** The demo matches the generator writes, one fixture file per entry. */
export const DEMO_MATCHES: { id: string; seed: number; white: HouseBotId; black: HouseBotId }[] = [
  { id: "engine-vs-random", seed: 1, white: "search-engine", black: "random-mover" },
  { id: "random-vs-engine", seed: 2, white: "random-mover", black: "search-engine" },
  { id: "engine-vs-engine", seed: 3, white: "search-engine", black: "search-engine" },
];
