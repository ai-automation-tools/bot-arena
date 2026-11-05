import vm from "node:vm";
import { Chess } from "chess";
import { HOUSE_BOTS, seededRng, type HouseBotId } from "../house-bots";
import type { ChessMove } from "../protocols/chess";
import type { TurnView } from "./view";

/**
 * Who sits in a seat. Bot Arena runs on your own machine against your own agents, so a code bot is
 * trusted code: it runs in a `node:vm` context only so a runaway loop can be stopped, not as a sandbox.
 */
export type AgentSpec =
  | { kind: "house"; bot: HouseBotId; name?: string }
  | { kind: "code"; code: string; name?: string }
  | { kind: "webhook"; url: string; name?: string }
  /** Plays through the MCP tools or the REST API with the seat token it's given. */
  | { kind: "external"; name?: string };

export const AGENT_KINDS = ["house", "code", "webhook", "external"] as const;

/** A move as an agent may send it: SAN ("Nf3", "e8=Q"), UCI ("g1f3", "e7e8q"), or { from, to, promotion }. */
export type MoveInput = string | { from: string; to: string; promotion?: string };

export function agentName(agent: AgentSpec): string {
  if (agent.name?.trim()) return agent.name.trim();
  switch (agent.kind) {
    case "house": return HOUSE_BOTS[agent.bot].name;
    case "code": return "Code bot";
    case "webhook": return new URL(agent.url).host;
    case "external": return "Agent";
  }
}

/**
 * Turns any accepted move notation into a legal move in this position, or explains why it can't.
 * Agents get the error back and may try again while their turn clock runs.
 */
export function parseMove(fen: string, input: MoveInput): { move: ChessMove; san: string } | { error: string } {
  const chess = new Chess(fen);
  let candidate: string | { from: string; to: string; promotion?: string } = input;
  if (typeof input === "string") {
    const s = input.trim();
    const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(s);
    candidate = uci ? { from: uci[1].toLowerCase(), to: uci[2].toLowerCase(), promotion: uci[3]?.toLowerCase() } : s;
  }
  try {
    const m = chess.move(candidate as Parameters<Chess["move"]>[0]);
    return { move: { from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion as ChessMove["promotion"] } : {}) }, san: m.san };
  } catch {
    return { error: `Illegal or unreadable move ${JSON.stringify(input)}. Legal moves: ${chess.moves().join(", ")}` };
  }
}

/** Something that, given the position, eventually produces a move (or throws). */
export type MoveSource = (view: TurnView, signal: AbortSignal) => Promise<MoveInput>;

/** Longest a code bot may compute synchronously in one call, whatever the turn clock says. */
const CODE_SYNC_LIMIT_MS = 10_000;

export function compileCodeBot(code: string): MoveSource {
  // `export default function (state, config) {}` is the documented shape; plain `function bot(...)` works too.
  const body = code.replace(/export\s+default\s+/, "globalThis.__bot = ");
  // Your own code on your own machine: give it the usual globals so it can call a model, time itself, etc.
  const context = vm.createContext({
    Chess,
    fetch, URL, URLSearchParams, Headers, Request, Response, AbortController, AbortSignal,
    TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, performance,
    console: { log: () => {}, error: () => {}, warn: () => {} },
  });
  new vm.Script(body, { filename: "bot.js" }).runInContext(context, { timeout: CODE_SYNC_LIMIT_MS });
  if (typeof context.__bot !== "function") {
    if (typeof context.bot === "function") context.__bot = context.bot;
    else throw new Error("Code bot must `export default function (state, config) { ... }` or define `function bot(state, config)`");
  }
  return async (view) => {
    context.__args = [view, { timeoutMs: view.turnTimeoutMs, playerId: view.you }];
    return (await vm.runInContext("__bot(...__args)", context, { timeout: CODE_SYNC_LIMIT_MS })) as MoveInput;
  };
}

export function houseBot(bot: HouseBotId, seed: number): MoveSource {
  const play = HOUSE_BOTS[bot].create(seededRng(seed));
  return async (view) =>
    play({ startFen: view.fen, fen: view.fen, currentPlayer: view.you, moveHistory: view.moveHistory }, { timeoutMs: view.turnTimeoutMs, playerId: view.you }) as ChessMove;
}

/** POSTs the turn view to the agent's URL; the reply is `{ "move": ... }`. */
export function webhookBot(url: string): MoveSource {
  return async (view, signal) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(view), signal });
    if (!res.ok) throw new Error(`Webhook answered ${res.status}`);
    const body = (await res.json()) as { move?: MoveInput };
    if (!body?.move) throw new Error('Webhook reply must be JSON like { "move": "e4" }');
    return body.move;
  };
}
