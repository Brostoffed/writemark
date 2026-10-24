import type { ReferenceMap } from "./types.ts";
import { getLines, normalizeLineEndings } from "../core/text.ts";
import { parseBlocks } from "./blocks.ts";
import { normalizeReferenceLabel, splitLinkDestinationAndTitle } from "./inline.ts";

export function parseReferenceDefinition(line: string) {
  const match = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(.+?)\s*$/.exec(String(line ?? ""));
  if (!match) return null;
  const label = normalizeReferenceLabel((match[1] ?? ""));
  if (!label) return null;
  const destination = splitLinkDestinationAndTitle((match[2] ?? ""));
  if (!destination.url) return null;
  return { label, ...destination };
}

export function extractReferenceDefinitions(markdown: string, inherited: ReferenceMap | null = null) {
  const references = new Map(inherited instanceof Map ? inherited : []);
  const source = normalizeLineEndings(markdown);
  const output = source.split("\n");
  const lineIndexes = new Map(getLines(source).map((line, index) => [line.start, index]));
  let paragraphOpen = false;
  for (const block of parseBlocks(source)) {
    if (block.type !== "paragraph") { paragraphOpen = false; continue; }
    const definition = paragraphOpen ? null : parseReferenceDefinition(block.line.text);
    if (!definition) { paragraphOpen = true; continue; }
    if (!references.has(definition.label)) references.set(definition.label, definition);
    const lineIndex = lineIndexes.get(block.line.start);
    if (lineIndex != null) output[lineIndex] = "";
  }
  return { markdown: output.join("\n"), references };
}
