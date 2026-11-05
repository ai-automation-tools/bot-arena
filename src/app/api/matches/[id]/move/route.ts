import { NextResponse } from "next/server";
import { z } from "zod";
import { submitMove } from "@/lib/arena/arena";
import { apiError, moveInputSchema, seatToken } from "@/lib/arena/schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/matches/:id/move `{ "move": "Nf3" }` (SAN, UCI like "g1f3", or { from, to, promotion })
 * with `Authorization: Bearer <seat token>`. An illegal move gets a 422 listing the legal ones; retry before your clock runs out.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = seatToken(req);
    const { move } = z.object({ move: moveInputSchema }).parse(await req.json());
    return NextResponse.json(submitMove((await params).id, token, move));
  } catch (e) {
    return apiError(e);
  }
}
