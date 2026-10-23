import ts from "typescript";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export function checkTypePolicy(program, sourceRoot = resolve(root, "src")) {
  const options = program.getCompilerOptions();
  for (const flag of ["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes", "noImplicitOverride", "noFallthroughCasesInSwitch", "isolatedModules", "verbatimModuleSyntax"]) {
    if (options[flag] !== true) throw new Error(`The source type policy requires ${flag}.`);
  }
  for (const flag of ["noImplicitAny", "strictNullChecks", "strictFunctionTypes", "strictPropertyInitialization", "useUnknownInCatchVariables"]) {
    if (options[flag] === false) throw new Error(`The source type policy forbids disabling ${flag}.`);
  }
  if (options.allowJs) throw new Error("Editor source cannot enable allowJs.");
  const checker = program.getTypeChecker();
  const failures = [];
  function checkFiles(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) checkFiles(file);
      else if (/\.ts$/.test(file) && !program.getSourceFile(file)) failures.push(`${file}: The compiler must check every source file.`);
      else if (/\.(?:js|mjs|cjs)$/.test(file)) failures.push(`${file}: Editor source must use TypeScript.`);
    }
  }
  checkFiles(sourceRoot);
  const isSource = file => file.fileName.startsWith(sourceRoot + "/");
  function containsAny(type, seen = new Set()) {
    if (seen.has(type)) return false;
    seen.add(type);
    if (type.flags & ts.TypeFlags.Any) return true;
    if (type.isUnionOrIntersection()) return type.types.some(member => containsAny(member, seen));
    if (!(type.flags & ts.TypeFlags.Object)) return false;
    if ((type.objectFlags & ts.ObjectFlags.Reference) && checker.getTypeArguments(type).some(argument => containsAny(argument, seen))) return true;
    // Inspect shapes from this source. DOM and standard-library contracts belong to their libraries.
    if (type.objectFlags & ts.ObjectFlags.Anonymous) {
      for (const property of checker.getPropertiesOfType(type)) {
        const declaration = property.valueDeclaration || property.declarations?.[0];
        if (declaration && isSource(declaration.getSourceFile()) && containsAny(checker.getTypeOfSymbolAtLocation(property, declaration), seen)) return true;
      }
      for (const signature of checker.getSignaturesOfType(type, ts.SignatureKind.Call)) {
        if (signature.declaration && isSource(signature.declaration.getSourceFile()) && containsAny(checker.getReturnTypeOfSignature(signature), seen)) return true;
      }
    }
    return false;
  }
  for (const file of program.getSourceFiles().filter(isSource)) {
    const report = (node, reason) => {
      const { line, character } = file.getLineAndCharacterOfPosition(node.getStart(file));
      failures.push(`${file.fileName}:${line + 1}:${character + 1}: ${reason}`);
    };
    if (/\.(?:js|mjs|cjs)$/.test(file.fileName)) report(file, "Editor source must use TypeScript.");
    for (const match of file.text.matchAll(/@ts-(?:ignore|nocheck|expect-error)\b/g)) {
      const { line } = file.getLineAndCharacterOfPosition(match.index);
      failures.push(`${file.fileName}:${line + 1}: Type suppression is forbidden in editor source.`);
    }
    function visit(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword) report(node, "Explicit any is forbidden.");
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isPropertyDeclaration(node) || ts.isBindingElement(node)) && ts.isIdentifier(node.name) && containsAny(checker.getTypeAtLocation(node.name))) {
        report(node, "This declaration contains an inferred any type.");
      }
      if (ts.isNewExpression(node) && containsAny(checker.getTypeAtLocation(node))) report(node, "This constructor contains an inferred any type.");
      if (ts.isFunctionLike(node) && node.body) {
        const signature = checker.getSignatureFromDeclaration(node);
        if (signature && containsAny(checker.getReturnTypeOfSignature(signature))) report(node, "This return value contains an inferred any type.");
      }
      if (ts.isAsExpression(node) && (node.type.kind === ts.SyntaxKind.NeverKeyword || node.type.kind === ts.SyntaxKind.UnknownKeyword || (ts.isAsExpression(node.expression) && node.expression.type.kind === ts.SyntaxKind.UnknownKeyword))) {
        report(node, "An unknown assertion cannot bypass a source contract.");
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = ts.readConfigFile(resolve(root, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(ts.formatDiagnostics(parsed.errors, ts.createCompilerHost(parsed.options)));
  checkTypePolicy(ts.createProgram(parsed.fileNames, parsed.options));
  console.log("Editor source has no explicit or inferred any types and no type suppressions.");
}
