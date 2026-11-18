/**
 * @jest-environment node
 *
 * The request guard: host and origin checks on the API, and the optional ARENA_API_KEY on everything.
 */
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { POST as unlock } from "../app/api/unlock/route";
import { GET as health } from "../app/api/health/route";
import { sameSitePath } from "../lib/utils";

const req = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost:9002"), { headers: { host: "localhost:9002", ...headers } });
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";

afterEach(() => {
  delete process.env.ARENA_API_KEY;
  delete process.env.ARENA_ALLOWED_HOSTS;
});

describe("ARENA_ALLOWED_HOSTS", () => {
  const remote = (headers: Record<string, string> = {}) => req("/api/matches", { host: "arena.lan:9002", ...headers });
  beforeEach(() => {
    process.env.ARENA_ALLOWED_HOSTS = "arena.lan, other.lan";
  });

  it("refuses the listed hosts without ARENA_API_KEY, and logs why once", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = proxy(remote());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "HOST_NOT_ALLOWED", error: expect.stringContaining("ARENA_API_KEY") });
    expect(proxy(req("/api/matches", { origin: "http://arena.lan:9002" })).status).toBe(403);
    proxy(remote());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/ARENA_API_KEY is not/);
    warn.mockRestore();
  });

  it("still lets this machine in without a key", () => {
    expect(passes(proxy(req("/api/matches")))).toBe(true);
  });

  it("lets the listed hosts in once a key is set, with the key", () => {
    process.env.ARENA_API_KEY = "s3cret-key";
    expect(passes(proxy(remote({ "x-arena-key": "s3cret-key" })))).toBe(true);
    expect(passes(proxy(req("/api/matches", { origin: "http://other.lan", "x-arena-key": "s3cret-key" })))).toBe(true);
    expect(proxy(remote()).status).toBe(401);
  });
});

describe("without a key", () => {
  it("lets this machine in", () => {
    expect(passes(proxy(req("/api/matches")))).toBe(true);
    expect(passes(proxy(req("/history")))).toBe(true);
  });
  it("refuses another host name and a cross-site origin on the API", async () => {
    expect(proxy(req("/api/matches", { host: "evil.example" })).status).toBe(403);
    const res = proxy(req("/api/matches", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "ORIGIN_NOT_ALLOWED" });
  });
  it("refuses an opaque null origin on the API", () => {
    expect(proxy(req("/api/matches", { origin: "null" })).status).toBe(403);
  });
  it("lets its own origin in", () => {
    expect(passes(proxy(req("/api/matches", { origin: "http://localhost:9002" })))).toBe(true);
    expect(passes(proxy(req("/api/matches", { origin: "http://localhost:9002", "sec-fetch-site": "same-origin" })))).toBe(true);
    expect(passes(proxy(req("/api/matches", { "sec-fetch-site": "none" })))).toBe(true);
  });
  it("refuses another app on this machine (same name, other port)", () => {
    expect(proxy(req("/api/matches", { origin: "http://localhost:3000" })).status).toBe(403);
    expect(proxy(req("/api/matches", { host: "127.0.0.1:9002", origin: "http://127.0.0.1:8080" })).status).toBe(403);
  });
  it("refuses a same-site or cross-site browser request that sends no Origin", () => {
    expect(proxy(req("/api/matches", { "sec-fetch-site": "same-site" })).status).toBe(403);
    expect(proxy(req("/api/matches", { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });
});

describe("unlock's return path", () => {
  it.each([["/matches/abc?x=1", "/matches/abc?x=1"], [undefined, "/"], ["//evil.example", "/"], [String.raw`/\evil.example`, "/"], ["https://evil.example/", "/"], ["javascript:alert(1)", "/"]])(
    "%p goes to %p",
    (next, to) => expect(sameSitePath(next)).toBe(to),
  );
});

describe("with ARENA_API_KEY", () => {
  beforeEach(() => {
    process.env.ARENA_API_KEY = "s3cret-key";
  });

  it("answers API calls without the key with 401", async () => {
    const res = proxy(req("/api/mcp"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "ARENA_KEY_REQUIRED" });
    expect(proxy(req("/api/mcp", { "x-arena-key": "s3cret-kez" })).status).toBe(401);
    expect(proxy(req("/api/mcp", { "x-arena-key": "s3cret-key-and-more" })).status).toBe(401);
  });

  it("lets the key in as a header or as the unlock cookie", () => {
    expect(passes(proxy(req("/api/matches", { "x-arena-key": "s3cret-key" })))).toBe(true);
    expect(passes(proxy(req("/history", { cookie: "arena_key=s3cret-key" })))).toBe(true);
  });

  it("sends a browser without the cookie to /unlock and back", () => {
    const res = proxy(req("/matches/abc/report?x=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:9002/unlock?next=%2Fmatches%2Fabc%2Freport%3Fx%3D1");
    expect(passes(proxy(req("/unlock")))).toBe(true);
  });

  it("still checks the host first, key or not", () => {
    expect(proxy(req("/api/matches", { host: "evil.example", "x-arena-key": "s3cret-key" })).status).toBe(403);
  });

  it("lets Docker's healthcheck reach /api/health without the key, and nothing else with it", async () => {
    expect(passes(proxy(req("/api/health")))).toBe(true);
    expect(proxy(req("/api/health", { host: "evil.example" })).status).toBe(403);
    expect(proxy(req("/api/matches")).status).toBe(401);
    expect(await (await health()).json()).toEqual({ ok: true });
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
