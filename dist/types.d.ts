export type EditorMode = "live" | "source" | "split" | "preview";
export type PreviewMode = "none" | "below" | "side" | "inline-split";
export type MarkdownFlavor = "gfm" | "commonmark";
export type SelectionDirection = "none" | "forward" | "backward";
export type SourceSelection = {
    start: number;
    end: number;
    direction?: SelectionDirection;
};
export type Snapshot = {
    value: string;
    selection: SourceSelection;
};
export type TextChange = {
    from: number;
    to: number;
    insert: string;
};
export type SourceRange = {
    from: number;
    to: number;
};
export type Tag = {
    value: string;
    key: string;
    count: number;
    ranges: SourceRange[];
};
export type MarkdownOptions = {
    markdownFlavor?: MarkdownFlavor;
    gfm?: boolean;
    tagsEnabled?: boolean;
    linkTarget?: string;
    references?: Map<string, {
        url: string;
        title: string;
    }>;
};
export type LineInfo = {
    start: number;
    end: number;
    text: string;
    newlineEnd?: number;
    indent?: string;
    marker?: string | null;
    contentStart?: number;
};
export type ListItem = {
    kind: "task-list-item" | "ordered-list-item" | "bullet-list-item";
    listType: "ul" | "ol";
    indent: string;
    marker: string;
    markerText: string;
    number?: number;
    delimiter?: string;
    checked?: boolean;
    content: string;
    contentStart: number;
    fullMarkerStart: number;
    fullMarkerEnd: number;
};
export type Heading = {
    indent: string;
    level: number;
    content: string;
    markerText: string;
    contentStart: number;
    id?: string;
};
export type Blockquote = {
    depth: number;
    content: string;
    markerText: string;
    contentStart: number;
    fullContentStart: number;
};
export type ActionLineInfo = LineInfo & {
    indent: string;
    marker: string | null;
    contentStart: number;
};
export type TableLine = LineInfo & {
    newlineEnd: number;
    cells: (SourceRange & {
        text: string;
    })[];
};
export type FenceInfo = {
    marker: string;
    length: number;
    sequence: string;
    info: string;
    language: string;
};
export interface BaseBlock {
    from: number;
    to: number;
    newlineEnd: number;
}
export type SourceLine = LineInfo & {
    newlineEnd: number;
};
export interface HeadingBlock extends BaseBlock {
    type: "heading";
    line: LineInfo;
    heading: Heading;
    setext?: LineInfo;
}
export interface TableBlock extends BaseBlock {
    type: "table";
    header: TableLine;
    delimiter: TableLine;
    rows: TableLine[];
}
export interface CodeFenceBlock extends BaseBlock {
    type: "code-fence";
    opening: SourceLine;
    closing: SourceLine | null;
    codeLines: SourceLine[];
    language: string;
    fence: FenceInfo;
}
export interface ListBlock extends BaseBlock {
    type: "task-list-item" | "ordered-list-item" | "bullet-list-item";
    line: LineInfo;
    list: ListItem;
}
export interface BlockquoteBlock extends BaseBlock {
    type: "blockquote";
    line: LineInfo;
    quote: Blockquote;
}
export interface TextBlock extends BaseBlock {
    type: "horizontal-rule" | "paragraph" | "blank";
    line: LineInfo;
}
type BlockField = "line" | "heading" | "setext" | "header" | "delimiter" | "rows" | "opening" | "closing" | "codeLines" | "language" | "fence" | "list" | "quote";
type BlockVariant<T> = T extends BaseBlock ? T & {
    [K in Exclude<BlockField, keyof T>]?: never;
} : never;
export type MarkdownBlock = BlockVariant<HeadingBlock | TableBlock | CodeFenceBlock | ListBlock | BlockquoteBlock | TextBlock>;
export type BlockContext = {
    kind: "fenced-code" | "task-list-item" | "ordered-list-item" | "bullet-list-item" | "heading" | "blockquote" | "horizontal-rule" | "table" | "paragraph";
    list?: ListItem;
    heading?: Heading;
    blockquote?: Blockquote;
};
export type Transaction = {
    changes: TextChange[];
    selectionBefore?: SourceSelection;
    selectionAfter?: SourceSelection;
    undoGroup?: string;
    actionId?: string;
    source?: string;
    timestamp?: number;
    args?: unknown;
};
export type ActionResult = {
    ok: true;
    transaction?: Transaction;
    announcement?: string | undefined;
    preventDefault?: boolean;
    actionHandled?: boolean;
} | {
    ok: false;
    reason: string;
    message?: string | undefined;
};
export type EditorConfig = {
    mode: EditorMode;
    preview: PreviewMode;
    markdownFlavor: MarkdownFlavor;
    tagsEnabled: boolean;
    shiftEnterBehavior: "soft-break" | "smart-enter";
    tabBehavior: "accessibility-first" | "editor-first";
    indentString: string;
    debug: number;
    debugLog: boolean;
    disabled: boolean;
    readonly: boolean;
};
export type CompletionState = {
    status: "closed";
    open: false;
    providerId: null;
    match: null;
    items: [];
    activeIndex: 0;
    requestId: number;
    abort: null;
} | {
    status: "loading";
    open: false;
    providerId: string;
    match: CompletionMatch;
    items: [];
    activeIndex: 0;
    requestId: number;
    abort: AbortController;
} | {
    status: "open";
    open: true;
    providerId: string;
    match: CompletionMatch;
    items: CompletionItem[];
    activeIndex: number;
    requestId: number;
    abort: AbortController;
};
export type ActionContext = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
    selectionDirection: SelectionDirection;
    mode: "idle" | "disabled" | "readonly" | "composing-ime" | "slash-open" | "completion-open";
    currentLine: ActionLineInfo;
    selectedLines: ActionLineInfo[];
    block: BlockContext;
    inline: {
        insideInlineCode: boolean;
    };
    completion: CompletionState;
    config: EditorConfig;
    host: WritemarkEditorElement;
};
export type Action = {
    id: string;
    label?: string;
    description?: string;
    group?: string;
    aliases?: string[];
    keywords?: string[];
    visibleInSlash?: boolean;
    defaultShortcut?: string | undefined;
    structural?: boolean;
    readonlySafe?: boolean;
    viewSafe?: boolean;
    when?: (context: ActionContext, args?: Record<string, unknown>) => boolean;
    run: (context: ActionContext, args?: Record<string, unknown>, options?: {
        source?: string;
        inputType?: string | null | undefined;
        apply?: boolean;
    }) => ActionResult;
};
export type CompletionMatch = {
    sequence?: string;
    indent?: string;
    from: number;
    to: number;
    query: string;
    trigger?: string;
    providerId?: string;
    [key: string]: unknown;
};
export type CompletionItem = {
    id: string;
    label: string;
    detail?: string | undefined;
    description?: string;
    kind?: string;
    disabled?: boolean;
    value?: string;
    actionId?: string;
    [key: string]: unknown;
};
export type CompletionProvider = {
    id: string;
    priority?: number;
    triggers?: string[];
    match: (context: ActionContext) => CompletionMatch | null;
    getItems: (match: CompletionMatch, context: ActionContext, signal: AbortSignal) => CompletionItem[] | Promise<CompletionItem[]>;
    apply: (item: CompletionItem, match: CompletionMatch, context: ActionContext) => ActionResult;
};
export type TagItem = ({
    value: string;
    label?: string;
} | {
    value?: string;
    label: string;
}) & {
    id?: string;
    detail?: string | undefined;
    kind?: string;
    [key: string]: unknown;
};
export type TagProvider = {
    allowCreate?: boolean;
    getItems: (request: {
        query: string;
        documentTags: Tag[];
        context: ActionContext;
        signal: AbortSignal;
    }) => (string | TagItem)[] | Promise<(string | TagItem)[]>;
};
export type FindOptions = {
    caseSensitive?: boolean;
    from?: number;
    wrap?: boolean;
};
export type FindMatch = {
    start: number;
    end: number;
    text: string;
};
export type FileDetails = {
    files: File[];
    insertionPoint: number;
    insertMarkdown: (markdown: string) => boolean;
};
export type DebugDetails = {
    sequence: number;
    timestamp: number;
    level: number;
    phase: string;
    mode: EditorMode;
    valueLength: number;
    selection: SourceSelection;
    [key: string]: unknown;
};
export type WritemarkEventMap = {
    "md-before-change": CustomEvent<{
        transaction: Transaction;
        before: Snapshot;
        nextValue: string;
        selectionAfter: SourceSelection;
        source: string;
    }>;
    "md-input": CustomEvent<{
        value: string;
        source: string;
        inputType: string | null;
    }>;
    "md-change": CustomEvent<{
        value: string;
    }>;
    "md-selection-change": CustomEvent<{
        selectionStart: number;
        selectionEnd: number;
        selectionDirection: SelectionDirection;
    }>;
    "md-action": CustomEvent<{
        actionId: string;
        source: string;
        before: Snapshot;
        after: Snapshot;
        args?: unknown;
    }>;
    "md-completion-open": CustomEvent<{
        providerId: string;
        match: CompletionMatch;
        items: CompletionItem[];
    }>;
    "md-completion-close": CustomEvent<{
        providerId: string | null;
        match: CompletionMatch | null;
    }>;
    "md-completion-accept": CustomEvent<{
        providerId: string;
        item: CompletionItem;
        before: Snapshot;
        after: Snapshot;
    }>;
    "md-tags-change": CustomEvent<{
        current: Tag[];
        added: string[];
        removed: string[];
        source: string;
        inputType: string | null;
    }>;
    "md-tag-activate": CustomEvent<{
        tag: string;
        key: string;
        surface: "live" | "preview";
    }>;
    "md-render": CustomEvent<{
        html: string;
    }>;
    "md-file-paste": CustomEvent<FileDetails>;
    "md-file-drop": CustomEvent<FileDetails>;
    "md-copy": CustomEvent<{
        markdown: string;
        start: number;
        end: number;
    }>;
    "md-cut": CustomEvent<{
        markdown: string;
        start: number;
        end: number;
    }>;
    "md-paste": CustomEvent<{
        markdown: string;
        kind: string;
    }>;
    "md-dirty-change": CustomEvent<{
        dirty: boolean;
    }>;
    "md-debug": CustomEvent<DebugDetails>;
    "md-error": CustomEvent<{
        phase: string;
        error: unknown;
        recoverable: boolean;
        [key: string]: unknown;
    }>;
};
export type EditorAPI = {
    value: string;
    defaultValue: string;
    name: string;
    label: string;
    placeholder: string;
    mode: EditorMode;
    preview: PreviewMode;
    markdownFlavor: MarkdownFlavor;
    tagsEnabled: boolean;
    shiftEnterBehavior: "soft-break" | "smart-enter";
    tabBehavior: "accessibility-first" | "editor-first";
    indentString: string;
    debug: number;
    debugLog: boolean;
    disabled: boolean;
    readonly: boolean;
    required: boolean;
    readonly dirty: boolean;
    tagProvider: TagProvider | null;
    selectionStart: number;
    selectionEnd: number;
    readonly validationMessage: string;
    readonly validity: Pick<ValidityState, "valid" | "valueMissing" | "tooShort" | "tooLong" | "customError">;
    readonly willValidate: boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    formResetCallback(): void;
    formDisabledCallback(disabled: boolean): void;
    formStateRestoreCallback(state: string | File | FormData | null, mode?: "restore" | "autocomplete"): void;
    focus(options?: FocusOptions): void;
    blur(): void;
    select(): void;
    setSelectionRange(start: number, end: number, direction?: SelectionDirection): void;
    exec(actionId: string, args?: Record<string, unknown>): boolean;
    canExec(actionId: string, args?: Record<string, unknown>): boolean;
    registerAction(action: Action): void;
    unregisterAction(actionId: string): void;
    registerCompletionProvider(provider: CompletionProvider): void;
    unregisterCompletionProvider(providerId: string): void;
    getHTML(): string;
    getText(): string;
    getTags(): Tag[];
    getMarkdown(): string;
    setMarkdown(markdown: string): void;
    getPlainText(): string;
    getSelectionMarkdown(): string;
    insertMarkdown(markdown: string): boolean;
    getCurrentBlock(): MarkdownBlock | null;
    getSelectedBlocks(): MarkdownBlock[];
    getActiveMarks(): string[];
    find(query: string, options?: FindOptions): FindMatch | null;
    replace(query: string, replacement: string, options?: FindOptions): number;
    replaceAll(query: string, replacement: string, options?: FindOptions): number;
    commit(): void;
    reset(): void;
    checkValidity(): boolean;
    reportValidity(): boolean;
    setCustomValidity(message: string): void;
    addEventListener: {
        <K extends keyof WritemarkEventMap>(type: K, listener: (this: WritemarkEditorElement, event: WritemarkEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
        <K extends keyof HTMLElementEventMap>(type: K, listener: (this: WritemarkEditorElement, event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
        (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    };
    removeEventListener: {
        <K extends keyof WritemarkEventMap>(type: K, listener: (this: WritemarkEditorElement, event: WritemarkEventMap[K]) => void, options?: boolean | EventListenerOptions): void;
        (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
    };
};
export type WritemarkEditorElement = EditorAPI & HTMLElement;
export type MdLiveEditorElement = WritemarkEditorElement;
export type EditorConstructor = {
    new (): WritemarkEditorElement;
    prototype: WritemarkEditorElement;
    readonly formAssociated: boolean;
    readonly observedAttributes: string[];
};
export type EventDetail<K extends keyof WritemarkEventMap> = WritemarkEventMap[K] extends CustomEvent<infer Detail> ? Detail : never;
export {};
