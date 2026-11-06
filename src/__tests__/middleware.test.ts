/**
 * @jest-environment node
 *
 * The request guard: host and origin checks on the API, and the optional ARENA_API_KEY on everything.
 */
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { POST as unlock } from "../app/api/unlock/route";

const req = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost:9002"), { headers: { host: "localhost:9002", ...headers } });
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";

afterEach(() => {
  delete process.env.ARENA_API_KEY;
});

describe("without a key", () => {
  it("lets this machine in", () => {
    expect(passes(middleware(req("/api/matches")))).toBe(true);
    expect(passes(middleware(req("/history")))).toBe(true);
  });
  it("refuses another host name and a cross-site origin on the API", async () => {
    expect(middleware(req("/api/matches", { host: "evil.example" })).status).toBe(403);
    const res = middleware(req("/api/matches", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "ORIGIN_NOT_ALLOWED" });
  });
});

describe("with ARENA_API_KEY", () => {
  beforeEach(() => {
    process.env.ARENA_API_KEY = "s3cret-key";
  });

  it("answers API calls without the key with 401", async () => {
    const res = middleware(req("/api/mcp"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "ARENA_KEY_REQUIRED" });
    expect(middleware(req("/api/mcp", { "x-arena-key": "s3cret-kez" })).status).toBe(401);
    expect(middleware(req("/api/mcp", { "x-arena-key": "s3cret-key-and-more" })).status).toBe(401);
  });

  it("lets the key in as a header or as the unlock cookie", () => {
    expect(passes(middleware(req("/api/matches", { "x-arena-key": "s3cret-key" })))).toBe(true);
    expect(passes(middleware(req("/history", { cookie: "arena_key=s3cret-key" })))).toBe(true);
  });

  it("sends a browser without the cookie to /unlock and back", () => {
    const res = middleware(req("/matches/abc/report?x=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:9002/unlock?next=%2Fmatches%2Fabc%2Freport%3Fx%3D1");
    expect(passes(middleware(req("/unlock")))).toBe(true);
  });

  it("still checks the host first, key or not", () => {
    expect(middleware(req("/api/matches", { host: "evil.example", "x-arena-key": "s3cret-key" })).status).toBe(403);
  });

  it("unlock sets the httpOnly cookie for the right key only", async () => {
    const post = (key: string) => unlock(new Request("http://localhost:9002/api/unlock", { method: "POST", body: JSON.stringify({ key }) }));
    expect((await post("wrong")).status).toBe(401);
    const ok = await post("s3cret-key");
    expect(ok.status).toBe(200);
    const cookies = ok.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith("arena_key="))).toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith("arena_key="))).toMatch(/SameSite=strict/i);
    expect(cookies.some((c) => c.startsWith("arena_locked=1"))).toBe(true);
  });
});
