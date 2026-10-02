import { getLines, normalizeLineEndings } from "../core/text.js";
import { getFenceInfo, isFenceCloseLine, isHorizontalRule, parseBlockquote, parseHeading, parseListItem, parseSetextHeadingLevel, usesGfm } from "./block-syntax.js";
import { isLikelyTableRow, isTableDelimiter, parseTableLineRanges } from "./tables.js";

export function headingSlug(value) {
  const text = String(value ?? "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, "$1")
    .replace(/[`*_~]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  return text || "section";
}

export function assignHeadingIds(blocks) {
  const used = new Set();
  const nextSuffix = new Map();
  for (const block of blocks) {
    if (block.type !== "heading" || !block.heading) continue;
    const base = headingSlug(block.heading.content);
    let suffix = nextSuffix.get(base) ?? 0;
    let id = suffix ? `${base}-${suffix}` : base;
    while (used.has(id)) { suffix += 1; id = `${base}-${suffix}`; }
    used.add(id);
    nextSuffix.set(base, suffix + 1);
    block.heading.id = id;
  }
  return blocks;
}

export function parseBlocks(markdown, opts = {}) {
  const source = normalizeLineEndings(markdown);
  const lines = getLines(source);
  const blocks = [];
  const gfm = usesGfm(opts);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceInfo = getFenceInfo(line.text);
    if (fenceInfo && (line.newlineEnd > line.end || i + 1 < lines.length)) {
      const codeLines = [];
      let j = i + 1;
      while (j < lines.length && !isFenceCloseLine(lines[j].text, fenceInfo)) { codeLines.push(lines[j]); j += 1; }
      const closing = j < lines.length ? lines[j] : null;
      blocks.push({ type: "code-fence", from: line.start, to: (closing ?? codeLines.at(-1) ?? line).end, newlineEnd: (closing ?? codeLines.at(-1) ?? line).newlineEnd, opening: line, closing, codeLines, language: fenceInfo.language, fence: fenceInfo });
      i = closing ? j : j - 1;
      continue;
    }
    if (gfm && i + 1 < lines.length && isLikelyTableRow(line.text) && isTableDelimiter(lines[i + 1].text)) {
      const header = { ...lines[i], cells: parseTableLineRanges(lines[i].text, lines[i].start) };
      const delimiter = { ...lines[i + 1], cells: parseTableLineRanges(lines[i + 1].text, lines[i + 1].start) };
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].text.trim() && isLikelyTableRow(lines[j].text)) {
        rows.push({ ...lines[j], cells: parseTableLineRanges(lines[j].text, lines[j].start) });
        j += 1;
      }
      blocks.push({ type: "table", from: line.start, to: (rows.at(-1) ?? delimiter).end, newlineEnd: (rows.at(-1) ?? delimiter).newlineEnd, header, delimiter, rows });
      i = j - 1;
      continue;
    }
    const setextLevel = i + 1 < lines.length ? parseSetextHeadingLevel(lines[i + 1].text) : null;
    const canSetext = setextLevel
      && line.text.trim()
      && !parseHeading(line.text)
      && !parseListItem(line.text, opts)
      && !parseBlockquote(line.text)
      && !isHorizontalRule(line.text);
    if (canSetext) {
      blocks.push({ type: "heading", from: line.start, to: lines[i + 1].end, newlineEnd: lines[i + 1].newlineEnd, line, heading: { indent: "", level: setextLevel, markerText: lines[i + 1].text, content: line.text.trim(), contentStart: 0 }, setext: lines[i + 1] });
      i += 1;
      continue;
    }
    const heading = parseHeading(line.text);
    if (heading) { blocks.push({ type: "heading", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, heading }); continue; }
    const list = parseListItem(line.text, opts);
    if (list) { blocks.push({ type: list.kind, from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, list }); continue; }
    const quote = parseBlockquote(line.text);
    if (quote) { blocks.push({ type: "blockquote", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, quote }); continue; }
    if (isHorizontalRule(line.text)) { blocks.push({ type: "horizontal-rule", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line }); continue; }
    blocks.push({ type: line.text.trim() ? "paragraph" : "blank", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line });
  }
  if (blocks.length === 0) blocks.push({ type: "blank", from: 0, to: 0, newlineEnd: 0, line: { start: 0, end: 0, newlineEnd: 0, text: "" } });
  return assignHeadingIds(blocks);
}
