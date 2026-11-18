import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/health: `{ ok: true }` while the server answers. For Docker's healthcheck; reads nothing, needs no key. */
export function GET() {
  return NextResponse.json({ ok: true });
}
