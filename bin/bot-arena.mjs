#!/usr/bin/env node
// `npx @ai-automation-tools/bot-arena`: serve the arena from this package's prebuilt `.next` on 127.0.0.1.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HELP = `Usage: npx @ai-automation-tools/bot-arena [--port 9002] [--data ~/.bot-arena]

  -p, --port   Port on 127.0.0.1 (default 9002, or $ARENA_PORT)
      --data   Folder for saved and in-progress games (default ~/.bot-arena, or $ARENA_DATA_DIR)
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
console.log(`Bot Arena on http://localhost:${opts.port} (games in ${data})`);

const child = spawn(process.execPath, [nextBin, "start", root, "-H", "127.0.0.1", "-p", opts.port], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", ARENA_DATA_DIR: data },
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
