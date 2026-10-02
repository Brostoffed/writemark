

export function splitTableRow(line) {
  let row = String(line ?? "").trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  const cells = [];
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

export function isTableDelimiter(line) {
  const t = String(line ?? "").trim();
  if (!t.includes("|")) return false;
  const cells = splitTableRow(t);
  return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
}

export function isLikelyTableRow(line) {
  const t = String(line ?? "").trim();
  return t.includes("|") && splitTableRow(t).length >= 2;
}

export function parseTableLineRanges(line, absoluteStart) {
  const raw = String(line ?? "");
  const cells = [];
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
      while (from < to && raw[from] === " ") from += 1;
      while (to > from && raw[to - 1] === " ") to -= 1;
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

export function tableAlignmentFromDelimiter(cellText) {
  const value = String(cellText ?? "").trim();
  const left = value.startsWith(":");
  const right = value.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
}

export function tableAlignmentStyle(alignment) {
  return alignment ? ` style="text-align:${alignment}"` : "";
}

export function unescapeTableCellText(cellText) {
  return String(cellText ?? "").replace(/\\([\\|])/g, "$1");
}
