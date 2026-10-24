import { requireItem } from "../core/collections.ts";
import type { MarkdownOptions, MarkdownBlock, LineInfo, TableLine } from "../types.ts";
import { getLines, normalizeLineEndings } from "../core/text.ts";
import { getFenceInfo, isFenceCloseLine, isHorizontalRule, parseBlockquote, parseHeading, parseListItem, parseSetextHeadingLevel, usesGfm } from "./block-syntax.ts";
import { isLikelyTableRow, isTableDelimiter, parseTableLineRanges } from "./tables.ts";

export function headingSlug(value: string) {
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

export function assignHeadingIds(blocks: MarkdownBlock[]) {
  const used = new Set<string>();
  const nextSuffix = new Map<string, number>();
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

export function parseBlocks(markdown: string, opts: MarkdownOptions = {}): MarkdownBlock[] {
  const source = normalizeLineEndings(markdown);
  const lines = getLines(source);
  const blocks: MarkdownBlock[] = [];
  const gfm = usesGfm(opts);
  for (let i = 0; i < lines.length; i += 1) {
    const line = requireItem(lines, i);
    const fenceInfo = getFenceInfo(line.text);
    if (fenceInfo && (line.newlineEnd > line.end || i + 1 < lines.length)) {
      const codeLines: (LineInfo & { newlineEnd: number })[] = [];
      let j = i + 1;
      while (j < lines.length && !isFenceCloseLine(requireItem(lines, j).text, fenceInfo)) { codeLines.push(requireItem(lines, j)); j += 1; }
      const closing = j < lines.length ? requireItem(lines, j) : null;
      blocks.push({ type: "code-fence", from: line.start, to: (closing ?? codeLines.at(-1) ?? line).end, newlineEnd: (closing ?? codeLines.at(-1) ?? line).newlineEnd, opening: line, closing, codeLines, language: fenceInfo.language, fence: fenceInfo });
      i = closing ? j : j - 1;
      continue;
    }
    if (gfm && i + 1 < lines.length && isLikelyTableRow(line.text) && isTableDelimiter(requireItem(lines, i + 1).text)) {
      const header = { ...requireItem(lines, i), cells: parseTableLineRanges(requireItem(lines, i).text, requireItem(lines, i).start) };
      const delimiter = { ...requireItem(lines, i + 1), cells: parseTableLineRanges(requireItem(lines, i + 1).text, requireItem(lines, i + 1).start) };
      const rows: TableLine[] = [];
      let j = i + 2;
      while (j < lines.length && requireItem(lines, j).text.trim() && isLikelyTableRow(requireItem(lines, j).text)) {
        rows.push({ ...requireItem(lines, j), cells: parseTableLineRanges(requireItem(lines, j).text, requireItem(lines, j).start) });
        j += 1;
      }
      blocks.push({ type: "table", from: line.start, to: (rows.at(-1) ?? delimiter).end, newlineEnd: (rows.at(-1) ?? delimiter).newlineEnd, header, delimiter, rows });
      i = j - 1;
      continue;
    }
    const setextLevel = i + 1 < lines.length ? parseSetextHeadingLevel(requireItem(lines, i + 1).text) : null;
    const canSetext = setextLevel
      && line.text.trim()
      && !parseHeading(line.text)
      && !parseListItem(line.text, opts)
      && !parseBlockquote(line.text)
      && !isHorizontalRule(line.text);
    if (canSetext) {
      blocks.push({ type: "heading", from: line.start, to: requireItem(lines, i + 1).end, newlineEnd: requireItem(lines, i + 1).newlineEnd, line, heading: { indent: "", level: setextLevel, markerText: requireItem(lines, i + 1).text, content: line.text.trim(), contentStart: 0 }, setext: requireItem(lines, i + 1) });
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
