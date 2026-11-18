/**
 * @jest-environment node
 *
 * Connect Four: every way a game ends, the move notation, start positions, the house bots, and the arena
 * running it for house, code and external seats.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seededRng } from "../../house-bots";
import {
  C4_HOUSE_BOTS, C4_START, applyC4Move, c4BoardText, c4LegalMoves, c4Winner, connect4Protocol, createC4State, parseC4Move, type C4State,
} from "../../protocols/connect4";
import { ArenaError, createMatch, getMatch, submitMove, waitForTurn } from "../arena";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-c4-"));
  process.env.ARENA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function finished(id: string) {
  for (let i = 0; i < 1000; i++) {
    const m = getMatch(id);
    if (m && m.status !== "in-progress") return m;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`match ${id} never finished`);
}

/** Plays columns in turn from the empty board. */
const play = (...cols: number[]) => cols.reduce((s: C4State, c) => applyC4Move(s, c), createC4State());
const done = (s: C4State) => connect4Protocol.checkCompletion(s, []);

describe("rules", () => {
  it("drops a disc to the lowest empty cell and alternates red, yellow", () => {
    const s = play(4, 4);
    expect(s.board[38]).toBe("R"); // bottom row, column 4
    expect(s.board[31]).toBe("Y"); // the row above
    expect(s.currentPlayer).toBe("red");
    expect(s.moveHistory).toEqual(["4", "4"]);
  });

  it("wins across, up, and on both diagonals", () => {
    expect(c4Winner(play(1, 1, 2, 2, 3, 3, 4).board)).toBe("red"); // across the bottom
    expect(c4Winner(play(1, 2, 1, 2, 1, 2, 1).board)).toBe("red"); // up column 1
    expect(c4Winner(play(1, 2, 2, 3, 3, 4, 3, 4, 4, 7, 4).board)).toBe("red"); // a1, b2, c3, d4
    expect(c4Winner(play(7, 6, 6, 5, 5, 4, 5, 4, 4, 1, 4).board)).toBe("red"); // g1, f2, e3, d4
    expect(done(play(1, 1, 2, 2, 3, 3, 4))).toMatchObject({ complete: true, result: { outcome: "win", winnerId: "red", reason: "four in a row" } });
  });

  it("calls a full board with no four a draw", () => {
    // A random game (seed 57) that filled the board without a four.
    const order = [6, 2, 1, 5, 4, 5, 2, 4, 4, 4, 4, 5, 3, 2, 6, 6, 3, 2, 5, 7, 7, 6, 4, 1, 3, 6, 2, 5, 2, 1, 5, 7, 1, 1, 6, 3, 1, 7, 3, 3, 7, 7];
    let s = createC4State();
    for (const c of order) {
      expect(c4Winner(s.board)).toBeNull();
      s = applyC4Move(s, c);
    }
    expect(s.board.includes(".")).toBe(false);
    expect(c4Winner(s.board)).toBeNull();
    expect(done(s)).toMatchObject({ complete: true, result: { outcome: "draw", reason: "full board" } });
  });

  it("reads a column 1-7 and refuses a full column, a bad column, or a move after the end", () => {
    const full = play(1, 1, 1, 1, 1, 1);
    expect(parseC4Move(full, "1")).toMatchObject({ error: expect.stringMatching(/Legal moves: 2, 3, 4, 5, 6, 7$/) });
    expect(parseC4Move(full, " 2 ")).toEqual({ move: { column: 2 }, san: "2" });
    for (const bad of ["0", "8", "d", "4.5", ""]) expect(parseC4Move(full, bad)).toHaveProperty("error");
    expect(c4LegalMoves(play(1, 1, 2, 2, 3, 3, 4).board)).toEqual([]);
    expect(connect4Protocol.validateMove(play(1, 1, 2, 2, 3, 3, 4), { column: 5 }, "yellow")).toMatchObject({ legal: false, violations: ["GAME_OVER"] });
    expect(connect4Protocol.validateMove(play(1), { column: 5 }, "red")).toMatchObject({ legal: false, violations: ["WRONG_PLAYER"] });
  });

  it("draws a text board with the columns numbered", () => {
    expect(c4BoardText(play(4).board).split("\n")).toEqual([
      "6 . . . . . . .", "5 . . . . . . .", "4 . . . . . . .", "3 . . . . . . .", "2 . . . . . . .", "1 . . . R . . .", "  1 2 3 4 5 6 7",
    ]);
  });

  it("accepts a start position and refuses impossible ones", () => {
    const board = play(4, 4, 3).board;
    expect(createC4State(board)).toMatchObject({ board, currentPlayer: "yellow" });
    expect(() => createC4State("R" + C4_START.slice(1))).toThrow(/floats/);
    expect(() => createC4State(C4_START.slice(0, 41) + "Y")).toThrow(/red moves first/);
    expect(() => createC4State("..")).toThrow(/42 cells/);
  });
});

describe("house bots", () => {
  const minimax = C4_HOUSE_BOTS["search-engine"].create;
  const deep = C4_HOUSE_BOTS["strong-engine"].create;

  it("take a win and block a loss", () => {
    const win = play(1, 1, 2, 2, 3, 3); // red to move: 4 wins across the bottom
    expect(minimax(seededRng(1))(win).column).toBe(4);
    expect(deep(seededRng(1))(win).column).toBe(4);
    const block = play(1, 7, 2, 7, 3); // yellow to move: red threatens 4
    expect(minimax(seededRng(1))(block).column).toBe(4);
  });

  it("make an open three on the bottom row, which can't be blocked at both ends", () => {
    // Red on c1 and d1, yellow on c2 and d2: b1 or e1 leaves two winning cells, so red wins next turn.
    const s = play(3, 3, 4, 4);
    expect([2, 5]).toContain(minimax(seededRng(2))(s).column);
    expect([2, 5]).toContain(deep(seededRng(2))(s).column);
  });

  it("Minimax beats Random Mover with either colour", () => {
    for (let g = 0; g < 6; g++) {
      const minimaxSeat = g % 2 ? "yellow" : "red";
      const bots = { [minimaxSeat]: minimax(seededRng(g)), [minimaxSeat === "red" ? "yellow" : "red"]: C4_HOUSE_BOTS["random-mover"].create(seededRng(100 + g)) };
      let s = createC4State();
      while (!c4Winner(s.board) && s.board.includes(".")) s = applyC4Move(s, bots[s.currentPlayer](s).column);
      expect(c4Winner(s.board)).toBe(minimaxSeat);
    }
  });

  it("the same seed plays the same game", () => {
    const s = play(4, 3);
    expect(deep(seededRng(7))(s)).toEqual(deep(seededRng(7))(s));
  });
});

describe("arena", () => {
  it("plays a code bot against Minimax to the end", async () => {
    const { match } = createMatch({
      game: "connect4",
      red: { kind: "code", name: "First open", code: "export default (s) => s.legalMoves[0]" },
      yellow: { kind: "house", bot: "search-engine" },
      turnTimeoutMs: 5000,
    });
    expect(match).toMatchObject({ game: "connect4", players: { red: { name: "First open" }, yellow: { name: "Minimax" } }, position: C4_START });
    const end = await finished(match.id);
    expect(end).toMatchObject({ status: "completed", result: { winner: "yellow", reason: "four in a row" } });
  }, 30_000);

  it("lets an external agent play red by column", async () => {
    const { match, tokens } = createMatch({ game: "connect4", red: { kind: "external" }, yellow: { kind: "house", bot: "random-mover" } });
    const view = await waitForTurn(match.id, tokens.red, 2000);
    expect(view).toMatchObject({ game: "connect4", status: "your-turn", you: "red", opponent: "Random Mover", legalMoves: ["1", "2", "3", "4", "5", "6", "7"] });
    expect(view.board).toContain("1 2 3 4 5 6 7");
    expect(view.rules).toMatch(/"1" to "7"/);
    expect(submitMove(match.id, tokens.red, "4")).toEqual({ san: "4" });
    expect(() => submitMove(match.id, tokens.red, "4")).toThrow(ArenaError); // not red's turn any more
    const next = await waitForTurn(match.id, tokens.red, 2000);
    expect(next.moveHistory[0]).toBe("4");
    expect(next.position[38]).toBe("R");
  });

  it("asks for the right seats and rejects a finished start position", () => {
    expect(() => createMatch({ game: "connect4", white: { kind: "external" }, black: { kind: "external" } })).toThrow(/red and yellow/);
    const over = play(1, 1, 2, 2, 3, 3, 4).board;
    expect(() => createMatch({ game: "connect4", red: { kind: "external" }, yellow: { kind: "external" }, startPosition: over })).toThrow(/already over/);
  });
});
