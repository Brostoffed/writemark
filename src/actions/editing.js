import { fail, insertionTransaction, ok, removePrefixFromLine, tx } from "../core/transactions.js";
import { parseListItem } from "../markdown/block-syntax.js";

export function deleteSelectionResult(ctx, actionId = "editor.deleteSelection") {
    const start = Math.min(ctx.selectionStart, ctx.selectionEnd);
    const end = Math.max(ctx.selectionStart, ctx.selectionEnd);
    if (start === end) return fail("not-applicable");
    return ok(tx(ctx, actionId, [{ from: start, to: end, insert: "" }], { start, end: start, direction: "none" }, "delete"), "Deleted selection.");
  }

export function markdownShortcut(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd || ctx.inline.insideInlineCode || ctx.block.kind === "fenced-code") return fail("not-applicable");
    const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start);
    const after = ctx.currentLine.text.slice(ctx.selectionStart - ctx.currentLine.start);
    if (after.trim()) return fail("not-applicable");
    const task = /^(\s*)(\[\]|\[ \]|\[x\]|\[X\])$/.exec(before);
    if (task) {
      const checked = /x/i.test(task[2]) ? "x" : " ";
      const insert = `${task[1]}- [${checked}] `;
      const cursor = ctx.currentLine.start + insert.length;
      return ok(tx(ctx, "editor.markdownShortcut", [{ from: ctx.currentLine.start, to: ctx.selectionStart, insert }], { start: cursor, end: cursor, direction: "none" }, "markdownShortcut"), "Task list.");
    }
    const heading = /^(\s*)(#{1,6})$/.exec(before);
    if (heading) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    const bullet = /^(\s*)[-+*]$/.exec(before);
    if (bullet) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    const ordered = /^(\s*)\d+[.)]$/.exec(before);
    if (ordered) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    const quote = /^(\s*)>$/.exec(before);
    if (quote) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    return fail("not-applicable");
  }

export function smartDelete(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return deleteSelectionResult(ctx, "editor.smartDelete");
    const lineOffset = ctx.selectionStart - ctx.currentLine.start;
    if (lineOffset === ctx.currentLine.text.length && ctx.currentLine.end < ctx.value.length && ctx.value[ctx.currentLine.end] === "\n") {
      return ok(tx(ctx, "editor.smartDelete", [{ from: ctx.currentLine.end, to: ctx.currentLine.end + 1, insert: "" }], { start: ctx.currentLine.end, end: ctx.currentLine.end, direction: "none" }, "smartDelete"), "Joined line.");
    }
    return fail("not-applicable");
  }

export function smartBackspace(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return deleteSelectionResult(ctx, "editor.smartBackspace"); const lineOffset = ctx.selectionStart - ctx.currentLine.start; const list = ctx.block.list;
    if (list) { if (list.content.trim() === "" && lineOffset >= list.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", list.contentStart, "Exited list."); if (lineOffset === list.contentStart) { const from = ctx.currentLine.start + list.fullMarkerStart; const to = ctx.currentLine.start + list.fullMarkerEnd; return ok(tx(ctx, "editor.smartBackspace", [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, "smartBackspace"), "Removed list marker."); } }
    const heading = ctx.block.heading; if (heading && lineOffset === heading.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", heading.contentStart, "Converted to paragraph.");
    const quote = ctx.block.blockquote; if (quote && lineOffset === quote.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", quote.contentStart, "Exited blockquote.");
    if (lineOffset === 0 && ctx.currentLine.start > 0 && ctx.value[ctx.currentLine.start - 1] === "\n") { const joinAt = ctx.currentLine.start - 1; return ok(tx(ctx, "editor.smartBackspace", [{ from: joinAt, to: ctx.currentLine.start, insert: "" }], { start: joinAt, end: joinAt, direction: "none" }, "smartBackspace"), "Joined line."); }
    if (lineOffset > 0 && /^\s+$/.test(ctx.currentLine.text.slice(0, lineOffset))) { const amount = lineOutdentAmount(ctx.currentLine.text.slice(0, lineOffset)); if (amount > 0) { const from = ctx.selectionStart - amount; return ok(tx(ctx, "editor.smartBackspace", [{ from, to: ctx.selectionStart, insert: "" }], { start: from, end: from, direction: "none" }, "smartBackspace")); } }
    return fail("not-applicable");
  }

export function smartOutdent(ctx) { const any = ctx.selectedLines.some(line => lineOutdentAmount(line.text, ctx.config.indentString) > 0); if (any) return outdentLines(ctx); return fail("not-applicable"); }

export function lineOutdentAmount(text, indentString = "  ") { if (text.startsWith("\t")) return 1; const indent = (text.match(/^ +/) || [""])[0].length; if (indent >= indentString.length && indentString !== "\t") return indentString.length; if (indent >= 4) return 4; if (indent >= 2) return 2; if (indent >= 1) return 1; return 0; }

export function indentLines(ctx, indent) { const changes = []; let ds = 0; let de = 0; for (const line of ctx.selectedLines) { if (!parseListItem(line.text, ctx.config) && ctx.block.kind !== "fenced-code") continue; changes.push({ from: line.start, to: line.start, insert: indent }); if (line.start < ctx.selectionStart) ds += indent.length; if (line.start < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += indent.length; } if (!changes.length) return fail("not-applicable"); return ok(tx(ctx, "editor.smartTab", changes, { start: ctx.selectionStart + ds, end: ctx.selectionEnd + de, direction: ctx.selectionDirection || "none" }, "indent"), "Indented."); }

export function outdentLines(ctx) { const changes = []; let ds = 0; let de = 0; for (const line of ctx.selectedLines) { const amount = lineOutdentAmount(line.text, ctx.config.indentString); if (amount <= 0) continue; changes.push({ from: line.start, to: line.start + amount, insert: "" }); if (line.start < ctx.selectionStart) ds -= amount; if (line.start < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de -= amount; } if (!changes.length) return fail("not-applicable"); const base = ctx.selectedLines[0]?.start ?? 0; return ok(tx(ctx, "editor.smartOutdent", changes, { start: Math.max(base, ctx.selectionStart + ds), end: Math.max(base, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "outdent"), "Outdented."); }
