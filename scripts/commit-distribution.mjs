import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const distributionFiles = Object.freeze([
  "md-live-editor.js", "md-live-editor.d.ts", "writemark-editor.js", "writemark-editor.d.ts",
  "writemark-editor.global.js", "writemark-editor.global.d.ts",
  "writemark-editor.global.min.js", "writemark-editor.global.min.d.ts", "types.d.ts", "manifest.json",
]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const gitBlobHash = bytes => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

export async function readDistribution(directory) {
  const names = (await readdir(directory)).sort();
  if (JSON.stringify(names) !== JSON.stringify([...distributionFiles].sort())) throw new Error("Unexpected artifact files.");
  const contents = new Map();
  for (const name of names) {
    const path = resolve(directory, name);
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_000_000) throw new Error(`Invalid artifact file: ${name}`);
    contents.set(name, await readFile(path));
  }
  const manifest = JSON.parse(contents.get("manifest.json").toString());
  const expected = distributionFiles.filter(name => name !== "manifest.json").sort();
  if (JSON.stringify(Object.keys(manifest.outputs || {}).sort()) !== JSON.stringify(expected)) throw new Error("Unexpected manifest outputs.");
  for (const name of expected) {
    const bytes = contents.get(name);
    if (manifest.outputs[name].bytes !== bytes.length || manifest.outputs[name].sha256 !== sha256(bytes)) {
      throw new Error(`Artifact hash mismatch: ${name}`);
    }
  }
  return contents;
}

/** Commit only verified distribution bytes. Do not execute contributor code. */
export async function commitDistribution({ repository, run, directory, request }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid repository.");
  if (run.event !== "pull_request" || run.conclusion !== "success") return "No successful pull request build.";
  const base = `/repos/${repository}`;
  const linked = await request("GET", `${base}/commits/${run.head_sha}/pulls`);
  const pr = linked.find(pr => pr.state === "open" && pr.head.sha === run.head_sha && pr.base.repo.full_name === repository);
  if (!pr) return "The pull request closed or its source changed.";
  if (pr.head.repo?.full_name !== repository) return "Fork pull requests require a maintainer-owned branch.";
  if (pr.head.ref === pr.base.ref) throw new Error("Cannot write to the pull request base branch.");
  const contents = await readDistribution(directory);
  const parent = await request("GET", `${base}/git/commits/${run.head_sha}`);
  const existing = await request("GET", `${base}/git/trees/${parent.tree.sha}?recursive=1`);
  if (existing.truncated) throw new Error("The repository tree is incomplete.");
  const previous = new Map(existing.tree.filter(entry => entry.path.startsWith("dist/")).map(entry => [entry.path.slice(5), entry]));
  const changed = [...contents].filter(([name, bytes]) => previous.get(name)?.sha !== gitBlobHash(bytes) || previous.get(name)?.mode !== "100644");
  const deleted = [...previous].filter(([name, entry]) => entry.type !== "tree" && !contents.has(name));
  if (!changed.length && !deleted.length) return "Distribution already matches.";
  const treeEntries = [];
  for (const [name, bytes] of changed) {
    const blob = await request("POST", `${base}/git/blobs`, { content: bytes.toString("base64"), encoding: "base64" });
    treeEntries.push({ path: `dist/${name}`, mode: "100644", type: "blob", sha: blob.sha });
  }
  for (const [name, entry] of deleted) treeEntries.push({ path: `dist/${name}`, mode: entry.mode, type: entry.type, sha: null });
  const tree = await request("POST", `${base}/git/trees`, { base_tree: parent.tree.sha, tree: treeEntries });
  const commit = await request("POST", `${base}/git/commits`, {
    message: `build: generate distribution for ${run.head_sha.slice(0, 12)}`,
    tree: tree.sha, parents: [run.head_sha],
  });
  // Recheck after blob creation. A non-force update also rejects a source race.
  const latest = await request("GET", `${base}/pulls/${pr.number}`);
  if (latest.state !== "open" || latest.head.sha !== run.head_sha) return "The source changed. No branch update.";
  await request("PATCH", `${base}/git/refs/heads/${encodeURIComponent(pr.head.ref)}`, { sha: commit.sha, force: false });
  // GITHUB_TOKEN pushes do not run push workflows. Dispatch the final checks.
  await request("POST", `${base}/actions/workflows/test.yml/dispatches`, { ref: pr.head.ref });
  return `Generated distribution committed to pull request ${pr.number}.`;
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  const token = process.env.DIST_TOKEN;
  if (!token) throw new Error("The distribution GitHub token is missing.");
  const request = async (method, path, body) => {
    const response = await fetch(`${process.env.GITHUB_API_URL || "https://api.github.com"}${path}`, {
      method,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`GitHub ${method} failed with status ${response.status}.`);
    return response.status === 204 ? null : response.json();
  };
  console.log(await commitDistribution({ repository: process.env.GITHUB_REPOSITORY, run: event.workflow_run, directory: process.argv[2], request }));
}
