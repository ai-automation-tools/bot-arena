/**
 * @jest-environment node
 *
 * The local arena: move parsing, code bots, house bots, and an external agent's wait/move/resign loop.
 */
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileCodeBot } from "../agents";
import { parseChessMove as parseMove } from "../games";
import { ArenaError, createMatch, getMatch, listMatches, resign, submitMove, waitForTurn } from "../arena";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-test-"));
  process.env.ARENA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function finished(id: string) {
  for (let i = 0; i < 400; i++) {
    const m = getMatch(id);
    if (m && m.status !== "in-progress") return m;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`match ${id} never finished`);
}

describe("parseMove", () => {
  it.each([["e4"], ["e2e4"], [{ from: "e2", to: "e4" }]])("reads %p as e4", (input) => {
    expect(parseMove(START, input)).toEqual({ move: { from: "e2", to: "e4" }, san: "e4" });
  });
  it("reads a UCI promotion", () => {
    expect(parseMove("8/P7/8/8/8/8/8/k6K w - - 0 1", "a7a8q")).toMatchObject({ san: expect.stringMatching(/^a8=Q/), move: { promotion: "q" } });
  });
  it("reads rank-disambiguated SAN that looks like UCI", () => {
    expect(parseMove("8/3B4/8/3B4/8/8/8/k6K w - - 0 1", "B5c6")).toMatchObject({ san: "B5c6", move: { from: "d5", to: "c6" } });
  });
  it("lists the legal moves when the move is illegal", () => {
    const r = parseMove(START, "e5");
    expect("error" in r && r.error).toMatch(/Legal moves: .*e4/);
  });
});

describe("arena", () => {
  it("plays a code bot against a house bot to the end and saves the game", async () => {
    const { match, tokens } = createMatch({
      white: { kind: "code", name: "First legal", code: "export default function (s) { return s.legalMoves[0]; }" },
      black: { kind: "house", bot: "search-engine" },
      turnTimeoutMs: 5000,
    });
    expect(tokens).toEqual({});
    const done = await finished(match.id);
    expect(done.status).toBe("completed");
    expect(done.moves.length).toBeGreaterThan(0);
    expect(readdirSync(join(dir, "matches"))).toContain(`${match.id}.json`);
    expect(listMatches().some((m) => m.id === match.id)).toBe(true);
  });

  it("runs code bots with nothing blocked, and stops a runaway one as a forfeit", async () => {
    const { match } = createMatch({
      white: { kind: "code", code: "export default function () { while (true) {} }" },
      black: { kind: "house", bot: "random-mover" },
      turnTimeoutMs: 2000,
    });
    const done = await finished(match.id);
    expect(done.result).toMatchObject({ winner: "black", outcome: "disqualified" });
  }, 20_000);

  it("rejects code that doesn't compile before the match exists", () => {
    expect(() => createMatch({ white: { kind: "code", code: "export default function (" }, black: { kind: "house", bot: "random-mover" } })).toThrow(ArenaError);
  });

  it("lets an external agent wait, move, retry an illegal move, and resign", async () => {
    const { match, tokens } = createMatch({ white: { kind: "external", name: "Agent" }, black: { kind: "house", bot: "random-mover" } });
    const token = tokens.white!;
    expect(tokens.black).toBeUndefined();

    let view = await waitForTurn(match.id, token, 2000);
    expect(view).toMatchObject({ status: "your-turn", you: "white", opponent: "Random Mover" });
    expect(view.legalMoves).toContain("e4");

    expect(() => submitMove(match.id, token, "Ke2")).toThrow(/Legal moves/);
    expect(submitMove(match.id, token, "e4")).toEqual({ san: "e4" });

    view = await waitForTurn(match.id, token, 2000);
    expect(view.status).toBe("your-turn");
    expect(view.moveHistory).toHaveLength(2);

    expect(() => submitMove(match.id, "not-a-seat", "d4")).toThrow(/doesn't hold a seat/);
    view = resign(match.id, token);
    expect(view).toMatchObject({ status: "finished", result: { winner: "black", reason: "resignation" } });
    const done = await finished(match.id);
    expect(done.moves).toHaveLength(2);
  });

  it("forfeits an external agent that runs out of time", async () => {
    const { match } = createMatch({ white: { kind: "external" }, black: { kind: "house", bot: "random-mover" }, turnTimeoutMs: 1000 });
    const done = await finished(match.id);
    expect(done.result).toMatchObject({ winner: "black", outcome: "disqualified" });
    expect(done.result?.reason).toMatch(/No move within 1s/);
  });
});

describe("code bots", () => {
  it("get the usual globals: chess.js, fetch, timers, async", async () => {
    const bot = compileCodeBot(
      "export default async function (s) { if (typeof fetch !== 'function') throw new Error('no fetch'); await new Promise((r) => setTimeout(r, 5)); return new Chess(s.fen).moves()[0]; }",
    );
    const view = { fen: START, you: "white", turnTimeoutMs: 1000 } as Parameters<typeof bot>[0];
    await expect(bot(view, new AbortController().signal)).resolves.toBe("a3");
  });
});
