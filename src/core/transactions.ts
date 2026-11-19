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

/** Preserve unchanged spans with a bounded UTF-16 edit script. */
export function diffTextChanges(before: string, after: string): TextChange[] {
  const fallback = diffTextChange(before, after);
  const span = fallback[0];
  if (!span || span.from === span.to || !span.insert.length) return fallback;
  const oldText = normalizeLineEndings(before).slice(span.from, span.to);
  const newText = span.insert;
  const frontier = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];
  let work = 0;
  const limit = Math.min(128, oldText.length + newText.length);
  for (let distance = 0; distance <= limit; distance += 1) {
    trace.push(new Map(frontier));
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      if (++work > 200000) return fallback;
      const left = frontier.get(diagonal - 1) ?? -Infinity;
      const right = frontier.get(diagonal + 1) ?? -Infinity;
      let x = diagonal === -distance || diagonal !== distance && left < right ? right : left + 1;
      if (!Number.isFinite(x)) x = 0;
      let y = x - diagonal;
      while (x < oldText.length && y < newText.length && oldText[x] === newText[y]) {
        x += 1;
        y += 1;
        if (++work > 200000) return fallback;
      }
      frontier.set(diagonal, x);
      if (x < oldText.length || y < newText.length) continue;
      const operations: { kind: "equal" | "insert" | "delete"; text: string }[] = [];
      for (let level = distance; level >= 0; level -= 1) {
        const previous = trace[level];
        if (!previous) return fallback;
        const currentDiagonal = x - y;
        const previousLeft = previous.get(currentDiagonal - 1) ?? -Infinity;
        const previousRight = previous.get(currentDiagonal + 1) ?? -Infinity;
        const previousDiagonal = currentDiagonal === -level || currentDiagonal !== level && previousLeft < previousRight
          ? currentDiagonal + 1 : currentDiagonal - 1;
        const previousX = previous.get(previousDiagonal) ?? 0;
        const previousY = previousX - previousDiagonal;
        while (x > previousX && y > previousY) {
          operations.push({ kind: "equal", text: oldText[x - 1] ?? "" });
          x -= 1;
          y -= 1;
        }
        if (!level) break;
        if (x === previousX) {
          operations.push({ kind: "insert", text: newText[y - 1] ?? "" });
          y -= 1;
        } else {
          operations.push({ kind: "delete", text: oldText[x - 1] ?? "" });
          x -= 1;
        }
      }
      const changes: TextChange[] = [];
      let offset = span.from;
      let pending: TextChange | null = null;
      for (const operation of operations.reverse()) {
        if (operation.kind === "equal") {
          if (pending) { changes.push(pending); pending = null; }
          offset += 1;
        } else {
          pending ??= { from: offset, to: offset, insert: "" };
          if (operation.kind === "delete") { offset += 1; pending.to = offset; }
          else pending.insert += operation.text;
        }
      }
      if (pending) changes.push(pending);
      return changes;
    }
  }
  return fallback;
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

/** Reject shared boundaries. All offsets refer to the original UTF-16 text. */
export function validateTransactionRequest(value: string, request: unknown, currentRevision?: number):
  { ok: true; request: import("../types.ts").TransactionRequest; value: string; changes: TextChange[] } |
  { ok: false; reason: import("../types.ts").TransactionFailureReason } {
  try {
    if (!request || typeof request !== "object" || Array.isArray(request)) return { ok: false, reason: "invalid-request" };
    const input = request as Record<string, unknown>;
    const baseRevision = input.baseRevision;
    if (!Number.isSafeInteger(baseRevision) || (baseRevision as number) < 0) return { ok: false, reason: "invalid-request" };
    if (currentRevision !== undefined && baseRevision !== currentRevision) return { ok: false, reason: "stale-revision" };
    const inputChanges = input.changes;
    if (!Array.isArray(inputChanges)) return { ok: false, reason: "invalid-request" };
    const inputCount: number = inputChanges.length;
    if (!Number.isSafeInteger(inputCount) || inputCount < 0) return { ok: false, reason: "invalid-request" };
    const origin = input.origin;
    let copiedOrigin: import("../types.ts").EditOrigin | undefined;
    if (origin !== undefined) {
      if (!origin || typeof origin !== "object") return { ok: false, reason: "invalid-request" };
      const o = origin as Record<string, unknown>;
      const kind = o.kind;
      const id = o.id;
      if (typeof kind !== "string" || !["user", "paste", "action", "completion", "external", "api"].includes(kind) || (id !== undefined && typeof id !== "string")) return { ok: false, reason: "invalid-request" };
      copiedOrigin = { kind: kind as import("../types.ts").EditOrigin["kind"], ...(id === undefined ? {} : { id }) };
    }
    const changes: TextChange[] = [];
    const items: readonly unknown[] = inputChanges;
    for (let index = 0; index < inputCount; index += 1) {
      const item = items[index];
      if (!item || typeof item !== "object") return { ok: false, reason: "invalid-change" };
      const c = item as Record<string, unknown>;
      const from = c.from;
      const to = c.to;
      const insert = c.insert;
      const expected = c.expected;
      if (typeof from !== "number" || typeof to !== "number" || !Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || to > value.length || typeof insert !== "string" || (expected !== undefined && typeof expected !== "string")) return { ok: false, reason: "invalid-change" };
      if (expected !== undefined && expected !== value.slice(from, to)) return { ok: false, reason: "expected-mismatch" };
      changes.push({ from, to, insert: normalizeLineEndings(insert) });
    }
    changes.sort((a, b) => a.from - b.from || a.to - b.to);
    for (let i = 1; i < changes.length; i += 1) {
      const previous = changes[i - 1]!;
      const current = changes[i]!;
      if (current.from < previous.to || (current.from === previous.to && (current.from === current.to || previous.from === previous.to))) return { ok: false, reason: "overlapping-changes" };
    }
    const nextValue = applyTextChanges(value, changes);
    const selection = input.selectionAfter;
    let copiedSelection: SourceSelection | undefined;
    if (selection !== undefined) {
      if (!selection || typeof selection !== "object") return { ok: false, reason: "invalid-selection" };
      const sel = selection as Record<string, unknown>;
      const start = sel.start;
      const end = sel.end;
      const direction = sel.direction;
      if (typeof start !== "number" || typeof end !== "number" || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > nextValue.length || (direction !== undefined && (typeof direction !== "string" || !["none", "forward", "backward"].includes(direction)))) return { ok: false, reason: "invalid-selection" };
      copiedSelection = { start, end, direction: direction as import("../types.ts").SelectionDirection | undefined ?? "none" };
    }
    const copy: import("../types.ts").TransactionRequest = {
      baseRevision: baseRevision as number,
      changes,
      ...(copiedOrigin ? { origin: { kind: copiedOrigin.kind, ...(copiedOrigin.id === undefined ? {} : { id: copiedOrigin.id }) } } : {}),
      ...(copiedSelection ? { selectionAfter: { start: copiedSelection.start, end: copiedSelection.end, direction: copiedSelection.direction ?? "none" } } : {})
    };
    return { ok: true, request: copy, value: nextValue, changes };
  } catch { return { ok: false, reason: "invalid-request" }; }
}

export function mapTransactionSelection(selection: SourceSelection, changes: readonly TextChange[]): SourceSelection {
  const collapsed = selection.start === selection.end;
  const map = (offset: number, affinity: "left" | "right") => {
    let shift = 0;
    for (const c of changes) {
      if (offset < c.from) break;
      if (offset <= c.to) return c.from + shift + (affinity === "right" || offset === c.to && c.from !== c.to ? c.insert.length : 0);
      shift += c.insert.length - (c.to - c.from);
    }
    return offset + shift;
  };
  return { start: map(selection.start, collapsed ? "right" : "left"), end: map(selection.end, "right"), direction: selection.direction ?? "none" };
}

/** Reverse a validated batch against its original source. */
export function invertTextChanges(before: string, changes: readonly TextChange[]): TextChange[] {
  const inverse: TextChange[] = [];
  let shift = 0;
  for (const change of [...changes].sort((a, b) => a.from - b.from || a.to - b.to)) {
    const inserted = normalizeLineEndings(change.insert);
    const from = change.from + shift;
    const next = { from, to: from + inserted.length, insert: before.slice(change.from, change.to) };
    shift += inserted.length - (change.to - change.from);
    if (next.from === next.to && !next.insert.length) continue;
    const previous = inverse.at(-1);
    // A collapsed inverse boundary has no distinct source seam.
    if (previous && previous.to === next.from && (previous.from === previous.to || next.from === next.to)) {
      previous.to = next.to;
      previous.insert += next.insert;
    } else inverse.push(next);
  }
  return inverse;
}
