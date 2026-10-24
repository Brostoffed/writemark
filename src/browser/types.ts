import type { EditorMode, SelectionDirection, SourceSelection, Snapshot, TextChange, Tag, MarkdownOptions, MarkdownBlock, Transaction, ActionResult, ActionContext, Action, CompletionProvider, TagProvider, DebugDetails, WritemarkEventMap, EventDetail } from "../types.ts";
import type { UndoEntry } from "../core/types.ts";
import type { VirtualState, RenderOptions } from "../render/types.ts";
import type { ValueChangeOptions } from "../component/types.ts";
import type { ActionOptions } from "../actions/types.ts";

export interface SelectionCandidate {
    channel: string;
    selection: Selection;
}
export type StructuredSelection = SourceSelection & {
    label?: string;
};
export interface PointerSelection {
    anchor: number;
    focus: number;
    startX: number;
    startY: number;
    moved: boolean;
    native: boolean;
}
export interface DomPosition {
    node: Node;
    offset: number;
    editable: HTMLElement;
}
export interface SelectionEndpoints {
    anchorNode: Node;
    anchorOffset: number;
    focusNode: Node;
    focusOffset: number;
    strategy: string;
}
export interface InputTarget {
    editable: HTMLElement;
    selection: SourceSelection;
    text: string;
}
export interface InputRange {
    selection: SourceSelection;
    startEditable: HTMLElement;
    endEditable: HTMLElement;
}
export interface PendingFenceOpening {
    start: number;
    marker: string;
}
export interface WebKitNativeInput {
    changes: TextChange[];
    inputType: string;
    selectionAfter: SourceSelection;
}
export interface SlashReplacement {
    insert: string | ((ctx: ActionContext) => string);
    selectionOffset?: number;
    selectionLength?: number;
}
export interface InputHost {
    getDisabled: () => boolean;
    setDisabled: (value: boolean) => void;
    getReadonly: () => boolean;
    setReadonly: (value: boolean) => void;
    _undo: ({ source, inputType }?: {
        source?: string;
        inputType?: string | null;
    }) => boolean;
    _redo: ({ source, inputType }?: {
        source?: string;
        inputType?: string | null;
    }) => boolean;
    _snapshot: () => Snapshot;
    getSourceTextarea: () => HTMLTextAreaElement;
    getValue: () => string;
    setValue: (value: string) => void;
    getSelection: () => SourceSelection;
    setSelection: (value: SourceSelection) => void;
    _scheduleCompletionUpdate: (args_0?: {
        immediate?: boolean | undefined;
    } | undefined) => void;
    _recordUndo: (before: Snapshot, after: Snapshot, group: string | undefined, args_3?: {
        coalesce?: boolean | undefined;
    } | undefined) => void;
    _undoGroupForInput: (inputType: string | null) => string;
    getRedoStack: () => UndoEntry[];
    _afterValueChanged: ({ source, inputType, silent, restoreSelection, previousValue, changes, preserveLiveDom }?: ValueChangeOptions) => void;
    _closeCompletion: () => void;
    _isLiveVisible: () => boolean;
    getLiveDirty: () => boolean;
    _renderAll: (args_0?: RenderOptions | undefined) => void;
    getIgnoreSelectionChangeCount: () => number;
    setIgnoreSelectionChangeCount: (value: number) => void;
    getStructuredSelection: () => StructuredSelection | null;
    setStructuredSelection: (value: StructuredSelection | null) => void;
    _debug: (level: number, phase: string, detail?: Record<string, unknown>) => CustomEvent<DebugDetails> | null;
    _debugEditableInfo: (editable: HTMLElement | null | undefined) => {
        editable: string | null;
        kind: string | null;
        from: number;
        to: number;
    } | null;
    getLiveSelectionAPI: () => boolean | null;
    getFallbackSelectionPending: () => boolean;
    setFallbackSelectionPending: (value: boolean) => void;
    getFallbackEditable: () => HTMLElement | null;
    setFallbackEditable: (value: HTMLElement | null) => void;
    _ensureEmptyLiveEditable: () => void;
    _isSourceActive: () => boolean;
    _getContext: (selection?: SourceSelection | null) => ActionContext;
    _isAppleWebKitRuntime: (navigator?: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> | undefined) => boolean;
    _isIOSWebKitRuntime: (navigator?: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> | undefined) => boolean;
    getShiftEnterBehavior: () => "soft-break" | "smart-enter";
    _isUnclosedFenceOpeningContext: (ctx: ActionContext) => boolean;
    _runAction: (actionId: string, args?: Record<string, unknown>, options?: ActionOptions) => ActionResult;
    _closestEditable: (target: EventTarget | null | undefined) => HTMLElement | null;
    _activeEditableFromSelection: () => HTMLElement | null;
    _editableSourceRange: (editable: HTMLElement | null) => {
        from: number;
        to: number;
    } | null;
    _applyActionResult: (actionId: string, result: ActionResult, options?: ActionOptions) => ActionResult;
    _markdownShortcut: (ctx: ActionContext) => ActionResult;
    _parseOptions: () => MarkdownOptions;
    _getCurrentSelection: () => SourceSelection;
    _smartBackspace: (ctx: ActionContext) => ActionResult;
    _debugTextChanges: (changes?: TextChange[]) => {
        from: number;
        to: number;
        removedLength: number;
        insertedLength: number;
    }[];
    _plainText: (el: HTMLElement) => string;
    _getLiveSelection: (preferredEditable?: HTMLElement | null | undefined) => SourceSelection | null;
    _displayOffsetFromSourceOffset: (editable: HTMLElement, sourceOffset: number) => number;
    _displayOffsetFromSelection: (editable: HTMLElement) => number | null;
    _tableCellInputEdit: (cell: HTMLElement, raw: string, displayCursor?: number | null) => {
        blockFrom: number;
        blockTo: number;
        cellFrom: number;
        cellTo: number;
        nextValue: string;
        cursor: number;
    } | null;
    _sourceOffsetFromDom: (editable: HTMLElement, node: Node, offset: number) => number | null;
}
export interface SelectionHost {
    hasComponentFocus: () => boolean;
    readSelectionCandidates: () => SelectionCandidate[];
    isIOSWebKitRuntime: (navigator?: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> | undefined) => boolean;
    isAppleWebKitRuntime: (navigator?: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> | undefined) => boolean;
    getDisabled: () => boolean;
    getReadonly: () => boolean;
    getMode: () => EditorMode;
    _closeCompletion: () => void;
    getSelection: () => SourceSelection;
    setSelection: (value: SourceSelection) => void;
    setSelectionRange: (start: number, end: number, direction?: SelectionDirection) => void;
    getOwnerDocument: () => Document;
    _emitSelectionChange: () => void;
    getIsComposing: () => boolean;
    setIsComposing: (value: boolean) => void;
    _scheduleCompletionUpdate: (args_0?: {
        immediate?: boolean | undefined;
    } | undefined) => void;
    getValue: () => string;
    _activeEditableFromEvent: (event: Event) => HTMLElement | null;
    getShadow: () => ShadowRoot;
    _debug: (level: number, phase: string, detail?: Record<string, unknown>) => CustomEvent<DebugDetails> | null;
    _debugEditableInfo: (editable: HTMLElement | null | undefined) => {
        editable: string | null;
        kind: string | null;
        from: number;
        to: number;
    } | null;
    getSourceTextarea: () => HTMLTextAreaElement;
    getPreview: () => HTMLElement;
    getLiveEditor: () => HTMLElement;
    setLiveEditor: (value: HTMLElement) => void;
    getVirtualState: () => VirtualState;
    _ensureVirtualSelectionVisible: (selection: SourceSelection) => boolean;
    getIsConnected: () => boolean;
    _lineEditable: () => "true" | "false";
    _syncLiveEditingHosts: () => void;
    _isSourceOffsetRendered: (offset: number) => boolean;
    getLiveBlocks: () => MarkdownBlock[];
    setLiveBlocks: (value: MarkdownBlock[]) => void;
    _getBlocks: () => MarkdownBlock[];
    _renderLiveVirtual: (blocks: MarkdownBlock[], args_1?: {
        anchorOffset?: number;
        force?: boolean;
        fromScroll?: boolean;
    } | undefined) => void;
    _renderLiveFull: (blocks: MarkdownBlock[]) => void;
}
export interface CompletionHost {
    registerProvider: (provider: CompletionProvider) => void;
    getContext: (selection?: SourceSelection | null) => ActionContext;
    emitError: (phase: string, error: unknown, recoverable?: boolean, extra?: Record<string, unknown>) => void;
    render: () => void;
    stopPositionTracking: () => void;
    startPositionTracking: () => void;
    isUnclosedFenceOpeningContext: (ctx: ActionContext) => boolean;
    snapshot: () => Snapshot;
    applyTransaction: (transaction: Transaction, options?: ActionOptions) => boolean;
    dispatch: <K extends keyof WritemarkEventMap>(name: K, detail: EventDetail<K>, options?: Pick<CustomEventInit<unknown>, "bubbles" | "composed" | "cancelable">) => WritemarkEventMap[K];
    announce: (message: string | undefined) => void;
    getTags: () => {
        value: string;
        key: string;
        count: number;
        ranges: {
            from: number;
            to: number;
        }[];
    }[];
    actions: () => IterableIterator<Action>;
    getTagIndex: () => Tag[];
    getTagProvider: () => TagProvider | null;
    tagsEnabled: () => boolean;
    disabled: () => boolean;
    readonly: () => boolean;
    isComposing: () => boolean;
}
