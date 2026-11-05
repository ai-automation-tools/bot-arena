import { NextResponse } from "next/server";
import { getMatch } from "@/lib/arena/arena";

export const dynamic = "force-dynamic";

/** GET /api/matches/:id: the match, its moves and result. No tokens. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const match = getMatch((await params).id);
  return match ? NextResponse.json(match) : NextResponse.json({ error: "Match not found", code: "MATCH_NOT_FOUND" }, { status: 404 });
}
