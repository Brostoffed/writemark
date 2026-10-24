import type { EditorMode, TableLine, MarkdownBlock, ActionResult, ActionContext, Action } from "../types.ts";
import type { TableBlock, CodeFenceBlock } from "../markdown/types.ts";

export type TextContext = Pick<ActionContext, "value" | "selectionStart" | "selectionEnd" | "selectionDirection">;
export interface ActionOptions {
    source?: string;
    inputType?: string | null | undefined;
    apply?: boolean;
}
export interface TablePosition {
    row: number;
    col: number;
    line: TableLine;
}
export interface ActionHost {
    registerAction: (action: Action) => void;
    smartEnter: (ctx: ActionContext) => ActionResult;
    smartTab: (ctx: ActionContext) => ActionResult;
    expandSelection: () => void;
    undo: ({ source, inputType }?: {
        source?: string;
        inputType?: string | null;
    }) => boolean;
    redo: ({ source, inputType }?: {
        source?: string;
        inputType?: string | null;
    }) => boolean;
    findBlockAtOffset: {
        (offset: number, type: "table"): TableBlock | null;
        (offset: number, type: "code-fence"): CodeFenceBlock | null;
        (offset: number, type?: MarkdownBlock["type"] | null): MarkdownBlock | null;
    };
    setMode: (mode: EditorMode) => void;
    closeCompletion: () => void;
    moveCompletion: (delta: number) => void;
    setCompletionIndex: (index: number, direction?: number | undefined) => void;
    completionCount: () => number;
    acceptCompletion: (source?: string | undefined) => ActionResult;
}
