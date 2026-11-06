/**
 * @jest-environment node
 *
 * A match in progress survives a restart: start it, drop the process's arena, load a fresh one, finish it.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Arena = typeof import("../arena");
let dir: string;

/** A new process, as far as the arena can tell: empty registry, module state reset. */
function restart(): Arena {
  delete (globalThis as { __arena?: unknown }).__arena;
  let fresh!: Arena;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh module copy needs a synchronous require
    fresh = require("../arena");
  });
  return fresh;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-resume-"));
  process.env.ARENA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

it("resumes a match after a restart, with the same tokens, and finishes it", async () => {
  const before = restart();
  // O always takes the first open cell (a3, then b3), so X wins the a1-b2-c3 diagonal.
  const { match, tokens } = before.createMatch({
    game: "tictactoe",
    x: { kind: "external", name: "Agent" },
    o: { kind: "code", name: "Top row", code: "export default (s) => s.legalMoves[0]" },
    turnTimeoutMs: 60_000,
  });
  await before.waitForTurn(match.id, tokens.x, 2000);
  before.submitMove(match.id, tokens.x, "a1");
  const mid = await before.waitForTurn(match.id, tokens.x, 2000);
  expect(mid.moveHistory).toEqual(["a1", "a3"]);
  expect(existsSync(join(dir, "live", `${match.id}.json`))).toBe(true);

  const after = restart();
  expect(after.resumeMatches()).toBe(1);
  const resumed = await after.waitForTurn(match.id, tokens.x, 2000);
  expect(resumed).toMatchObject({ status: "your-turn", moveHistory: ["a1", "a3"], opponent: "Top row" });

  after.submitMove(match.id, tokens.x, "b2");
  await after.waitForTurn(match.id, tokens.x, 2000);
  after.submitMove(match.id, tokens.x, "c3");
  const done = await after.waitForTurn(match.id, tokens.x, 2000);
  expect(done).toMatchObject({ status: "finished", result: { winner: "x", reason: "three in a row" } });

  for (let i = 0; i < 50 && existsSync(join(dir, "live", `${match.id}.json`)); i++) await new Promise((r) => setTimeout(r, 10));
  expect(readdirSync(join(dir, "live"))).toEqual([]);
  expect(after.getMatch(match.id)).toMatchObject({ status: "completed", moves: expect.any(Array) });
});

it("sets aside a live file that can't be resumed", async () => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(join(dir, "live"), { recursive: true });
  writeFileSync(join(dir, "live", "broken.json"), "{ not json");
  const arena = restart();
  jest.spyOn(console, "error").mockImplementation(() => {});
  expect(arena.resumeMatches()).toBe(0);
  expect(readdirSync(join(dir, "live"))).toContain("broken.json.bad");
});
