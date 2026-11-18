# Security Policy

Bot Arena is a web app you run on your own machine to play your own AI agents against each other. Its
security model follows from that: **one trusted user, one machine.** There are no accounts, and the
agents and code bots you add run with your permissions, like any script you run yourself.

What the app does guarantee is that **only your machine can drive it**:

- `npx @ai-automation-tools/bot-arena`, `npm run dev` and `npm start` listen on `127.0.0.1`.
- `src/proxy.ts` refuses any API or MCP request whose `Host` isn't `localhost`, `127.0.0.1` or
  `[::1]` (or a name you list in `ARENA_ALLOWED_HOSTS`, and only while `ARENA_API_KEY` is set), and
  any browser request from another origin: another site, or another port on this machine (the `Origin` must
  match the `Host`, port included, and `Sec-Fetch-Site` must be `same-origin` or `none`). This stops
  DNS-rebinding and cross-site attacks from a web page you happen to visit, and other local apps' pages.

Please report privately rather than in a public issue.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

1. Go to the repository's **Security** tab → **Report a vulnerability** (GitHub Private
   Vulnerability Reporting).
2. Describe the issue, the impact, and clear steps to reproduce. A proof-of-concept helps.

Expect an acknowledgement within a few days. Please allow reasonable time for a fix before
public disclosure.

## Scope

Especially interested in:

- Any way for a **web page, another machine, or another user on the network** to reach the API or
  the MCP endpoint, start a match, play a move or run code, with the default settings.
- Ways a move, a bot name, a webhook reply or a saved match file can inject script into the UI.
- Ways one seat can act for the other (play, resign or read a token it wasn't given).
- The static replay demo (GitHub Pages): it has no server; anything that runs script on it.
- The published npm package and Docker image: anything in them that isn't built from this repo.

### By design, not vulnerabilities

- **Code bots run arbitrary JavaScript** with full access (network, timers). You paste them in; they're
  yours. Each one runs in a worker thread that's stopped when its move clock runs out; that only stops a
  stuck loop. It is not a sandbox.
- **Webhook seats call any URL you give them**, including ones on your network.
- **No authentication by default** on the pages, the API or the MCP endpoint when used from the same
  machine. If you expose the arena with `-H 0.0.0.0` and `ARENA_ALLOWED_HOSTS`, set `ARENA_API_KEY`
  (the listed hosts are refused until you do): every request then needs the key (`X-Arena-Key`, or the httpOnly cookie `/unlock` sets). It's one
  shared key with no rate limit, so make it long and random, and serve the arena over HTTPS.
- Bot Arena is **pre-1.0**. Fixes land on the latest `main` and ship in the next npm and Docker release; there are no back-ported releases.

## Secrets

Bot Arena needs none. Never commit `.env*` (gitignored except `.env.example`, which lists names only).
