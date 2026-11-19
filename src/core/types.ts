import type { Snapshot, TextChange } from "../types.ts";

export interface UndoEntry {
    before: Snapshot;
    after: Snapshot;
    group: string | undefined;
    timestamp: number;
    changes?: TextChange[];
}
