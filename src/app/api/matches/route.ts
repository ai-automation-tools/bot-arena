import { NextResponse } from "next/server";
import { createMatch, listMatches } from "@/lib/arena/arena";
import { apiError, createMatchSchema } from "@/lib/arena/schema";

export const dynamic = "force-dynamic";

/** GET /api/matches: every live and saved match, newest first. */
export function GET() {
  return NextResponse.json({ matches: listMatches() });
}

/**
 * POST /api/matches: `{ white, black, turnTimeoutMs? }`, each side an agent spec.
 * Returns the match and a token for each `external` seat; give each token to the agent that plays it.
 */
export async function POST(req: Request) {
  try {
    const input = createMatchSchema.parse(await req.json());
    return NextResponse.json(createMatch(input), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
