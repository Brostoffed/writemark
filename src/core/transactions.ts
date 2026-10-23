import type { TextContext } from "../actions/types.ts";
import type { SelectionDirection, SourceSelection, Snapshot, TextChange, Transaction, ActionResult, ActionContext } from "../types.ts";
import { clamp, normalizeLineEndings, now } from "./text.ts";

export function applyTextChanges(value: string, changes: TextChange[]) {
  const sorted = [...changes].sort((a, b) => b.from - a.from);
  let out = value;
  for (const c of sorted) {
    const from = clamp(c.from, 0, out.length);
    const to = clamp(c.to, from, out.length);
    out = out.slice(0, from) + normalizeLineEndings(c.insert ?? "") + out.slice(to);
  }
  return out;
}

export function diffTextChange(before: string, after: string) {
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

export function normalizeChanges(changes: TextChange[] = []) {
  return [...changes]
    .map(change => ({
      from: Number(change.from) || 0,
      to: Number(change.to) || Number(change.from) || 0,
      insert: normalizeLineEndings(change.insert ?? ""),
    }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
}

export function changedSpans(changes: TextChange[] = []) {
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

export function sameSelection(a: SourceSelection | null | undefined, b: SourceSelection | null | undefined) { return Boolean(a && b && a.start === b.start && a.end === b.end && (a.direction || "none") === (b.direction || "none")); }

export function makeSnapshot(value: string, selectionStart: number, selectionEnd: number, direction: SelectionDirection = "none"): Snapshot { return { value, selection: { start: selectionStart, end: selectionEnd, direction } }; }

export function tx(ctx: TextContext, actionId: string, changes: TextChange[], selectionAfter: SourceSelection, undoGroup = actionId): Transaction {
  return { changes, selectionBefore: { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection ?? "none" }, selectionAfter, source: "api", actionId, undoGroup, timestamp: now() };
}

export function ok(transaction: Transaction, announcement?: string | undefined): Extract<ActionResult, { ok: true }> { return { ok: true, transaction, announcement }; }

export function okNoop(announcement?: string | undefined, preventDefault = false): Extract<ActionResult, { ok: true }> { return { ok: true, announcement, preventDefault }; }

export function fail(reason: string, message?: string): Extract<ActionResult, { ok: false }> { return { ok: false, reason, message }; }

export function insertionTransaction(ctx: TextContext, actionId: string, insert: string, selectionOffset = insert.length, undoGroup = actionId) {
  const from = ctx.selectionStart; const to = ctx.selectionEnd; const cursor = from + selectionOffset;
  return ok(tx(ctx, actionId, [{ from, to, insert }], { start: cursor, end: cursor, direction: "none" }, undoGroup));
}

export function removePrefixFromLine(ctx: ActionContext, actionId: string, prefixEndOffset: number, announcement: string) {
  const from = ctx.currentLine.start; const to = ctx.currentLine.start + prefixEndOffset;
  return ok(tx(ctx, actionId, [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, actionId), announcement);
}
