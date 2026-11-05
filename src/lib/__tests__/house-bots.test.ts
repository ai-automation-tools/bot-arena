/**
 * @jest-environment node
 *
 * House bots and the demo-match fixtures they produce.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRandomMover, createSearchEngine, seededRng } from "../house-bots";
import { DEMO_MATCHES, playDemoMatch, type DemoMatch } from "../demo-match";
import { chessProtocol, createChessState, type ChessMove } from "../protocols/chess";

const config = { timeoutMs: 1000, playerId: "white" };

describe("house bots", () => {
  it("the random mover only plays legal moves", () => {
    const bot = createRandomMover(seededRng(7));
    let state = createChessState();
    for (let i = 0; i < 40 && !chessProtocol.checkCompletion(state, []).complete; i++) {
      const move = bot(state, config) as ChessMove;
      expect(chessProtocol.validateMove(state, move, state.currentPlayer).legal).toBe(true);
      state = chessProtocol.applyMove(state, move, state.currentPlayer);
    }
  });

  it("the search engine takes a hanging queen", () => {
    // Black queen on d5 is attacked by the e4 pawn and defended by nothing.
    const state = createChessState("rnb1kbnr/pppppppp/8/3q4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1");
    expect(createSearchEngine(seededRng(1))(state, config)).toEqual({ from: "e4", to: "d5" });
  });

  it("the search engine mates in one", () => {
    // Back-rank mate: Ra8#.
    const state = createChessState("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
    expect(createSearchEngine(seededRng(1))(state, config)).toEqual({ from: "a1", to: "a8" });
  });
});

describe("demo matches", () => {
  it("same seed, same match: replaying the shortest fixture's seed gives the committed file", () => {
    const file = join(__dirname, "..", "..", "data", "demo-matches", "random-vs-engine.json");
    const fixture = JSON.parse(readFileSync(file, "utf8"));
    expect(playDemoMatch("random-vs-engine", 2, "random-mover", "search-engine")).toEqual(fixture);
  });

  it("the search engine picks the same move for the same seed", () => {
    const state = createChessState();
    const pick = (seed: number) => createSearchEngine(seededRng(seed))(state, config);
    expect(pick(5)).toEqual(pick(5));
  });

  // Replaying every seed is slow under Jest (chess.js rebuilds each game per call), so this replays each fixture
  // through the protocol instead; `npm run demo:matches` rewrites them byte for byte from their seeds.
  it.each(DEMO_MATCHES)("fixture $id is committed and is a legal, finished game", ({ id, seed, white, black }) => {
    const file = join(__dirname, "..", "..", "data", "demo-matches", `${id}.json`);
    const fixture: DemoMatch = JSON.parse(readFileSync(file, "utf8"));
    expect(fixture).toMatchObject({ id, seed, white: { botId: white }, black: { botId: black } });

    let state = createChessState(fixture.startFen);
    for (const { san, ...move } of fixture.moves) {
      expect(chessProtocol.validateMove(state, move, state.currentPlayer).legal).toBe(true);
      state = chessProtocol.applyMove(state, move, state.currentPlayer);
      expect(state.moveHistory.at(-1)).toBe(san);
    }
    expect(state.fen).toBe(fixture.finalFen);

    const { result } = chessProtocol.checkCompletion(state, []);
    expect(result).toMatchObject({ outcome: fixture.result.outcome, reason: fixture.result.reason });
    expect(result?.winnerId).toBe(fixture.result.winner);
  });
});
