import { getLines, normalizeLineEndings } from "../core/text.js";
import { getFenceInfo, isFenceCloseLine } from "./block-syntax.js";
import { isBackslashEscaped, matchingBrackets, parseCodeSpanAt, parseInlineLinkAt, parseReferenceLinkAt } from "./inline.js";
import { extractReferenceDefinitions, parseReferenceDefinition } from "./references.js";

export function normalizeTagKey(value) {
  return String(value ?? "").normalize("NFC").toLowerCase();
}

export function isTagBodyCharacter(char) {
  return Boolean(char) && /[\p{L}\p{M}\p{N}_-]/u.test(char);
}

export function isValidTagValue(value) {
  const tag = String(value ?? "");
  if (!tag || tag.startsWith("/") || tag.endsWith("/") || tag.includes("//")) return false;
  if (!tag.split("/").every(segment => segment && [...segment].every(isTagBodyCharacter))) return false;
  return /[\p{L}\p{M}_-]/u.test(tag);
}

export function isTagBoundary(source, index) {
  if (index === 0) return true;
  const before = source[index - 1];
  if (!/\s|[\p{P}\p{S}]/u.test(before) || before === "#" || before === "/") return false;
  const tokenStart = Math.max(
    source.lastIndexOf(" ", index - 1),
    source.lastIndexOf("\n", index - 1),
    source.lastIndexOf("\t", index - 1)
  ) + 1;
  const prefix = source.slice(tokenStart, index);
  return !/(?:^|[([{<])(?:[a-z][a-z\d+.-]*:\/\/|www\.)/i.test(prefix);
}

export function parseTagAt(source, index) {
  const text = String(source ?? "");
  if (text[index] !== "#" || isBackslashEscaped(text, index) || !isTagBoundary(text, index)) return null;
  const match = /^([\p{L}\p{M}\p{N}_-]+(?:\/[\p{L}\p{M}\p{N}_-]+)*)/u.exec(text.slice(index + 1));
  const value = match?.[1] || "";
  if (!isValidTagValue(value) || text[index + 1 + value.length] === "/") return null;
  const cursor = index + 1 + value.length;
  return { value, key: normalizeTagKey(value), from: index, to: cursor };
}

export function cloneTags(tags) {
  return (tags || []).map(tag => ({
    value: tag.value,
    key: tag.key,
    count: tag.count,
    ranges: tag.ranges.map(range => ({ from: range.from, to: range.to })),
  }));
}

export function parseTags(markdown, opts = {}) {
  const source = normalizeLineEndings(markdown);
  const references = extractReferenceDefinitions(source).references;
  const lines = getLines(source);
  const excluded = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = getFenceInfo(line.text);
    if (fence && (line.newlineEnd > line.end || i + 1 < lines.length)) {
      let closingIndex = i + 1;
      while (closingIndex < lines.length && !isFenceCloseLine(lines[closingIndex].text, fence)) closingIndex += 1;
      const last = lines[closingIndex] || lines.at(-1) || line;
      excluded.push({ from: line.start, to: last.newlineEnd });
      i = closingIndex < lines.length ? closingIndex : lines.length - 1;
      continue;
    }
    if (parseReferenceDefinition(line.text)) excluded.push({ from: line.start, to: line.newlineEnd });
  }
  excluded.sort((a, b) => a.from - b.from);
  const found = [];
  const scan = (text, offset = 0) => {
    let excludedIndex = 0;
    const brackets = matchingBrackets(text);
    for (let i = 0; i < text.length; i += 1) {
      const absolute = offset + i;
      while (excludedIndex < excluded.length && excluded[excludedIndex].to <= absolute) excludedIndex += 1;
      const blocked = excluded[excludedIndex];
      if (offset === 0 && blocked && blocked.from <= absolute && absolute < blocked.to) {
        i = blocked.to - 1;
        continue;
      }
      if (text[i] === "`") {
        const code = parseCodeSpanAt(text, i);
        if (code) { i = code.to - 1; continue; }
      }
      const link = parseInlineLinkAt(text, i, brackets) || parseReferenceLinkAt(text, references, i, brackets);
      if (link) {
        scan(link.label, absolute + (link.labelStart - link.from));
        i = link.to - 1;
        continue;
      }
      const tag = parseTagAt(text, i);
      if (!tag) continue;
      found.push({ ...tag, from: absolute, to: offset + tag.to });
      i = tag.to - 1;
    }
  };
  scan(source);
  const indexed = new Map();
  for (const tag of found) {
    const current = indexed.get(tag.key);
    if (current) {
      current.count += 1;
      current.ranges.push({ from: tag.from, to: tag.to });
    } else {
      indexed.set(tag.key, {
        value: tag.value,
        key: tag.key,
        count: 1,
        ranges: [{ from: tag.from, to: tag.to }],
      });
    }
  }
  return [...indexed.values()];
}
