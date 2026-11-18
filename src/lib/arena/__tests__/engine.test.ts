/**
 * @jest-environment node
 *
 * Engine edge cases from the 2026-11-17 audit: start positions, yielding between plies, late moves,
 * resigning while the opponent thinks, atomic saves, and finished matches leaving memory.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArenaError, FINISHED_GRACE_MS, createMatch, getMatch, listMatches, resign, submitMove, waitForTurn, type CreateMatchInput } from "../arena";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-engine-"));
  process.env.ARENA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function finished(id: string, tries = 400) {
  for (let i = 0; i < tries; i++) {
    const m = getMatch(id);
    if (m && m.status !== "in-progress") return m;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`match ${id} never finished`);
}

const random = { kind: "house", bot: "random-mover" } as const;
const badStart = (input: CreateMatchInput) => {
  try {
    createMatch(input);
  } catch (e) {
    return e instanceof ArenaError ? e.code : String(e);
  }
  return "accepted";
};

describe("start positions", () => {
  it("lets black move first from a chess FEN with black to move", async () => {
    const { match, tokens } = createMatch({ game: "chess", startPosition: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", white: random, black: { kind: "external" } });
    expect(match.toMove).toBe("black");
    expect(await waitForTurn(match.id, tokens.black!, 2000)).toMatchObject({ status: "your-turn", you: "black" });
    submitMove(match.id, tokens.black!, "e5");
    const view = await waitForTurn(match.id, tokens.black!, 2000);
    expect(view).toMatchObject({ status: "your-turn", moveHistory: ["e5", expect.any(String)] });
    resign(match.id, tokens.black!);
  });

  it("lets O move first from a tic-tac-toe board with O to move", async () => {
    const { match } = createMatch({ game: "tictactoe", startPosition: "X........", x: random, o: random });
    expect(match.toMove).toBe("o");
    const done = await finished(match.id);
    expect(done.result?.outcome).not.toBe("disqualified");
  });

  it.each([
    ["a tic-tac-toe board X has already won", { game: "tictactoe", startPosition: "XXXOO....", x: random, o: random }],
    ["an impossible tic-tac-toe board (two O, no X)", { game: "tictactoe", startPosition: "OO.......", x: random, o: random }],
    ["a checkmated chess position", { game: "chess", startPosition: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", white: random, black: random }],
  ] as [string, CreateMatchInput][])("refuses %s", (_, input) => {
    expect(badStart(input)).toBe("BAD_START_POSITION");
  });
});

describe("run loop", () => {
  it("lets timers fire while two house bots play", async () => {
    let last = performance.now();
    let worst = 0;
    const hb = setInterval(() => {
      const now = performance.now();
      worst = Math.max(worst, now - last);
      last = now;
    }, 10);
    const { match } = createMatch({ game: "chess", white: { kind: "house", bot: "search-engine" }, black: random });
    await finished(match.id, 3000);
    clearInterval(hb);
    expect(worst).toBeLessThan(1000); // before the fix the whole game was one blocking stretch (seconds); loose for busy CI
  }, 40_000);

  it("stops an async code bot that never yields, on its clock, and keeps answering", async () => {
    let last = performance.now();
    let worst = 0;
    const hb = setInterval(() => {
      const now = performance.now();
      worst = Math.max(worst, now - last);
      last = now;
    }, 10);
    const started = Date.now();
    const { match } = createMatch({
      game: "tictactoe",
      turnTimeoutMs: 1000,
      x: { kind: "code", code: "export default async function () { await null; while (true) {} }" },
      o: random,
    });
    const done = await finished(match.id);
    clearInterval(hb);
    expect(done.result).toMatchObject({ winner: "o", outcome: "disqualified" });
    expect(done.result?.reason).toMatch(/timeout/);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(worst).toBeLessThan(1000); // before the fix the loop never ended; loose for busy CI
  }, 10_000);

  it("calls a move that arrives after the clock a timeout", async () => {
    const { match } = createMatch({
      game: "tictactoe",
      turnTimeoutMs: 1000,
      x: { kind: "code", code: "export default function (s) { const t = Date.now(); while (Date.now() - t < 1500) {} return s.legalMoves[0]; }" },
      o: random,
    });
    const done = await finished(match.id);
    expect(done.result).toMatchObject({ winner: "o", outcome: "disqualified" });
    expect(done.result?.reason).toMatch(/timeout/);
    expect(done.moves).toHaveLength(0);
  }, 10_000);
});

describe("resign", () => {
  it("saves the game at once, while the opponent is still thinking", async () => {
    const { match, tokens } = createMatch({
      game: "tictactoe",
      turnTimeoutMs: 60_000,
      x: { kind: "external" },
      o: { kind: "code", code: "export default function (s) { return new Promise((r) => setTimeout(() => r(s.legalMoves[0]), 1000)); }" },
    });
    await waitForTurn(match.id, tokens.x!, 2000);
    submitMove(match.id, tokens.x!, "b2");
    await new Promise((r) => setTimeout(r, 100)); // O is on the clock now
    resign(match.id, tokens.x!);
    expect(existsSync(join(dir, "matches", `${match.id}.json`))).toBe(true);
    expect(existsSync(join(dir, "live", `${match.id}.json`))).toBe(false);
    await new Promise((r) => setTimeout(r, 1100)); // O's call returns; nothing changes
    expect(getMatch(match.id)).toMatchObject({ status: "completed", result: { winner: "o", reason: "resignation" } });
    expect(existsSync(join(dir, "live", `${match.id}.json`))).toBe(false);
  });
});

describe("saves", () => {
  it("ignores a stray .tmp file left by a crash mid-write", async () => {
    mkdirSync(join(dir, "matches"), { recursive: true });
    writeFileSync(join(dir, "matches", "deadbeef.json.tmp"), '{"id": "deadb');
    const { match } = createMatch({ game: "tictactoe", x: random, o: random });
    await finished(match.id);
    const ids = listMatches().map((m) => m.id);
    expect(ids).toContain(match.id);
    expect(ids).not.toContain("deadbeef");
    expect(existsSync(join(dir, "matches", `${match.id}.json.tmp`))).toBe(false);
  });
});

describe("memory and listing (BA-11)", () => {
  // Only setTimeout is faked: the run loop's setImmediate and the clocks stay real.
  afterEach(() => jest.useRealTimers());

  it("keeps a finished match for its agents for a while, then serves it from its saved file", async () => {
    const { match, tokens } = createMatch({ game: "tictactoe", x: { kind: "external" }, o: random });
    await waitForTurn(match.id, tokens.x!, 2000);
    jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick", "queueMicrotask", "performance", "Date", "hrtime"] });
    resign(match.id, tokens.x!);
    // Still known by token: an agent's last wait_for_turn sees the end.
    expect(await waitForTurn(match.id, tokens.x!, 0)).toMatchObject({ status: "finished" });
    jest.advanceTimersByTime(FINISHED_GRACE_MS + 1);
    await expect(waitForTurn(match.id, tokens.x!, 0)).rejects.toMatchObject({ code: "MATCH_NOT_FOUND" });
    expect(getMatch(match.id)).toMatchObject({ status: "completed", result: { reason: "resignation" } });
    expect(listMatches().some((m) => m.id === match.id)).toBe(true);
  });

  it("re-reads a saved game only when its file changes", async () => {
    // A game from an earlier run: on disk only.
    const { match } = createMatch({ game: "tictactoe", x: random, o: random });
    const saved = { ...(await finished(match.id)), id: "cafe0001" };
    const file = join(dir, "matches", "cafe0001.json");
    writeFileSync(file, JSON.stringify(saved));
    const first = listMatches().find((m) => m.id === "cafe0001");
    expect(listMatches().find((m) => m.id === "cafe0001")).toBe(first); // same object: not parsed again
    writeFileSync(file, JSON.stringify({ ...saved, players: { ...saved.players, x: { ...saved.players.x, name: "Renamed" } } }));
    utimesSync(file, new Date(), new Date(Date.now() + 5000));
    expect(listMatches().find((m) => m.id === "cafe0001")?.players.x.name).toBe("Renamed");
    rmSync(file);
    expect(listMatches().some((m) => m.id === "cafe0001")).toBe(false);
  });
});
