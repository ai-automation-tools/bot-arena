// Runs after `next build` when packing for npm. Turbopack reaches each server-external package
// (`serverExternalPackages` in next.config.ts) through a link at `.next/node_modules/<name>-<hash>`.
// npm never packs a node_modules folder, so record each link here; `bin/bot-arena.mjs` recreates them.
import { existsSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const links = join(".next", "node_modules");
const modules = realpathSync("node_modules");
const externals = {};
for (const name of existsSync(links) ? readdirSync(links) : []) {
  // A scoped package sits one level down: .next/node_modules/@scope/<name>-<hash>.
  const entries = name.startsWith("@") ? readdirSync(join(links, name)).map((n) => `${name}/${n}`) : [name];
  for (const link of entries) {
    const pkg = relative(modules, realpathSync(join(links, link))).split(sep).join("/");
    if (pkg.startsWith("..")) throw new Error(`${link} points outside node_modules`);
    externals[link] = pkg;
  }
}
writeFileSync(join(".next", "externals.json"), JSON.stringify(externals, null, 2) + "\n");
console.log(`Recorded ${Object.keys(externals).length} external package link(s):`, externals);
