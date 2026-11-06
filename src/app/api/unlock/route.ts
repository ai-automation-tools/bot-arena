import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/arena/schema";
import { KEY_COOKIE, LOCKED_COOKIE } from "@/middleware";

export const dynamic = "force-dynamic";

/**
 * POST /api/unlock `{ "key": "..." }`: checks the arena key and stores it in an httpOnly cookie, so the
 * browser UI works with ARENA_API_KEY set. Agents don't need this; they send X-Arena-Key.
 * ponytail: no rate limit; use a long random key (the README says `openssl rand -hex 24`).
 */
export async function POST(req: Request) {
  try {
    const expected = process.env.ARENA_API_KEY;
    if (!expected) return NextResponse.json({ ok: true, locked: false });
    const { key } = z.object({ key: z.string().min(1).max(500) }).parse(await req.json());
    const a = Buffer.from(key);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "That isn't this arena's key", code: "BAD_ARENA_KEY" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, locked: true });
    const cookie = { path: "/", sameSite: "strict" as const, secure: new URL(req.url).protocol === "https:", maxAge: 60 * 60 * 24 * 30 };
    res.cookies.set(KEY_COOKIE, key, { ...cookie, httpOnly: true });
    res.cookies.set(LOCKED_COOKIE, "1", cookie);
    return res;
  } catch (e) {
    return apiError(e);
  }
}
