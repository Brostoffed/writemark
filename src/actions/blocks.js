import { clamp } from "../core/text.js";
import { fail, insertionTransaction, ok, tx } from "../core/transactions.js";
import { getFenceInfo, parseBlockquote, parseHeading, parseListItem } from "../markdown/block-syntax.js";
import { codeLanguage } from "../security.js";

export function toggleParagraph(ctx) { const changes = []; for (const line of ctx.selectedLines) { const list = parseListItem(line.text, ctx.config); const heading = parseHeading(line.text); const quote = parseBlockquote(line.text); if (list) changes.push({ from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: "" }); else if (heading) changes.push({ from: line.start, to: line.start + heading.contentStart, insert: heading.indent }); else if (quote) changes.push({ from: line.start, to: line.start + quote.contentStart, insert: "" }); } if (!changes.length) return fail("not-applicable"); const d = changes.reduce((sum, c) => c.from < ctx.selectionStart ? sum + c.insert.length - (c.to - c.from) : sum, 0); return ok(tx(ctx, "block.paragraph", changes, { start: Math.max(0, ctx.selectionStart + d), end: Math.max(0, ctx.selectionEnd + d), direction: ctx.selectionDirection || "none" }, "block"), "Converted to paragraph."); }

export function toggleHeading(ctx, level) { const marker = `${"#".repeat(level)} `; const lines = ctx.selectedLines; const allSame = lines.every(line => { const h = parseHeading(line.text); return h && h.level === level; }); const changes = []; for (const line of lines) { const h = parseHeading(line.text); const list = parseListItem(line.text, ctx.config); const quote = parseBlockquote(line.text); if (allSame && h) changes.push({ from: line.start, to: line.start + h.contentStart, insert: h.indent }); else if (h) changes.push({ from: line.start, to: line.start + h.contentStart, insert: h.indent + marker }); else if (list) changes.push({ from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: marker }); else if (quote) changes.push({ from: line.start, to: line.start + quote.contentStart, insert: marker }); else changes.push({ from: line.start, to: line.start, insert: marker }); } let ds = 0; let de = 0; for (const c of changes) { const diff = c.insert.length - (c.to - c.from); if (c.from < ctx.selectionStart) ds += diff; if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff; } return ok(tx(ctx, `block.heading.${level}`, changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allSame ? "Converted to paragraph." : `Heading level ${level}.`); }

export function toggleList(ctx, type) { const markerFor = i => type === "ordered" ? `${i + 1}. ` : type === "task" ? "- [ ] " : "- "; const lines = ctx.selectedLines; const allList = lines.every(line => parseListItem(line.text, ctx.config)); const changes = []; lines.forEach((line, i) => { const list = parseListItem(line.text, ctx.config); const h = parseHeading(line.text); const quote = parseBlockquote(line.text); let c; if (allList && list) c = { from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: "" }; else if (list) c = { from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: markerFor(i) }; else if (h) c = { from: line.start, to: line.start + h.contentStart, insert: h.indent + markerFor(i) }; else if (quote) c = { from: line.start, to: line.start + quote.contentStart, insert: markerFor(i) }; else { const indent = (line.text.match(/^\s*/) || [""])[0]; c = { from: line.start + indent.length, to: line.start + indent.length, insert: markerFor(i) }; } changes.push(c); }); let ds = 0; let de = 0; for (const c of changes) { const diff = c.insert.length - (c.to - c.from); if (c.from < ctx.selectionStart) ds += diff; if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff; } const id = `block.${type === "bullet" ? "bulletList" : type === "ordered" ? "orderedList" : "taskList"}`; return ok(tx(ctx, id, changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allList ? "Removed list." : type === "ordered" ? "Numbered list." : type === "task" ? "Task list." : "Bullet list."); }

export function toggleTaskDone(ctx) { const list = ctx.block.list; if (!list || list.kind !== "task-list-item") return fail("not-applicable"); const checkboxStart = ctx.currentLine.start + list.indent.length + `${list.marker} [`.length; const next = list.checked ? " " : "x"; return ok(tx(ctx, "block.taskDone", [{ from: checkboxStart, to: checkboxStart + 1, insert: next }], { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection || "none" }, "block"), next === "x" ? "Task checked." : "Task unchecked."); }

export function toggleBlockquote(ctx) { const lines = ctx.selectedLines; const allQuote = lines.every(line => parseBlockquote(line.text)); const changes = lines.map(line => { const quote = parseBlockquote(line.text); return allQuote && quote ? { from: line.start, to: line.start + quote.contentStart, insert: "" } : { from: line.start, to: line.start, insert: "> " }; }); let ds = 0; let de = 0; for (const c of changes) { const diff = c.insert.length - (c.to - c.from); if (c.from < ctx.selectionStart) ds += diff; if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff; } return ok(tx(ctx, "block.blockquote", changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allQuote ? "Removed blockquote." : "Blockquote."); }

export function toggleCodeFence(ctx, args = {}) {
    const language = codeLanguage(args.language);
    if (language == null) return fail("invalid-language");
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    let longestRun = 2;
    for (const match of selected.matchAll(/`+/g)) longestRun = Math.max(longestRun, match[0].length);
    const marker = "`".repeat(longestRun + 1);
    const insert = `${marker}${language}\n${selected}\n${marker}`;
    const cursor = ctx.selectionStart + marker.length + language.length + 1 + selected.length;
    return ok(tx(ctx, "block.codeFence", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "block"), "Code block.");
  }

export function insertHorizontalRule(ctx) { const lead = ctx.selectionStart > 0 && ctx.value[ctx.selectionStart - 1] !== "\n" ? "\n" : ""; const trail = ctx.selectionStart < ctx.value.length && ctx.value[ctx.selectionStart] !== "\n" ? "\n" : "\n"; const insert = `${lead}---${trail}`; return insertionTransaction(ctx, "block.horizontalRule", insert, insert.length, "block"); }

export function insertTable(ctx, args = {}) { const rows = clamp(Number(args.rows) || 2, 1, 20); const cols = clamp(Number(args.cols) || 3, 2, 12); const header = `| ${Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ")} |`; const delimiter = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`; const body = Array.from({ length: rows }, (_, r) => `| ${Array.from({ length: cols }, (_, c) => `Cell ${r * cols + c + 1}`).join(" | ")} |`); const insert = [header, delimiter, ...body].join("\n"); const cursor = ctx.selectionStart + header.indexOf("Column 1"); return ok(tx(ctx, "block.table", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor + "Column 1".length, direction: "none" }, "block"), "Table inserted."); }

export function setCodeLanguageResult(ctx, block, language) {
    const opening = block?.opening;
    if (!opening) return fail("not-applicable");
    const clean = codeLanguage(language);
    if (clean == null) return fail("invalid-language");
    const fence = getFenceInfo(opening.text);
    if (!fence) return fail("not-applicable");
    const indent = /^\s{0,3}/.exec(opening.text)?.[0] ?? "";
    const insert = `${indent}${fence.sequence}${clean}`;
    const cursor = opening.start + insert.length;
    return ok(tx(ctx, "code.setLanguage", [{ from: opening.start, to: opening.end, insert }], { start: cursor, end: cursor, direction: "none" }, "code"), clean ? `Language ${clean}.` : "Language cleared.");
  }
