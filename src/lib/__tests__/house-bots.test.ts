/**
 * @jest-environment node
 *
 * House bots and the demo-match fixtures they produce.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRandomMover, createSearchEngine, createStrongEngine, seededRng, type ChessBot } from "../house-bots";
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

describe("strong engine (BA-22)", () => {
  const strong = (seed = 1) => createStrongEngine(seededRng(seed));
  const legal = (state: ReturnType<typeof createChessState>, move: ChessMove) => chessProtocol.validateMove(state, move, state.currentPlayer).legal;

  it("only plays legal moves, promotions included", () => {
    const bot = strong(3);
    let state = createChessState("8/P6k/8/8/8/8/6pK/8 w - - 0 1"); // both sides about to promote
    for (let i = 0; i < 6 && !chessProtocol.checkCompletion(state, []).complete; i++) {
      const move = bot(state, config) as ChessMove;
      expect(legal(state, move)).toBe(true);
      state = chessProtocol.applyMove(state, move, state.currentPlayer);
    }
    expect(state.moveHistory[0]).toBe("a8=Q");
  });

  it("takes a hanging queen and mates in one", () => {
    expect(strong()(createChessState("rnb1kbnr/pppppppp/8/3q4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1"), config)).toEqual({ from: "e4", to: "d5" });
    expect(strong()(createChessState("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1"), config)).toEqual({ from: "a1", to: "a8" });
  });

  it("sees a 3-ply combination: the knight fork that wins the queen", () => {
    // Nc7+ forks king e8 and queen a8; a depth-2 search can't see the queen fall after the king moves.
    const move = strong()(createChessState("q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1"), config);
    expect(move).toEqual({ from: "b5", to: "c7" });
  });

  it("still answers, legally, on a clock too short to finish a depth", () => {
    const state = createChessState("r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R2QKB1R w KQ - 0 9");
    const started = Date.now();
    const move = strong()(state, { ...config, timeoutMs: 4 }) as ChessMove;
    expect(Date.now() - started).toBeLessThan(500);
    expect(legal(state, move)).toBe(true);
  });

  it("the same seed plays the same move", () => {
    const state = createChessState("r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R2QKB1R w KQ - 0 9");
    expect(strong(9)(state, config)).toEqual(strong(9)(state, config));
  });

  // The first 4 of the 20 seeded games behind the roadmap's "beats Search Engine" (Strong Engine won all 20);
  // all 20 take about a minute, nearly all of it Search Engine's SAN-based search.
  it("beats Search Engine with either colour", () => {
    const slow = { timeoutMs: 120_000, playerId: "white" };
    let wins = 0;
    for (let g = 0; g < 4; g++) {
      const strongColor = g % 2 === 0 ? "white" : "black";
      const bots: Record<string, ChessBot> = {
        white: strongColor === "white" ? createStrongEngine(seededRng(100 + g)) : createSearchEngine(seededRng(100 + g)),
        black: strongColor === "black" ? createStrongEngine(seededRng(200 + g)) : createSearchEngine(seededRng(200 + g)),
      };
      let state = createChessState();
      let done = chessProtocol.checkCompletion(state, []);
      for (let ply = 0; !done.complete && ply < 300; ply++) {
        state = chessProtocol.applyMove(state, bots[state.currentPlayer](state, { ...slow, playerId: state.currentPlayer }) as ChessMove, state.currentPlayer);
        done = chessProtocol.checkCompletion(state, []);
      }
      if (done.complete && done.result?.winnerId === strongColor) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(3);
  }, 180_000);
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
