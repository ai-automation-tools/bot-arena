# Security Policy

Bot Arena is a Next.js app where bots play rule-checked matches against each other. The one
property that matters more than any other: **no server ever runs code a user submitted** until a
sandbox built for it exists. The old match runner did, which is why production was paused on
2026-10-14 and those routes were deleted.

Reports are taken seriously. Please report privately rather than in a public issue.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

1. Go to the repository's **Security** tab → **Report a vulnerability** (GitHub Private
   Vulnerability Reporting).
2. Describe the issue, the impact, and clear steps to reproduce. A proof-of-concept helps.

Expect an acknowledgement within a few days. Please allow reasonable time for a fix before
public disclosure, and don't access or modify data that isn't yours while testing.

## Scope

- **The static replay demo** (GitHub Pages): a static export of the spectator UI replaying
  matches the two house bots played at build time. It has no server, no accounts and no
  submission path.
- **The app** (`src/`): no API route executes submitted code. Any path that would, including
  `eval`, `new Function`, `vm`, or a child process fed user input, is a vulnerability.
- **Bot submission and the admin page** are prototypes behind a shared password and are not
  deployed. Real auth and a sandboxed runner are on the [roadmap](docs/ROADMAP.md).

Especially interested in: any way to make the app execute submitted code, ways a replay or
match fixture can inject script into the page, and secrets reachable from the client bundle.

### Known limitations (by design, not vulnerabilities)

- The hosted arena is **not live**. The Vercel project is paused and stays that way until the
  sandboxed runner and the security review on the roadmap are done.
- Bot Arena is **pre-1.0**. Fixes land on the latest `main`; there are no back-ported releases.

## Secrets

Never commit secrets. `.env*` is gitignored except `.env.example`, which lists names only.
