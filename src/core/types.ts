import type { Snapshot } from "../types.ts";

export interface UndoEntry {
    before: Snapshot;
    after: Snapshot;
    group: string | undefined;
    timestamp: number;
}
