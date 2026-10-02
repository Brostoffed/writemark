

export function now() { return Date.now(); }

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function normalizeLineEndings(value) { return String(value ?? "").replace(/\r\n?/g, "\n"); }

export function literalSearchPattern(query, caseSensitive = false, global = false) {
  const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, `${global ? "g" : ""}${caseSensitive ? "" : "i"}u`);
}

export function graphemeBoundaries(value) {
  const text = String(value ?? "");
  if (typeof globalThis.Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(text)].map(part => part.index).concat(text.length);
  }
  const boundaries = [0];
  let offset = 0;
  for (const character of text) {
    offset += character.length;
    boundaries.push(offset);
  }
  return boundaries;
}

export function graphemeWindowStart(text, offset) {
  const stable = /^(?:[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{N}\p{P}]|\p{Extended_Pictographic})$/u;
  const previous = index => {
    if (index <= 0) return null;
    let start = index - 1;
    if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start]) && /[\uD800-\uDBFF]/.test(text[start - 1])) start -= 1;
    return { start, char: text.slice(start, index) };
  };
  // Adjacent stable characters have a boundary between them.
  // A long joined cluster has no such boundary, so use the source start.
  for (let index = offset; index > 0;) {
    const current = previous(index);
    const before = previous(current.start);
    if (before && stable.test(current.char) && stable.test(before.char)) return current.start;
    index = current.start;
  }
  return 0;
}

export function previousGraphemeOffset(value, offset) {
  const text = String(value ?? "");
  const safe = clamp(offset, 0, text.length);
  const start = graphemeWindowStart(text, safe);
  return start + (graphemeBoundaries(text.slice(start, safe))
    .filter(boundary => boundary < safe - start).at(-1) ?? 0);
}

export function nextGraphemeOffset(value, offset) {
  const text = String(value ?? "");
  const safe = clamp(offset, 0, text.length);
  const start = graphemeWindowStart(text, safe);
  let radius = 64;
  while (true) {
    let end = Math.min(text.length, safe + radius);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end += 1;
    const next = graphemeBoundaries(text.slice(start, end))
      .find(boundary => boundary > safe - start) ?? end - start;
    if (next < end - start || end === text.length) return start + next;
    radius *= 2;
  }
}

export function parseLengthConstraint(value) {
  if (value == null || !/^\d+$/.test(String(value).trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647 ? parsed : null;
}

export function getLines(value) {
  const source = normalizeLineEndings(value);
  const lines = [];
  let start = 0;
  for (let i = 0; i <= source.length; i += 1) {
    if (i === source.length || source[i] === "\n") {
      lines.push({ index: lines.length, start, end: i, text: source.slice(start, i), newlineEnd: i < source.length ? i + 1 : i });
      start = i + 1;
    }
  }
  if (source.length === 0) lines.length = 0;
  return lines;
}

export function getLineRange(value, offset) {
  const source = normalizeLineEndings(value);
  const safe = clamp(offset, 0, source.length);
  const before = source.lastIndexOf("\n", Math.max(0, safe - 1));
  const start = before === -1 ? 0 : before + 1;
  const after = source.indexOf("\n", safe);
  const end = after === -1 ? source.length : after;
  return { start, end, text: source.slice(start, end) };
}
