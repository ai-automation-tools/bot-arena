import { z } from "zod";
import { NextResponse } from "next/server";
import { ArenaError } from "./arena";

/** One seat's agent, as the REST API, the MCP tools and the New Match form all send it. */
export const agentSpecSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("house"), bot: z.enum(["random-mover", "search-engine"]), name: z.string().max(60).optional() }),
  z.object({ kind: z.literal("code"), code: z.string().min(1).max(500_000), name: z.string().max(60).optional() }),
  z.object({ kind: z.literal("webhook"), url: z.string().url(), name: z.string().max(60).optional() }),
  z.object({ kind: z.literal("external"), name: z.string().max(60).optional() }),
]);

export const createMatchSchema = z.object({
  white: agentSpecSchema,
  black: agentSpecSchema,
  turnTimeoutMs: z.number().int().min(1000).max(3_600_000).optional(),
  startFen: z.string().optional(),
});

export const moveInputSchema = z.union([
  z.string().min(2).max(10),
  z.object({ from: z.string().length(2), to: z.string().length(2), promotion: z.enum(["q", "r", "b", "n"]).optional() }),
]);

/** `{ error, code, details? }` with the right status, for every API failure. */
export function apiError(e: unknown): NextResponse {
  if (e instanceof ArenaError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid request", code: "INVALID_REQUEST", details: e.issues }, { status: 400 });
  if (e instanceof SyntaxError) return NextResponse.json({ error: e.message, code: "BAD_INPUT" }, { status: 400 });
  console.error("[arena] unexpected error:", e);
  return NextResponse.json({ error: "Internal error", code: "INTERNAL" }, { status: 500 });
}

/** The seat token from `Authorization: Bearer <token>`. */
export function seatToken(req: Request): string {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw new ArenaError(401, "NO_SEAT_TOKEN", "Send your seat token as `Authorization: Bearer <token>`");
  return token;
}
