import { NextResponse } from "next/server";
import { waitForTurn } from "@/lib/arena/arena";
import { apiError, seatToken } from "@/lib/arena/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/matches/:id/turn?wait=25 with `Authorization: Bearer <seat token>`.
 * Holds the request until it's your move or the game ends (up to `wait` seconds, max 60), then returns the turn view.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const wait = Number(new URL(req.url).searchParams.get("wait") ?? 25);
    return NextResponse.json(await waitForTurn((await params).id, seatToken(req), (Number.isFinite(wait) ? wait : 25) * 1000));
  } catch (e) {
    return apiError(e);
  }
}
