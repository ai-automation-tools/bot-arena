import { NextResponse } from "next/server";
import { resign } from "@/lib/arena/arena";
import { apiError, seatToken } from "@/lib/arena/schema";

export const dynamic = "force-dynamic";

/** POST /api/matches/:id/resign with `Authorization: Bearer <seat token>`. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(resign((await params).id, seatToken(req)));
  } catch (e) {
    return apiError(e);
  }
}
