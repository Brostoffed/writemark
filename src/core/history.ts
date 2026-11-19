import type { UndoEntry } from "./types.ts";
import type { Snapshot, TextChange } from "../types.ts";
import { now } from "./text.ts";
import { applyTextChanges, diffTextChanges, normalizeChanges, sameSelection } from "./transactions.ts";
import { composeTextChanges } from "./text-edits.ts";

/** Owns undo records. The component applies the returned snapshot. */
export class UndoHistory {
  declare undoStack: UndoEntry[];
  declare redoStack: UndoEntry[];
  declare maxEntries: number;
  declare clock: () => number;

  constructor(maxEntries = 300, clock = now) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxEntries = maxEntries;
    this.clock = clock;
  }
  record(before: Snapshot, after: Snapshot, group: string | undefined, { coalesce = false, changes }: { coalesce?: boolean | undefined; changes?: readonly TextChange[] } = {}) {
    if (!before || !after) return;
    if (before.value === after.value && sameSelection(before.selection, after.selection)) return;
    const supplied = changes ? normalizeChanges([...changes]) : null;
    const canonical = supplied && supplied.every((change, index) => Number.isSafeInteger(change.from) && Number.isSafeInteger(change.to) && change.from >= 0 && change.to >= change.from && change.to <= before.value.length && (!index || supplied[index - 1]!.to <= change.from)) && applyTextChanges(before.value, supplied) === after.value
      ? supplied : diffTextChanges(before.value, after.value);
    const latest = this.undoStack.at(-1);
    const timestamp = this.clock();
    if (coalesce && latest && latest.after.value === before.value && latest.group === group && timestamp - latest.timestamp < 900) {
      latest.changes = composeTextChanges(latest.before.value, latest.changes ?? diffTextChanges(latest.before.value, latest.after.value), canonical);
      latest.after = after;
      latest.timestamp = timestamp;
      return;
    }
    this.undoStack.push({ before, after, group, timestamp, changes: canonical });
    if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
  }
  undo(current: Snapshot) {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ before: entry.before, after: current, group: entry.group, timestamp: this.clock(), changes: current.value === entry.after.value && entry.changes ? entry.changes : diffTextChanges(entry.before.value, current.value) });
    return entry.before;
  }
  redo(current: Snapshot) {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ before: current, after: entry.after, group: entry.group, timestamp: this.clock(), changes: current.value === entry.before.value && entry.changes ? entry.changes : diffTextChanges(current.value, entry.after.value) });
    return entry.after;
  }
}
