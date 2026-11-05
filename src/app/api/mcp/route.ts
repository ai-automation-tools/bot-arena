import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { ArenaError, createMatch, getMatch, listMatches, resign, submitMove, waitForTurn } from "@/lib/arena/arena";
import type { TurnView } from "@/lib/arena/view";
import { agentSpecSchema, moveInputSchema } from "@/lib/arena/schema";

/**
 * The arena's MCP server over Streamable HTTP, at /api/mcp. Stateless: a fresh server per request.
 *   claude mcp add --transport http bot-arena http://localhost:9002/api/mcp
 * An agent plays a seat with: wait_for_turn -> make_move -> wait_for_turn ... until status is "finished".
 */
export const dynamic = "force-dynamic";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof ArenaError ? `${e.code}: ${e.message}` : String((e as Error)?.message ?? e) }],
});

/** The turn as an agent should read it: the board first, then what to do. */
function turnText(v: TurnView) {
  const lines = [
    `Match ${v.matchId}: you are ${v.you} vs ${v.opponent}. Status: ${v.status}.`,
    v.board,
    `FEN: ${v.fen}`,
    `Moves so far: ${v.moveHistory.length ? v.moveHistory.join(" ") : "(none)"}`,
  ];
  if (v.status === "your-turn") lines.push(`Your move. Legal moves: ${v.legalMoves.join(", ")}`, `Call make_move within ${v.turnTimeoutMs / 1000}s of your turn starting.`);
  if (v.status === "waiting") lines.push(`${v.toMove} to move. Call wait_for_turn again.`);
  if (v.result) lines.push(`Result: ${v.result.winner ? `${v.result.winner} wins` : v.result.outcome} (${v.result.reason}).`);
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

function server() {
  const s = new McpServer({ name: "bot-arena", version: "0.2.0" });
  const seat = { match_id: z.string().describe("Match id"), token: z.string().describe("Your seat token from create_match") };

  s.registerTool(
    "create_match",
    {
      title: "Create a chess match",
      description:
        'Starts a chess match. Each side is an agent: {"kind":"external"} for an MCP or REST agent (you get a seat token for it), ' +
        '{"kind":"house","bot":"random-mover"|"search-engine"} for a built-in bot, {"kind":"code","code":"export default function (state) { return state.legalMoves[0] }"} ' +
        'for JavaScript run by the arena, or {"kind":"webhook","url":"http://..."} for an agent the arena POSTs each turn to. ' +
        "To play yourself, make your side external and keep its token. To have two agents play each other, make both external and hand each its token.",
      inputSchema: {
        white: agentSpecSchema.describe("White's agent"),
        black: agentSpecSchema.describe("Black's agent"),
        turn_timeout_seconds: z.number().int().min(1).max(3600).optional().describe("Per-move clock, default 120"),
      },
    },
    async ({ white, black, turn_timeout_seconds }) => {
      try {
        const { match, tokens } = createMatch({ white, black, turnTimeoutMs: turn_timeout_seconds ? turn_timeout_seconds * 1000 : undefined });
        return json({ match_id: match.id, tokens, watch: `/matches/${match.id}`, next: "Call wait_for_turn with the match id and a seat token." });
      } catch (e) {
        return fail(e);
      }
    },
  );

  s.registerTool(
    "wait_for_turn",
    {
      title: "Wait for your turn",
      description: "Blocks until it's your move or the game ends (up to wait_seconds), then shows the board, the legal moves and the status.",
      inputSchema: { ...seat, wait_seconds: z.number().int().min(0).max(55).optional().describe("Default 25") },
      annotations: { readOnlyHint: true },
    },
    async ({ match_id, token, wait_seconds }) => {
      try {
        return turnText(await waitForTurn(match_id, token, (wait_seconds ?? 25) * 1000));
      } catch (e) {
        return fail(e);
      }
    },
  );

  s.registerTool(
    "make_move",
    {
      title: "Make a move",
      description: 'Plays your move: SAN like "Nf3" or "e8=Q", or UCI like "g1f3". An illegal move is rejected with the legal list; try again before your clock runs out.',
      inputSchema: { ...seat, move: moveInputSchema.describe("Your move") },
    },
    async ({ match_id, token, move }) => {
      try {
        const { san } = submitMove(match_id, token, move);
        return { content: [{ type: "text" as const, text: `Played ${san}. Call wait_for_turn for the reply.` }] };
      } catch (e) {
        return fail(e);
      }
    },
  );

  s.registerTool(
    "resign",
    { title: "Resign", description: "Resigns your seat; the other side wins.", inputSchema: seat, annotations: { destructiveHint: true } },
    async ({ match_id, token }) => {
      try {
        return turnText(resign(match_id, token));
      } catch (e) {
        return fail(e);
      }
    },
  );

  s.registerTool(
    "list_matches",
    { title: "List matches", description: "Live and saved matches, newest first, without tokens.", annotations: { readOnlyHint: true } },
    async () => json(listMatches().map(({ moves, ...m }) => ({ ...m, plies: moves.length }))),
  );

  s.registerTool(
    "get_match",
    { title: "Get a match", description: "One match with its full move list and result.", inputSchema: { match_id: z.string() }, annotations: { readOnlyHint: true } },
    async ({ match_id }) => getMatch(match_id) ? json(getMatch(match_id)) : fail(new ArenaError(404, "MATCH_NOT_FOUND", `No match ${match_id}`)),
  );

  return s;
}

async function handle(req: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server().connect(transport);
  return transport.handleRequest(req);
}

export { handle as GET, handle as POST, handle as DELETE };
