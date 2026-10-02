import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = (cwd, args = []) => spawnSync(process.execPath, ["scripts/build.mjs", ...args], { cwd, encoding: "utf8" });
test("builds repeatable files and rejects stale source, artifacts, and declarations without writes", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "writemark-build-"));
  try {
    for (const name of ["src", "scripts", "package.json", "package-lock.json", "tsconfig.declarations.json", "LICENSE", ".node-version"]) {
      await cp(resolve(root, name), resolve(directory, name), { recursive: true });
    }
    await symlink(resolve(root, "node_modules"), resolve(directory, "node_modules"), "dir");
    let result = run(directory);
    assert.equal(result.status, 0, result.stderr);
    const names = await readdir(resolve(directory, "dist"));
    const expected = new Map(await Promise.all(names.map(async name => [name, await readFile(resolve(directory, "dist", name))])));
    for (const [name, bytes] of expected) assert.deepEqual(bytes, await readFile(resolve(root, "dist", name)), name);
    result = run(directory, ["--check"]);
    assert.equal(result.status, 0, result.stderr);
    for (const name of ["writemark-editor.global.min.js", "writemark-editor.d.ts"]) {
      const altered = Buffer.concat([expected.get(name), Buffer.from("\n// manual change\n")]);
      await writeFile(resolve(directory, "dist", name), altered);
      result = run(directory, ["--check"]);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /stale/);
      assert.deepEqual(await readFile(resolve(directory, "dist", name)), altered);
      await writeFile(resolve(directory, "dist", name), expected.get(name));
    }
    const source = resolve(directory, "src/security.js");
    await writeFile(source, (await readFile(source, "utf8")) + "\n// source changed\n");
    result = run(directory, ["--check"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /manifest.json is missing or stale/);
    for (const [name, bytes] of expected) assert.deepEqual(await readFile(resolve(directory, "dist", name)), bytes);
    await writeFile(source, await readFile(resolve(root, "src/security.js")));
    await writeFile(resolve(directory, "dist/unexpected.css"), "body {}\n");
    result = run(directory, ["--check"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unexpected.css is unexpected/);
    result = run(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await readdir(resolve(directory, "dist"))).includes("unexpected.css"), false);
    await mkdir(resolve(directory, "other"));
    await writeFile(resolve(directory, "src/component/styles.css"), '@import "https://invalid.example/style.css";\n');
    result = run(directory);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must not load external resources/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
