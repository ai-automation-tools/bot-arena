import vm from "node:vm";
import { Chess } from "chess";
import type { HouseBotId } from "../house-bots";
import type { GameDef, MoveInput } from "./games";
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

export function agentName(agent: AgentSpec, game: GameDef): string {
  if (agent.name?.trim()) return agent.name.trim();
  switch (agent.kind) {
    case "house": return game.houseBotName(agent.bot);
    case "code": return "Code bot";
    case "webhook": return new URL(agent.url).host;
    case "external": return "Agent";
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

export function houseBot<S>(game: GameDef<S>, bot: HouseBotId, seed: number, state: () => S): MoveSource {
  const play = game.houseBot(bot, seed);
  return async (view) => play(state(), view.you, view.turnTimeoutMs);
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
