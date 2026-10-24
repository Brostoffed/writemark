import type { UndoEntry } from "./types.ts";
import type { Snapshot } from "../types.ts";
import { now } from "./text.ts";
import { sameSelection } from "./transactions.ts";

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
  record(before: Snapshot, after: Snapshot, group: string | undefined, { coalesce = false } = {}) {
    if (!before || !after) return;
    if (before.value === after.value && sameSelection(before.selection, after.selection)) return;
    const latest = this.undoStack.at(-1);
    const timestamp = this.clock();
    if (coalesce && latest && latest.group === group && timestamp - latest.timestamp < 900) {
      latest.after = after;
      latest.timestamp = timestamp;
      return;
    }
    this.undoStack.push({ before, after, group, timestamp });
    if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
  }
  undo(current: Snapshot) {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ before: entry.before, after: current, group: entry.group, timestamp: this.clock() });
    return entry.before;
  }
  redo(current: Snapshot) {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ before: current, after: entry.after, group: entry.group, timestamp: this.clock() });
    return entry.after;
  }
}
