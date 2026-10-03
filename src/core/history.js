import { now } from "./text.js";
import { sameSelection } from "./transactions.js";

/** Owns undo records. The component applies the returned snapshot. */
export class UndoHistory {
  constructor(maxEntries = 300, clock = now) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxEntries = maxEntries;
    this.clock = clock;
  }
  record(before, after, group, { coalesce = false } = {}) {
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
  undo(current) {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ before: entry.before, after: current, group: entry.group, timestamp: this.clock() });
    return entry.before;
  }
  redo(current) {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ before: current, after: entry.after, group: entry.group, timestamp: this.clock() });
    return entry.after;
  }
}
