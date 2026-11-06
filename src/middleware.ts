import { NextResponse, type NextRequest } from "next/server";

/**
 * The API runs your agents and plays moves without logging in, so only this machine may call it.
 * Blocks DNS rebinding (a web page reaching localhost under another name) and cross-site calls.
 * To reach it from other machines, list their host names in ARENA_ALLOWED_HOSTS (comma-separated),
 * start the server with `-H 0.0.0.0`, set ARENA_API_KEY, and preferably put it behind TLS.
 *
 * With ARENA_API_KEY set, every request needs the key: agents send `X-Arena-Key`, and a browser
 * unlocks once at /unlock, which stores it in an httpOnly cookie. Seat tokens stay the Bearer.
 */
const LOCAL = ["localhost", "127.0.0.1", "[::1]"];
export const KEY_COOKIE = "arena_key";
/** Readable by the page, so the connect snippets know to include the key header. Holds no secret. */
export const LOCKED_COOKIE = "arena_locked";
const OPEN_PATHS = ["/unlock", "/api/unlock"];

/** Compares without stopping at the first difference. Edge middleware has no crypto.timingSafeEqual. */
function sameKey(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const api = req.nextUrl.pathname.startsWith("/api/");
  if (api) {
    const blocked = hostCheck(req);
    if (blocked) return blocked;
  }

  const key = process.env.ARENA_API_KEY;
  if (key && !OPEN_PATHS.includes(req.nextUrl.pathname)) {
    const sent = req.headers.get("x-arena-key") ?? req.cookies.get(KEY_COOKIE)?.value ?? "";
    if (!sameKey(sent, key)) {
      if (api) {
        return NextResponse.json({ error: "This arena needs its key: send it as X-Arena-Key", code: "ARENA_KEY_REQUIRED" }, { status: 401 });
      }
      const unlock = new URL("/unlock", req.url);
      unlock.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(unlock);
    }
  }
  return NextResponse.next();
}

function hostCheck(req: NextRequest): NextResponse | null {
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
  return null;
}

// Every page and API route; not the build's static files or the icon.
export const config = { matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"] };
