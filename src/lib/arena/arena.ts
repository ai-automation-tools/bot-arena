import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BotExecutionResult, MatchState } from "../match-runner";
import { initializeMatch, processTurn, startMatch } from "../match-state-manager";
import { agentName, compileCodeBot, houseBot, webhookBot, type AgentSpec, type MoveSource } from "./agents";
import { getGame, type GameDef, type GameId, type MoveInput, type MoveRecord } from "./games";
import type { TurnView } from "./view";

/**
 * The local arena: every match lives in this process, and finished ones are written to
 * `$ARENA_DATA_DIR/matches/<id>.json` (default `.arena/`) so history survives a restart.
 * ponytail: one process, in memory; a match in progress is lost on restart. Add a store if that matters.
 */

export const DEFAULT_TURN_TIMEOUT_MS = 120_000; // LLM agents think slowly
const MAX_PLIES = 600;

export interface Seat {
  /** "white"/"black" in chess, "x"/"o" in tic-tac-toe. */
  color: string;
  name: string;
  kind: AgentSpec["kind"];
  /** External seats only: the token an agent plays with. Never sent to the browser UI. */
  token?: string;
}

interface LiveMatch {
  id: string;
  game: GameDef;
  createdAt: string;
  turnTimeoutMs: number;
  startPosition: string;
  seats: Record<string, Seat>;
  state: MatchState<unknown, unknown>;
  /** Set while an external seat is on the clock. */
  pending?: { color: string; resolve: (move: MoveInput) => void };
  /** Long-poll waiters, woken on every change. */
  waiters: Set<() => void>;
}

/** A match as the UI and the API list it: no tokens, no code. */
export interface MatchSummary {
  id: string;
  game: GameId;
  createdAt: string;
  status: MatchState["status"];
  /** Keyed by seat, first mover first. */
  players: Record<string, { name: string; kind: Seat["kind"] }>;
  turnTimeoutMs: number;
  toMove: string;
  /** Chess: FEN. Tic-tac-toe: 9 cells in reading order. */
  position: string;
  startPosition: string;
  moves: MoveRecord[];
  result: { outcome: string; winner: string | null; reason: string } | null;
}

// Route handlers can load this module more than once in dev; one registry per process.
const g = globalThis as typeof globalThis & { __arena?: Map<string, LiveMatch> };
const matches: Map<string, LiveMatch> = (g.__arena ??= new Map());

const dataDir = () => join(process.env.ARENA_DATA_DIR || ".arena", "matches");

/** One agent per seat, keyed by seat id: `white`/`black` for chess, `x`/`o` for tic-tac-toe. */
export interface CreateMatchInput {
  game?: GameId;
  white?: AgentSpec;
  black?: AgentSpec;
  x?: AgentSpec;
  o?: AgentSpec;
  turnTimeoutMs?: number;
  /** A start position: a FEN for chess, 9 cells for tic-tac-toe. */
  startPosition?: string;
}

/** Creates and starts a match. Returns its summary plus a token for each external seat. */
export function createMatch(input: CreateMatchInput): { match: MatchSummary; tokens: Record<string, string> } {
  const id = randomUUID().slice(0, 8);
  const game = getGame(input.game);
  const turnTimeoutMs = Math.min(Math.max(input.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS, 1000), 3_600_000);
  const sources: Record<string, MoveSource | null> = {};
  const seats: Record<string, Seat> = {};
  const tokens: Record<string, string> = {};
  let initialState: unknown;
  try {
    initialState = game.create(input.startPosition);
  } catch (e) {
    throw new ArenaError(400, "BAD_START_POSITION", (e as Error).message);
  }

  for (const [n, color] of game.seats.entries()) {
    const agent = input[color as "white" | "black" | "x" | "o"];
    if (!agent) throw new ArenaError(400, "MISSING_SEAT", `${game.name} needs an agent for ${game.seats.join(" and ")}; ${color} is missing`);
    const seat: Seat = { color, name: agentName(agent, game), kind: agent.kind };
    switch (agent.kind) {
      case "house": sources[color] = houseBot(game, agent.bot, Date.now() + n, () => matches.get(id)!.state.gameState); break;
      case "code":
        try {
          sources[color] = compileCodeBot(agent.code);
        } catch (e) {
          throw new ArenaError(400, "BAD_BOT_CODE", `${color} code bot: ${(e as Error).message}`);
        }
        break;
      case "webhook": sources[color] = webhookBot(agent.url); break;
      case "external": sources[color] = null; seat.token = tokens[color] = randomUUID(); break;
    }
    seats[color] = seat;
  }

  const state = startMatch(
    initializeMatch(
      {
        matchId: id,
        protocolId: game.protocol.id,
        initialState,
        players: game.seats.map((c) => ({ id: c, name: seats[c].name, botCode: seats[c].kind, position: c })),
        turnTimeoutMs,
        maxTurns: MAX_PLIES,
        matchTimeoutMs: 0,
      },
      game.protocol,
    ),
  );

  const live: LiveMatch = { id, game, createdAt: new Date().toISOString(), turnTimeoutMs, startPosition: game.position(initialState), seats, state, waiters: new Set() };
  matches.set(id, live);
  void run(live, sources);
  return { match: summarize(live), tokens };
}

const toMove = (m: LiveMatch) => m.game.protocol.getNextPlayer(m.state.gameState, "");
const other = (m: LiveMatch, color: string) => m.game.seats.find((c) => c !== color)!;
const history = (m: LiveMatch) => (m.state.gameState as { moveHistory: string[] }).moveHistory;

async function run(m: LiveMatch, sources: Record<string, MoveSource | null>) {
  while (m.state.status === "in-progress") {
    const color = toMove(m);
    const source = sources[color];
    const started = Date.now();
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let exec: BotExecutionResult<unknown>;
    try {
      const input = await Promise.race([
        source ? source(view(m, color), ac.signal) : new Promise<MoveInput>((resolve) => (m.pending = { color, resolve })),
        new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new TimeoutError()), m.turnTimeoutMs))),
      ]);
      const parsed = m.game.parse(m.state.gameState, input);
      exec =
        "move" in parsed
          ? { move: parsed.move, executionTimeMs: Date.now() - started, timedOut: false, violations: [] }
          : { move: null, executionTimeMs: Date.now() - started, timedOut: false, violations: [], error: { type: "validation-error", message: parsed.error } };
    } catch (e) {
      const timedOut = e instanceof TimeoutError;
      exec = {
        move: null,
        executionTimeMs: Date.now() - started,
        timedOut,
        violations: [],
        error: { type: timedOut ? "timeout" : "runtime-error", message: timedOut ? `No move within ${m.turnTimeoutMs / 1000}s` : String((e as Error)?.message ?? e) },
      };
    } finally {
      clearTimeout(timer);
      ac.abort();
      m.pending = undefined;
    }
    if (m.state.status !== "in-progress") break; // resigned while on the clock
    m.state = processTurn(m.state, exec, m.game.protocol);
    wake(m);
  }
  persist(m);
}

class TimeoutError extends Error {}

function wake(m: LiveMatch) {
  for (const w of m.waiters) w();
  m.waiters.clear();
}

function persist(m: LiveMatch) {
  try {
    mkdirSync(dataDir(), { recursive: true });
    writeFileSync(join(dataDir(), `${m.id}.json`), JSON.stringify(summarize(m), null, 2));
  } catch (e) {
    console.error(`[arena] could not save match ${m.id}:`, e);
  }
}

function result(m: LiveMatch): MatchSummary["result"] {
  const r = m.state.result;
  return r ? { outcome: r.outcome, winner: r.winnerId ?? null, reason: r.reason } : null;
}

export function summarize(m: LiveMatch): MatchSummary {
  const legal = m.state.turns.filter((t) => t.legal);
  const moves = history(m);
  return {
    id: m.id,
    game: m.game.id as GameId,
    createdAt: m.createdAt,
    status: m.state.status,
    players: Object.fromEntries(m.game.seats.map((c) => [c, { name: m.seats[c].name, kind: m.seats[c].kind }])),
    turnTimeoutMs: m.turnTimeoutMs,
    toMove: toMove(m),
    position: m.game.position(m.state.gameState),
    startPosition: m.startPosition,
    moves: legal.map((t, i) => m.game.record(t.execution.move, moves[i])),
    result: result(m),
  };
}

function view(m: LiveMatch, you: string): TurnView {
  const { gameState } = m.state;
  const finished = m.state.status !== "in-progress";
  const yourTurn = !finished && toMove(m) === you;
  const moves = history(m);
  return {
    matchId: m.id,
    game: m.game.id as GameId,
    rules: m.game.rules,
    status: finished ? "finished" : yourTurn ? "your-turn" : "waiting",
    you,
    toMove: toMove(m),
    position: m.game.position(gameState),
    ...m.game.extraView?.(gameState),
    board: m.game.board(gameState),
    legalMoves: yourTurn ? m.game.legalMoves(gameState) : [],
    moveHistory: moves,
    lastMove: moves.at(-1) ?? null,
    opponent: m.seats[other(m, you)].name,
    turnTimeoutMs: m.turnTimeoutMs,
    result: result(m),
  };
}

export class ArenaError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function seatFor(matchId: string, token: string): { m: LiveMatch; color: string } {
  const m = matches.get(matchId);
  if (!m) throw new ArenaError(404, "MATCH_NOT_FOUND", `No live match ${matchId}`);
  const color = m.game.seats.find((c) => m.seats[c].token && m.seats[c].token === token);
  if (!color) throw new ArenaError(403, "BAD_SEAT_TOKEN", "That token doesn't hold a seat in this match");
  return { m, color };
}

/**
 * Long-polls until it's this seat's turn or the game ends, or `waitMs` passes, then returns the view.
 * Agents call this in a loop: wait, move, wait.
 */
export async function waitForTurn(matchId: string, token: string, waitMs = 25_000): Promise<TurnView> {
  const { m, color } = seatFor(matchId, token);
  const deadline = Date.now() + Math.min(Math.max(waitMs, 0), 60_000);
  for (;;) {
    const v = view(m, color);
    // A seat's own clock starts when run() asks for its move, so wait for `pending` before calling it its turn.
    const ready = v.status === "finished" || (v.status === "your-turn" && m.pending?.color === color);
    const left = deadline - Date.now();
    if (ready || left <= 0) return ready ? v : { ...v, status: v.status === "your-turn" ? "waiting" : v.status };
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, Math.min(left, 250)); // also re-check: run() sets `pending` after waking
      m.waiters.add(() => { clearTimeout(t); resolve(); });
    });
  }
}

/** Plays a move for an external seat. An illegal move is rejected (the clock keeps running) so the agent can retry. */
export function submitMove(matchId: string, token: string, input: MoveInput): { san: string } {
  const { m, color } = seatFor(matchId, token);
  if (m.state.status !== "in-progress") throw new ArenaError(409, "GAME_OVER", "The game is over");
  if (m.pending?.color !== color) throw new ArenaError(409, "NOT_YOUR_TURN", `It's ${toMove(m)}'s move`);
  const parsed = m.game.parse(m.state.gameState, input);
  if ("error" in parsed) throw new ArenaError(422, "ILLEGAL_MOVE", parsed.error);
  const { resolve } = m.pending;
  m.pending = undefined; // taken now, so a second move or an early wait can't see a stale turn
  resolve(input); // run() applies it on its next tick; wait_for_turn shows the result
  return { san: parsed.san };
}

/** Ends the game in the other side's favour. */
export function resign(matchId: string, token: string): TurnView {
  const { m, color } = seatFor(matchId, token);
  if (m.state.status !== "in-progress") throw new ArenaError(409, "GAME_OVER", "The game is over");
  const winner = other(m, color);
  m.state = {
    ...m.state,
    status: "completed",
    completedAt: new Date().toISOString(),
    result: { outcome: "win", winnerId: winner, loserId: color, reason: "resignation", scores: { [winner]: 1, [color]: 0 }, statistics: { totalTurns: m.state.turns.length, durationMs: 0, players: {} } },
  };
  const pending = m.pending;
  m.pending = undefined;
  pending?.resolve("resign"); // unblocks run(); its processTurn is skipped because the status changed
  wake(m);
  return view(m, color);
}

/** Matches saved before v0.3 were chess-only, with `white`/`black`/`fen`/`startFen` fields. */
type SavedV2 = Omit<MatchSummary, "game" | "players" | "position" | "startPosition"> & {
  white: MatchSummary["players"][string];
  black: MatchSummary["players"][string];
  fen: string;
  startFen: string;
};
function upgrade(s: MatchSummary | SavedV2): MatchSummary {
  if ("game" in s) return s;
  const { white, black, fen, startFen, ...rest } = s;
  return { ...rest, game: "chess", players: { white, black }, position: fen, startPosition: startFen };
}

const readSaved = (file: string) => upgrade(JSON.parse(readFileSync(file, "utf8")));

export function getMatch(id: string): MatchSummary | null {
  const m = matches.get(id);
  if (m) return summarize(m);
  try {
    return readSaved(join(dataDir(), `${id.replace(/[^\w-]/g, "")}.json`));
  } catch {
    return null;
  }
}

/** Live matches plus saved ones, newest first. */
export function listMatches(): MatchSummary[] {
  const all = new Map<string, MatchSummary>();
  try {
    for (const f of readdirSync(dataDir())) {
      if (!f.endsWith(".json")) continue;
      try {
        const s = readSaved(join(dataDir(), f));
        all.set(s.id, s);
      } catch { /* skip a corrupt file */ }
    }
  } catch { /* no saved matches yet */ }
  for (const m of matches.values()) all.set(m.id, summarize(m));
  return [...all.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
