// npm run examples:test — plays the example agents to the end of a game against the random mover.
// Starts its own arena (next dev on a spare port, a throwaway ARENA_DATA_DIR) unless ARENA_URL points at one.
// Passes when every game finishes and the example agent never timed out, crashed or forfeited.
import { execFile, execFileSync, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GAMES = [
  { game: 'tictactoe', me: 'x', them: 'o' },
  { game: 'chess', me: 'white', them: 'black' },
];
const win = process.platform === 'win32';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () =>
  new Promise((resolve) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

/** Kills a process and everything it started (next dev runs workers). */
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (win) execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  } catch { /* already gone */ }
}

async function waitFor(url, ms) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
  }
  throw new Error(`${url} didn't come up within ${ms / 1000}s`);
}

/** Polls a match until it ends and returns it. */
async function finished(base, id, ms = 180_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) {
    const m = await (await fetch(`${base}/api/matches/${id}`)).json();
    if (m.status !== 'in-progress') return m;
  }
  throw new Error(`match ${id} still running after ${ms / 1000}s`);
}

function check(label, match, seat) {
  const s = match.stats?.[seat] ?? {};
  const ok = match.status === 'completed' && !s.timeouts && !s.forfeits && s.moves > 0;
  const outcome = match.result?.winner ? `${match.result.winner} won by ${match.result.reason}` : match.result?.reason;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${match.game}, ${match.moves.length} plies, ${outcome}, agent ${s.moves} moves, ${s.timeouts ?? '?'} timeouts, ${s.forfeits ?? '?'} forfeits`);
  return ok;
}

const children = [];
let dataDir;
let failed = 0;
try {
  let base = process.env.ARENA_URL?.replace(/\/$/, '');
  if (!base) {
    const port = await freePort();
    dataDir = mkdtempSync(join(tmpdir(), 'arena-examples-'));
    base = `http://127.0.0.1:${port}`;
    const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', String(port)], {
      env: { ...process.env, ARENA_DATA_DIR: dataDir, NEXT_DIST_DIR: '.next-examples' },
      stdio: process.env.ARENA_LOG ? 'inherit' : 'ignore',
      detached: !win,
    });
    children.push(next);
    console.log(`starting an arena at ${base}`);
  }
  await waitFor(`${base}/api/matches`, 180_000);

  // Python over REST: it creates its own match and prints the result as its last line.
  const python = process.env.PYTHON ?? (win ? 'python' : 'python3');
  for (const { game } of GAMES) {
    // Async on purpose: a blocked event loop lets fetch reuse a keep-alive socket the server already closed.
    const { stdout: out } = await promisify(execFile)(python, ['examples/python-rest/agent.py', '--base', base, '--game', game, '--opponent', 'random-mover'], { encoding: 'utf8', timeout: 300_000 });
    const { match: id } = JSON.parse(out.trim().split('\n').at(-1));
    if (!check('python-rest', await finished(base, id), GAMES.find((g) => g.game === game).me)) failed++;
  }

  // Node webhook: the arena calls it, so start it and point a seat at it.
  const hookPort = await freePort();
  const hook = spawn(process.execPath, ['examples/node-webhook/agent.mjs'], { env: { ...process.env, PORT: String(hookPort) }, stdio: 'ignore', detached: !win });
  children.push(hook);
  await sleep(500);
  for (const { game, me, them } of GAMES) {
    const res = await fetch(`${base}/api/matches`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game, [me]: { kind: 'webhook', url: `http://127.0.0.1:${hookPort}/move`, name: 'Webhook example' }, [them]: { kind: 'house', bot: 'random-mover' }, turnTimeoutMs: 10_000 }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`create match: ${JSON.stringify(body)}`);
    if (!check('node-webhook', await finished(base, body.match.id), me)) failed++;
  }
} catch (e) {
  console.error(e);
  failed++;
} finally {
  children.forEach(killTree);
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}
console.log(failed ? `${failed} example check(s) failed` : 'all examples played to the end');
process.exit(failed ? 1 : 0);
