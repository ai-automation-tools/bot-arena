#!/usr/bin/env node
// `npx @ai-automation-tools/bot-arena`: serve the arena from this package's prebuilt `.next` on 127.0.0.1.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HELP = `Usage: npx @ai-automation-tools/bot-arena [--port 9002] [--data ~/.bot-arena] [--stdio]

  -p, --port   Port on 127.0.0.1 (default 9002, or $ARENA_PORT)
      --data   Folder for saved and in-progress games (default ~/.bot-arena, or $ARENA_DATA_DIR)
      --stdio  Be an MCP server on stdin/stdout for clients that launch one: start the arena, carry each
               message to its /api/mcp, and stop when stdin closes. Server logs go to stderr.
  -h, --help   Show this help

Then open http://localhost:<port>. MCP clients connect to http://localhost:<port>/api/mcp.
Docs: https://github.com/ai-automation-tools/bot-arena#readme`;

let opts;
try {
  opts = parseArgs({
    options: {
      port: { type: "string", short: "p", default: process.env.ARENA_PORT || "9002" },
      data: { type: "string", default: process.env.ARENA_DATA_DIR || join(homedir(), ".bot-arena") },
      help: { type: "boolean", short: "h" },
      stdio: { type: "boolean" },
    },
  }).values;
} catch (e) {
  console.error(`${e.message}\n\n${HELP}`);
  process.exit(2);
}
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}
if (!/^\d+$/.test(opts.port) || +opts.port < 1 || +opts.port > 65535) {
  console.error(`--port must be a number from 1 to 65535, not "${opts.port}"`);
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

// Recreate the links Turbopack loads server-external packages through (scripts/pack-externals.mjs).
const manifest = join(root, ".next", "externals.json");
for (const [link, pkg] of Object.entries(existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : {})) {
  const at = join(root, ".next", "node_modules", link);
  if (existsSync(at)) continue;
  const target = require.resolve.paths(pkg).map((dir) => join(dir, pkg)).find((dir) => existsSync(join(dir, "package.json")));
  if (!target) throw new Error(`Bot Arena needs the package "${pkg}", which isn't installed`);
  mkdirSync(dirname(at), { recursive: true });
  symlinkSync(target, at, "junction"); // a junction needs no admin rights on Windows; elsewhere it's a symlink
}
const data = resolve(opts.data);
(opts.stdio ? console.error : console.log)(`Bot Arena on http://localhost:${opts.port} (games in ${data})`);

const child = spawn(process.execPath, [nextBin, "start", root, "-H", "127.0.0.1", "-p", opts.port], {
  stdio: opts.stdio ? ["ignore", process.stderr, process.stderr] : "inherit", // in --stdio, stdout carries MCP
  env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ARENA_DATA_DIR: data },
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
let stopping = false; // --stdio stops the server itself once stdin closes, which is a clean exit
child.on("exit", (code, signal) => process.exit(stopping ? 0 : (code ?? (signal ? 1 : 0))));
if (opts.stdio) bridge();

// --stdio: each JSON-RPC line from stdin is POSTed to /api/mcp (stateless, plain JSON replies); the reply goes to stdout.
async function bridge() {
  const base = `http://127.0.0.1:${opts.port}`;
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (process.env.ARENA_API_KEY) headers["x-arena-key"] = process.env.ARENA_API_KEY;
  const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
  for (let tries = 0; !(await fetch(`${base}/api/health`).then((r) => r.ok, () => false)); tries++) {
    if (tries === 120) {
      console.error("Bot Arena didn't start within a minute");
      return child.kill();
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  let pending = 0;
  let closed = false;
  const finish = () => closed && pending === 0 && (stopping = true) && child.kill("SIGTERM"); // answer all of stdin first
  const lines = createInterface({ input: process.stdin });
  lines.on("close", () => {
    closed = true;
    finish();
  });
  lines.on("line", async (line) => {
    if (!line.trim()) return;
    let id, msg;
    try {
      msg = JSON.parse(line);
      id = msg.id;
    } catch {
      return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
    pending++;
    try {
      const res = await fetch(`${base}/api/mcp`, { method: "POST", headers: { ...headers, ...modernHeaders(msg) }, body: line });
      const text = await res.text();
      const reply = text.trim() ? JSON.parse(text) : null; // a notification gets 202 and no body
      if (reply?.jsonrpc || Array.isArray(reply)) [].concat(reply).forEach(send);
      else if (id !== undefined) throw new Error(reply?.error ?? `HTTP ${res.status}`); // e.g. the proxy's ARENA_KEY_REQUIRED
    } catch (e) {
      if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32603, message: `Bot Arena: ${e.message}` } });
    } finally {
      pending--;
      finish();
    }
  });
}

// A 2026-07-28 client names its revision only in the message's _meta; over HTTP the spec also wants it, the
// method and (for tools/call and the like) the name in headers. 2025 messages have no _meta revision: none added.
function modernHeaders(msg) {
  const version = msg?.params?._meta?.["io.modelcontextprotocol/protocolVersion"];
  if (typeof version !== "string" || typeof msg.method !== "string") return {};
  const name = msg.params[{ "tools/call": "name", "prompts/get": "name", "resources/read": "uri" }[msg.method]];
  return { "mcp-protocol-version": version, "mcp-method": msg.method, ...(typeof name === "string" && { "mcp-name": name }) };
}
