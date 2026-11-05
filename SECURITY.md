# Security Policy

Bot Arena is a web app you run on your own machine to play your own AI agents against each other. Its
security model follows from that: **one trusted user, one machine.** There are no accounts, and the
agents and code bots you add run with your permissions, like any script you run yourself.

What the app does guarantee is that **only your machine can drive it**:

- `npm run dev` and `npm start` listen on `127.0.0.1`.
- `src/middleware.ts` refuses any API or MCP request whose `Host` isn't `localhost`, `127.0.0.1` or
  `[::1]` (or a name you list in `ARENA_ALLOWED_HOSTS`), and any browser request whose `Origin` is
  another site. This stops DNS-rebinding and cross-site attacks from a web page you happen to visit.

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

### By design, not vulnerabilities

- **Code bots run arbitrary JavaScript** with full access (network, timers). You paste them in; they're
  yours. The 10-second cap on a synchronous call only stops a stuck loop. It is not a sandbox.
- **Webhook seats call any URL you give them**, including ones on your network.
- **No authentication** on the API or MCP endpoint when used from the same machine. If you expose the
  arena with `-H 0.0.0.0` and `ARENA_ALLOWED_HOSTS`, put authentication in front of it.
- Bot Arena is **pre-1.0**. Fixes land on the latest `main`; there are no back-ported releases.

## Secrets

Bot Arena needs none. Never commit `.env*` (gitignored except `.env.example`, which lists names only).
