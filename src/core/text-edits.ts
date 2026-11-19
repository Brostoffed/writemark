import type { TextChange } from "../types.ts";
import { clamp, normalizeLineEndings } from "./text.ts";

type Piece = { kind: "source"; from: number; to: number } | { kind: "insert"; text: string };
const lengthOf = (piece: Piece) => piece.kind === "source" ? piece.to - piece.from : piece.text.length;

function slicePieces(pieces: readonly Piece[], from: number, to: number): Piece[] {
  const result: Piece[] = [];
  let offset = 0;
  for (const piece of pieces) {
    const length = lengthOf(piece);
    const start = Math.max(0, from - offset);
    const end = Math.min(length, to - offset);
    if (start < end) {
      result.push(piece.kind === "source"
        ? { kind: "source", from: piece.from + start, to: piece.from + end }
        : { kind: "insert", text: piece.text.slice(start, end) });
    }
    offset += length;
    if (offset >= to) break;
  }
  return result;
}

function applyPieces(initial: readonly Piece[], changes: readonly TextChange[]): Piece[] {
  let pieces = [...initial];
  let length = pieces.reduce((total, piece) => total + lengthOf(piece), 0);
  for (const change of [...changes].sort((a, b) => b.from - a.from)) {
    const from = clamp(change.from, 0, length);
    const to = clamp(change.to, from, length);
    const insert = normalizeLineEndings(change.insert);
    pieces = [...slicePieces(pieces, 0, from), ...(insert ? [{ kind: "insert" as const, text: insert }] : []), ...slicePieces(pieces, to, length)];
    length += insert.length - (to - from);
  }
  return pieces;
}

/** Compose two source batches without losing original character identity. */
export function composeTextChanges(before: string, first: readonly TextChange[], second: readonly TextChange[]): TextChange[] {
  const initial: Piece[] = before.length ? [{ kind: "source", from: 0, to: before.length }] : [];
  const pieces = applyPieces(applyPieces(initial, first), second);
  const result: TextChange[] = [];
  let from = 0;
  let inserted: string[] = [];
  for (const piece of pieces) {
    if (piece.kind === "insert") { inserted.push(piece.text); continue; }
    if (piece.from !== from || inserted.length) {
      result.push({ from, to: piece.from, insert: inserted.join("") });
      inserted = [];
    }
    from = piece.to;
  }
  if (from !== before.length || inserted.length) result.push({ from, to: before.length, insert: inserted.join("") });
  return result;
}

/** Infer a native textarea target. Every candidate must reconstruct the new text. */
export function inferSourceTextChanges(
  before: string,
  after: string,
  selection: import("../types.ts").SourceSelection,
  inputType: string,
  data: string | null,
  selectionAfter: import("../types.ts").SourceSelection
): TextChange[] | null {
  if (before === after) return [];
  const start = selection.start;
  const end = selection.end;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > before.length) return null;
  const candidate = (from: number, to: number, insert: string): TextChange[] | null => {
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || to > before.length) return null;
    return before.slice(0, from) + insert + before.slice(to) === after ? [{ from, to, insert }] : null;
  };
  if (inputType.startsWith("delete")) {
    if (start !== end) return candidate(start, end, "");
    const removed = before.length - after.length;
    if (removed <= 0) return null;
    if (inputType.endsWith("Backward")) return candidate(start - removed, start, "");
    if (inputType.endsWith("Forward")) return candidate(start, start + removed, "");
    const from = selectionAfter.start;
    if (selectionAfter.start === selectionAfter.end && from <= start && from + removed >= start) return candidate(from, from + removed, "");
    return null;
  }
  if (!inputType.startsWith("insert")) return null;
  const supplied = data === null ? null : normalizeLineEndings(data);
  const insertedLength = after.length - before.length + end - start;
  if (insertedLength >= 0) {
    const insert = supplied ?? after.slice(start, start + insertedLength);
    const direct = candidate(start, end, insert);
    if (direct) return direct;
  }
  if (supplied !== null && selectionAfter.start === selectionAfter.end) {
    const from = selectionAfter.end - supplied.length;
    const to = from + before.length + supplied.length - after.length;
    if (from <= start && to >= end) return candidate(from, to, supplied);
  }
  return null;
}
