/**
 * Public types for the editor. The build emits declarations from these comments.
 * @typedef {'live' | 'source' | 'split' | 'preview'} EditorMode
 * @typedef {'none' | 'below' | 'side' | 'inline-split'} PreviewMode
 * @typedef {'gfm' | 'commonmark'} MarkdownFlavor
 * @typedef {'none' | 'forward' | 'backward'} SelectionDirection
 * @typedef {{start: number, end: number, direction?: SelectionDirection}} SourceSelection
 * @typedef {{value: string, selection: SourceSelection}} Snapshot
 * @typedef {{from: number, to: number, insert: string}} TextChange
 * @typedef {{from: number, to: number}} SourceRange
 * @typedef {{value: string, key: string, count: number, ranges: SourceRange[]}} Tag
 * @typedef {{markdownFlavor?: MarkdownFlavor, gfm?: boolean, tagsEnabled?: boolean,
 *   linkTarget?: string, references?: Map<string, {url: string, title: string}>}} MarkdownOptions
 * @typedef {{start: number, end: number, text: string, newlineEnd?: number,
 *   indent?: string, marker?: string | null, contentStart?: number}} LineInfo
 * @typedef {{kind: 'task-list-item' | 'ordered-list-item' | 'bullet-list-item',
 *   listType: 'ul' | 'ol', indent: string, marker: string, markerText: string,
 *   number?: number, delimiter?: string, checked?: boolean, content: string,
 *   contentStart: number, fullMarkerStart: number, fullMarkerEnd: number}} ListItem
 * @typedef {{indent: string, level: number, content: string, markerText: string, contentStart: number, id?: string}} Heading
 * @typedef {{depth: number, content: string, markerText: string, contentStart: number, fullContentStart: number}} Blockquote
 * @typedef {LineInfo & {indent: string, marker: string | null, contentStart: number}} ActionLineInfo
 * @typedef {LineInfo & {cells: (SourceRange & {text: string})[]}} TableLine
 * @typedef {{marker: string, length: number, sequence: string, info: string, language: string}} FenceInfo
 * @typedef {{type: 'code-fence' | 'table' | 'heading' | 'task-list-item' |
 *   'ordered-list-item' | 'bullet-list-item' | 'blockquote' | 'horizontal-rule' | 'paragraph' | 'blank',
 *   from: number, to: number, newlineEnd: number, line?: LineInfo,
 *   heading?: Heading, list?: ListItem, quote?: Blockquote, setext?: LineInfo,
 *   opening?: LineInfo, closing?: LineInfo | null, codeLines?: LineInfo[], language?: string,
 *   fence?: FenceInfo, header?: TableLine, delimiter?: TableLine, rows?: TableLine[]}} MarkdownBlock
 * @typedef {{kind: 'fenced-code' | 'task-list-item' | 'ordered-list-item' |
 *   'bullet-list-item' | 'heading' | 'blockquote' | 'horizontal-rule' | 'table' | 'paragraph',
 *   list?: ListItem, heading?: Heading, blockquote?: Blockquote}} BlockContext
 * @typedef {{changes: TextChange[], selectionBefore?: SourceSelection,
 *   selectionAfter?: SourceSelection, undoGroup?: string, actionId?: string,
 *   source?: string, timestamp?: number, args?: unknown}} Transaction
 * @typedef {{ok: true, transaction?: Transaction, announcement?: string,
 *   preventDefault?: boolean, actionHandled?: boolean} |
 *   {ok: false, reason: string, message?: string}} ActionResult
 * @typedef {{mode: EditorMode, preview: PreviewMode, markdownFlavor: MarkdownFlavor,
 *   tagsEnabled: boolean, shiftEnterBehavior: 'soft-break' | 'smart-enter',
 *   tabBehavior: 'accessibility-first' | 'editor-first', indentString: string,
 *   debug: number, debugLog: boolean, disabled: boolean, readonly: boolean}} EditorConfig
 * @typedef {{open: boolean, providerId: string | null, match: CompletionMatch | null,
 *   items: CompletionItem[], activeIndex: number, requestId: number,
 *   abort: AbortController | null}} CompletionState
 * @typedef {{value: string, selectionStart: number, selectionEnd: number,
 *   selectionDirection: SelectionDirection,
 *   mode: 'idle' | 'disabled' | 'readonly' | 'composing-ime' | 'slash-open' | 'completion-open',
 *   currentLine: ActionLineInfo, selectedLines: ActionLineInfo[], block: BlockContext,
 *   inline: {insideInlineCode: boolean}, completion: CompletionState, config: EditorConfig,
 *   host: WritemarkEditorElement}} ActionContext
 * @typedef {{id: string, label?: string, description?: string, group?: string,
 *   aliases?: string[], keywords?: string[], visibleInSlash?: boolean,
 *   defaultShortcut?: string, structural?: boolean, readonlySafe?: boolean, viewSafe?: boolean,
 *   when?: (context: ActionContext, args?: Record<string, unknown>) => boolean,
 *   run: (context: ActionContext, args?: Record<string, unknown>, options?: Record<string, unknown>) => ActionResult}} Action
 * @typedef {{from: number, to: number, query: string, trigger?: string,
 *   providerId?: string, [key: string]: unknown}} CompletionMatch
 * @typedef {{id: string, label: string, detail?: string, description?: string,
 *   kind?: string, disabled?: boolean, value?: string, actionId?: string,
 *   [key: string]: unknown}} CompletionItem
 * @typedef {{id: string, priority?: number, triggers?: string[],
 *   match: (context: ActionContext) => CompletionMatch | null,
 *   getItems: (match: CompletionMatch, context: ActionContext, signal: AbortSignal) => CompletionItem[] | Promise<CompletionItem[]>,
 *   apply: (item: CompletionItem, match: CompletionMatch, context: ActionContext) => ActionResult}} CompletionProvider
 * @typedef {({value: string, label?: string} | {value?: string, label: string}) &
 *   {id?: string, detail?: string, kind?: string, [key: string]: unknown}} TagItem
 * @typedef {{allowCreate?: boolean, getItems: (request: {query: string,
 *   documentTags: Tag[], context: ActionContext, signal: AbortSignal}) =>
 *   (string | TagItem)[] | Promise<(string | TagItem)[]>}} TagProvider
 * @typedef {{caseSensitive?: boolean, from?: number, wrap?: boolean}} FindOptions
 * @typedef {{start: number, end: number, text: string}} FindMatch
 * @typedef {{files: File[], insertionPoint: number, insertMarkdown: (markdown: string) => boolean}} FileDetails
 * @typedef {{sequence: number, timestamp: number, level: number, phase: string,
 *   mode: EditorMode, valueLength: number, selection: SourceSelection, [key: string]: unknown}} DebugDetails
 * @typedef {{
 *   'md-before-change': CustomEvent<{transaction: Transaction, before: Snapshot,
 *     nextValue: string, selectionAfter: SourceSelection, source: string}>,
 *   'md-input': CustomEvent<{value: string, source: string, inputType: string | null}>,
 *   'md-change': CustomEvent<{value: string}>,
 *   'md-selection-change': CustomEvent<{selectionStart: number, selectionEnd: number, selectionDirection: SelectionDirection}>,
 *   'md-action': CustomEvent<{actionId: string, source: string, before: Snapshot, after: Snapshot, args?: unknown}>,
 *   'md-completion-open': CustomEvent<{providerId: string, match: CompletionMatch, items: CompletionItem[]}>,
 *   'md-completion-close': CustomEvent<{providerId: string | null, match: CompletionMatch | null}>,
 *   'md-completion-accept': CustomEvent<{providerId: string, item: CompletionItem, before: Snapshot, after: Snapshot}>,
 *   'md-tags-change': CustomEvent<{current: Tag[], added: Tag[], removed: Tag[], source: string, inputType: string | null}>,
 *   'md-tag-activate': CustomEvent<{tag: string, key: string, surface: 'live' | 'preview'}>,
 *   'md-render': CustomEvent<{html: string}>,
 *   'md-file-paste': CustomEvent<FileDetails>,
 *   'md-file-drop': CustomEvent<FileDetails>,
 *   'md-copy': CustomEvent<{markdown: string, start: number, end: number}>,
 *   'md-cut': CustomEvent<{markdown: string, start: number, end: number}>,
 *   'md-paste': CustomEvent<{markdown: string, kind: string}>,
 *   'md-dirty-change': CustomEvent<{dirty: boolean}>,
 *   'md-debug': CustomEvent<DebugDetails>,
 *   'md-error': CustomEvent<{phase: string, error: unknown, recoverable: boolean, [key: string]: unknown}>
 * }} WritemarkEventMap
 * @typedef {{
 *   value: string, defaultValue: string, name: string, label: string, placeholder: string,
 *   mode: EditorMode, preview: PreviewMode, markdownFlavor: MarkdownFlavor, tagsEnabled: boolean,
 *   shiftEnterBehavior: 'soft-break' | 'smart-enter', tabBehavior: 'accessibility-first' | 'editor-first',
 *   indentString: string, debug: number, debugLog: boolean, disabled: boolean, readonly: boolean,
 *   required: boolean, readonly dirty: boolean, tagProvider: TagProvider | null,
 *   selectionStart: number, selectionEnd: number,
 *   readonly validationMessage: string,
 *   readonly validity: Pick<ValidityState, 'valid' | 'valueMissing' | 'tooShort' | 'tooLong' | 'customError'>,
 *   readonly willValidate: boolean,
 *   connectedCallback(): void, disconnectedCallback(): void,
 *   attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void,
 *   formResetCallback(): void, formDisabledCallback(disabled: boolean): void,
 *   formStateRestoreCallback(state: string | File | FormData | null, mode?: 'restore' | 'autocomplete'): void,
 *   focus(options?: FocusOptions): void, blur(): void, select(): void,
 *   setSelectionRange(start: number, end: number, direction?: SelectionDirection): void,
 *   exec(actionId: string, args?: Record<string, unknown>): boolean,
 *   canExec(actionId: string, args?: Record<string, unknown>): boolean,
 *   registerAction(action: Action): void, unregisterAction(actionId: string): void,
 *   registerCompletionProvider(provider: CompletionProvider): void,
 *   unregisterCompletionProvider(providerId: string): void,
 *   getHTML(): string, getText(): string, getTags(): Tag[], getMarkdown(): string,
 *   setMarkdown(markdown: string): void, getPlainText(): string,
 *   getSelectionMarkdown(): string, insertMarkdown(markdown: string): boolean,
 *   getCurrentBlock(): MarkdownBlock | null, getSelectedBlocks(): MarkdownBlock[], getActiveMarks(): string[],
 *   find(query: string, options?: FindOptions): FindMatch | null,
 *   replace(query: string, replacement: string, options?: FindOptions): number,
 *   replaceAll(query: string, replacement: string, options?: FindOptions): number,
 *   commit(): void, reset(): void, checkValidity(): boolean, reportValidity(): boolean,
 *   setCustomValidity(message: string): void,
 *   addEventListener: {
 *     <K extends keyof WritemarkEventMap>(type: K,
 *       listener: (this: WritemarkEditorElement, event: WritemarkEventMap[K]) => void,
 *       options?: boolean | AddEventListenerOptions): void,
 *     <K extends keyof HTMLElementEventMap>(type: K,
 *       listener: (this: WritemarkEditorElement, event: HTMLElementEventMap[K]) => void,
 *       options?: boolean | AddEventListenerOptions): void,
 *     (type: string, listener: EventListenerOrEventListenerObject | null,
 *       options?: boolean | AddEventListenerOptions): void
 *   },
 *   removeEventListener: {
 *     <K extends keyof WritemarkEventMap>(type: K,
 *       listener: (this: WritemarkEditorElement, event: WritemarkEventMap[K]) => void,
 *       options?: boolean | EventListenerOptions): void,
 *     (type: string, listener: EventListenerOrEventListenerObject | null,
 *       options?: boolean | EventListenerOptions): void
 *   }
 * }} EditorAPI
 * @typedef {EditorAPI & HTMLElement} WritemarkEditorElement
 * @typedef {WritemarkEditorElement} MdLiveEditorElement
 * @typedef {{new(): WritemarkEditorElement, prototype: WritemarkEditorElement,
 *   readonly formAssociated: boolean, readonly observedAttributes: string[]}} EditorConstructor
 */
export {};
