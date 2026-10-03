

export const ESCAPABLE_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

export function isEscapablePunctuation(char) { return Boolean(char) && ESCAPABLE_PUNCTUATION.includes(char); }

export function placeholderPrefix(source) {
  let longestRun = 0;
  for (const match of String(source ?? "").matchAll(/\uE000+/g)) longestRun = Math.max(longestRun, match[0].length);
  return "\uE000".repeat(longestRun + 1);
}

export function isBackslashEscaped(source, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && source[i] === "\\"; i -= 1) slashes += 1;
  return slashes % 2 === 1;
}

export function matchingBrackets(source) {
  const matches = new Int32Array(source.length).fill(-1);
  const openers = [];
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === "[") openers.push(i);
    else if (char === "]" && openers.length) matches[openers.pop()] = i;
  }
  return matches;
}

export function parseCodeSpanAt(source, index) {
  if (source[index] !== "`" || source[index - 1] === "`" || isBackslashEscaped(source, index)) return null;
  let markerLength = 1;
  while (source[index + markerLength] === "`") markerLength += 1;
  let cursor = index + markerLength;
  while (cursor < source.length) {
    if (source[cursor] !== "`") { cursor += 1; continue; }
    let closingLength = 1;
    while (source[cursor + closingLength] === "`") closingLength += 1;
    if (closingLength === markerLength) {
      return {
        from: index,
        to: cursor + closingLength,
        marker: source.slice(index, index + markerLength),
        content: source.slice(index + markerLength, cursor),
        contentStart: index + markerLength,
        contentEnd: cursor,
      };
    }
    cursor += closingLength;
  }
  return null;
}

export function normalizeCodeSpanContent(content) {
  let value = String(content ?? "").replace(/\n/g, " ");
  if (/^\s[\s\S]*\s$/.test(value) && /\S/.test(value)) value = value.slice(1, -1);
  return value;
}

export function codeSpanMarkdown(content) {
  const value = String(content ?? "");
  let longestRun = 0;
  for (const match of value.matchAll(/`+/g)) longestRun = Math.max(longestRun, match[0].length);
  const marker = "`".repeat(longestRun + 1);
  const padded = value && (value.startsWith("`") || value.endsWith("`") || (value.startsWith(" ") && value.endsWith(" ")))
    ? ` ${value} ` : value;
  return `${marker}${padded}${marker}`;
}

export function splitLinkDestinationAndTitle(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return { url: "", title: "" };
  const angle = /^<([^<>\n]*)>(?:\s+(["'])(.*?)\2)?\s*$/.exec(value);
  if (angle) return { url: angle[1], title: angle[3] || "" };
  const quoted = /^(.*?)\s+(["'])(.*?)\2\s*$/.exec(value);
  if (quoted && quoted[1].trim()) return { url: quoted[1].trim(), title: quoted[3] };
  return { url: value, title: "" };
}

export function parseInlineLinkAt(text, start = 0, brackets = null) {
  const source = String(text ?? "");
  if (isBackslashEscaped(source, start)) return null;
  const bang = source[start] === "!" ? "!" : "";
  let i = start + bang.length;
  if (source[i] !== "[" || isBackslashEscaped(source, i)) return null;
  let escaped = false;
  let labelEnd = brackets ? brackets[i] : -1;
  if (!brackets) {
    let labelDepth = 1;
    for (let j = i + 1; j < source.length; j += 1) {
      const ch = source[j];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === "[") { labelDepth += 1; continue; }
      if (ch === "]") {
        labelDepth -= 1;
        if (labelDepth === 0) { labelEnd = j; break; }
      }
    }
  }
  if (labelEnd === -1 || source[labelEnd + 1] !== "(") return null;
  const label = source.slice(i + 1, labelEnd);
  const destStart = labelEnd + 2;
  let depth = 0;
  let quote = "";
  let angle = false;
  escaped = false;
  for (let j = destStart; j < source.length; j += 1) {
    const ch = source[j];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === "<" && j === destStart) { angle = true; continue; }
    if (angle) { if (ch === ">") angle = false; continue; }
    if (quote) {
      if (ch === quote) quote = "";
      continue;
    }
    if ((ch === "\"" || ch === "'") && depth === 0 && /\s/.test(source[j - 1] || "")) { quote = ch; continue; }
    if (ch === "(") { depth += 1; continue; }
    if (ch === ")") {
      if (depth > 0) { depth -= 1; continue; }
      const destination = splitLinkDestinationAndTitle(source.slice(destStart, j));
      return {
        bang,
        label,
        url: destination.url,
        title: destination.title,
        from: start,
        to: j + 1,
        labelStart: i + 1,
        labelEnd,
        full: source.slice(start, j + 1),
      };
    }
  }
  return null;
}

export function normalizeReferenceLabel(label) {
  return String(label ?? "")
    .replace(/\\([!-/:-@[-`{-~])/g, "$1")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function parseReferenceLinkAt(text, references, start = 0, brackets = null) {
  if (!(references instanceof Map) || references.size === 0) return null;
  const source = String(text ?? "");
  if (isBackslashEscaped(source, start)) return null;
  const bang = source[start] === "!" ? "!" : "";
  const labelStartMarker = start + bang.length;
  if (source[labelStartMarker] !== "[" || isBackslashEscaped(source, labelStartMarker)) return null;
  let labelEnd = brackets ? brackets[labelStartMarker] : -1;
  if (!brackets) {
    let escaped = false;
    let depth = 1;
    for (let i = labelStartMarker + 1; i < source.length; i += 1) {
      const char = source[i];
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === "[") { depth += 1; continue; }
      if (char !== "]") continue;
      depth -= 1;
      if (depth === 0) { labelEnd = i; break; }
    }
  }
  if (labelEnd === -1 || source[labelEnd + 1] === "(") return null;
  const label = source.slice(labelStartMarker + 1, labelEnd);
  let referenceLabel = label;
  let to = labelEnd + 1;
  if (source[to] === "[") {
    const referenceEnd = source.indexOf("]", to + 1);
    if (referenceEnd === -1 || isBackslashEscaped(source, referenceEnd)) return null;
    referenceLabel = source.slice(to + 1, referenceEnd) || label;
    to = referenceEnd + 1;
  }
  const reference = references.get(normalizeReferenceLabel(referenceLabel));
  if (!reference) return null;
  return {
    bang,
    label,
    url: reference.url,
    title: reference.title,
    from: start,
    to,
    labelStart: labelStartMarker + 1,
    labelEnd,
    full: source.slice(start, to),
  };
}

export function isInlineWhitespace(char) {
  return !char || /\s/u.test(char);
}

export function isInlinePunctuation(char) {
  return Boolean(char) && /[\p{P}\p{S}]/u.test(char);
}

export function emphasisDelimiterRuns(source) {
  const runs = [];
  for (let i = 0; i < source.length; i += 1) {
    const marker = source[i];
    if ((marker !== "*" && marker !== "_") || isBackslashEscaped(source, i)) continue;
    let length = 1;
    while (source[i + length] === marker) length += 1;
    const before = source[i - 1] || "";
    const after = source[i + length] || "";
    const beforeWhitespace = isInlineWhitespace(before);
    const afterWhitespace = isInlineWhitespace(after);
    const beforePunctuation = isInlinePunctuation(before);
    const afterPunctuation = isInlinePunctuation(after);
    const leftFlanking = !afterWhitespace
      && (!afterPunctuation || beforeWhitespace || beforePunctuation);
    const rightFlanking = !beforeWhitespace
      && (!beforePunctuation || afterWhitespace || afterPunctuation);
    const canOpen = marker === "*"
      ? leftFlanking
      : leftFlanking && (!rightFlanking || beforePunctuation);
    const canClose = marker === "*"
      ? rightFlanking
      : rightFlanking && (!leftFlanking || afterPunctuation);
    runs.push({
      start: i,
      length,
      marker,
      canOpen,
      canClose,
      leftUsed: 0,
      rightUsed: 0,
      get remaining() { return this.length - this.leftUsed - this.rightUsed; },
    });
    i += length - 1;
  }
  return runs;
}

export function emphasisPairs(source) {
  const runs = emphasisDelimiterRuns(source);
  const pairs = [];
  const openers = { "*": [], "_": [] };
  for (const closer of runs) {
    if (closer.canClose) {
      while (closer.remaining > 0) {
        const candidates = openers[closer.marker];
        while (candidates.length && candidates.at(-1).remaining <= 0) candidates.pop();
        let opener = null;
        for (let openerIndex = candidates.length - 1; openerIndex >= 0; openerIndex -= 1) {
          const candidate = candidates[openerIndex];
          if (candidate.remaining <= 0) continue;
          const blockedByRuleOfThree = (candidate.canClose || closer.canOpen)
            && (candidate.remaining + closer.remaining) % 3 === 0
            && (candidate.remaining % 3 !== 0 || closer.remaining % 3 !== 0);
          if (blockedByRuleOfThree) continue;
          opener = candidate;
          break;
        }
        if (!opener) break;
        const use = opener.remaining >= 2 && closer.remaining >= 2 ? 2 : 1;
        const openEnd = opener.start + opener.length - opener.rightUsed;
        const openStart = openEnd - use;
        const closeStart = closer.start + closer.leftUsed;
        const closeEnd = closeStart + use;
        opener.rightUsed += use;
        closer.leftUsed += use;
        pairs.push({
          openStart,
          openEnd,
          closeStart,
          closeEnd,
          marker: source.slice(openStart, openEnd),
          tag: use === 2 ? "strong" : "em",
        });
      }
    }
    if (closer.canOpen && closer.remaining > 0) openers[closer.marker].push(closer);
  }
  return pairs;
}

export function collectInlineMarkdownRanges(source) {
  const ranges = [];
  const addMatches = (regex, openLength, closeLength, labelGroup = 1, markerOffsetGroup = null) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      const label = match[labelGroup] ?? "";
      const markerOffset = markerOffsetGroup == null ? 0 : (match[markerOffsetGroup]?.length ?? 0);
      const from = match.index + markerOffset;
      const to = match.index + match[0].length;
      const innerFrom = from + openLength;
      const innerTo = to - closeLength;
      if (isBackslashEscaped(source, from) || isBackslashEscaped(source, to - closeLength)) continue;
      if (innerTo >= innerFrom && label.length >= 0) ranges.push({ from, to, innerFrom, innerTo });
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
    }
  };
  addMatches(/\*\*([^*]+)\*\*/g, 2, 2);
  addMatches(/__([^_]+)__/g, 2, 2);
  addMatches(/~~([^~]+)~~/g, 2, 2);
  addMatches(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, 1, 1, 2, 1);
  addMatches(/(^|[^_])_([^_\n]+)_(?!_)/g, 1, 1, 2, 1);
  for (let i = 0; i < source.length; i += 1) {
    const code = parseCodeSpanAt(source, i);
    if (!code) continue;
    ranges.push({ from: code.from, to: code.to, innerFrom: code.contentStart, innerTo: code.contentEnd });
    i = code.to - 1;
  }
  const brackets = matchingBrackets(source);
  for (let i = 0; i < source.length; i += 1) {
    const link = parseInlineLinkAt(source, i, brackets);
    if (!link) continue;
    ranges.push({ from: link.from, to: link.to, innerFrom: link.labelStart, innerTo: link.labelEnd });
    i = link.to - 1;
  }
  return ranges.sort((a, b) => (a.to - a.from) - (b.to - b.from));
}
