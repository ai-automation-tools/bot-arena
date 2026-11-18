import vm from "node:vm";
import { Worker } from "node:worker_threads";
import { Chess } from "chess";
import type { HouseBotId } from "../house-bots";
import type { GameDef, MoveInput } from "./games";
import type { TurnView } from "./view";

/**
 * Who sits in a seat. Bot Arena runs on your own machine against your own agents, so a code bot is
 * trusted code: it runs in its own worker thread only so a runaway loop can be stopped, not as a sandbox.
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

/** Something that, given the position, eventually produces a move (or throws). `close` frees what it holds. */
export type MoveSource = ((view: TurnView, signal: AbortSignal) => Promise<MoveInput>) & { close?: () => void };

/** Longest a code bot may compute synchronously in one call, whatever the turn clock says. */
const CODE_SYNC_LIMIT_MS = 10_000;

/**
 * Runs one code-bot seat. Plain JS (not bundled), so it's eval'd as the worker's source. Your own code on
 * your own machine: it gets the usual globals so it can call a model, time itself, etc.
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
const vm = require("node:vm");
const { Chess } = require("chess");
const context = vm.createContext({
  Chess,
  fetch, URL, URLSearchParams, Headers, Request, Response, AbortController, AbortSignal,
  TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, performance,
  console: { log() {}, error() {}, warn() {} },
});
new vm.Script(workerData.body, { filename: "bot.js" }).runInContext(context, { timeout: workerData.limit });
if (typeof context.__bot !== "function") context.__bot = context.bot;
parentPort.on("message", async (view) => {
  try {
    context.__args = [view, { timeoutMs: view.turnTimeoutMs, playerId: view.you }];
    parentPort.postMessage({ move: await vm.runInContext("__bot(...__args)", context, { timeout: workerData.limit }) });
  } catch (e) {
    parentPort.postMessage({ error: String((e && e.message) || e) });
  }
});
`;

/**
 * Checks the code here, so a bad bot is refused before the match exists, then runs each call in a worker
 * thread. When the turn's clock fires, `run()` aborts the call and the worker is terminated, so an async
 * loop that never yields can't hang the server. The next call starts a fresh worker.
 * ponytail: the top-level code runs twice (here to check it, then in the worker); fine for defining functions.
 */
export function compileCodeBot(code: string): MoveSource {
  // `export default function (state, config) {}` is the documented shape; plain `function bot(...)` works too.
  const body = code.replace(/export\s+default\s+/, "globalThis.__bot = ");
  const check = vm.createContext({
    Chess,
    fetch, URL, URLSearchParams, Headers, Request, Response, AbortController, AbortSignal,
    TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, performance,
    console: { log: () => {}, error: () => {}, warn: () => {} },
  });
  new vm.Script(body, { filename: "bot.js" }).runInContext(check, { timeout: CODE_SYNC_LIMIT_MS });
  if (typeof check.__bot !== "function" && typeof check.bot !== "function") {
    throw new Error("Code bot must `export default function (state, config) { ... }` or define `function bot(state, config)`");
  }

  let worker: Worker | undefined;
  const stop = () => {
    void worker?.terminate();
    worker = undefined;
  };
  const source: MoveSource = (view, signal) =>
    new Promise<MoveInput>((resolve, reject) => {
      const w = (worker ??= new Worker(WORKER_SOURCE, { eval: true, workerData: { body, limit: CODE_SYNC_LIMIT_MS } }));
      w.unref(); // a bot thinking never keeps the process alive
      const done = () => {
        w.off("message", onMessage);
        w.off("error", onError);
        w.off("exit", onExit);
        signal.removeEventListener("abort", onAbort);
      };
      const onMessage = (m: { move?: MoveInput; error?: string }) => {
        done();
        if (m.error !== undefined) reject(new Error(m.error));
        else resolve(m.move as MoveInput);
      };
      const onError = (e: Error) => {
        done();
        stop();
        reject(e);
      };
      const onExit = () => {
        done();
        worker = undefined;
        reject(new Error("Code bot stopped"));
      };
      const onAbort = () => {
        done();
        stop(); // out of time: kill the thread, whatever it's doing
        reject(new Error("Code bot was stopped when its clock ran out"));
      };
      w.on("message", onMessage);
      w.once("error", onError);
      w.once("exit", onExit);
      signal.addEventListener("abort", onAbort);
      w.postMessage(view);
    });
  source.close = stop;
  return source;
}

export function houseBot<S>(game: GameDef<S>, bot: HouseBotId, seed: number, state: () => S): MoveSource {
  const play = game.houseBot(bot, seed);
  return async (view) => play(state(), view.you, view.turnTimeoutMs);
}

/** A move reply is a few bytes; anything past this is a broken agent, not a move. */
export const WEBHOOK_REPLY_LIMIT = 64 * 1024;

/** Reads at most `WEBHOOK_REPLY_LIMIT` bytes of the reply, so a runaway body can't fill memory. */
async function readCapped(res: Response): Promise<string> {
  const tooBig = () => new Error(`Webhook reply is over ${WEBHOOK_REPLY_LIMIT / 1024} KB`);
  if (Number(res.headers.get("content-length")) > WEBHOOK_REPLY_LIMIT) {
    void res.body?.cancel();
    throw tooBig();
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > WEBHOOK_REPLY_LIMIT) {
      void reader.cancel();
      throw tooBig();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** POSTs the turn view to the agent's URL; the reply is `{ "move": ... }`. */
export function webhookBot(url: string): MoveSource {
  return async (view, signal) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(view), signal });
    if (!res.ok) {
      void res.body?.cancel();
      throw new Error(`Webhook answered ${res.status}`);
    }
    const text = await readCapped(res);
    let body: { move?: MoveInput } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      // fall through to the shape error below
    }
    if (!body?.move) throw new Error('Webhook reply must be JSON like { "move": "e4" }');
    return body.move;
  };
}
