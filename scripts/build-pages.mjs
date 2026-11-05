// Static export of the replay demo for GitHub Pages, written to out/.
//   npm run build:pages   (PAGES_BASE_PATH=/sub/path if it's ever served below a domain's root)
// The demo leaves out every route that needs the local arena server (the API, new and live matches,
// match history, connect) and the mock match report, whose share image renders per request:
// they're moved aside for the build and always put back. Next has no per-build route filter, hence the move.
// ponytail: a killed process can leave them in .pages-hold/; the next run puts them back first.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const APP = 'src/app';
const HOLD = '.pages-hold';
const SERVER_ONLY = ['api', 'new', 'matches', 'history', 'connect', 'match-report'];

const restore = () => {
  for (const r of SERVER_ONLY) if (existsSync(join(HOLD, r))) renameSync(join(HOLD, r), join(APP, r));
  rmSync(HOLD, { recursive: true, force: true });
};

restore();
mkdirSync(HOLD, { recursive: true });
try {
  for (const r of SERVER_ONLY) renameSync(join(APP, r), join(HOLD, r));
  execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_DEMO: '1' } });
} finally {
  restore();
}
