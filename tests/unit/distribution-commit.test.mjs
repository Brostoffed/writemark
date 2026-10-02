import assert from "node:assert/strict";
import { test } from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { commitDistribution, readDistribution } from "../../scripts/commit-distribution.mjs";

const run = { event: "pull_request", conclusion: "success", head_sha: "a".repeat(40) };
const pull = { number: 3, state: "open", head: { sha: run.head_sha, ref: "codex/change", repo: { full_name: "owner/repo" } }, base: { ref: "main", repo: { full_name: "owner/repo" } } };
function fakeRequest({ latest = pull, linked = [pull] } = {}) {
  const calls = [];
  const request = async (method, path, body) => {
    calls.push({ method, path, body });
    if (path.endsWith("/pulls/3")) return latest;
    if (path.endsWith("/pulls")) return linked;
    if (method === "GET" && path.includes("/git/commits/")) return { tree: { sha: "tree" } };
    if (method === "GET" && path.includes("/git/trees/")) return { tree: [{ path: "src/keep.js", type: "blob", mode: "100644", sha: "keep" }] };
    return { sha: "created" };
  };
  return { request, calls };
}
test("bot writes only dist and dispatches checks after a non-force branch update", async () => {
  const fake = fakeRequest();
  await commitDistribution({ repository: "owner/repo", run, directory: resolve("dist"), request: fake.request });
  const tree = fake.calls.find(call => call.method === "POST" && call.path.endsWith("/git/trees"));
  assert.ok(tree.body.tree.every(entry => entry.path.startsWith("dist/")));
  const update = fake.calls.findIndex(call => call.method === "PATCH");
  const dispatch = fake.calls.findIndex(call => call.path.endsWith("/dispatches"));
  assert.equal(fake.calls[update].body.force, false);
  assert.ok(dispatch > update);
  assert.deepEqual(fake.calls[dispatch].body, { ref: "codex/change" });
});
test("bot leaves the branch unchanged when source changes during its run", async () => {
  const fake = fakeRequest({ latest: { ...pull, head: { ...pull.head, sha: "b".repeat(40) } } });
  assert.match(await commitDistribution({ repository: "owner/repo", run, directory: resolve("dist"), request: fake.request }), /No branch update/);
  assert.equal(fake.calls.some(call => call.method === "PATCH" || call.path.endsWith("/dispatches")), false);
});
test("bot never writes to a fork or the base branch", async () => {
  const fork = fakeRequest({ linked: [{ ...pull, head: { ...pull.head, repo: { full_name: "fork/repo" } } }] });
  assert.match(await commitDistribution({ repository: "owner/repo", run, directory: "/unused", request: fork.request }), /maintainer-owned branch/);
  assert.ok(fork.calls.every(call => call.method === "GET"));
  const base = fakeRequest({ linked: [{ ...pull, head: { ...pull.head, ref: "main" } }] });
  await assert.rejects(commitDistribution({ repository: "owner/repo", run, directory: "/unused", request: base.request }), /base branch/);
});
test("bot rejects changed bytes and files outside the artifact list", async () => {
  const directory = await mkdtemp(join(tmpdir(), "writemark-artifact-"));
  try {
    await cp(resolve("dist"), directory, { recursive: true });
    const script = resolve(directory, "writemark-editor.global.min.js");
    const original = await readFile(script);
    await writeFile(script, "modified");
    await assert.rejects(readDistribution(directory), /hash mismatch/);
    await writeFile(script, original);
    await writeFile(resolve(directory, "extra.js"), "modified");
    await assert.rejects(readDistribution(directory), /Unexpected artifact files/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
