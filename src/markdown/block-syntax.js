import { getLineRange, getLines, normalizeLineEndings } from "../core/text.js";
import { isLikelyTableRow } from "./tables.js";

export function getSelectedLineRanges(value, selectionStart, selectionEnd, opts = {}) {
  const startLine = getLineRange(value, selectionStart);
  const endProbe = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
  const endLine = getLineRange(value, endProbe);
  const out = [];
  let cursor = startLine.start;
  while (cursor <= endLine.start) {
    const line = getLineRange(value, cursor);
    out.push(makeLineInfo(line.start, line.end, line.text, opts));
    if (line.end >= value.length) break;
    cursor = line.end + 1;
  }
  return out;
}

export function makeLineInfo(start, end, text, opts = {}) {
  const indent = (/^(\s*)/.exec(text) || ["", ""])[1];
  const list = parseListItem(text, opts);
  const contentStart = list ? start + list.contentStart : start + indent.length;
  return { start, end, text, indent, marker: list?.markerText ?? null, contentStart };
}

export function usesGfm(opts = {}) { return opts.gfm ?? opts.markdownFlavor !== "commonmark"; }

export function parseListItem(line, opts = {}) {
  if (usesGfm(opts)) {
    const task = /^(\s*)([-+*])(\s+)\[( |x|X)\](\s+)(.*)$/.exec(line);
    if (task) {
      const markerText = `${task[2]}${task[3]}[${task[4]}]${task[5]}`;
      return { kind: "task-list-item", listType: "ul", indent: task[1], marker: task[2], markerText, checked: task[4].toLowerCase() === "x", content: task[6], contentStart: task[1].length + markerText.length, fullMarkerStart: task[1].length, fullMarkerEnd: task[1].length + markerText.length };
    }
  }
  const ordered = /^(\s*)(\d+)([.)])(\s+)(.*)$/.exec(line);
  if (ordered) {
    const markerText = `${ordered[2]}${ordered[3]}${ordered[4]}`;
    return { kind: "ordered-list-item", listType: "ol", indent: ordered[1], marker: ordered[2], number: Number(ordered[2]), delimiter: ordered[3], markerText, content: ordered[5], contentStart: ordered[1].length + markerText.length, fullMarkerStart: ordered[1].length, fullMarkerEnd: ordered[1].length + markerText.length };
  }
  const bullet = /^(\s*)([-+*])(\s+)(.*)$/.exec(line);
  if (bullet) {
    const markerText = `${bullet[2]}${bullet[3]}`;
    return { kind: "bullet-list-item", listType: "ul", indent: bullet[1], marker: bullet[2], markerText, content: bullet[4], contentStart: bullet[1].length + markerText.length, fullMarkerStart: bullet[1].length, fullMarkerEnd: bullet[1].length + markerText.length };
  }
  return null;
}

export function parseHeading(line) {
  const m = /^(\s{0,3})(#{1,6})([ \t]+)(.*)$/.exec(line);
  if (!m) return null;
  let content = m[4];
  if (/^#+[ \t]*$/.test(content)) content = "";
  else {
    const closing = /^(.*?)[ \t]+#+[ \t]*$/.exec(content);
    content = closing ? closing[1] : content.replace(/[ \t]+$/, "");
  }
  const separator = m[3];
  return {
    indent: m[1],
    level: m[2].length,
    markerText: `${m[2]}${separator}`,
    content,
    contentStart: m[1].length + m[2].length + separator.length,
  };
}

export function parseBlockquote(line) {
  const m = /^(\s*>\s?)(.*)$/.exec(line);
  if (!m) return null;
  let depth = 1;
  let fullContentStart = m[1].length;
  let nestedContent = m[2];
  while (true) {
    const nested = /^(\s*>\s?)(.*)$/.exec(nestedContent);
    if (!nested) break;
    depth += 1;
    fullContentStart += nested[1].length;
    nestedContent = nested[2];
  }
  return {
    markerText: m[1],
    content: m[2],
    contentStart: m[1].length,
    depth,
    fullContentStart,
  };
}

export function isHorizontalRule(line) { const t = line.trim(); return /^([-*_])(?:\s*\1){2,}\s*$/.test(t); }

export function getFenceInfo(line) {
  const m = /^(\s{0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
  if (!m) return null;
  const marker = m[2][0];
  const info = m[3].trim();
  if (marker === "`" && info.includes("`")) return null;
  return { marker, length: m[2].length, sequence: m[2], info, language: info.split(/[ \t]+/, 1)[0] || "" };
}

export function isFenceLine(line) { return Boolean(getFenceInfo(line)); }

export function isFenceCloseLine(line, opener) {
  const info = getFenceInfo(line);
  return Boolean(info && opener && info.marker === opener.marker && info.length >= opener.length && info.language === "");
}

export function isFenceOpenerLine(line) { return Boolean(getFenceInfo(line)); }

export function parseSetextHeadingLevel(line) {
  const m = /^\s{0,3}(=+|-+)\s*$/.exec(line);
  if (!m) return null;
  return m[1][0] === "=" ? 1 : 2;
}

export function isInsideInlineCode(lineBeforeCursor) { return ((lineBeforeCursor.match(/(?<!\\)`/g) || []).length % 2) === 1; }

export function classifyLine(value, offset, lineInfo, opts = {}) {
  if (isInsideFence(value, offset)) return { kind: "fenced-code" };
  const list = parseListItem(lineInfo.text, opts); if (list) return { kind: list.kind, list };
  const heading = parseHeading(lineInfo.text); if (heading) return { kind: "heading", heading };
  const quote = parseBlockquote(lineInfo.text); if (quote) return { kind: "blockquote", blockquote: quote };
  if (isHorizontalRule(lineInfo.text)) return { kind: "horizontal-rule" };
  if (usesGfm(opts) && isLikelyTableRow(lineInfo.text)) return { kind: "table" };
  return { kind: "paragraph" };
}

export function isInsideFence(value, offset) {
  const source = normalizeLineEndings(value);
  const lines = getLines(source);
  let opener = null;
  for (const line of lines) {
    if (line.start >= offset) break;
    if (!opener) {
      const info = getFenceInfo(line.text);
      if (!info) continue;
      if (offset <= line.end) break;
      opener = info;
      continue;
    }
    if (isFenceCloseLine(line.text, opener)) {
      if (offset <= line.end) break;
      opener = null;
    }
  }
  return Boolean(opener);
}

export function hasClosingFenceAfter(value, lineEnd, opener) {
  const rest = normalizeLineEndings(value).slice(lineEnd + 1);
  return getLines(rest).some(line => isFenceCloseLine(line.text, opener));
}
