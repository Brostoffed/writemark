import { clamp, normalizeLineEndings, now } from "./text.js";

export function applyTextChanges(value, changes) {
  const sorted = [...changes].sort((a, b) => b.from - a.from);
  let out = value;
  for (const c of sorted) {
    const from = clamp(c.from, 0, out.length);
    const to = clamp(c.to, from, out.length);
    out = out.slice(0, from) + normalizeLineEndings(c.insert ?? "") + out.slice(to);
  }
  return out;
}

export function diffTextChange(before, after) {
  const oldValue = normalizeLineEndings(before ?? "");
  const newValue = normalizeLineEndings(after ?? "");
  if (oldValue === newValue) return [];
  let start = 0;
  const maxStart = Math.min(oldValue.length, newValue.length);
  while (start < maxStart && oldValue[start] === newValue[start]) start += 1;
  let oldEnd = oldValue.length;
  let newEnd = newValue.length;
  while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  return [{ from: start, to: oldEnd, insert: newValue.slice(start, newEnd) }];
}

export function normalizeChanges(changes = []) {
  return [...changes]
    .map(change => ({
      from: Number(change.from) || 0,
      to: Number(change.to) || Number(change.from) || 0,
      insert: normalizeLineEndings(change.insert ?? ""),
    }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
}

export function changedSpans(changes = []) {
  const sorted = normalizeChanges(changes);
  if (!sorted.length) return null;
  let oldStart = Infinity;
  let oldEnd = -Infinity;
  let newStart = Infinity;
  let newEnd = -Infinity;
  let shift = 0;
  for (const change of sorted) {
    oldStart = Math.min(oldStart, change.from);
    oldEnd = Math.max(oldEnd, change.to);
    const newFrom = change.from + shift;
    const newTo = newFrom + change.insert.length;
    newStart = Math.min(newStart, newFrom);
    newEnd = Math.max(newEnd, newTo);
    shift += change.insert.length - (change.to - change.from);
  }
  return { oldStart, oldEnd, newStart, newEnd, delta: shift };
}

export function sameSelection(a, b) { return a && b && a.start === b.start && a.end === b.end && (a.direction || "none") === (b.direction || "none"); }

export function makeSnapshot(value, selectionStart, selectionEnd, direction = "none") { return { value, selection: { start: selectionStart, end: selectionEnd, direction } }; }

export function tx(ctx, actionId, changes, selectionAfter, undoGroup = actionId) {
  return { changes, selectionBefore: { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection ?? "none" }, selectionAfter, source: "api", actionId, undoGroup, timestamp: now() };
}

export function ok(transaction, announcement) { return { ok: true, transaction, announcement }; }

export function okNoop(announcement, preventDefault = false) { return { ok: true, announcement, preventDefault }; }

export function fail(reason, message) { return { ok: false, reason, message }; }

export function insertionTransaction(ctx, actionId, insert, selectionOffset = insert.length, undoGroup = actionId) {
  const from = ctx.selectionStart; const to = ctx.selectionEnd; const cursor = from + selectionOffset;
  return ok(tx(ctx, actionId, [{ from, to, insert }], { start: cursor, end: cursor, direction: "none" }, undoGroup));
}

export function removePrefixFromLine(ctx, actionId, prefixEndOffset, announcement) {
  const from = ctx.currentLine.start; const to = ctx.currentLine.start + prefixEndOffset;
  return ok(tx(ctx, actionId, [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, actionId), announcement);
}
