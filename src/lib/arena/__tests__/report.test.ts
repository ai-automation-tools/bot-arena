/**
 * @jest-environment node
 *
 * The match report reads a saved game: per-seat stats, the headline, and the auditor's commentary.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { postMatchAuditor } from "@/ai/flows/post-match-auditor";
import { createMatch, getMatch, submitMove, waitForTurn, type MatchSummary } from "../arena";
import { buildReport } from "../report";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-report-"));
  process.env.ARENA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const saved: MatchSummary = {
  id: "fixture1",
  game: "tictactoe",
  createdAt: "2026-11-06T10:00:00.000Z",
  finishedAt: "2026-11-06T10:00:12.500Z",
  status: "completed",
  players: { x: { name: "Claude", kind: "external" }, o: { name: "Minimax", kind: "house" } },
  turnTimeoutMs: 120000,
  toMove: "x",
  position: "XO.XO..O.",
  startPosition: ".........",
  moves: [{ san: "a3" }, { san: "b3" }, { san: "a2" }, { san: "b2" }, { san: "c2" }, { san: "b1" }],
  result: { outcome: "win", winner: "o", reason: "three in a row" },
  stats: {
    x: { moves: 3, totalMs: 9000, maxMs: 5000, timeouts: 0, rejected: 2, forfeits: 0 },
    o: { moves: 3, totalMs: 30, maxMs: 12, timeouts: 0, rejected: 0, forfeits: 0 },
  },
};

describe("buildReport", () => {
  it("states the result, the timing and each seat's stats", async () => {
    const r = buildReport(saved);
    expect(r).toMatchObject({ headline: "Minimax won by three in a row", game: "Tic-Tac-Toe", plies: 6, durationMs: 12500 });
    expect(r.seats).toEqual([
      expect.objectContaining({ seat: "x", name: "Claude", won: false, avgMs: 3000 }),
      expect.objectContaining({ seat: "o", name: "Minimax", won: true, avgMs: 10 }),
    ]);
    const audit = await postMatchAuditor(r.auditor);
    expect(audit.strategicSummary).toMatch(/Claude \(x, external\) vs Minimax \(o, house\)\. Minimax won by three in a row after 6 plies/);
    expect(audit.efficiencyAnalysis).toMatch(/rejected moves 2/);
    expect(audit.failureDiagnosis).toMatch(/Agent 1 2, Agent 2 0/);
  });

  it("copes with a game saved before stats existed", () => {
    const { stats: _stats, finishedAt: _f, ...old } = saved;
    const r = buildReport(old);
    expect(r.durationMs).toBeNull();
    expect(r.seats[0].stats).toBeNull();
    expect(r.auditor.agent1Metrics).toMatch(/No per-move stats/);
  });
});

describe("arena stats", () => {
  it("counts an external seat's rejected moves and its moves", async () => {
    const { match, tokens } = createMatch({ game: "tictactoe", x: { kind: "external" }, o: { kind: "house", bot: "random-mover" } });
    await waitForTurn(match.id, tokens.x, 2000);
    expect(() => submitMove(match.id, tokens.x, "z9")).toThrow(/Legal moves/);
    submitMove(match.id, tokens.x, "b2");
    await waitForTurn(match.id, tokens.x, 2000);
    expect(getMatch(match.id)?.stats).toMatchObject({ x: { moves: 1, rejected: 1, forfeits: 0 }, o: { moves: 1 } });
  });
});
