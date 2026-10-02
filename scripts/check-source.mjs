import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.(?:js|mjs)$/.test(file)) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
  }
}
for (const directory of ["src", "dist", "scripts"]) check(directory);
console.log("Source syntax verified.");
