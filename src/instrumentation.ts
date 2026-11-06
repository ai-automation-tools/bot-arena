/**
 * Next runs this once when the server starts: resume the matches the last run left in progress.
 * The runtime check has to wrap the import inline, or the edge bundle tries to pull in `node:fs`.
 * Builds (including the static demo) load this too; they must not start games.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.NEXT_PUBLIC_DEMO !== "1") {
    const { resumeMatches } = await import("./lib/arena/arena");
    const n = resumeMatches();
    if (n) console.log(`[arena] resumed ${n} match${n === 1 ? "" : "es"} in progress`);
  }
}
