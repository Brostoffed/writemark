import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceConfig = ts.readConfigFile(resolve(root, "tsconfig.json"), ts.sys.readFile);
if (sourceConfig.error) throw new Error(ts.flattenDiagnosticMessageText(sourceConfig.error.messageText, "\n"));
const sourceOptions = ts.parseJsonConfigFileContent(sourceConfig.config, ts.sys, root);
const internalProgram = ts.createProgram([resolve(root, "tests/types/internal.ts")], sourceOptions.options);
const internalDiagnostics = [...sourceOptions.errors, ...ts.getPreEmitDiagnostics(internalProgram)];
if (internalDiagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(internalDiagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
}));
console.log("Internal capability and event contracts verified.");
const directory = await mkdtemp(join(tmpdir(), "writemark-types-"));
try {
  // Test the package users install. Ignore lifecycle scripts to avoid recursion.
  const packed = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", directory, "--cache", resolve(directory, "npm-cache")], { cwd: root, encoding: "utf8" }));
  execFileSync("tar", ["-xf", resolve(directory, packed[0].filename), "-C", directory]);
  const pkg = JSON.parse(await readFile(resolve(directory, "package/package.json"), "utf8"));
  if (Object.keys(pkg.dependencies || {}).length) throw new Error("The package has runtime dependencies.");
  for (const name of ["writemark-editor.js", "writemark-editor.global.js", "writemark-editor.global.min.js", "md-live-editor.js"]) {
    const actual = await readFile(resolve(directory, "package/dist", name));
    const expected = await readFile(resolve(root, "dist", name));
    if (!actual.equals(expected)) throw new Error(`Packaged ${name} differs from the tested file.`);
  }
  await mkdir(resolve(directory, "node_modules"));
  await symlink(resolve(directory, "package"), resolve(directory, "node_modules/writemark-editor"), "dir");
  await writeFile(resolve(directory, "package.json"), '{"type":"module"}\n');
  const files = ["module.ts", "global.ts"];
  for (const name of files) await writeFile(resolve(directory, name), await readFile(resolve(root, "tests/types", name)));
  for (const resolution of ["NodeNext", "Bundler"]) {
    const options = {
      strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: false,
      target: ts.ScriptTarget.ES2022,
      module: resolution === "NodeNext" ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
      moduleResolution: resolution === "NodeNext" ? ts.ModuleResolutionKind.NodeNext : ts.ModuleResolutionKind.Bundler,
      types: [],
    };
    const program = ts.createProgram(files.map(name => resolve(directory, name)), options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file, getCurrentDirectory: () => directory, getNewLine: () => "\n",
    }));
    console.log(`Packaged declarations verified (${resolution}).`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
