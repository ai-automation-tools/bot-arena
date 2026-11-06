/**
 * @jest-environment node
 *
 * Tic-tac-toe: the rules, the house bots, and the arena running it for code, house and external seats.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seededRng } from "../../house-bots";
import { applyTttMove, cellIndex, createTttState, parseTttMove, tttMinimax, tttWinner, type TttState } from "../../protocols/tictactoe";
import { ArenaError, createMatch, getMatch, submitMove, waitForTurn } from "../arena";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-ttt-"));
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

describe("rules", () => {
  it("names cells like chess squares and reads 1-9 in reading order", () => {
    expect([cellIndex("a3"), cellIndex("B2"), cellIndex("c1"), cellIndex("1"), cellIndex("9"), cellIndex("d4")]).toEqual([0, 4, 8, 0, 8, -1]);
  });
  it("rejects a taken cell and lists the open ones", () => {
    const s = applyTttMove(createTttState(), "b2");
    expect(parseTttMove(s, "5")).toMatchObject({ error: expect.stringMatching(/Legal moves: a3, b3/) });
    expect(parseTttMove(s, "a1")).toEqual({ move: { cell: "a1" }, san: "a1" });
  });
  it("finds three in a row", () => {
    expect(tttWinner("XXX.OO...")).toBe("x");
    expect(tttWinner("O.X.OX..O")).toBe("o");
    expect(tttWinner("XOXXOOOXX")).toBeNull();
  });
});

describe("minimax", () => {
  it("takes a win and blocks a loss", () => {
    const win: TttState = { board: "XX.OO....", currentPlayer: "x", moveHistory: [] };
    expect(tttMinimax(seededRng(1))(win).cell).toBe("c3");
    const block: TttState = { board: "XX..O....", currentPlayer: "o", moveHistory: [] };
    expect(tttMinimax(seededRng(1))(block).cell).toBe("c3");
  });
  it("never loses to random play", () => {
    for (let seed = 0; seed < 40; seed++) {
      const rng = seededRng(seed);
      const minimaxSeat = seed % 2 ? "x" : "o";
      let s = createTttState();
      while (!tttWinner(s.board) && s.board.includes(".")) {
        const legal = [...s.board].flatMap((c, i) => (c === "." ? [i + 1] : []));
        const cell = s.currentPlayer === minimaxSeat ? tttMinimax(rng)(s).cell : String(legal[Math.floor(rng() * legal.length)]);
        s = applyTttMove(s, cell);
      }
      expect(tttWinner(s.board) ?? minimaxSeat).toBe(minimaxSeat);
    }
  });
});

describe("arena", () => {
  it("plays a code bot against Minimax to the end", async () => {
    const { match } = createMatch({
      game: "tictactoe",
      x: { kind: "code", name: "First open", code: "export default (s) => s.legalMoves[0]" },
      o: { kind: "house", bot: "search-engine" },
      turnTimeoutMs: 5000,
    });
    expect(match).toMatchObject({ game: "tictactoe", players: { x: { name: "First open" }, o: { name: "Minimax" } }, position: "........." });
    const done = await finished(match.id);
    expect(done.status).toBe("completed");
    expect(done.result?.winner).not.toBe("x");
  });

  it("lets an external agent play X by cell name", async () => {
    const { match, tokens } = createMatch({ game: "tictactoe", x: { kind: "external" }, o: { kind: "house", bot: "random-mover" } });
    const view = await waitForTurn(match.id, tokens.x, 2000);
    expect(view).toMatchObject({ game: "tictactoe", status: "your-turn", you: "x", opponent: "Random Mover" });
    expect(view.legalMoves).toHaveLength(9);
    expect(view.board).toContain("a b c");
    expect(submitMove(match.id, tokens.x, "b2")).toEqual({ san: "b2" });
    const next = await waitForTurn(match.id, tokens.x, 2000);
    expect(next.moveHistory[0]).toBe("b2");
    expect(next.legalMoves).toHaveLength(7);
  });

  it("asks for the right seats", () => {
    expect(() => createMatch({ game: "tictactoe", white: { kind: "external" }, black: { kind: "external" } })).toThrow(ArenaError);
  });

  it("reads matches saved before games existed as chess", () => {
    mkdirSync(join(dir, "matches"), { recursive: true });
    writeFileSync(
      join(dir, "matches", "oldchess.json"),
      JSON.stringify({ id: "oldchess", createdAt: "2026-11-01T00:00:00Z", status: "completed", white: { name: "A", kind: "house" }, black: { name: "B", kind: "code" }, turnTimeoutMs: 1000, toMove: "white", fen: "f", startFen: "s", moves: [], result: null }),
    );
    expect(getMatch("oldchess")).toMatchObject({ game: "chess", players: { white: { name: "A" }, black: { name: "B" } }, position: "f", startPosition: "s" });
  });
});
