import { NextRequest, NextResponse } from "next/server";
import { matchPersistence } from "@/lib/match-persistence";

/**
 * GET /api/match/[id]
 *
 * Retrieves match state and result by match ID.
 * Used by spectator view to fetch match data for replay.
 *
 * Response:
 * {
 *   "success": true,
 *   "match": {
 *     "state": MatchState,
 *     "result": MatchResult | null
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: "Match ID is required" },
        { status: 400 }
      );
    }

    // Fetch match state
    const matchState = await matchPersistence.loadMatchState(matchId);

    if (!matchState) {
      return NextResponse.json(
        { success: false, error: `Match not found: ${matchId}` },
        { status: 404 }
      );
    }

    // Fetch match result (may not exist if match is still running)
    const matchResult = await matchPersistence.loadMatchResult(matchId);

    return NextResponse.json(
      {
        success: true,
        match: {
          state: matchState,
          result: matchResult,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Match fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
