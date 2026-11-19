import { isEscapablePunctuation, parseCodeSpanAt } from "./inline.ts";
import { diffTextChange } from "../core/transactions.ts";



export function splitTableRow(line: string) {
  let row = String(line ?? "").trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of row) {
    if (escaped) { current += char; escaped = false; continue; }
    if (char === "\\") { current += char; escaped = true; continue; }
    if (char === "|") { cells.push(current.trim()); current = ""; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function hasTablePipe(text: string) {
  let escaped = false;
  for (const character of text) {
    if (escaped) { escaped = false; continue; }
    if (character === "\\") { escaped = true; continue; }
    if (character === "|") return true;
  }
  return false;
}

export function isTableDelimiter(line: string) {
  const t = String(line ?? "").trim();
  if (!hasTablePipe(t)) return false;
  const cells = splitTableRow(t);
  return cells.length >= 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
}

export function isLikelyTableRow(line: string) {
  const t = String(line ?? "").trim();
  return hasTablePipe(t) && splitTableRow(t).length >= 1;
}

export function parseTableLineRanges(line: string, absoluteStart: number, preserveWhitespace = false) {
  const raw = String(line ?? "");
  const cells: { text: string; from: number; to: number }[] = [];
  let start = 0;
  let end = raw.length;
  if (raw[start] === "|") start += 1;
  if (raw[end - 1] === "|") end -= 1;
  let cellStart = start;
  let escaped = false;
  for (let i = start; i <= end; i += 1) {
    const atEnd = i === end;
    const ch = raw[i];
    if (!atEnd && escaped) { escaped = false; continue; }
    if (!atEnd && ch === "\\") { escaped = true; continue; }
    if (atEnd || ch === "|") {
      const rawCellStart = cellStart;
      const rawCellEnd = i;
      let from = cellStart;
      let to = i;
      // Live cells keep spaces beyond the single padding space used by the serializer.
      // Preview cells follow GFM and remove all boundary spaces.
      while (from < to && raw[from] === " ") {
        from += 1;
        if (preserveWhitespace) break;
      }
      while (to > from && raw[to - 1] === " ") {
        to -= 1;
        if (preserveWhitespace) break;
      }
      if (from === to && rawCellEnd > rawCellStart && raw[rawCellStart] === " ") {
        from = Math.min(rawCellStart + 1, rawCellEnd);
        to = from;
      }
      cells.push({ text: raw.slice(from, to), from: absoluteStart + from, to: absoluteStart + to });
      cellStart = i + 1;
    }
  }
  return cells;
}

export function tableAlignmentFromDelimiter(cellText: string) {
  const value = String(cellText ?? "").trim();
  const left = value.startsWith(":");
  const right = value.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
}

export function tableAlignmentStyle(alignment: string) {
  return alignment ? ` style="text-align:${alignment}"` : "";
}

export function unescapeTableCellText(cellText: string) {
  return String(cellText ?? "").replace(/\\([\\|])/g, "$1");
}

export function escapeTableCellText(cellText: string) {
  return String(cellText ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

/** Map visible table text to exact canonical UTF-16 boundaries. */
export function tableCellDisplayMap(raw: string) {
  let inline = "";
  const tableOffsets = [0];
  for (let index = 0; index < raw.length;) {
    if (raw[index] === "\\" && (raw[index + 1] === "\\" || raw[index + 1] === "|")) {
      inline += raw[index + 1];
      index += 2;
    } else { inline += raw[index]; index += 1; }
    tableOffsets.push(index);
  }
  let text = "";
  const sourceOffsets = [0];
  for (let index = 0; index < inline.length;) {
    const code = inline[index] === "`" ? parseCodeSpanAt(inline, index) : null;
    if (code) {
      while (index < code.to) { text += inline[index]; index += 1; sourceOffsets.push(tableOffsets[index] ?? raw.length); }
    } else if (inline[index] === "\\" && isEscapablePunctuation(inline[index + 1])) {
      text += inline[index + 1];
      index += 2;
      sourceOffsets.push(tableOffsets[index] ?? raw.length);
    } else {
      text += inline[index];
      index += 1;
      sourceOffsets.push(tableOffsets[index] ?? raw.length);
    }
  }
  return { text, sourceOffsets };
}

/** Keep unchanged cell bytes when a native edit changes visible text. */
export function editTableCellDisplay(raw: string, nextText: string, displayCursor: number) {
  const before = tableCellDisplayMap(raw);
  const change = diffTextChange(before.text, nextText)[0];
  let text = raw;
  if (change) {
    const from = before.sourceOffsets[change.from] ?? raw.length;
    const to = before.sourceOffsets[change.to] ?? raw.length;
    text = raw.slice(0, from) + escapeTableCellText(change.insert) + raw.slice(to);
  }
  const after = tableCellDisplayMap(text);
  const cursor = after.sourceOffsets[Math.max(0, Math.min(after.text.length, displayCursor))] ?? text.length;
  return { text, cursor };
}
