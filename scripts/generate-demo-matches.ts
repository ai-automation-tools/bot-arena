/**
 * Plays the house-bot demo matches and writes each to src/data/demo-matches/<id>.json.
 * Run with `npm run demo:matches`. Same seeds, same files: house-bots.test.ts replays every fixture
 * through the protocol and regenerates the shortest one from its seed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_MATCHES, playDemoMatch } from "../src/lib/demo-match";

const outDir = join(__dirname, "..", "src", "data", "demo-matches");
mkdirSync(outDir, { recursive: true });

for (const { id, seed, white, black } of DEMO_MATCHES) {
  const match = playDemoMatch(id, seed, white, black);
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(match, null, 2) + "\n");
  console.log(`${id}: ${match.moves.length} plies, ${match.result.outcome} (${match.result.reason})`);
}
