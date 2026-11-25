/**
 * @jest-environment node
 *
 * The MCP route through the SDK's own client, once per protocol era: a 2025-11-25 client (initialize first,
 * served by the stateless fallback) and a 2026-07-28 client (server/discover, per-request envelope).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client, StreamableHTTPClientTransport, type VersionNegotiationMode } from "@modelcontextprotocol/client";
import { POST } from "../app/api/mcp/route";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "arena-mcp-"));
  process.env.ARENA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const url = new URL("http://127.0.0.1:9002/api/mcp");

async function connect(mode: VersionNegotiationMode) {
  const client = new Client({ name: "mcp-test", version: "1" }, { versionNegotiation: { mode } });
  // The route's handler answers every method; the client's GET/DELETE go to it too and get 405, as on the server.
  const transport = new StreamableHTTPClientTransport(url, { fetch: (input, init) => POST(new Request(input, init)) });
  await client.connect(transport);
  return client;
}

const text = (r: Awaited<ReturnType<Client["callTool"]>>) => (r.content as { type: string; text: string }[]).map((c) => c.text).join("\n");

describe.each([
  ["2025-11-25", "legacy" as const, "legacy"],
  ["2026-07-28", { pin: "2026-07-28" }, "modern"],
])("an MCP client on %s", (version, mode, era) => {
  let client: Client;
  beforeAll(async () => {
    client = await connect(mode);
  });
  afterAll(() => client.close());

  it("negotiates that revision", () => {
    expect(client.getNegotiatedProtocolVersion()).toBe(version);
    expect(client.getProtocolEra()).toBe(era);
  });

  it("lists the six tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["create_match", "get_match", "list_matches", "make_move", "resign", "wait_for_turn"]);
    expect(tools.find((t) => t.name === "make_move")?.inputSchema.required).toEqual(["match_id", "token", "move"]);
  });

  it("plays a tic-tac-toe game to the end against a house bot", async () => {
    const created = JSON.parse(text(await client.callTool({ name: "create_match", arguments: { game: "tictactoe", x: { kind: "external" }, o: { kind: "house", bot: "random-mover" } } })));
    const seat = { match_id: created.match_id, token: created.tokens.x };
    for (let ply = 0; ply < 9; ply++) {
      const turn = text(await client.callTool({ name: "wait_for_turn", arguments: { ...seat, wait_seconds: 5 } }));
      if (turn.includes("Status: finished")) break;
      const move = /Legal moves: ([a-c][1-3])/.exec(turn)?.[1];
      expect(move).toBeDefined();
      expect(text(await client.callTool({ name: "make_move", arguments: { ...seat, move } }))).toMatch(/^Played /);
    }
    const match = JSON.parse(text(await client.callTool({ name: "get_match", arguments: { match_id: created.match_id } })));
    expect(match.status).toBe("completed");
  });

  it("answers a bad match id as a tool error", async () => {
    const r = await client.callTool({ name: "get_match", arguments: { match_id: "nope" } });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/^MATCH_NOT_FOUND/);
  });
});

/**
 * What the npx --stdio bridge (bin/bot-arena.mjs) and CI's curl send: one JSON-RPC message per POST. A stdio
 * client puts the 2026-07-28 revision only in _meta, so the bridge copies it, the method and the tool name to
 * the headers HTTP needs (modernHeaders there).
 */
async function raw(message: { jsonrpc: "2.0"; id: number; method: string; params?: { name?: string; arguments?: object; _meta?: Record<string, unknown> } }) {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  const version = message.params?._meta?.["io.modelcontextprotocol/protocolVersion"];
  if (typeof version === "string") Object.assign(headers, { "mcp-protocol-version": version, "mcp-method": message.method }, message.params?.name && { "mcp-name": message.params.name });
  const res = await POST(new Request(url, { method: "POST", headers, body: JSON.stringify(message) }));
  const body = await res.text();
  expect([res.headers.get("content-type"), body]).toEqual([expect.stringMatching(/^application\/json/), expect.any(String)]);
  return JSON.parse(body);
}

describe("a raw JSON-RPC POST", () => {
  it("lists the tools with no handshake (2025 stateless)", async () => {
    const r = await raw({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(r.result.tools).toHaveLength(6);
  });

  const _meta = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientInfo": { name: "raw", version: "1" },
    "io.modelcontextprotocol/clientCapabilities": {},
  };

  it("answers 2026-07-28 requests with the revision in _meta and the bridge's headers", async () => {
    const list = await raw({ jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta } });
    expect(list.result.tools).toHaveLength(6);
    expect(list.result.resultType).toBe("complete");
    const call = await raw({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_matches", arguments: {}, _meta } });
    expect(call.result.isError).toBeFalsy();
  });
});
