import { clamp } from "../core/text.js";
import { fail, ok, tx } from "../core/transactions.js";
import { splitTableRow, unescapeTableCellText } from "../markdown/tables.js";

export function serializeTableBlock(headerCells, delimiterCells, rows) {
    const serialize = cells => tableRowSourceParts(cells).text;
    return [serialize(headerCells), serialize(delimiterCells), ...rows.map(serialize)].join("\n");
  }

export function tableCellTexts(line, cols) {
    const cells = splitTableRow(line?.text ?? "");
    return Array.from({ length: cols }, (_, i) => unescapeTableCellText(cells[i] ?? ""));
  }

export function tablePositionForOffset(block, offset) {
    if (!block) return null;
    const safe = clamp(Number(offset) || 0, block.from, block.to);
    const lines = [
      { line: block.header, row: -1 },
      { line: block.delimiter, row: -2 },
      ...block.rows.map((line, row) => ({ line, row })),
    ];
    const match = lines.find(entry => safe >= entry.line.start && safe <= entry.line.end)
      || lines.find(entry => safe >= entry.line.start && safe <= entry.line.newlineEnd)
      || lines.at(-1);
    if (!match) return null;
    const cells = match.line.cells || [];
    let col = cells.findIndex(cell => safe >= cell.from && safe <= cell.to);
    if (col === -1 && cells.length) {
      let bestDistance = Infinity;
      cells.forEach((cell, index) => {
        const distance = safe < cell.from ? cell.from - safe : safe > cell.to ? safe - cell.to : 0;
        if (distance < bestDistance) { bestDistance = distance; col = index; }
      });
    }
    return { row: match.row, col: Math.max(0, col), line: match.line };
  }

export function tableColumnResult(ctx, block, col, mode) {
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    const target = clamp(Number(col) || 0, 0, cols - 1);
    const header = tableCellTexts(block.header, cols);
    const delimiter = tableCellTexts(block.delimiter, cols);
    const rows = block.rows.map(row => tableCellTexts(row, cols));
    if (mode === "delete") {
      if (cols <= 1) return fail("not-applicable", "Cannot delete the only column.");
      for (const list of [header, delimiter, ...rows]) list.splice(target, 1);
    } else {
      const at = target + 1;
      header.splice(at, 0, `Column ${cols + 1}`);
      delimiter.splice(at, 0, "---");
      for (const row of rows) row.splice(at, 0, "");
    }
    const insert = serializeTableBlock(header, delimiter, rows.length ? rows : [Array.from({ length: header.length }, () => "")]);
    const cursor = block.from + insert.split("\n")[0].length;
    return ok(tx(ctx, mode === "delete" ? "table.deleteColumn" : "table.insertColumnAfter", [{ from: block.from, to: block.to, insert }], { start: cursor, end: cursor, direction: "none" }, "table"), mode === "delete" ? "Column deleted." : "Column inserted.");
  }

export function tableDeleteRowResult(ctx, block, row) {
    if (!block.rows.length) return fail("not-applicable");
    const index = clamp(Number(row) || 0, 0, block.rows.length - 1);
    const line = block.rows[index];
    let from = line.start; let to = line.newlineEnd;
    if (to <= line.end && line.start > block.delimiter.end && ctx.value[line.start - 1] === "\n") {
      from = line.start - 1;
      to = line.end;
    } else if (to <= from) {
      to = line.end;
    }
    const cursor = from;
    return ok(tx(ctx, "table.deleteRow", [{ from, to, insert: "" }], { start: cursor, end: cursor, direction: "none" }, "table"), "Row deleted.");
  }

export function tableRowSourceParts(cells) {
    const escaped = cells.map(cell => escapeTableCellText(cell));
    const offsets = [];
    let text = "| ";
    escaped.forEach((cell, index) => {
      offsets[index] = { from: text.length, to: text.length + cell.length };
      text += cell;
      text += index === escaped.length - 1 ? " |" : " | ";
    });
    return { text, offsets };
  }

export function escapeTableCellText(cell) {
    return String(cell ?? "").replace(/\|/g, "\\|");
  }

export function tableBlockSourceWithOffsets(headerCells, delimiterCells, rows) {
    const parts = [
      tableRowSourceParts(headerCells),
      tableRowSourceParts(delimiterCells),
      ...rows.map(row => tableRowSourceParts(row)),
    ];
    const lines = [];
    const lineStarts = [];
    let cursor = 0;
    for (const part of parts) {
      lineStarts.push(cursor);
      lines.push(part.text);
      cursor += part.text.length + 1;
    }
    return { source: lines.join("\n"), parts, lineStarts };
  }

export function tableRowInsertionResult(ctx, block, line, placement = "after-row") {
    if (!block) return fail("not-applicable");
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    const insert = `\n| ${Array.from({ length: cols }, () => "").join(" | ")} |`;
    const insertionLine = placement === "after-delimiter" ? block.delimiter : (line || block.rows.at(-1) || block.delimiter);
    const from = insertionLine.end;
    const cursor = from + 3;
    return ok(tx(ctx, "table.insertRowAfter", [{ from, to: from, insert }], { start: cursor, end: cursor, direction: "none" }, "table"), "Table row inserted.");
  }
