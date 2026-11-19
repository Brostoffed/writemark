import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

const playwright = createRequire(import.meta.url).resolve("@playwright/test/cli");
const reports = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR || "output/playwright/report";
const args = process.argv.slice(2);
const timingTag = "@cursor-timing";
const suites = [
  { name: "browser", options: ["--grep-invert", timingTag] },
  { name: "timing", options: ["--grep", timingTag, "--workers=1"] }
];

for (const { name, options } of suites) {
  console.log(`\nRun Playwright ${name} checks`);
  const result = spawnSync(process.execPath, [
    playwright, "test", ...args, ...options,
    "--output", join("output/playwright/test-results", name)
  ], {
    env: { ...process.env, PLAYWRIGHT_HTML_OUTPUT_DIR: join(reports, name) },
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  if (result.signal) break;
}
