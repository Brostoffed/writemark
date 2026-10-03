#!/usr/bin/env node
import { build, transform } from "esbuild";
import ts from "typescript";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--check")) throw new Error("Usage: node scripts/build.mjs [--check]");
const checkOnly = args.includes("--check");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const license = (await readFile(resolve(root, "LICENSE"), "utf8")).replace(/\r\n?/g, "\n").trim();
const banner = `/*! Writemark v${pkg.version}\n${license.replace(/\*\//g, "* /")}\n*/`;
const generated = new Map();
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const add = (name, contents) => generated.set(name, Buffer.from(contents));

function embeddedCss(minify) {
  return {
    name: "embedded-css",
    setup(builder) {
      builder.onLoad({ filter: /\.css$/ }, async ({ path }) => {
        const css = (await readFile(path, "utf8")).replace(/\r\n?/g, "\n");
        if (/@import\b|\burl\s*\(/i.test(css)) throw new Error("Component styles must not load external resources.");
        const result = await transform(css, { loader: "css", minifyWhitespace: minify });
        return { contents: result.code, loader: "text", warnings: result.warnings, watchFiles: [path] };
      });
    },
  };
}

for (const variant of [
  { file: "writemark-editor.js", format: "esm", minify: false },
  { file: "writemark-editor.global.js", format: "iife", minify: false },
  { file: "writemark-editor.global.min.js", format: "iife", minify: true },
]) {
  const classic = variant.format === "iife";
  const result = await build({
    absWorkingDir: root, entryPoints: ["src/writemark-editor.js"],
    outfile: resolve(root, "dist", variant.file),
    bundle: true, splitting: false, platform: "browser", format: variant.format,
    ...(classic ? { globalName: "__writemark", footer: { js: "globalThis.WritemarkEditor = Object.freeze(__writemark);\n})();" } } : {}),
    target: "es2022", minify: variant.minify, keepNames: true,
    sourcemap: false, legalComments: "none",
    banner: { js: banner + (classic ? "\n(() => {" : "") },
    plugins: [embeddedCss(variant.minify)], metafile: true, write: false, logLevel: "warning",
  });
  if (result.warnings.length) throw new Error(`${variant.file}: build warnings require a fix.`);
  if (result.outputFiles.length !== 1) throw new Error(`${variant.file}: expected one output file.`);
  if (Object.values(result.metafile.outputs).some(output => output.imports.length)) {
    throw new Error(`${variant.file}: unresolved runtime imports.`);
  }
  if (Object.keys(result.metafile.inputs).some(input => !input.startsWith("src/"))) {
    throw new Error(`${variant.file}: bundled a dependency outside src/.`);
  }
  add(variant.file, result.outputFiles[0].contents);
}
add("md-live-editor.js", 'export * from "./writemark-editor.js";\n');

// Emit in memory. Keep only declarations reachable from the public entry.
const config = ts.readConfigFile(resolve(root, "tsconfig.declarations.json"), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [...parsed.errors, ...program.getOptionsDiagnostics(),
  ...program.getGlobalDiagnostics(), ...program.getSyntacticDiagnostics()];
const declarations = new Map();
let emitSkipped = false;
for (const entry of ["src/writemark-editor.js", "src/types.js"]) {
  const sourceFile = program.getSourceFile(resolve(root, entry));
  diagnostics.push(...program.getSemanticDiagnostics(sourceFile), ...program.getDeclarationDiagnostics(sourceFile));
  const emitted = program.emit(sourceFile, (file, contents) => {
    declarations.set(relative(resolve(root, "dist"), file).replaceAll("\\", "/"), contents.replace(/\r\n?/g, "\n"));
  });
  diagnostics.push(...emitted.diagnostics);
  emitSkipped ||= emitted.emitSkipped;
}
if (diagnostics.length || emitSkipped) {
  throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
  }));
}
for (const name of ["writemark-editor.d.ts", "types.d.ts"]) {
  if (!declarations.has(name)) throw new Error(`Missing declaration: ${name}`);
  add(name, declarations.get(name));
}
add("writemark-editor.d.ts", generated.get("writemark-editor.d.ts").toString() + `
declare global {
  interface HTMLElementTagNameMap {
    "writemark-editor": WritemarkEditorElement;
    "md-live-editor": MdLiveEditorElement;
  }
}
`);
add("md-live-editor.d.ts", 'export * from "./writemark-editor.js";\n');
const globalTypes = `import type * as API from "./writemark-editor.js";
declare global {
  var WritemarkEditor: Readonly<typeof API>;
  interface Window { WritemarkEditor: Readonly<typeof API>; }
}
export {};
`;
add("writemark-editor.global.d.ts", globalTypes);
add("writemark-editor.global.min.d.ts", globalTypes);

async function sourceHashes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const hashes = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) Object.assign(hashes, await sourceHashes(file));
    else hashes[relative(root, file).replaceAll("\\", "/")] = hash(await readFile(file));
  }
  return hashes;
}
const inputs = await sourceHashes(resolve(root, "src"));
for (const name of ["scripts/build.mjs", "tsconfig.declarations.json", "package.json", "package-lock.json", "LICENSE", ".node-version"]) {
  inputs[name] = hash(await readFile(resolve(root, name)));
}
add("manifest.json", JSON.stringify({
  version: pkg.version, target: "es2022",
  tools: { node: process.versions.node, esbuild: pkg.devDependencies.esbuild, typescript: pkg.devDependencies.typescript },
  inputs,
  outputs: Object.fromEntries([...generated].map(([name, bytes]) => [name, { bytes: bytes.length, sha256: hash(bytes) }])),
}, null, 2) + "\n");

// --check compares without changing files. Unexpected files also fail the check.
const dist = resolve(root, "dist");
const existing = await readdir(dist).catch(error => {
  if (error.code !== "ENOENT") throw error;
  return [];
});
const unexpected = existing.filter(name => !generated.has(name));
const stale = unexpected.map(name => `${name} is unexpected`);
if (!checkOnly) await mkdir(dist, { recursive: true });
for (const [name, expected] of generated) {
  const file = resolve(dist, name);
  if (checkOnly) {
    const actual = await readFile(file).catch(error => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    if (!actual?.equals(expected)) stale.push(`${name} is missing or stale`);
  } else await writeFile(file, expected);
}
if (checkOnly && stale.length) throw new Error(`${stale.join("\n")}\nRun npm run build.`);
if (!checkOnly) for (const name of unexpected) await rm(resolve(dist, name), { recursive: true });
console.log(checkOnly ? "Distribution verified." : "Distribution built.");
