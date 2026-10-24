import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { checkTypePolicy } from "../../scripts/check-type-policy.mjs";

const options = { strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true, noFallthroughCasesInSwitch: true, isolatedModules: true, verbatimModuleSyntax: true, noEmit: true, types: [], target: ts.ScriptTarget.ES2022 };

test("source policy rejects explicit types, inferred types, suppressions, and assertion bypasses", async () => {
  const directory = await mkdtemp(join(tmpdir(), "writemark-policy-"));
  const file = join(directory, "source.ts");
  try {
    for (const source of [
      "export const value: any = 1;",
      "export const value = JSON.parse('{}');",
      "export const value = { nested: JSON.parse('{}') };",
      "export const value = new Map();",
      "export class Value { map: Map<string, string>; constructor() { this.map = new Map(); } }",
      "export const value = 1 as never;",
      "// @ts-ignore\nexport const value: number = 'bad';",
      "// @ts-nocheck\nexport const value: number = 'bad';",
      "// @ts-expect-error\nexport const value: number = 'bad';",
      "export const value = 1 as unknown as string;",
    ]) {
      await writeFile(file, source);
      const program = ts.createProgram([file], options);
      assert.throws(() => checkTypePolicy(program, directory), /any|suppression|assertion/, source);
    }
    await writeFile(file, "export function value(input: unknown): string { return typeof input === 'string' ? input : ''; }");
    assert.doesNotThrow(() => checkTypePolicy(ts.createProgram([file], options), directory));
    assert.throws(() => checkTypePolicy(ts.createProgram([file], { ...options, strict: false }), directory), /requires strict/);
    assert.throws(() => checkTypePolicy(ts.createProgram([file], { ...options, noImplicitAny: false }), directory), /disabling noImplicitAny/);
    await writeFile(join(directory, "orphan.js"), "export const value = 1;");
    assert.throws(() => checkTypePolicy(ts.createProgram([file], options), directory), /must use TypeScript/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
