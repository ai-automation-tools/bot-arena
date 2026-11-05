import { NextResponse, type NextRequest } from "next/server";

/**
 * The API runs your agents and plays moves without logging in, so only this machine may call it.
 * Blocks DNS rebinding (a web page reaching localhost under another name) and cross-site calls.
 * To reach it from other machines, list their host names in ARENA_ALLOWED_HOSTS (comma-separated),
 * start the server with `-H 0.0.0.0`, and put it behind something that authenticates.
 */
const LOCAL = ["localhost", "127.0.0.1", "[::1]"];

export function middleware(req: NextRequest) {
  const allowed = [...LOCAL, ...(process.env.ARENA_ALLOWED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)];
  const hostname = (h: string) => h.toLowerCase().replace(/:\d+$/, "");

  const host = req.headers.get("host");
  if (!host || !allowed.includes(hostname(host))) {
    return NextResponse.json({ error: `Host ${host} is not allowed; add it to ARENA_ALLOWED_HOSTS`, code: "HOST_NOT_ALLOWED" }, { status: 403 });
  }
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* malformed: rejected below */ }
    if (hostname(originHost) !== hostname(host) && !allowed.includes(hostname(originHost))) {
      return NextResponse.json({ error: `Cross-origin request from ${origin} refused`, code: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
