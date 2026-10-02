import { isAppleWebKitRuntime, isIOSWebKitRuntime, readSelectionCandidates } from "../browser/runtime.js";
import { SelectionController } from "../browser/selection.js";
import { LiveRenderer } from "../render/live.js";
import { InputController } from "../browser/input.js";
import { DocumentState } from "../core/state.js";
import { UndoHistory } from "../core/history.js";
import { CompletionController } from "../browser/completions.js";
import { installBuiltInActions } from "../actions/registry.js";
import { deleteSelectionResult, markdownShortcut, smartDelete, smartBackspace, smartOutdent, lineOutdentAmount, indentLines, outdentLines } from "../actions/editing.js";
import { serializeTableBlock, tableCellTexts, tablePositionForOffset, tableColumnResult, tableDeleteRowResult, tableRowSourceParts, escapeTableCellText, tableBlockSourceWithOffsets, tableRowInsertionResult } from "../actions/tables.js";
import { toggleParagraph, toggleHeading, toggleList, toggleTaskDone, toggleBlockquote, toggleCodeFence, insertHorizontalRule, insertTable, setCodeLanguageResult } from "../actions/blocks.js";
import { wrapInline, wrapCode, insertLink, insertImage } from "../actions/inline.js";
import { renderTemplate } from "./template.js";
import { expandMarkdownFormattingRange, looksLikeBlockMarkdown, markdownFromClipboardData, safeClipboardGet, textFromMarkdown } from "../browser/clipboard.js";
import { displayShortcut, uid } from "../browser/util.js";
import { ALIASES, DEFAULTS, LANGUAGES, LIVE_ARROW_KEYS, LIVE_STRUCTURAL_BLOCK_TYPES, NAVIGATION_KEYS, REFLECTED_ATTRIBUTES, normalizeIndentAttribute } from "../config.js";
import { clamp, getLineRange, literalSearchPattern, nextGraphemeOffset, normalizeLineEndings, now, parseLengthConstraint, previousGraphemeOffset } from "../core/text.js";
import { applyTextChanges, changedSpans, diffTextChange, fail, insertionTransaction, makeSnapshot, normalizeChanges, ok, okNoop, removePrefixFromLine, sameSelection, tx } from "../core/transactions.js";
import { classifyLine, getFenceInfo, getSelectedLineRanges, hasClosingFenceAfter, isFenceLine, isHorizontalRule, isInsideFence, isInsideInlineCode, makeLineInfo, parseBlockquote, parseHeading, parseListItem, parseSetextHeadingLevel, usesGfm } from "../markdown/block-syntax.js";
import { assignHeadingIds, parseBlocks } from "../markdown/blocks.js";
import { codeSpanMarkdown, emphasisPairs, isBackslashEscaped, matchingBrackets, parseCodeSpanAt, parseInlineLinkAt, parseReferenceLinkAt } from "../markdown/inline.js";
import { extractReferenceDefinitions, parseReferenceDefinition } from "../markdown/references.js";
import { isLikelyTableRow, isTableDelimiter, splitTableRow, tableAlignmentFromDelimiter, tableAlignmentStyle, unescapeTableCellText } from "../markdown/tables.js";
import { cloneTags, isTagBodyCharacter, isTagBoundary, isValidTagValue, normalizeTagKey, parseTags } from "../markdown/tags.js";
import { renderMarkdown } from "../render/html.js";
import { decorateInline } from "../render/inline.js";
import { codeLanguage, escapeAttribute, escapeHtml, escapeMarkdownLabel, isProbablyUrl, markdownLinkDestination } from "../security.js";

/** @internal */
export class WritemarkEditorElement extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return REFLECTED_ATTRIBUTES; }

  constructor() {
    super();
    this._document = new DocumentState();
    this._history = new UndoHistory();
    this._inputController = new InputController({
      getDisabled: () => this.disabled,
      setDisabled: value => { this.disabled = value; },
      getReadonly: () => this.readonly,
      setReadonly: value => { this.readonly = value; },
      _undo: (...args) => this._undo(...args),
      _redo: (...args) => this._redo(...args),
      _snapshot: (...args) => this._snapshot(...args),
      getSourceTextarea: () => this._sourceTextarea,
      getValue: () => this._value,
      setValue: value => { this._value = value; },
      getSelection: () => this._selection,
      setSelection: value => { this._selection = value; },
      _scheduleCompletionUpdate: (...args) => this._scheduleCompletionUpdate(...args),
      _recordUndo: (...args) => this._recordUndo(...args),
      _undoGroupForInput: (...args) => this._undoGroupForInput(...args),
      getRedoStack: () => this._redoStack,
      _afterValueChanged: (...args) => this._afterValueChanged(...args),
      _closeCompletion: (...args) => this._closeCompletion(...args),
      _isLiveVisible: (...args) => this._isLiveVisible(...args),
      getLiveDirty: () => this._liveDirty,
      _renderAll: (...args) => this._renderAll(...args),
      getIgnoreSelectionChangeCount: () => this._ignoreSelectionChangeCount,
      setIgnoreSelectionChangeCount: value => { this._ignoreSelectionChangeCount = value; },
      getStructuredSelection: () => this._structuredSelection,
      setStructuredSelection: value => { this._structuredSelection = value; },
      _debug: (...args) => this._debug(...args),
      _debugEditableInfo: (...args) => this._debugEditableInfo(...args),
      getLiveSelectionAPI: () => this._liveSelectionAPI,
      getFallbackSelectionPending: () => this._fallbackSelectionPending,
      setFallbackSelectionPending: value => { this._fallbackSelectionPending = value; },
      getFallbackEditable: () => this._fallbackEditable,
      setFallbackEditable: value => { this._fallbackEditable = value; },
      _ensureEmptyLiveEditable: (...args) => this._ensureEmptyLiveEditable(...args),
      _isSourceActive: (...args) => this._isSourceActive(...args),
      _getContext: (...args) => this._getContext(...args),
      _isAppleWebKitRuntime: (...args) => this._isAppleWebKitRuntime(...args),
      _isIOSWebKitRuntime: (...args) => this._isIOSWebKitRuntime(...args),
      getShiftEnterBehavior: () => this.shiftEnterBehavior,
      _isUnclosedFenceOpeningContext: (...args) => this._isUnclosedFenceOpeningContext(...args),
      _runAction: (...args) => this._runAction(...args),
      _closestEditable: (...args) => this._closestEditable(...args),
      _activeEditableFromSelection: (...args) => this._activeEditableFromSelection(...args),
      _editableSourceRange: (...args) => this._editableSourceRange(...args),
      _applyActionResult: (...args) => this._applyActionResult(...args),
      _markdownShortcut: (...args) => this._markdownShortcut(...args),
      _parseOptions: (...args) => this._parseOptions(...args),
      _getCurrentSelection: (...args) => this._getCurrentSelection(...args),
      _smartBackspace: (...args) => this._smartBackspace(...args),
      _debugTextChanges: (...args) => this._debugTextChanges(...args),
      _plainText: (...args) => this._plainText(...args),
      _getLiveSelection: (...args) => this._getLiveSelection(...args),
      _displayOffsetFromSourceOffset: (...args) => this._displayOffsetFromSourceOffset(...args),
      _displayOffsetFromSelection: (...args) => this._displayOffsetFromSelection(...args),
      _tableCellInputEdit: (...args) => this._tableCellInputEdit(...args),
      _sourceOffsetFromDom: (...args) => this._sourceOffsetFromDom(...args)
    });
    this._liveRenderer = new LiveRenderer({
      getLiveEditor: () => this._liveEditor,
      setLiveEditor: value => { this._liveEditor = value; },
      getSourceTextarea: () => this._sourceTextarea,
      getValue: () => this._value,
      _isSourceActive: (...args) => this._isSourceActive(...args),
      getSelection: () => this._selection,
      getIsComposing: () => this._isComposing,
      _restoreLiveSelection: (...args) => this._restoreLiveSelection(...args),
      getMode: () => this.mode,
      getPreview: () => this.preview,
      getAttribute: (...args) => this.getAttribute(...args),
      getPreviewElement: () => this._preview,
      setPreview: value => { this._preview = value; },
      getHTML: (...args) => this.getHTML(...args),
      _dispatch: (...args) => this._dispatch(...args),
      _emitError: (...args) => this._emitError(...args),
      _parseOptions: (...args) => this._parseOptions(...args),
      _rebuildLiveIndex: (...args) => this._rebuildLiveIndex(...args),
      getLiveIndexDirty: () => this._liveIndexDirty,
      setLiveIndexDirty: value => { this._liveIndexDirty = value; },
      _debug: (...args) => this._debug(...args),
      getPlaceholder: () => this.placeholder,
      getLiveSelectionAPI: () => this._liveSelectionAPI,
      _computedLineHeight: (...args) => this._computedLineHeight(...args),
      _rendererOptions: (...args) => this._rendererOptions(...args),
      getIndentString: () => this.indentString,
      getDisabled: () => this.disabled,
      setDisabled: value => { this.disabled = value; },
      getReadonly: () => this.readonly,
      setReadonly: value => { this.readonly = value; }
    });
    this._selectionController = new SelectionController({
      hasComponentFocus: (...args) => this._hasComponentFocus(...args),
      readSelectionCandidates: (...args) => this._liveSelectionCandidates(...args),
      isIOSWebKitRuntime: (...args) => this._isIOSWebKitRuntime(...args),
      isAppleWebKitRuntime: (...args) => this._isAppleWebKitRuntime(...args),
      getDisabled: () => this.disabled,
      getReadonly: () => this.readonly,
      getMode: () => this.mode,
      _closeCompletion: (...args) => this._closeCompletion(...args),
      getSelection: () => this._selection,
      setSelection: value => { this._selection = value; },
      setSelectionRange: (...args) => this.setSelectionRange(...args),
      getOwnerDocument: () => this.ownerDocument,
      _emitSelectionChange: (...args) => this._emitSelectionChange(...args),
      getIsComposing: () => this._isComposing,
      setIsComposing: value => { this._isComposing = value; },
      _scheduleCompletionUpdate: (...args) => this._scheduleCompletionUpdate(...args),
      getValue: () => this._value,
      _activeEditableFromEvent: (...args) => this._activeEditableFromEvent(...args),
      getShadow: () => this._shadow,
      _debug: (...args) => this._debug(...args),
      _debugEditableInfo: (...args) => this._debugEditableInfo(...args),
      getSourceTextarea: () => this._sourceTextarea,
      getPreview: () => this._preview,
      getLiveEditor: () => this._liveEditor,
      setLiveEditor: value => { this._liveEditor = value; },
      getVirtualState: () => this._virtualState,
      _ensureVirtualSelectionVisible: (...args) => this._ensureVirtualSelectionVisible(...args),
      getIsConnected: () => this.isConnected,
      _lineEditable: (...args) => this._lineEditable(...args),
      _syncLiveEditingHosts: (...args) => this._syncLiveEditingHosts(...args),
      _isSourceOffsetRendered: (...args) => this._isSourceOffsetRendered(...args),
      getLiveBlocks: () => this._liveBlocks,
      setLiveBlocks: value => { this._liveBlocks = value; },
      _getBlocks: (...args) => this._getBlocks(...args),
      _renderLiveVirtual: (...args) => this._renderLiveVirtual(...args),
      _renderLiveFull: (...args) => this._renderLiveFull(...args)
    });
    this._internals = this.attachInternals?.() ?? null;
    this._shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
    this._value = "";
    this._defaultValue = "";
    this._selection = { start: 0, end: 0, direction: "none" };
    this._dirty = false;
    this._formDisabled = false;
    this._hostTabIndexBeforeDisable = undefined;
    this._hasConnected = false;
    this._debugSequence = 0;
    this._selectAllLevel = 0;
    this._focusWithin = false;
    this._validationVisible = false;
    this._completionPositionFrame = 0;
    this._completionVisualViewport = null;
    this._boundCompletionViewportChange = () => this._scheduleCompletionPositionUpdate();
    this._actions = new Map();
    this._tagProvider = null;
    this._tagIndex = [];
    this._ids = { label: uid("mfe-label"), source: uid("mfe-source"), live: uid("mfe-live"), completion: uid("mfe-completion"), status: uid("mfe-status"), validation: uid("mfe-validation") };
    this._completionController = new CompletionController({
      registerProvider: (...args) => this.registerCompletionProvider(...args),
      getContext: (...args) => this._getContext(...args),
      emitError: (...args) => this._emitError(...args),
      render: (...args) => this._renderCompletion(...args),
      stopPositionTracking: (...args) => this._stopCompletionPositionTracking(...args),
      startPositionTracking: (...args) => this._startCompletionPositionTracking(...args),
      isUnclosedFenceOpeningContext: (...args) => this._isUnclosedFenceOpeningContext(...args),
      snapshot: (...args) => this._snapshot(...args),
      applyTransaction: (...args) => this._applyTransaction(...args),
      dispatch: (...args) => this._dispatch(...args),
      announce: (...args) => this._announce(...args),
      getTags: (...args) => this.getTags(...args),
      actions: () => this._actions.values(),
      getTagIndex: () => this._tagIndex,
      getTagProvider: () => this._tagProvider,
      tagsEnabled: () => this.tagsEnabled,
      disabled: () => this.disabled,
      readonly: () => this.readonly,
      isComposing: () => this._isComposing
    });
    this._providers = this._completionController._providers;
    this._installBuiltInActions();
    this._installBuiltInProviders();
  }

  get _completion() { return this._completionController._completion; }
  set _completion(value) { this._completionController._completion = value; }
  get _completionUpdateFrame() { return this._completionController._completionUpdateFrame; }
  set _completionUpdateFrame(value) { this._completionController._completionUpdateFrame = value; }

  get _value() { return this._document.value; }
  set _value(value) { this._document.value = value; }
  get _defaultValue() { return this._document.defaultValue; }
  set _defaultValue(value) { this._document.defaultValue = value; }
  get _selection() { return this._document.selection; }
  set _selection(value) { this._document.selection = value; }
  get _dirty() { return this._document.dirty; }
  set _dirty(value) { this._document.dirty = value; }
  get _undoStack() { return this._history.undoStack; }
  set _undoStack(value) { this._history.undoStack = value; }
  get _redoStack() { return this._history.redoStack; }
  set _redoStack(value) { this._history.redoStack = value; }
  get _maxUndo() { return this._history.maxEntries; }
  set _maxUndo(value) { this._history.maxEntries = value; }

  get _beforeInputSnapshot() { return this._inputController._beforeInputSnapshot; }
  set _beforeInputSnapshot(value) { this._inputController._beforeInputSnapshot = value; }
  get _beforeInputTarget() { return this._inputController._beforeInputTarget; }
  set _beforeInputTarget(value) { this._inputController._beforeInputTarget = value; }
  get _compositionSnapshot() { return this._inputController._compositionSnapshot; }
  set _compositionSnapshot(value) { this._inputController._compositionSnapshot = value; }
  get _isComposing() { return this._inputController._isComposing; }
  set _isComposing(value) { this._inputController._isComposing = value; }
  get _pendingFenceOpening() { return this._inputController._pendingFenceOpening; }
  set _pendingFenceOpening(value) { this._inputController._pendingFenceOpening = value; }
  get _webKitNativeInput() { return this._inputController._webKitNativeInput; }
  set _webKitNativeInput(value) { this._inputController._webKitNativeInput = value; }
  get _blockCache() { return this._liveRenderer._blockCache; }
  set _blockCache(value) { this._liveRenderer._blockCache = value; }
  get _blockCacheValue() { return this._liveRenderer._blockCacheValue; }
  set _blockCacheValue(value) { this._liveRenderer._blockCacheValue = value; }
  get _hasRenderedOnce() { return this._liveRenderer._hasRenderedOnce; }
  set _hasRenderedOnce(value) { this._liveRenderer._hasRenderedOnce = value; }
  get _lastParseMode() { return this._liveRenderer._lastParseMode; }
  set _lastParseMode(value) { this._liveRenderer._lastParseMode = value; }
  get _liveBlocks() { return this._liveRenderer._liveBlocks; }
  set _liveBlocks(value) { this._liveRenderer._liveBlocks = value; }
  get _liveDirty() { return this._liveRenderer._liveDirty; }
  set _liveDirty(value) { this._liveRenderer._liveDirty = value; }
  get _nativeLiveDomDirty() { return this._liveRenderer._nativeLiveDomDirty; }
  set _nativeLiveDomDirty(value) { this._liveRenderer._nativeLiveDomDirty = value; }
  get _previewDirty() { return this._liveRenderer._previewDirty; }
  set _previewDirty(value) { this._liveRenderer._previewDirty = value; }
  get _previewRenderTimer() { return this._liveRenderer._previewRenderTimer; }
  set _previewRenderTimer(value) { this._liveRenderer._previewRenderTimer = value; }
  get _virtualMetricsCache() { return this._liveRenderer._virtualMetricsCache; }
  set _virtualMetricsCache(value) { this._liveRenderer._virtualMetricsCache = value; }
  get _virtualScrollFrame() { return this._liveRenderer._virtualScrollFrame; }
  set _virtualScrollFrame(value) { this._liveRenderer._virtualScrollFrame = value; }
  get _virtualState() { return this._liveRenderer._virtualState; }
  set _virtualState(value) { this._liveRenderer._virtualState = value; }
  get _liveEditablesCache() { return this._selectionController._liveEditablesCache; }
  set _liveEditablesCache(value) { this._selectionController._liveEditablesCache = value; }
  get _liveNavigationCache() { return this._selectionController._liveNavigationCache; }
  set _liveNavigationCache(value) { this._selectionController._liveNavigationCache = value; }
  get _liveIndexDirty() { return this._selectionController._liveIndexDirty; }
  set _liveIndexDirty(value) { this._selectionController._liveIndexDirty = value; }
  get _liveSelectionAPI() { return this._selectionController._liveSelectionAPI; }
  set _liveSelectionAPI(value) { this._selectionController._liveSelectionAPI = value; }
  get _fallbackEditable() { return this._selectionController._fallbackEditable; }
  set _fallbackEditable(value) { this._selectionController._fallbackEditable = value; }
  get _fallbackSelectionPending() { return this._selectionController._fallbackSelectionPending; }
  set _fallbackSelectionPending(value) { this._selectionController._fallbackSelectionPending = value; }
  get _selectionRestoreRequest() { return this._selectionController._selectionRestoreRequest; }
  set _selectionRestoreRequest(value) { this._selectionController._selectionRestoreRequest = value; }
  get _pointerSelection() { return this._selectionController._pointerSelection; }
  set _pointerSelection(value) { this._selectionController._pointerSelection = value; }
  get _suppressLiveClick() { return this._selectionController._suppressLiveClick; }
  set _suppressLiveClick(value) { this._selectionController._suppressLiveClick = value; }
  get _structuredSelection() { return this._selectionController._structuredSelection; }
  set _structuredSelection(value) { this._selectionController._structuredSelection = value; }
  get _ignoreSelectionChangeCount() { return this._selectionController._ignoreSelectionChangeCount; }
  set _ignoreSelectionChangeCount(value) { this._selectionController._ignoreSelectionChangeCount = value; }

  connectedCallback() {
    if (!this._hasConnected) {
      this._upgradeProperties();
      this._renderShell();
      this._bindEvents();
      this._hasConnected = true;
      const initial = this.getAttribute("value") ?? this._value ?? "";
      this._defaultValue = normalizeLineEndings(initial);
      this._setValueInternal(this._defaultValue, { source: "init", silent: true, recordUndo: false, preserveSelection: false });
      this._syncAttributesToControls();
      this._renderAll({ restoreSelection: false });
      this._updateFormValue();
      this._updateValidity();
    } else {
      this._syncAttributesToControls();
      this._renderAll({ restoreSelection: true });
      this._updateFormValue();
      this._updateValidity();
    }
    if (this._completion.open) this._startCompletionPositionTracking();
  }
  disconnectedCallback() {
    this._selectionController.disconnect();
    this._completionController.disconnect();
    this._selectionRestoreRequest += 1;
    this._completion.abort?.abort();
    if (this._previewRenderTimer) globalThis.clearTimeout?.(this._previewRenderTimer);
    if (this._completionUpdateFrame) cancelAnimationFrame(this._completionUpdateFrame);
    this._stopCompletionPositionTracking();
    if (this._virtualScrollFrame) cancelAnimationFrame(this._virtualScrollFrame);
    this._previewRenderTimer = 0;
    this._completionUpdateFrame = 0;
    this._completionPositionFrame = 0;
    this._virtualScrollFrame = 0;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value") {
      const nextDefault = normalizeLineEndings(newValue ?? "");
      if (!this._hasConnected) { this._value = nextDefault; this._defaultValue = nextDefault; return; }
      const wasDirty = this._dirty;
      this._defaultValue = nextDefault;
      if (!wasDirty) this._setValueInternal(nextDefault, { source: "attribute", silent: true, recordUndo: false, preserveSelection: false });
      else {
        const oldDirty = this._dirty;
        this._dirty = this._value !== this._defaultValue;
        if (oldDirty !== this._dirty) this._dispatch("md-dirty-change", { dirty: this._dirty });
      }
      return;
    }
    if (!this._hasConnected) return;
    if (name === "tags-enabled") {
      const restoreFocus = this._hasComponentFocus();
      if (!this._isComposing) this._selection = { ...this._getCurrentSelection() };
      if (!restoreFocus) this._selectionRestoreRequest += 1;
      this._closeCompletion();
      const tagChange = this._refreshTagIndex();
      this._renderAll({ restoreSelection: restoreFocus && !this.disabled, force: true });
      if (restoreFocus && !this.disabled && !this._isComposing) this._focusEditable();
      if (tagChange) this._dispatch("md-tags-change", { ...tagChange, source: "attribute", inputType: null });
      if (restoreFocus) this._scheduleCompletionUpdate();
      return;
    }
    if (this._isComposing && ["mode", "disabled", "readonly"].includes(name)) {
      this._onCompositionEnd();
    }
    const restoreFocus = (name === "mode" || name === "readonly") && (this._focusWithin || Boolean(this._shadow.activeElement));
    if ((name === "disabled" || name === "readonly") && (this.disabled || this.readonly)) this._closeCompletion();
    this._syncAttributesToControls();
    if (name === "disabled" && this.disabled) this.blur();
    if (["mode", "preview", "disabled", "readonly"].includes(name)) this._renderAll({ restoreSelection: !this.disabled, force: true });
    if (["required", "disabled", "readonly", "maxlength", "minlength"].includes(name)) { this._updateFormValue(); this._updateValidity(); }
    if (restoreFocus && !this.disabled) this._focusEditable();
  }

  get value() { return this._value; }
  set value(next) { this._setValueInternal(next, { source: "api", silent: false, recordUndo: false }); }
  get defaultValue() { return this._defaultValue; }
  set defaultValue(next) { this._defaultValue = normalizeLineEndings(next ?? ""); this.setAttribute("value", this._defaultValue); }
  get name() { return this.getAttribute("name") ?? ""; }
  set name(v) { v == null ? this.removeAttribute("name") : this.setAttribute("name", String(v)); }
  get label() { return this.getAttribute("label") ?? ""; }
  set label(v) { v == null ? this.removeAttribute("label") : this.setAttribute("label", String(v)); }
  get placeholder() { return this.getAttribute("placeholder") ?? DEFAULTS.placeholder; }
  set placeholder(v) { v == null ? this.removeAttribute("placeholder") : this.setAttribute("placeholder", String(v)); }
  get mode() { const v = this.getAttribute("mode") ?? DEFAULTS.mode; return ["live", "source", "split", "preview"].includes(v) ? v : DEFAULTS.mode; }
  set mode(v) { v == null ? this.removeAttribute("mode") : this.setAttribute("mode", String(v)); }
  get preview() { const v = this.getAttribute("preview") ?? DEFAULTS.preview; return ["none", "below", "side", "inline-split"].includes(v) ? v : DEFAULTS.preview; }
  set preview(v) { v == null ? this.removeAttribute("preview") : this.setAttribute("preview", String(v)); }
  get markdownFlavor() { const v = this.getAttribute("markdown-flavor") ?? DEFAULTS.markdownFlavor; return ["gfm", "commonmark"].includes(v) ? v : DEFAULTS.markdownFlavor; }
  set markdownFlavor(v) { v == null ? this.removeAttribute("markdown-flavor") : this.setAttribute("markdown-flavor", String(v)); }
  get tagsEnabled() { return this.hasAttribute("tags-enabled"); }
  set tagsEnabled(v) { this.toggleAttribute("tags-enabled", Boolean(v)); }
  get shiftEnterBehavior() { const v = this.getAttribute("shift-enter-behavior") ?? DEFAULTS.shiftEnterBehavior; return ["soft-break", "smart-enter"].includes(v) ? v : DEFAULTS.shiftEnterBehavior; }
  set shiftEnterBehavior(v) { v == null ? this.removeAttribute("shift-enter-behavior") : this.setAttribute("shift-enter-behavior", String(v)); }
  get tabBehavior() { const v = this.getAttribute("tab-behavior") ?? DEFAULTS.tabBehavior; return ["accessibility-first", "editor-first"].includes(v) ? v : DEFAULTS.tabBehavior; }
  set tabBehavior(v) { v == null ? this.removeAttribute("tab-behavior") : this.setAttribute("tab-behavior", String(v)); }
  get indentString() { return normalizeIndentAttribute(this.getAttribute("indent-string") ?? DEFAULTS.indentString); }
  set indentString(v) { this.setAttribute("indent-string", v === "\t" ? "tab" : String(v)); }
  get debug() {
    const raw = Number(this.getAttribute("debug") ?? DEFAULTS.debug);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULTS.debug;
  }
  set debug(v) {
    if (v == null) {
      this.removeAttribute("debug");
      return;
    }
    const next = Number(v);
    this.setAttribute("debug", String(Number.isFinite(next) && next >= 0 ? Math.floor(next) : DEFAULTS.debug));
  }
  get debugLog() { return this.hasAttribute("debug-log"); }
  set debugLog(v) { this.toggleAttribute("debug-log", Boolean(v)); }
  get disabled() { return this.hasAttribute("disabled") || this._formDisabled; }
  set disabled(v) { this.toggleAttribute("disabled", Boolean(v)); }
  get readonly() { return this.hasAttribute("readonly"); }
  set readonly(v) { this.toggleAttribute("readonly", Boolean(v)); }
  get required() { return this.hasAttribute("required"); }
  set required(v) { this.toggleAttribute("required", Boolean(v)); }
  get dirty() { return this._dirty; }
  get tagProvider() { return this._tagProvider; }
  set tagProvider(provider) {
    if (provider != null && (typeof provider !== "object" || typeof provider.getItems !== "function")) {
      throw new TypeError("tagProvider requires a getItems function.");
    }
    this._tagProvider = provider || null;
    if (this._hasConnected && this.tagsEnabled) this._scheduleCompletionUpdate({ immediate: true });
  }
  get selectionStart() { return this._getCurrentSelection().start; }
  set selectionStart(v) { this.setSelectionRange(v, this.selectionEnd); }
  get selectionEnd() { return this._getCurrentSelection().end; }
  set selectionEnd(v) { this.setSelectionRange(this.selectionStart, v); }
  get validationMessage() { return this._internals?.validationMessage || this._validationMessage || ""; }
  get validity() { return this._internals?.validity ?? this._fallbackValidity(); }
  get willValidate() { return this._internals?.willValidate ?? !this.disabled; }

  focus(options) { this._focusEditable(options); }
  blur() { this._focusWithin = false; this._shadow?.activeElement?.blur?.(); this._sourceTextarea?.blur(); this._liveEditor?.blur(); this._preview?.blur(); }
  select() { this.setSelectionRange(0, this._value.length); }
  setSelectionRange(start, end, direction = "none") {
    const s = clamp(Number(start) || 0, 0, this._value.length);
    const e = clamp(Number(end) || 0, 0, this._value.length);
    this._selection = { start: s, end: e, direction };
    this._structuredSelection = (!this._isSourceActive() && s !== e) ? { start: s, end: e, direction, label: "selection" } : null;
    if (this._sourceTextarea && this._isSourceActive()) this._sourceTextarea.setSelectionRange(s, e, direction);
    if (this._liveEditor && !this._isSourceActive()) { this._ignoreSelectionChangeCount = 2; this._restoreLiveSelection(this._selection); }
    this._emitSelectionChange();
    this._scheduleCompletionUpdate();
  }
  exec(actionId, args) { const result = this._runAction(actionId, args, { source: "api", apply: true }); return Boolean(result?.ok); }
  registerAction(action) {
    if (!action || typeof action.id !== "string" || typeof action.run !== "function") throw new TypeError("registerAction(action) requires an action with string id and run(ctx,args).");
    this._actions.set(action.id, { group: "Custom", visibleInSlash: false, aliases: [], keywords: [], ...action });
  }
  unregisterAction(actionId) { this._actions.delete(actionId); }
  registerCompletionProvider(provider) {
    if (!provider || typeof provider.id !== "string" || typeof provider.match !== "function" || typeof provider.getItems !== "function" || typeof provider.apply !== "function") throw new TypeError("Completion provider requires id, match, getItems, apply.");
    this._providers.set(provider.id, { priority: 0, triggers: [], ...provider });
  }
  unregisterCompletionProvider(providerId) { this._providers.delete(providerId); if (this._completion.providerId === providerId) this._closeCompletion(); }
  getHTML() { return renderMarkdown(this._value, this._rendererOptions()); }
  getText() { return textFromMarkdown(this._value, this._rendererOptions()); }
  getTags() { return cloneTags(this._tagIndex); }
  getMarkdown() { return this._value; }
  setMarkdown(markdown) { this.value = markdown; }
  getPlainText() { return this.getText(); }
  getSelectionMarkdown() { const sel = this._getCurrentSelection(); return this._value.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end)); }
  insertMarkdown(markdown) { return this.exec("editor.insertText", { text: markdown }); }
  canExec(actionId, args) { const action = this._actions.get(actionId); if (!action) return false; const ctx = this._getContext(); if (ctx.mode === "disabled" && !action.viewSafe) return false; if (ctx.mode === "readonly" && !action.readonlySafe && !action.viewSafe) return false; if (ctx.mode === "composing-ime" && action.structural !== false) return false; return !action.when || action.when(ctx, args); }
  getCurrentBlock() { const sel = this._getCurrentSelection(); return this._findBlockAtOffset(sel.start) || null; }
  getSelectedBlocks() { const sel = this._getCurrentSelection(); const start = Math.min(sel.start, sel.end); const end = Math.max(sel.start, sel.end); return this._getBlocks().filter(block => block.to >= start && block.from <= end); }
  getActiveMarks() { return this._getActiveStateIds(this._getContext()); }
  find(query, options = {}) { return this._findText(query, options); }
  replace(query, replacement, options = {}) { return this._replaceText(query, replacement, { ...options, all: false }); }
  replaceAll(query, replacement, options = {}) { return this._replaceText(query, replacement, { ...options, all: true }); }
  commit() { const old = this._dirty; this._defaultValue = this._value; this._dirty = false; this._dispatch("md-change", { value: this._value }); if (old) this._dispatch("md-dirty-change", { dirty: false }); }
  reset() { this._setValueInternal(this._defaultValue, { source: "api", recordUndo: true }); this.setSelectionRange(0, 0); this._dirty = false; this._dispatch("md-dirty-change", { dirty: false }); }
  checkValidity() { this._updateValidity(); return this._internals ? this._internals.checkValidity() : this._fallbackValidity().valid; }
  reportValidity() { this._validationVisible = true; this._updateValidity(); return this._internals ? this._internals.reportValidity() : this.checkValidity(); }
  setCustomValidity(message) { this._customValidityMessage = String(message ?? ""); this._updateValidity(); }

  _upgradeProperties() {
    for (const prop of ["value", "defaultValue", "name", "label", "placeholder", "mode", "preview", "markdownFlavor", "tagsEnabled", "shiftEnterBehavior", "tabBehavior", "indentString", "debug", "debugLog", "disabled", "readonly", "required", "tagProvider"]) {
      if (Object.prototype.hasOwnProperty.call(this, prop)) { const value = this[prop]; delete this[prop]; this[prop] = value; }
    }
  }

  _renderShell() {
    this._shadow.innerHTML = renderTemplate(this._ids);
    this._label = this._shadow.querySelector(".label");
    this._liveEditor = this._shadow.querySelector(".live-editor");
    this._sourceTextarea = this._shadow.querySelector("textarea");
    this._preview = this._shadow.querySelector(".preview");
    this._completionPopup = this._shadow.querySelector(".completion-popup");
    this._validation = this._shadow.querySelector(".validation");
    this._status = this._shadow.querySelector(".sr-only");
  }

  _bindEvents() {
    this._sourceTextarea.addEventListener("beforeinput", event => this._onSourceBeforeInput(event));
    this._sourceTextarea.addEventListener("input", event => this._onSourceInput(event));
    this._sourceTextarea.addEventListener("change", () => this._dispatch("md-change", { value: this._value }));
    this._sourceTextarea.addEventListener("keydown", event => this._onKeyDown(event));
    this._sourceTextarea.addEventListener("keyup", event => this._onNavigationKey(event));
    this._sourceTextarea.addEventListener("click", () => this._onSelectionChanged());
    this._sourceTextarea.addEventListener("select", () => this._onSelectionChanged());
    this._sourceTextarea.addEventListener("paste", event => this._onPaste(event));
    this._sourceTextarea.addEventListener("drop", event => this._onDrop(event));
    this._sourceTextarea.addEventListener("compositionstart", () => this._onCompositionStart());
    this._sourceTextarea.addEventListener("compositionend", () => this._onCompositionEnd());

    this._liveEditor.addEventListener("focus", () => { if (this._selection.start > this._value.length) this._selection = { start: 0, end: 0, direction: "none" }; }, true);
    this._liveEditor.addEventListener("keydown", event => this._onKeyDown(event));
    this._liveEditor.addEventListener("keyup", event => this._onNavigationKey(event));
    this._liveEditor.addEventListener("beforeinput", event => this._onLiveBeforeInput(event));
    this._liveEditor.addEventListener("input", event => this._onLiveInput(event));
    this._liveEditor.addEventListener("click", event => this._onLiveClick(event));
    this._liveEditor.addEventListener("mousedown", event => this._onLiveMouseDown(event));
    this._liveEditor.addEventListener("mouseup", () => this._onSelectionChanged());
    this._liveEditor.addEventListener("scroll", () => this._onLiveScroll());
    this._liveEditor.addEventListener("copy", event => this._onLiveCopy(event));
    this._liveEditor.addEventListener("cut", event => this._onLiveCut(event));
    this._liveEditor.addEventListener("paste", event => this._onPaste(event));
    this._liveEditor.addEventListener("drop", event => this._onDrop(event));
    this._liveEditor.addEventListener("compositionstart", () => this._onCompositionStart());
    this._liveEditor.addEventListener("compositionend", () => this._onCompositionEnd());
    this._liveEditor.addEventListener("focusout", event => {
      const relatedTarget = event.relatedTarget || null;
      queueMicrotask(() => {
        const active = this._shadow?.activeElement || null;
        const focusRemainsInside = [relatedTarget, active].some(target =>
          target && (target === this._liveEditor || this._liveEditor.contains(target))
        ) || this._liveEditor.matches?.(":focus-within");
        if (!focusRemainsInside) {
          this._flushNativeLiveDom();
        }
      });
    });
    this._preview.addEventListener("click", event => this._onPreviewClick(event));
    this._preview.addEventListener("keydown", event => this._onPreviewKeyDown(event));

    this._completionPopup.addEventListener("mousedown", e => e.preventDefault());
    this._completionPopup.addEventListener("click", e => { const item = e.target.closest("[data-index]"); if (!item) return; const index = Number(item.dataset.index); if (this._completion.items[index]?.disabled) return; this._completion.activeIndex = index; this._acceptCompletion("pointer"); });
    this._label.addEventListener("click", event => { event.preventDefault(); this._focusEditable(); });
    this._shadow.addEventListener("focusin", () => { this._focusWithin = true; });
    this._shadow.addEventListener("focusout", () => { queueMicrotask(() => { this._focusWithin = this._hasComponentFocus(); }); });
    this._shadow.addEventListener("selectionchange", () => this._onSelectionChanged?.());
  }

  _syncAttributesToControls() {
    if (!this._sourceTextarea) return;
    if (this.disabled) {
      if (this._hostTabIndexBeforeDisable === undefined) {
        this._hostTabIndexBeforeDisable = this.getAttribute("tabindex");
      }
      this.tabIndex = -1;
    } else if (this._hostTabIndexBeforeDisable !== undefined) {
      const previousTabIndex = this._hostTabIndexBeforeDisable;
      this._hostTabIndexBeforeDisable = undefined;
      if (previousTabIndex == null) this.removeAttribute("tabindex");
      else this.setAttribute("tabindex", previousTabIndex);
    }
    this._label.textContent = this.label; this._label.hidden = !this.label;
    this._sourceTextarea.placeholder = this.placeholder;
    this._sourceTextarea.disabled = this.disabled;
    this._sourceTextarea.readOnly = this.readonly;
    this._sourceTextarea.required = this.required;
    this._sourceTextarea.name = this.name;
    this._liveEditor.setAttribute("aria-readonly", this.readonly ? "true" : "false");
    this._liveEditor.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    this._liveEditor.contentEditable = this._liveSelectionAPI === false
      ? "false"
      : this._lineEditable();
    this._syncLiveEditingHosts();
    this._liveEditor.tabIndex = this.disabled ? -1 : 0;
    this._preview.tabIndex = this.disabled ? -1 : (this.mode === "preview" ? 0 : -1);
    const maxLength = parseLengthConstraint(this.getAttribute("maxlength"));
    const minLength = parseLengthConstraint(this.getAttribute("minlength"));
    maxLength != null ? this._sourceTextarea.maxLength = maxLength : this._sourceTextarea.removeAttribute("maxlength");
    minLength != null ? this._sourceTextarea.minLength = minLength : this._sourceTextarea.removeAttribute("minlength");
    const rawSpellcheck = this.getAttribute("spellcheck");
    const spellcheck = rawSpellcheck == null || rawSpellcheck === "" || rawSpellcheck === "true";
    this._sourceTextarea.spellcheck = spellcheck;
    this._liveEditor.spellcheck = spellcheck;
    const ariaLabel = this.getAttribute("aria-label"); const ariaLabelledby = this.getAttribute("aria-labelledby");
    for (const el of [this._sourceTextarea, this._liveEditor]) {
      if (ariaLabel) el.setAttribute("aria-label", ariaLabel); else el.removeAttribute("aria-label");
      if (ariaLabelledby) el.setAttribute("aria-labelledby", ariaLabelledby); else if (this.label) el.setAttribute("aria-labelledby", this._ids.label); else el.removeAttribute("aria-labelledby");
      const dir = this.getAttribute("dir");
      if (dir) el.dir = dir; else el.removeAttribute("dir");
    }
    if (ariaLabelledby) {
      this._preview.setAttribute("aria-labelledby", ariaLabelledby);
      this._preview.removeAttribute("aria-label");
    } else {
      this._preview.removeAttribute("aria-labelledby");
      this._preview.setAttribute("aria-label", ariaLabel ? `${ariaLabel} preview` : this.label ? `${this.label} preview` : "Rendered markdown preview");
    }
  }

  _getActiveStateIds(ctx) {
    const ids = [];
    const block = ctx.block || {};
    if (block.kind === "heading" && block.heading) ids.push(`block.heading.${block.heading.level}`);
    if (block.kind === "bullet-list-item") ids.push("block.bulletList");
    if (block.kind === "ordered-list-item") ids.push("block.orderedList");
    if (block.kind === "task-list-item") ids.push("block.taskList");
    if (block.kind === "blockquote") ids.push("block.blockquote");
    if (block.kind === "fenced-code") ids.push("block.codeFence");
    if (block.kind === "table") ids.push("block.table");
    if (block.kind === "fenced-code") return ids;
    const line = ctx.currentLine?.text ?? "";
    const pos = clamp(ctx.selectionStart - (ctx.currentLine?.start ?? 0), 0, line.length);
    const masked = line.split("");
    const hide = (from, to) => masked.fill(" ", from, to);
    for (let i = 0; i < line.length; i += 1) {
      const code = parseCodeSpanAt(line, i);
      if (!code) continue;
      if (pos >= code.contentStart && pos <= code.contentEnd) ids.push("inline.code");
      hide(code.from, code.to);
      i = code.to - 1;
    }
    const references = this._referenceDefinitions();
    const brackets = matchingBrackets(line);
    for (let i = 0; i < line.length; i += 1) {
      if (masked[i] === " " && line[i] !== " ") continue;
      const link = parseInlineLinkAt(line, i, brackets) || parseReferenceLinkAt(line, references, i, brackets);
      if (!link) continue;
      if (link.bang) hide(link.from, link.to);
      else {
        if (pos >= link.labelStart && pos <= link.labelEnd) ids.push("inline.link");
        hide(link.from, link.labelStart);
        hide(link.labelEnd, link.to);
      }
      i = link.to - 1;
    }
    const visible = masked.join("");
    for (const pair of emphasisPairs(visible)) {
      if (pos < pair.openEnd || pos > pair.closeStart) continue;
      ids.push(pair.tag === "strong" ? "inline.bold" : "inline.italic");
    }
    if (usesGfm(ctx.config)) {
      for (const match of visible.matchAll(/~~([^~\n]+)~~/g)) {
        if (isBackslashEscaped(visible, match.index)) continue;
        if (pos >= match.index + 2 && pos <= match.index + match[0].length - 2) ids.push("inline.strikethrough");
      }
    }
    return ids;
  }
  _findText(query, options = {}) {
    const q = String(query ?? ""); if (!q) return null;
    const from = clamp(Number(options.from ?? this.selectionEnd ?? 0), 0, this._value.length);
    const pattern = literalSearchPattern(q, options.caseSensitive, true);
    pattern.lastIndex = from;
    let match = pattern.exec(this._value);
    if (!match && options.wrap !== false) { pattern.lastIndex = 0; match = pattern.exec(this._value); }
    if (!match) return null;
    const index = match.index;
    const end = index + match[0].length;
    this.setSelectionRange(index, end, "forward");
    this._announce("Match found.");
    return { start: index, end, text: match[0] };
  }
  _replaceText(query, replacement, options = {}) {
    const q = String(query ?? ""); if (!q) return 0;
    const repl = normalizeLineEndings(replacement ?? "");
    const changes = [];
    if (options.all) {
      const pattern = literalSearchPattern(q, options.caseSensitive, true);
      for (const match of this._value.matchAll(pattern)) changes.push({ from: match.index, to: match.index + match[0].length, insert: repl });
    } else {
      const sel = this._getCurrentSelection();
      const selected = this._value.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end));
      const matchSelected = new RegExp(`^(?:${literalSearchPattern(q, options.caseSensitive).source})$`, options.caseSensitive ? "u" : "iu").test(selected);
      const found = matchSelected ? { start: Math.min(sel.start, sel.end), end: Math.max(sel.start, sel.end) } : this._findText(q, options);
      if (found) changes.push({ from: found.start, to: found.end, insert: repl });
    }
    if (!changes.length) return 0;
    const first = changes[0].from + repl.length;
    this._applyTransaction({ changes, selectionAfter: { start: first, end: first, direction: "none" }, actionId: options.all ? "editor.replaceAll" : "editor.replace", undoGroup: "replace", source: "api" }, { source: "api" });
    return changes.length;
  }

  _parseOptions() { return { markdownFlavor: this.markdownFlavor }; }
  _referenceDefinitions() {
    if (this._referenceCacheValue === this._value && this._referenceCache) return this._referenceCache;
    this._referenceCacheValue = this._value;
    this._referenceCache = extractReferenceDefinitions(this._value).references;
    return this._referenceCache;
  }
  _rendererOptions() {
    return {
      ...this._parseOptions(),
      tagsEnabled: this.tagsEnabled,
      allowRawHtml: false,
      sanitize: true,
      linkTarget: DEFAULTS.linkTarget,
      references: this._referenceDefinitions(),
    };
  }
  _setValueInternal(next, opts = {}) {
    const previousValue = this._value;
    const value = normalizeLineEndings(next ?? ""); const before = this._snapshot(); const changed = value !== previousValue;
    if (changed) this._pendingFenceOpening = null;
    this._value = value; if (this._sourceTextarea && this._sourceTextarea.value !== value) this._sourceTextarea.value = value;
    if (!opts.preserveSelection) this._selection = { start: clamp(this._selection.start, 0, value.length), end: clamp(this._selection.end, 0, value.length), direction: "none" };
    if (opts.recordUndo && changed) this._recordUndo(before, this._snapshot(), opts.undoGroup || opts.source || "api", { coalesce: false });
    if (changed || opts.force || !this._hasRenderedOnce) this._afterValueChanged({ source: opts.source || "api", silent: opts.silent, restoreSelection: opts.preserveSelection !== false, previousValue, changes: changed ? diffTextChange(previousValue, value) : [] });
  }
  _afterValueChanged({ source = "api", inputType = null, silent = false, restoreSelection = true, previousValue = null, changes = null, preserveLiveDom = false } = {}) {
    this._selectAllLevel = 0;
    this._structuredSelection = null;
    const tagChange = this._refreshTagIndex();
    if (["user", "keyboard", "paste", "pointer"].includes(source)) this._validationVisible = true;
    this._updateFormValue();
    this._updateValidity();
    if (preserveLiveDom && this._isLiveVisible() && !this._isComposing) {
      this._adoptNativeLiveDom({ previousValue, changes });
      if (restoreSelection
        && this._isAppleWebKitRuntime()
        && !this._isIOSWebKitRuntime()) {
        this._restoreLiveSelection(this._selection);
      }
    } else {
      this._renderAll({ restoreSelection, previousValue, changes });
    }
    const oldDirty = this._dirty; this._dirty = this._value !== this._defaultValue; if (oldDirty !== this._dirty) this._dispatch("md-dirty-change", { dirty: this._dirty });
    if (!silent) {
      this._dispatch("md-input", { value: this._value, source, inputType });
      if (tagChange) this._dispatch("md-tags-change", { ...tagChange, source, inputType });
    }
  }
  _refreshTagIndex() {
    const previous = this._tagIndex;
    const current = this.tagsEnabled ? parseTags(this._value, this._parseOptions()) : [];
    this._tagIndex = current;
    if (JSON.stringify(previous) === JSON.stringify(current)) return null;
    const oldKeys = new Map(previous.map(tag => [tag.key, tag.value]));
    const newKeys = new Map(current.map(tag => [tag.key, tag.value]));
    return {
      current: cloneTags(current),
      added: current.filter(tag => !oldKeys.has(tag.key)).map(tag => tag.value),
      removed: previous.filter(tag => !newKeys.has(tag.key)).map(tag => tag.value),
    };
  }
  _renderAll(...args) { return this._liveRenderer._renderAll(...args); }
  _isLiveVisible(...args) { return this._liveRenderer._isLiveVisible(...args); }
  _isPreviewVisible(...args) { return this._liveRenderer._isPreviewVisible(...args); }
  _renderDebounceMs(...args) { return this._liveRenderer._renderDebounceMs(...args); }
  _schedulePreviewRender(...args) { return this._liveRenderer._schedulePreviewRender(...args); }
  _renderPreview(...args) { return this._liveRenderer._renderPreview(...args); }
  _getBlocks(...args) { return this._liveRenderer._getBlocks(...args); }
  _setBlockCache(...args) { return this._liveRenderer._setBlockCache(...args); }
  _blocksForRender(...args) { return this._liveRenderer._blocksForRender(...args); }
  _renderLive(...args) { return this._liveRenderer._renderLive(...args); }
  _adoptNativeLiveDom(...args) { return this._liveRenderer._adoptNativeLiveDom(...args); }
  _flushNativeLiveDom(...args) { return this._liveRenderer._flushNativeLiveDom(...args); }
  _renderLiveFull(...args) { return this._liveRenderer._renderLiveFull(...args); }
  _tryPatchLiveBlocks(...args) { return this._liveRenderer._tryPatchLiveBlocks(...args); }
  _expandedBlockRange(...args) { return this._liveRenderer._expandedBlockRange(...args); }
  _blockRangeForSourceRange(...args) { return this._liveRenderer._blockRangeForSourceRange(...args); }
  _liveFragmentForBlocks(...args) { return this._liveRenderer._liveFragmentForBlocks(...args); }
  _syncLiveMetadata(...args) { return this._liveRenderer._syncLiveMetadata(...args); }
  _setEditableMetadata(...args) { return this._liveRenderer._setEditableMetadata(...args); }
  _setLiveEditingHostState(...args) { return this._liveRenderer._setLiveEditingHostState(...args); }
  _syncLiveEditingHosts(...args) { return this._liveRenderer._syncLiveEditingHosts(...args); }
  _liveDescendantEditableAttribute(...args) { return this._liveRenderer._liveDescendantEditableAttribute(...args); }
  _syncLiveBlockNodeMetadata(...args) { return this._liveRenderer._syncLiveBlockNodeMetadata(...args); }
  _lineAt(...args) { return this._liveRenderer._lineAt(...args); }
  _previousLineText(...args) { return this._liveRenderer._previousLineText(...args); }
  _nextLineText(...args) { return this._liveRenderer._nextLineText(...args); }
  _lineHasStructuralNeighbors(...args) { return this._liveRenderer._lineHasStructuralNeighbors(...args); }
  _parseSingleLineBlock(...args) { return this._liveRenderer._parseSingleLineBlock(...args); }
  _tryIncrementalBlocks(...args) { return this._liveRenderer._tryIncrementalBlocks(...args); }
  _shiftCell(...args) { return this._liveRenderer._shiftCell(...args); }
  _shiftLineOffsets(...args) { return this._liveRenderer._shiftLineOffsets(...args); }
  _shiftBlockOffsets(...args) { return this._liveRenderer._shiftBlockOffsets(...args); }
  _shouldVirtualize(...args) { return this._liveRenderer._shouldVirtualize(...args); }
  _virtualLineHeight(...args) { return this._liveRenderer._virtualLineHeight(...args); }
  _virtualWindowSize(...args) { return this._liveRenderer._virtualWindowSize(...args); }
  _estimatedBlockHeight(...args) { return this._liveRenderer._estimatedBlockHeight(...args); }
  _virtualMetrics(...args) { return this._liveRenderer._virtualMetrics(...args); }
  _virtualBlockIndexAtPixel(...args) { return this._liveRenderer._virtualBlockIndexAtPixel(...args); }
  _blockIndexForOffset(...args) { return this._liveRenderer._blockIndexForOffset(...args); }
  _renderLiveVirtual(...args) { return this._liveRenderer._renderLiveVirtual(...args); }
  _isSourceOffsetRendered(...args) { return this._liveRenderer._isSourceOffsetRendered(...args); }
  _ensureVirtualSelectionVisible(...args) { return this._liveRenderer._ensureVirtualSelectionVisible(...args); }
  _onLiveScroll(...args) { return this._liveRenderer._onLiveScroll(...args); }
  _renderLiveBlock(...args) { return this._liveRenderer._renderLiveBlock(...args); }
  _lineEditable(...args) { return this._liveRenderer._lineEditable(...args); }
  _renderHeadingLine(...args) { return this._liveRenderer._renderHeadingLine(...args); }
  _renderTaskLine(...args) { return this._liveRenderer._renderTaskLine(...args); }
  _renderCodeFence(...args) { return this._liveRenderer._renderCodeFence(...args); }
  _renderTable(...args) { return this._liveRenderer._renderTable(...args); }

  _onSourceBeforeInput(...args) { return this._inputController._onSourceBeforeInput(...args); }
  _onSourceInput(...args) { return this._inputController._onSourceInput(...args); }
  _onCompositionStart(...args) { return this._inputController._onCompositionStart(...args); }
  _onCompositionEnd(...args) { return this._inputController._onCompositionEnd(...args); }
  _onLiveBeforeInput(...args) { return this._inputController._onLiveBeforeInput(...args); }
  _applyLiveMarkdownInsertBeforeInput(...args) { return this._inputController._applyLiveMarkdownInsertBeforeInput(...args); }
  _liveMarkdownInsertCandidate(...args) { return this._inputController._liveMarkdownInsertCandidate(...args); }
  _shouldPreserveNativeFenceInsert(...args) { return this._inputController._shouldPreserveNativeFenceInsert(...args); }
  _applyLiveMarkdownInsertAfterInput(...args) { return this._inputController._applyLiveMarkdownInsertAfterInput(...args); }
  _isPendingFenceOpening(...args) { return this._inputController._isPendingFenceOpening(...args); }
  _shouldUseAppleWebKitNativeDeletion(...args) { return this._inputController._shouldUseAppleWebKitNativeDeletion(...args); }
  _applyLiveDeletionBeforeInput(...args) { return this._inputController._applyLiveDeletionBeforeInput(...args); }
  _onLiveInput(...args) { return this._inputController._onLiveInput(...args); }
  _commitWebKitNativeInput(...args) { return this._inputController._commitWebKitNativeInput(...args); }
  _sourceSelectionFromBeforeInput(...args) { return this._inputController._sourceSelectionFromBeforeInput(...args); }
  _inputTargetFromBeforeInput(...args) { return this._inputController._inputTargetFromBeforeInput(...args); }
  _applyFallbackBeforeInput(...args) { return this._inputController._applyFallbackBeforeInput(...args); }
  _applySourceBackedInput(...args) { return this._inputController._applySourceBackedInput(...args); }
  _plainText(...args) { return this._selectionController._plainText(...args); }
  _debugEditableInfo(editable) {
    if (!editable) return null;
    return {
      editable: editable.dataset.editable || null,
      kind: editable.dataset.kind || null,
      from: Number(editable.dataset.from),
      to: Number(editable.dataset.to)
    };
  }
  _debugTextChanges(changes = []) {
    return changes.map(change => ({
      from: change.from,
      to: change.to,
      removedLength: Math.max(0, change.to - change.from),
      insertedLength: String(change.insert ?? "").length
    }));
  }
  _editableSourceRange(...args) { return this._selectionController._editableSourceRange(...args); }
  _cellRawSource(...args) { return this._selectionController._cellRawSource(...args); }
  _displayOffsetFromSourceOffset(...args) { return this._selectionController._displayOffsetFromSourceOffset(...args); }
  _sourceOffsetFromDisplayOffset(...args) { return this._selectionController._sourceOffsetFromDisplayOffset(...args); }
  _closestEditable(...args) { return this._selectionController._closestEditable(...args); }
  _fragmentIdForLink(link) {
    const href = link?.getAttribute?.("href")?.trim() ?? "";
    if (!href.startsWith("#") || href.length === 1) return "";
    try { return decodeURIComponent(href.slice(1)); } catch { return href.slice(1); }
  }
  _headingElementForId(surface, id) {
    return [...surface?.querySelectorAll?.(".md-heading[id], h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]") || []]
      .find(heading => heading.id === id) || null;
  }
  _navigateFragmentLink(event, surface) {
    const link = event.target?.closest?.("a[href]");
    const id = this._fragmentIdForLink(link);
    if (!link || !surface?.contains(link) || !id) return false;
    let target = this._headingElementForId(surface, id);
    let label = target?.textContent?.trim() || "";
    if (surface === this._liveEditor) {
      const block = this._getBlocks().find(candidate => candidate.type === "heading" && candidate.heading?.id === id);
      if (!block) return false;
      label = block.heading.content;
      event.preventDefault();
      this.setSelectionRange(block.from, block.from, "none");
      target = this._headingElementForId(surface, id);
    } else {
      if (!target) return false;
      event.preventDefault();
    }
    target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    this._announce(`Navigated to ${label || id}.`);
    return true;
  }
  _onPreviewClick(event) {
    if (this._activateTag(event, "preview")) return;
    this._navigateFragmentLink(event, this._preview);
  }
  _onPreviewKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (this._activateTag(event, "preview")) event.preventDefault();
  }
  _activateTag(event, surface) {
    if (!this.tagsEnabled) return false;
    const target = event.target.closest?.("[data-md-tag]");
    if (!target) return false;
    const tag = target.dataset.mdTag || "";
    if (!tag) return false;
    this._dispatch("md-tag-activate", {
      tag,
      key: target.dataset.tagKey || normalizeTagKey(tag),
      surface,
    });
    return true;
  }
  _onLiveClick(event) {
    if (this._suppressLiveClick) {
      this._suppressLiveClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (this._navigateFragmentLink(event, this._liveEditor)) return;
    this._activateTag(event, "live");
    this._structuredSelection = null;
    const checkbox = event.target.closest?.("[data-task-checkbox]");
    if (checkbox) {
      event.preventDefault();
      const offset = Number(checkbox.dataset.checkOffset);
      const current = this._value[offset] || " ";
      const next = current.toLowerCase() === "x" ? " " : "x";
      const source = event.detail === 0 ? "keyboard" : "pointer";
      const ctx = this._getContext();
      const result = ok(
        tx(
          ctx,
          "block.taskDone",
          [{ from: offset, to: offset + 1, insert: next }],
          this._selection,
          "block"
        ),
        next === "x" ? "Task checked." : "Task unchecked."
      );
      this._applyActionResult("block.taskDone", result, { source });
      if (source === "keyboard") this._liveEditor.querySelector(`[data-task-checkbox][data-check-offset="${offset}"]`)?.focus();
      return;
    }
    this._onSelectionChanged();
  }

  _onLiveMouseDown(...args) { return this._selectionController._onLiveMouseDown(...args); }

  _bindPointerSelectionListeners(...args) { return this._selectionController._bindPointerSelectionListeners(...args); }

  _onLiveMouseMove(...args) { return this._selectionController._onLiveMouseMove(...args); }

  _onLiveMouseEnd(...args) { return this._selectionController._onLiveMouseEnd(...args); }

  _setLivePointerSelection(...args) { return this._selectionController._setLivePointerSelection(...args); }

  _setFallbackPointerSelection(...args) { return this._selectionController._setFallbackPointerSelection(...args); }

  _onNavigationKey(...args) { return this._selectionController._onNavigationKey(...args); }

  _maybeHandleLineBoundaryKey(...args) { return this._selectionController._maybeHandleLineBoundaryKey(...args); }

  _maybeHandleLiveArrowKey(...args) { return this._selectionController._maybeHandleLiveArrowKey(...args); }

  _maybeExtendLiveArrowSelection(...args) { return this._selectionController._maybeExtendLiveArrowSelection(...args); }

  _setSourceBackedSelection(...args) { return this._selectionController._setSourceBackedSelection(...args); }

  _horizontalArrowTarget(...args) { return this._selectionController._horizontalArrowTarget(...args); }

  _fallbackHorizontalArrowTarget(...args) { return this._selectionController._fallbackHorizontalArrowTarget(...args); }

  _fallbackVerticalArrowTarget(...args) { return this._selectionController._fallbackVerticalArrowTarget(...args); }

  _verticalArrowTarget(...args) { return this._selectionController._verticalArrowTarget(...args); }

  _isSingleVisualRow(...args) { return this._selectionController._isSingleVisualRow(...args); }

  _rebuildLiveIndex(...args) { return this._selectionController._rebuildLiveIndex(...args); }
  _liveEditables(...args) { return this._selectionController._liveEditables(...args); }
  _liveNavigationEditables(...args) { return this._selectionController._liveNavigationEditables(...args); }

  _adjacentLiveEditable(...args) { return this._selectionController._adjacentLiveEditable(...args); }

  _computedLineHeight(...args) { return this._selectionController._computedLineHeight(...args); }

  _isCaretOnVisualBoundary(...args) { return this._selectionController._isCaretOnVisualBoundary(...args); }

  _caretRectForSourceOffset(...args) { return this._selectionController._caretRectForSourceOffset(...args); }

  _caretRectFromDomPosition(...args) { return this._selectionController._caretRectFromDomPosition(...args); }

  _sourceOffsetInEditableAtX(...args) { return this._selectionController._sourceOffsetInEditableAtX(...args); }

  _sourceOffsetFromPoint(...args) { return this._selectionController._sourceOffsetFromPoint(...args); }

  _liveEditableFromPoint(...args) { return this._selectionController._liveEditableFromPoint(...args); }

  _sourceOffsetForClientPoint(...args) { return this._selectionController._sourceOffsetForClientPoint(...args); }

  _nearestSourceOffsetInEditable(...args) { return this._selectionController._nearestSourceOffsetInEditable(...args); }

  _onSelectionChanged(...args) { return this._selectionController._onSelectionChanged(...args); }

  _isSourceActive(...args) { return this._selectionController._isSourceActive(...args); }
  _focusEditable(...args) { return this._selectionController._focusEditable(...args); }
  _getCurrentSelection(...args) { return this._selectionController._getCurrentSelection(...args); }
  _getLiveSelection(...args) { return this._selectionController._getLiveSelection(...args); }
  _readLiveSelection(...args) { return this._selectionController._readLiveSelection(...args); }
  _liveSelectionCandidates(...args) { return readSelectionCandidates(this._shadow); }
  _isLiveSelectionNode(...args) { return this._selectionController._isLiveSelectionNode(...args); }
  _liveComposedSelectionRange(...args) { return this._selectionController._liveComposedSelectionRange(...args); }
  _liveSelectionEndpoints(...args) { return this._selectionController._liveSelectionEndpoints(...args); }
  _exposedLiveSelection(...args) { return this._selectionController._exposedLiveSelection(...args); }
  _hasComponentFocus() {
    const shadowActive = this._shadow?.activeElement || null;
    return Boolean(shadowActive);
  }
  _isIOSWebKitRuntime(...args) { return isIOSWebKitRuntime(...args); }
  _isAppleWebKitRuntime(...args) { return isAppleWebKitRuntime(...args); }
  _displayOffsetFromSelection(...args) { return this._selectionController._displayOffsetFromSelection(...args); }
  _sourceOffsetFromDom(...args) { return this._selectionController._sourceOffsetFromDom(...args); }
  _restoreLiveSelection(...args) { return this._selectionController._restoreLiveSelection(...args); }
  _useFallbackLiveSelection(...args) { return this._selectionController._useFallbackLiveSelection(...args); }
  _isLiveDomPositionConnected(...args) { return this._selectionController._isLiveDomPositionConnected(...args); }
  _domPositionFromSource(...args) { return this._selectionController._domPositionFromSource(...args); }
  _textPositionInElement(...args) { return this._selectionController._textPositionInElement(...args); }
  _ensureEmptyLiveEditable(...args) { return this._selectionController._ensureEmptyLiveEditable(...args); }

  _snapshot() { const sel = this._getCurrentSelection(); this._selection = sel; return makeSnapshot(this._value, sel.start, sel.end, sel.direction || "none"); }
  _recordUndo(...args) { this._history.record(...args); }
  _undoGroupForInput(inputType) { if (inputType?.startsWith("insert")) return "typing"; if (inputType?.startsWith("delete")) return "delete"; return inputType || "input"; }
  _undo({ source = "keyboard", inputType = null } = {}) {
    const current = this._snapshot();
    const target = this._history.undo(current);
    if (!target) return false;
    this._restoreSnapshot(target, "undo", inputType);
    this._dispatch("md-action", { actionId: "history.undo", source, before: current, after: this._snapshot() });
    return true;
  }
  _redo({ source = "keyboard", inputType = null } = {}) {
    const current = this._snapshot();
    const target = this._history.redo(current);
    if (!target) return false;
    this._restoreSnapshot(target, "redo", inputType);
    this._dispatch("md-action", { actionId: "history.redo", source, before: current, after: this._snapshot() });
    return true;
  }
  _restoreSnapshot(snapshot, source, inputType = null) {
    const previousValue = this._value;
    this._value = snapshot.value;
    this._selection = { ...snapshot.selection };
    this._redoStack = this._redoStack;
    this._afterValueChanged({ source, inputType, restoreSelection: true, previousValue, changes: diffTextChange(previousValue, this._value) });
  }

  _onKeyDown(event) {
    if (this._isComposing || event?.isComposing || event?.keyCode === 229) return;
    const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "");
    const mod = isMac ? event.metaKey : event.ctrlKey;
    const taskCheckbox = event.target.closest?.("[data-task-checkbox]");
    if (!this._isSourceActive() && taskCheckbox && (event.key === " " || event.key === "Spacebar")) {
      event.preventDefault();
      taskCheckbox.click();
      return;
    }
    const activeEditable = this._activeEditableFromEvent(event);
    const activeCell = activeEditable?.dataset.editable === "cell" ? activeEditable : null;
    const opaqueDesktopSafari = !this._isSourceActive()
      && this._isAppleWebKitRuntime()
      && !this._isIOSWebKitRuntime()
      && !this._readLiveSelection();
    if (!this._isSourceActive() && NAVIGATION_KEYS.has(event.key)) this._ignoreSelectionChangeCount = 0;
    if (!this._isSourceActive() && this._value.length === 0 && (event.key === "Backspace" || event.key === "Delete")) {
      event.preventDefault();
      this._ensureEmptyLiveEditable();
      return;
    }

    if (mod && !event.altKey && event.key.toLowerCase() === "z") {
      if (this.readonly || this.disabled) return;
      if (opaqueDesktopSafari) {
        this._debug(1, "live.key.browser-owned", {
          key: event.key,
          reason: "opaque-desktop-safari-selection"
        });
        return;
      }
      event.preventDefault();
      event.shiftKey ? this._redo() : this._undo();
      return;
    }

    if (mod && !event.altKey && event.key.toLowerCase() === "a" && !this._isSourceActive()) {
      if (opaqueDesktopSafari) {
        this._debug(1, "live.key.browser-owned", {
          key: event.key,
          reason: "opaque-desktop-safari-selection"
        });
        return;
      }
      event.preventDefault();
      this._expandSelection();
      return;
    }

    if (this._completion.open) {
      const map = { ArrowDown: "completion.next", ArrowUp: "completion.previous", Home: "completion.first", End: "completion.last", Escape: "completion.close" };
      if (map[event.key]) { event.preventDefault(); this._runAction(map[event.key], undefined, { source: "keyboard", apply: true }); return; }
      if (event.key === "PageDown") { event.preventDefault(); this._moveCompletion(5); return; }
      if (event.key === "PageUp") { event.preventDefault(); this._moveCompletion(-5); return; }
      if ((event.key === "Enter" && (!event.shiftKey || this.shiftEnterBehavior === "soft-break")) || (event.key === "Tab" && !event.shiftKey)) { event.preventDefault(); this._runAction("completion.accept", undefined, { source: "keyboard", apply: true }); return; }
    }

    if (opaqueDesktopSafari && (
      NAVIGATION_KEYS.has(event.key)
      || ["Enter", "Backspace", "Delete", " ", "Spacebar", "Tab"].includes(event.key)
      || (mod && !event.altKey && ["b", "e", "i", "k"].includes(event.key.toLowerCase()))
      || (mod && event.shiftKey && !event.altKey && event.key.toLowerCase() === "x")
      || (mod && event.altKey && /^[1-6]$/.test(event.key))
    )) {
      this._debug(1, "live.key.browser-owned", {
        key: event.key,
        reason: "opaque-desktop-safari-selection"
      });
      return;
    }

    if (this._maybeHandleTableLineBoundaryKey(event, activeCell)) return;
    if (this._maybeHandleLineBoundaryKey(event, activeCell, activeEditable)) return;
    if (activeCell && this._maybeHandleTableArrowKey(event, activeCell)) return;
    if (this._maybeHandleLiveArrowKey(event, activeEditable)) return;

    if ((event.key === "Backspace" || event.key === "Delete") && !this._isSourceActive()) {
      if (this.readonly || this.disabled) return;
      const selection = this._getCurrentSelection();
      if (selection.start !== selection.end) {
        event.preventDefault();
        const result = this._deleteSelectionResult(this._getContext(), event.key === "Delete" ? "editor.smartDelete" : "editor.smartBackspace");
        this._applyActionResult(event.key === "Delete" ? "editor.smartDelete" : "editor.smartBackspace", result, { source: "keyboard" });
        return;
      }
    }

    if (activeCell && (event.key === "Backspace" || event.key === "Delete")) {
      if (this.readonly || this.disabled) return;
      const result = this._deleteEmptyTableRowFromCellResult(activeCell);
      if (result?.ok && result.transaction) {
        event.preventDefault();
        this._applyActionResult("table.deleteRow", result, { source: "keyboard" });
        return;
      }
    }

    if (event.key === "Escape") {
      if (activeCell && !this._completion.open) {
        event.preventDefault();
        this._exitTable(activeCell, "after");
        return;
      }
      this._closeCompletion();
      return;
    }

    if (activeCell && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (this._maybeExitTableWithArrow(activeCell, direction)) {
        event.preventDefault();
        return;
      }
    }

    if (mod && !event.shiftKey && !event.altKey) {
      const key = event.key.toLowerCase();
      const map = { b: "inline.bold", i: "inline.italic", k: "inline.link", e: "inline.code" };
      if (map[key]) { event.preventDefault(); this._runAction(map[key], undefined, { source: "keyboard", apply: true }); return; }
    }
    if (mod && event.shiftKey && !event.altKey && event.key.toLowerCase() === "x") { event.preventDefault(); this._runAction("inline.strikethrough", undefined, { source: "keyboard", apply: true }); return; }
    if (mod && event.altKey && /^[1-6]$/.test(event.key)) { event.preventDefault(); this._runAction(`block.heading.${event.key}`, undefined, { source: "keyboard", apply: true }); return; }

    if (event.key === " " && !event.shiftKey && !event.altKey && !mod) {
      if (this.readonly || this.disabled) return;
      const result = this._runAction("editor.markdownShortcut", undefined, { source: "keyboard", apply: false });
      if (result?.ok && result.transaction) { event.preventDefault(); this._applyActionResult("editor.markdownShortcut", result, { source: "keyboard" }); return; }
    }

    if (event.key === "Delete") {
      if (this.readonly || this.disabled) return;
      const result = this._runAction("editor.smartDelete", undefined, { source: "keyboard", apply: false });
      if (result?.ok && result.transaction) { event.preventDefault(); this._applyActionResult("editor.smartDelete", result, { source: "keyboard" }); return; }
    }

    if (event.key === "Enter") {
      if (this.readonly || this.disabled) return;
      if (!this._isSourceActive() && this._isIOSWebKitRuntime()) return;
      event.preventDefault();
      if (activeCell) {
        if ((event.shiftKey && this.shiftEnterBehavior === "soft-break") || mod || event.altKey) this._exitTable(activeCell, "after");
        else this._insertTableRowAfterCell(activeCell);
        return;
      }
      const activeEditableType = activeEditable?.dataset.editable;
      if (activeEditableType === "virtual-code-after" || activeEditableType === "virtual-table-after") {
        this._runAction("editor.insertParagraph", undefined, { source: "keyboard", apply: true });
        return;
      }
      const actionId = event.shiftKey && this.shiftEnterBehavior === "soft-break" ? "editor.insertSoftBreak" : "editor.smartEnter";
      this._runAction(actionId, undefined, { source: "keyboard", apply: true });
      return;
    }

    if (event.key === "Tab") {
      if (this.readonly || this.disabled) return;
      if (activeCell) { event.preventDefault(); this._handleTableTab(activeCell, event.shiftKey ? -1 : 1); return; }
      const id = event.shiftKey ? "editor.smartOutdent" : "editor.smartTab";
      const result = this._runAction(id, undefined, { source: "keyboard", apply: false });
      if (result?.ok && (result.transaction || result.preventDefault)) { event.preventDefault(); this._applyActionResult(id, result, { source: "keyboard" }); }
      return;
    }

    if (event.key === "Backspace") {
      if (this.readonly || this.disabled) return;
      const result = this._runAction("editor.smartBackspace", undefined, { source: "keyboard", apply: false });
      if (result?.ok && result.transaction) { event.preventDefault(); this._applyActionResult("editor.smartBackspace", result, { source: "keyboard" }); }
    }
  }

  _activeEditableFromEvent(event) {
    return this._closestEditable(event?.target) || this._activeEditableFromSelection();
  }

  _activeEditableFromSelection(...args) { return this._selectionController._activeEditableFromSelection(...args); }

  _findBlockAtOffset(offset, type = null) {
    const safe = clamp(Number(offset) || 0, 0, this._value.length);
    return this._getBlocks().find(block => (!type || block.type === type) && safe >= block.from && safe <= Math.max(block.to, block.from)) || null;
  }

  _findTableBlockForCell(cell) {
    const tableEl = cell?.closest?.(".md-table-block");
    if (!tableEl) return null;
    const from = Number(tableEl.dataset.from);
    const to = Number(tableEl.dataset.to);
    return this._getBlocks().find(block => block.type === "table" && block.from === from && block.to === to) || null;
  }

  _tableInfoForCell(cell) {
    const block = this._findTableBlockForCell(cell);
    if (!block) return null;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const line = row < 0 ? block.header : block.rows[row];
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    return { block, row, col, line, cols };
  }

  _moveTableCell(cell, delta) {
    const cells = [...cell.closest(".md-table-block")?.querySelectorAll('[data-editable="cell"]') || []];
    const i = cells.indexOf(cell);
    if (i === -1) return false;
    const next = cells[i + delta];
    if (!next) return false;
    const from = Number(next.dataset.from);
    const text = this._plainText(next);
    this._selection = { start: from, end: from + text.length, direction: "none" };
    this._restoreLiveSelection(this._selection);
    this._announce("Table cell.");
    return true;
  }

  _handleTableTab(cell, delta) {
    if (this._moveTableCell(cell, delta)) return;
    if (delta < 0) {
      this._exitTable(cell, "before");
      return;
    }
    const info = this._tableInfoForCell(cell);
    if (!info) return;
    if (info.row >= 0 && this._isTableRowEmpty(info.line)) this._exitTable(cell, "after");
    else this._insertTableRowAfterCell(cell);
  }

  _maybeHandleTableLineBoundaryKey(event, activeCell = null) {
    if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;
    if (event.key !== "Home" && event.key !== "End") return false;
    const selectedEditable = activeCell || this._activeEditableFromSelection();
    const cell = selectedEditable?.dataset?.editable === "cell" ? selectedEditable : null;
    if (!cell) return false;
    const range = this._editableSourceRange(cell);
    if (!range) return false;
    const selection = this._getLiveSelection() || this._getCurrentSelection();
    const focus = selection.direction === "backward" ? selection.start : selection.end;
    const anchor = selection.direction === "backward" ? selection.end : selection.start;
    const target = event.key === "Home" ? range.from : range.to;
    if (target === focus && !event.shiftKey) {
      event.preventDefault();
      return true;
    }
    event.preventDefault();
    if (event.shiftKey) this._setSourceBackedSelection(anchor, target);
    else this.setSelectionRange(target, target, "none");
    return true;
  }

  _maybeHandleTableArrowKey(event, cell) {
    if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return false;
    if (!LIVE_ARROW_KEYS.has(event.key)) return false;
    const selection = this._getLiveSelection() || this._getCurrentSelection();
    if (!selection) return false;
    if (selection.start !== selection.end && !event.shiftKey) {
      const target = (event.key === "ArrowLeft" || event.key === "ArrowUp") ? selection.start : selection.end;
      event.preventDefault();
      this.setSelectionRange(target, target, "none");
      return true;
    }
    const focus = selection.direction === "backward" ? selection.start : selection.end;
    const anchor = selection.direction === "backward" ? selection.end : selection.start;
    const direction = (event.key === "ArrowLeft" || event.key === "ArrowUp") ? -1 : 1;
    const target = (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ? this._horizontalTableArrowTarget(cell, focus, direction)
      : this._verticalTableArrowTarget(cell, focus, direction);
    if (!target) return false;
    event.preventDefault();
    if (target.exit) {
      if (event.shiftKey) this._setSourceBackedSelection(anchor, target.offset);
      else this._exitTable(cell, target.exit);
      return true;
    }
    if (event.shiftKey) this._setSourceBackedSelection(anchor, target.offset);
    else this.setSelectionRange(target.offset, target.offset, "none");
    return true;
  }

  _tableCellsForCell(cell) {
    return [...cell.closest(".md-table-block")?.querySelectorAll('[data-editable="cell"]') || []];
  }

  _tableCellElement(block, row, col) {
    return this._liveEditor?.querySelector(`.md-table-block[data-from="${block.from}"][data-to="${block.to}"] .md-cell[data-row="${row}"][data-col="${col}"]`) || null;
  }

  _horizontalTableArrowTarget(cell, offset, direction) {
    const range = this._editableSourceRange(cell);
    if (!range) return null;
    if (direction < 0 && offset <= range.from) {
      const cells = this._tableCellsForCell(cell);
      const previous = cells[cells.indexOf(cell) - 1];
      if (previous) return { offset: Number(previous.dataset.to) };
      const info = this._tableInfoForCell(cell);
      return info?.block ? { exit: "before", offset: info.block.from } : null;
    }
    if (direction > 0 && offset >= range.to) {
      const cells = this._tableCellsForCell(cell);
      const next = cells[cells.indexOf(cell) + 1];
      if (next) return { offset: Number(next.dataset.from) };
      const info = this._tableInfoForCell(cell);
      return info?.block ? { exit: "after", offset: info.block.to } : null;
    }
    return null;
  }

  _verticalTableArrowTarget(cell, offset, direction) {
    const info = this._tableInfoForCell(cell);
    if (!info) return null;
    const nextRow = info.row + direction;
    if (nextRow < -1) return { exit: "before", offset: info.block.from };
    if (nextRow >= info.block.rows.length) return { exit: "after", offset: info.block.to };
    const targetCell = this._tableCellElement(info.block, nextRow, info.col);
    if (!targetCell) return null;
    const displayOffset = this._displayOffsetFromSourceOffset(cell, offset);
    const targetDisplayOffset = Math.min(displayOffset, this._plainText(targetCell).length);
    return { offset: this._sourceOffsetFromDisplayOffset(targetCell, targetDisplayOffset) ?? Number(targetCell.dataset.from) };
  }

  _maybeExitTableWithArrow(cell, direction) {
    const info = this._tableInfoForCell(cell);
    if (!info) return false;
    const atStart = this._isCellSelectionAtBoundary(cell, "start");
    const atEnd = this._isCellSelectionAtBoundary(cell, "end");
    if (direction < 0 && info.row < 0 && atStart) { this._exitTable(cell, "before"); return true; }
    if (direction > 0 && info.row === info.block.rows.length - 1 && atEnd) { this._exitTable(cell, "after"); return true; }
    return false;
  }

  _isCellSelectionAtBoundary(cell, boundary) {
    const sel = this._getLiveSelection(cell);
    if (!sel || sel.start !== sel.end) return false;
    const from = Number(cell.dataset.from);
    const to = Number(cell.dataset.to);
    return boundary === "start" ? sel.start <= from : sel.start >= to;
  }

  _isTableRowEmpty(line) {
    if (!line) return true;
    return splitTableRow(line.text).every(cell => cell.trim() === "");
  }

  _escapeTableCellText(...args) { return escapeTableCellText(...args); }

  _tableRowSourceParts(...args) { return tableRowSourceParts(...args); }

  _tableBlockSourceWithOffsets(...args) { return tableBlockSourceWithOffsets(...args); }

  _tableCellInputEdit(cell, raw, displayCursor = null) {
    const info = this._tableInfoForCell(cell);
    if (!info) return null;
    const cols = info.cols;
    const header = this._tableCellTexts(info.block.header, cols);
    const delimiter = this._tableCellTexts(info.block.delimiter, cols);
    const rows = info.block.rows.map(row => this._tableCellTexts(row, cols));
    if (info.row < 0) {
      header[info.col] = raw;
    } else {
      while (rows.length <= info.row) rows.push(Array.from({ length: cols }, () => ""));
      rows[info.row][info.col] = raw;
    }
    const serialized = this._tableBlockSourceWithOffsets(header, delimiter, rows);
    const lineIndex = info.row < 0 ? 0 : info.row + 2;
    const cellOffsets = serialized.parts[lineIndex]?.offsets?.[info.col];
    const rawCursor = clamp(displayCursor ?? raw.length, 0, raw.length);
    const escapedCursor = this._escapeTableCellText(raw.slice(0, rawCursor)).length;
    const cursor = info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.from ?? 0) + escapedCursor;
    return {
      blockFrom: info.block.from,
      blockTo: info.block.from + serialized.source.length,
      cellFrom: info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.from ?? 0),
      cellTo: info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.to ?? 0),
      nextValue: this._value.slice(0, info.block.from) + serialized.source + this._value.slice(info.block.to),
      cursor,
    };
  }

  _deleteEmptyTableRowFromCellResult(cell) {
    const info = this._tableInfoForCell(cell);
    if (!info || info.row < 0 || !info.line) return fail("not-applicable");
    const selection = this._getLiveSelection(cell);
    if (!selection || selection.start !== selection.end) return fail("not-applicable");
    if (this._plainText(cell).trim() || !this._isTableRowEmpty(info.line)) return fail("not-applicable");
    return this._tableDeleteRowResult(this._getContext(), info.block, info.row);
  }

  _insertTableRowAfterCell(cell) {
    const info = this._tableInfoForCell(cell);
    if (!info) return;
    const ctx = this._getContext();
    const result = this._tableRowInsertionResult(ctx, info.block, info.line, info.row < 0 ? "after-delimiter" : "after-row");
    this._applyActionResult("table.insertRowAfter", result, { source: "keyboard" });
  }

  _tableRowInsertionResult(...args) { return tableRowInsertionResult(...args); }

  _exitTable(cell, direction = "after") {
    const info = this._tableInfoForCell(cell);
    if (!info) return;
    const before = this._snapshot();
    const block = info.block;
    let changes = [];
    let cursor;
    if (direction === "before") {
      if (block.from === 0 || this._value[block.from - 1] !== "\n") {
        changes = [{ from: block.from, to: block.from, insert: "\n" }];
        cursor = block.from;
      } else {
        cursor = block.from;
      }
    } else {
      cursor = block.to < this._value.length ? block.to + 1 : block.to;
    }
    if (changes.length) {
      this._applyTransaction({ changes, selectionAfter: { start: cursor, end: cursor, direction: "none" }, actionId: "table.exit", undoGroup: "table", source: "keyboard" }, { source: "keyboard" });
    } else {
      this._selection = { start: cursor, end: cursor, direction: "none" };
      this._restoreLiveSelection(this._selection);
      this._emitSelectionChange();
    }
    const after = this._snapshot();
    this._dispatch("md-action", { actionId: "table.exit", source: "keyboard", before, after });
    this._announce(direction === "before" ? "Before table." : "After table.");
  }

  _expandSelection() {
    const current = this._getCurrentSelection();
    const candidates = this._selectionExpansionCandidates(current);
    const normalized = { start: Math.min(current.start, current.end), end: Math.max(current.start, current.end) };
    let next = candidates.find(range => (range.end > range.start || this._value.length === 0) && range.start <= normalized.start && range.end >= normalized.end && !this._sameRange(range, normalized));
    if (!next) next = { start: 0, end: this._value.length, label: "document" };
    this.setSelectionRange(next.start, next.end, "forward");
    this._announce(`Selected ${next.label || "content"}.`);
  }

  _selectionExpansionCandidates(selection) {
    const point = clamp(selection.start, 0, this._value.length);
    const out = [];
    const push = (start, end, label) => {
      const range = { start: clamp(start, 0, this._value.length), end: clamp(end, 0, this._value.length), label };
      if (range.end < range.start) [range.start, range.end] = [range.end, range.start];
      if (!out.some(existing => this._sameRange(existing, range))) out.push(range);
    };
    const active = this._activeEditableFromSelection();
    if (active?.dataset.editable === "cell") {
      const info = this._tableInfoForCell(active);
      const cellFrom = Number(active.dataset.from);
      const cellTo = Number(active.dataset.to);
      push(cellFrom, cellTo, "cell");
      if (info?.line) push(info.line.start, info.line.end, "row");
      if (info?.block) push(info.block.from, info.block.to, "table");
    }
    const block = this._findBlockAtOffset(point) || this._getBlocks()[0];
    if (block) push(block.from, block.to, block.type === "table" ? "table" : "block");
    const section = this._sectionRangeForOffset(point);
    if (section) push(section.start, section.end, "section");
    push(0, this._value.length, "document");
    return out.sort((a, b) => (a.end - a.start) - (b.end - b.start));
  }

  _sectionRangeForOffset(offset) {
    const blocks = this._getBlocks();
    let headingIndex = -1;
    let headingLevel = Infinity;
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block.type === "heading" && block.from <= offset) {
        headingIndex = i;
        headingLevel = block.heading.level;
      }
      if (block.from > offset) break;
    }
    if (headingIndex === -1) return null;
    let end = this._value.length;
    for (let i = headingIndex + 1; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block.type === "heading" && block.heading.level <= headingLevel) { end = block.from; break; }
    }
    return { start: blocks[headingIndex].from, end, label: "section" };
  }

  _sameRange(a, b) {
    return a && b && a.start === b.start && a.end === b.end;
  }

  _normalizedClipboardSelectionText(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  _selectionTextCoversLiveDocument(selectedText) {
    const selected = this._normalizedClipboardSelectionText(selectedText);
    if (!selected) return false;
    const segments = this._liveEditables()
      .map(editable => this._normalizedClipboardSelectionText(
        this._plainText(editable)
      ))
      .filter(Boolean);
    if (!segments.length) return false;
    let cursor = 0;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const found = selected.indexOf(segment, cursor);
      if (found === -1) return false;
      if (index === 0 && found !== 0) return false;
      cursor = found + segment.length;
    }
    return cursor === selected.length;
  }
  _opaqueAppleWebKitClipboardSelectionText() {
    if (!this._isAppleWebKitRuntime() || this._readLiveSelection()) return null;
    let selectedText = "";
    for (const { selection } of this._liveSelectionCandidates()) {
      try {
        const candidate = this._normalizedClipboardSelectionText(
          selection?.toString?.()
        );
        if (candidate.length > selectedText.length) selectedText = candidate;
      } catch {}
    }
    return selectedText || null;
  }
  _opaqueAppleWebKitFullDocumentClipboardRange(selectedText = this._opaqueAppleWebKitClipboardSelectionText()) {
    if (!selectedText) return null;
    if (!this._selectionTextCoversLiveDocument(selectedText)) return null;
    this._debug(2, "live.clipboard.full-selection-inferred", {
      selectedTextLength: selectedText.length
    });
    return { start: 0, end: this._value.length };
  }
  _clipboardRangeFromSelection(selection = this._getCurrentSelection()) {
    const opaqueSelectionText = this._opaqueAppleWebKitClipboardSelectionText();
    if (opaqueSelectionText) {
      return this._opaqueAppleWebKitFullDocumentClipboardRange(opaqueSelectionText);
    }
    if (!selection || selection.start === selection.end) return null;
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    return expandMarkdownFormattingRange(this._value, start, end);
  }
  _writeMarkdownClipboard(event, markdown) {
    event.clipboardData?.setData("text/plain", markdown);
    event.clipboardData?.setData("text/markdown", markdown);
    event.clipboardData?.setData("text/x-markdown", markdown);
    event.clipboardData?.setData("text/html", renderMarkdown(markdown, this._rendererOptions()));
  }
  _onLiveCopy(event) {
    if (this._isSourceActive()) return;
    const range = this._clipboardRangeFromSelection();
    if (!range) return;
    const markdown = this._value.slice(range.start, range.end);
    event.preventDefault();
    this._writeMarkdownClipboard(event, markdown);
    this._dispatch("md-copy", { markdown, start: range.start, end: range.end });
  }
  _onLiveCut(event) {
    if (this._isSourceActive() || this.disabled || this.readonly) return;
    const range = this._clipboardRangeFromSelection();
    if (!range) return;
    const markdown = this._value.slice(range.start, range.end);
    event.preventDefault();
    this._writeMarkdownClipboard(event, markdown);
    const ctx = this._getContext();
    const result = ok(tx(ctx, "editor.deleteSelection", [{ from: range.start, to: range.end, insert: "" }], { start: range.start, end: range.start, direction: "none" }, "cut"), "Cut.");
    this._applyActionResult("editor.deleteSelection", result, { source: "keyboard" });
    this._dispatch("md-cut", { markdown, start: range.start, end: range.end });
  }

  _serializeTableBlock(...args) { return serializeTableBlock(...args); }
  _tableCellTexts(...args) { return tableCellTexts(...args); }
  _tablePositionForOffset(...args) { return tablePositionForOffset(...args); }
  _tableColumnResult(...args) { return tableColumnResult(...args); }
  _tableDeleteRowResult(...args) { return tableDeleteRowResult(...args); }

  _preparePastedMarkdown(markdown, kind = "text") {
    let insert = normalizeLineEndings(markdown ?? "");
    if (!insert) return insert;
    const sel = this._getCurrentSelection();
    if (sel.start !== sel.end) return insert;
    const shouldSeparate = kind === "markdown" || kind === "html" || kind === "table" || insert.includes("\n") || looksLikeBlockMarkdown(insert);
    if (!shouldSeparate) return insert;
    const line = getLineRange(this._value, sel.start);
    const beforeLine = this._value.slice(line.start, sel.start);
    const afterLine = this._value.slice(sel.start, line.end);
    if (beforeLine.trim() && !insert.startsWith("\n")) insert = "\n" + insert;
    if (afterLine.trim() && !insert.endsWith("\n")) insert = insert + "\n";
    return insert;
  }
  _insertPastedMarkdown(markdown, kind = "text") {
    const prepared = this._preparePastedMarkdown(markdown, kind);
    if (!prepared) return false;
    this._runAction("editor.insertText", { text: prepared }, { source: "paste", apply: true });
    this._dispatch("md-paste", { markdown: prepared, kind });
    return true;
  }
  _onPaste(event) {
    if (this.disabled || this.readonly) return;
    const clipboard = event.clipboardData || event.dataTransfer; if (!clipboard) return;
    const files = Array.from(clipboard.files || []);
    if (files.length > 0) { event.preventDefault(); const insertionPoint = this.selectionStart; this._dispatch("md-file-paste", { files, insertionPoint, insertMarkdown: markdown => this._insertPastedMarkdown(markdown, "file") }); return; }
    const text = safeClipboardGet(clipboard, "text/plain");
    if (text && this.selectionStart !== this.selectionEnd && isProbablyUrl(text) && !safeClipboardGet(clipboard, "text/markdown") && !safeClipboardGet(clipboard, "text/html")) { event.preventDefault(); this._runAction("inline.link", { url: text.trim() }, { source: "paste", apply: true }); return; }
    const { markdown, kind } = markdownFromClipboardData(clipboard);
    if (!markdown) return;
    event.preventDefault();
    this._insertPastedMarkdown(markdown, kind);
  }
  _onDrop(event) { if (this.disabled || this.readonly) return; const files = Array.from(event.dataTransfer?.files || []); if (!files.length) return; event.preventDefault(); const insertionPoint = this.selectionStart; this._dispatch("md-file-drop", { files, insertionPoint, insertMarkdown: markdown => this._insertPastedMarkdown(markdown, "file") }); }

  /** @returns {import("../types.js").ActionContext} */
  _getContext(selection = null) {
    const current = selection || this._getCurrentSelection();
    const sel = {
      start: clamp(Number(current?.start) || 0, 0, this._value.length),
      end: clamp(Number(current?.end) || 0, 0, this._value.length),
      direction: current?.direction || "none"
    };
    this._selection = sel;
    const parseOptions = this._parseOptions();
    const value = this._value; const line = getLineRange(value, sel.start); const currentLine = makeLineInfo(line.start, line.end, line.text, parseOptions); const selectedLines = getSelectedLineRanges(value, sel.start, sel.end, parseOptions); const block = classifyLine(value, sel.start, currentLine, parseOptions); const lineBeforeCursor = currentLine.text.slice(0, sel.start - currentLine.start);
    return { value, selectionStart: sel.start, selectionEnd: sel.end, selectionDirection: sel.direction || "none", mode: this.disabled ? "disabled" : this.readonly ? "readonly" : this._isComposing ? "composing-ime" : this._completion.open ? (this._completion.providerId === "slash" ? "slash-open" : "completion-open") : "idle", currentLine, selectedLines, block, inline: { insideInlineCode: isInsideInlineCode(lineBeforeCursor) }, completion: { ...this._completion }, config: { mode: this.mode, preview: this.preview, markdownFlavor: this.markdownFlavor, tagsEnabled: this.tagsEnabled, shiftEnterBehavior: this.shiftEnterBehavior, tabBehavior: this.tabBehavior, indentString: this.indentString, debug: this.debug, debugLog: this.debugLog, disabled: this.disabled, readonly: this.readonly }, host: this };
  }
  _runAction(actionId, args, options = {}) {
    const action = this._actions.get(actionId); if (!action) return fail("not-applicable", `Unknown action: ${actionId}`);
    const ctx = this._getContext(); if (ctx.mode === "disabled" && !action.viewSafe) return fail("disabled"); if (ctx.mode === "readonly" && !action.readonlySafe && !action.viewSafe) return fail("readonly"); if (ctx.mode === "composing-ime" && action.structural !== false) return fail("composition-active"); if (action.when && !action.when(ctx, args)) return fail("not-applicable");
    try { const result = action.run(ctx, args, options); if (options.apply === false) return result; return this._applyActionResult(actionId, result, options); } catch (error) { this._emitError("action", error, true, { actionId }); return fail("provider-error", String(error?.message || error)); }
  }
  _applyActionResult(actionId, result, options = {}) {
    if (!result?.ok) return result; const before = this._snapshot();
    if (result.actionHandled) {
      if (result.announcement) this._announce(result.announcement);
      return result;
    }
    if (result.transaction) { const t = { ...result.transaction, source: options.source || result.transaction.source || "api", actionId, timestamp: now() }; if (!this._applyTransaction(t, { source: t.source, inputType: options.inputType })) return fail("change-canceled", "Change blocked."); const after = this._snapshot(); this._dispatch("md-action", { actionId, args: t.args, source: t.source, before, after }); }
    else this._dispatch("md-action", { actionId, source: options.source || "api", before, after: this._snapshot() });
    if (result.announcement) this._announce(result.announcement); return result;
  }
  _applyTransaction(transaction, options = {}) {
    const before = this._snapshot();
    const nextValue = applyTextChanges(this._value, transaction.changes);
    const proposedSelection = transaction.selectionAfter || { start: nextValue.length, end: nextValue.length, direction: "none" };
    const beforeEvent = this._dispatch("md-before-change", { transaction, before, nextValue, selectionAfter: proposedSelection, source: options.source || transaction.source || "api" }, { cancelable: true });
    if (beforeEvent.defaultPrevented) { this._announce("Change blocked."); return false; }
    this._value = nextValue;
    this._pendingFenceOpening = null;
    const sel = proposedSelection;
    this._selection = { start: clamp(sel.start, 0, nextValue.length), end: clamp(sel.end, 0, nextValue.length), direction: sel.direction || "none" }; this._structuredSelection = null;
    const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction); this._recordUndo(before, after, transaction.undoGroup || transaction.actionId, { coalesce: false }); this._redoStack.length = 0; this._afterValueChanged({ source: options.source || transaction.source || "api", inputType: options.inputType, restoreSelection: true, previousValue: before.value, changes: transaction.changes }); this._scheduleCompletionUpdate();
    return true;
  }

  _installBuiltInActions() {
    installBuiltInActions({
      registerAction: (...args) => this.registerAction(...args),
      smartEnter: (...args) => this._smartEnter(...args),
      smartTab: (...args) => this._smartTab(...args),
      expandSelection: (...args) => this._expandSelection(...args),
      undo: (...args) => this._undo(...args),
      redo: (...args) => this._redo(...args),
      findBlockAtOffset: (...args) => this._findBlockAtOffset(...args),
      setMode: mode => { this.mode = mode; },
      closeCompletion: (...args) => this._closeCompletion(...args),
      moveCompletion: (...args) => this._moveCompletion(...args),
      setCompletionIndex: (...args) => this._setCompletionIndex(...args),
      completionCount: () => this._completion.items.length,
      acceptCompletion: (...args) => this._acceptCompletion(...args)
    });
  }

  _installBuiltInProviders(...args) { return this._completionController._installBuiltInProviders(...args); }
  _getLanguageItems(...args) { return this._completionController._getLanguageItems(...args); }

  _smartEnter(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
    if (this._isUnclosedFenceOpeningContext(ctx)) {
      const fenceInfo = getFenceInfo(ctx.currentLine.text);
      return insertionTransaction(ctx, "editor.smartEnter", `\n\n${fenceInfo.sequence}`, 1, "smartEnter");
    }
    if (ctx.block.kind === "fenced-code") return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
    const list = ctx.block.list;
    if (list) {
      if (list.content.trim() === "") return removePrefixFromLine(ctx, "editor.smartEnter", list.contentStart, "Exited list.");
      if (list.kind === "task-list-item") { const insert = `\n${list.indent}${list.marker} [ ] `; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter"); }
      if (list.kind === "ordered-list-item") { const next = Number.isFinite(list.number) ? list.number + 1 : 1; const insert = `\n${list.indent}${next}${list.delimiter || "."} `; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter"); }
      const insert = `\n${list.indent}${list.marker} `; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter");
    }
    const quote = ctx.block.blockquote;
    if (quote) { if (quote.content.trim() === "") return removePrefixFromLine(ctx, "editor.smartEnter", quote.contentStart, "Exited blockquote."); const insert = `\n${quote.markerText}`; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter"); }
    if (ctx.block.kind === "heading") return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
    if (ctx.block.kind === "table") {
      const table = this._findBlockAtOffset(ctx.selectionStart, "table");
      if (table) {
        const placement = ctx.currentLine.start === table.header.start ? "after-delimiter" : "after-row";
        return this._tableRowInsertionResult(ctx, table, ctx.currentLine, placement);
      }
    }
    return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
  }
  _isUnclosedFenceOpeningContext(ctx) {
    if (!ctx || ctx.selectionStart !== ctx.selectionEnd) return false;
    const currentTextBeforeCursor = ctx.currentLine.text.slice(
      0,
      ctx.selectionStart - ctx.currentLine.start
    );
    const fenceInfo = getFenceInfo(ctx.currentLine.text);
    const pending = this._pendingFenceOpening;
    const isPending = Boolean(
      pending
      && pending.start === ctx.currentLine.start
      && pending.marker === fenceInfo?.marker
    );
    return Boolean(
      fenceInfo
      && currentTextBeforeCursor.trim().startsWith(fenceInfo.sequence)
      && !isInsideFence(ctx.value, ctx.selectionStart)
      && (isPending
        || !hasClosingFenceAfter(ctx.value, ctx.currentLine.end, fenceInfo))
    );
  }
  _smartTab(ctx) {
    if (ctx.completion?.open) return this._acceptCompletion("tab");
    const anyList = ctx.selectedLines.some(line => parseListItem(line.text, ctx.config)); if (anyList) return this._indentLines(ctx, ctx.config.indentString);
    if (ctx.block.kind === "fenced-code") return insertionTransaction(ctx, "editor.smartTab", ctx.config.indentString, ctx.config.indentString.length, "indent");
    if (ctx.config.tabBehavior === "editor-first") return insertionTransaction(ctx, "editor.smartTab", ctx.config.indentString, ctx.config.indentString.length, "indent");
    return fail("not-applicable", "Tab should move focus in accessibility-first mode.");
  }
  _smartOutdent(...args) { return smartOutdent(...args); }
  _deleteSelectionResult(...args) { return deleteSelectionResult(...args); }
  _markdownShortcut(...args) { return markdownShortcut(...args); }
  _smartDelete(...args) { return smartDelete(...args); }
  _smartBackspace(...args) { return smartBackspace(...args); }
  _lineOutdentAmount(...args) { return lineOutdentAmount(...args, this.indentString); }
  _indentLines(...args) { return indentLines(...args); }
  _outdentLines(...args) { return outdentLines(...args); }

  _toggleParagraph(...args) { return toggleParagraph(...args); }
  _toggleHeading(...args) { return toggleHeading(...args); }
  _toggleList(...args) { return toggleList(...args); }
  _toggleTaskDone(...args) { return toggleTaskDone(...args); }
  _toggleBlockquote(...args) { return toggleBlockquote(...args); }
  _setCodeLanguageResult(...args) { return setCodeLanguageResult(...args); }
  _toggleCodeFence(...args) { return toggleCodeFence(...args); }
  _insertHorizontalRule(...args) { return insertHorizontalRule(...args); }
  _insertTable(...args) { return insertTable(...args); }
  _wrapInline(...args) { return wrapInline(...args); }
  _wrapCode(...args) { return wrapCode(...args); }
  _insertLink(...args) { return insertLink(...args); }
  _insertImage(...args) { return insertImage(...args); }

  _matchTag(...args) { return this._completionController._matchTag(...args); }
  _getTagItems(...args) { return this._completionController._getTagItems(...args); }
  _applyTagItem(...args) { return this._completionController._applyTagItem(...args); }
  _matchSlash(...args) { return this._completionController._matchSlash(...args); }
  _getSlashItems(...args) { return this._completionController._getSlashItems(...args); }
  _applySlashItem(...args) { return this._completionController._applySlashItem(...args); }
  _slashReplacementForAction(...args) { return this._completionController._slashReplacementForAction(...args); }
  _applyCodeLanguageItem(...args) { return this._completionController._applyCodeLanguageItem(...args); }
  _matchCodeLanguage(...args) { return this._completionController._matchCodeLanguage(...args); }

  _scheduleCompletionUpdate(...args) { return this._completionController._scheduleCompletionUpdate(...args); }
  _maybeUpdateCompletions(...args) { return this._completionController._maybeUpdateCompletions(...args); }
  _normalizeCompletionItems(...args) { return this._completionController._normalizeCompletionItems(...args); }
  _openCompletion(...args) { return this._completionController._openCompletion(...args); }
  _closeCompletion(...args) { return this._completionController._closeCompletion(...args); }
  _renderCompletion() {
    if (!this._completionPopup) return; const open = this._completion.open && this._completion.items.length > 0; this._completionPopup.hidden = !open; const controller = this._isSourceActive() ? this._sourceTextarea : this._liveEditor; controller?.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) { this._completionPopup.innerHTML = ""; this._completionPopup.scrollTop = 0; this._completionPopup.style.left = ""; this._completionPopup.style.top = ""; this._completionPopup.style.width = ""; this._completionPopup.style.minWidth = ""; this._completionPopup.style.maxWidth = ""; this._completionPopup.style.maxHeight = ""; delete this._completionPopup.dataset.boundary; delete this._completionPopup.dataset.placement; this._sourceTextarea?.removeAttribute("aria-activedescendant"); this._liveEditor?.removeAttribute("aria-activedescendant"); return; }
    const previousScrollTop = this._completionPopup.scrollTop;
    const activeId = this._completion.activeIndex >= 0 ? `${this._ids.completion}-item-${this._completion.activeIndex}` : null;
    if (activeId) controller?.setAttribute("aria-activedescendant", activeId); else controller?.removeAttribute("aria-activedescendant");
    this._completionPopup.innerHTML = this._completion.items.map((item, index) => `<div id="${this._ids.completion}-item-${index}" class="completion-item" part="${index === this._completion.activeIndex ? "completion-item completion-item-active" : "completion-item"}" role="option" aria-selected="${index === this._completion.activeIndex ? "true" : "false"}" aria-disabled="${item.disabled ? "true" : "false"}" data-index="${index}"><div class="completion-label">${escapeHtml(item.label)}</div><div class="completion-detail">${escapeHtml(item.detail || "")}</div>${item.description ? `<div class="completion-description">${escapeHtml(item.description)}</div>` : ""}</div>`).join("");
    this._completionPopup.scrollTop = previousScrollTop;
    this._positionCompletionPopup();
    this._scrollActiveCompletionIntoView();
  }
  _scrollActiveCompletionIntoView() {
    const popup = this._completionPopup;
    const option = popup?.querySelector('[role="option"][aria-selected="true"]');
    if (!popup || !option) return;
    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    const visibleTop = popup.scrollTop;
    const visibleBottom = visibleTop + popup.clientHeight;
    if (optionTop < visibleTop) popup.scrollTop = optionTop;
    else if (optionBottom > visibleBottom) popup.scrollTop = optionBottom - popup.clientHeight;
  }
  _startCompletionPositionTracking() {
    globalThis.addEventListener?.("resize", this._boundCompletionViewportChange);
    globalThis.addEventListener?.("scroll", this._boundCompletionViewportChange, true);
    const viewport = globalThis.visualViewport || null;
    if (this._completionVisualViewport && this._completionVisualViewport !== viewport) {
      this._completionVisualViewport.removeEventListener?.("resize", this._boundCompletionViewportChange);
      this._completionVisualViewport.removeEventListener?.("scroll", this._boundCompletionViewportChange);
    }
    this._completionVisualViewport = viewport;
    viewport?.addEventListener?.("resize", this._boundCompletionViewportChange);
    viewport?.addEventListener?.("scroll", this._boundCompletionViewportChange);
  }
  _stopCompletionPositionTracking() {
    globalThis.removeEventListener?.("resize", this._boundCompletionViewportChange);
    globalThis.removeEventListener?.("scroll", this._boundCompletionViewportChange, true);
    this._completionVisualViewport?.removeEventListener?.("resize", this._boundCompletionViewportChange);
    this._completionVisualViewport?.removeEventListener?.("scroll", this._boundCompletionViewportChange);
    this._completionVisualViewport = null;
    if (this._completionPositionFrame) cancelAnimationFrame(this._completionPositionFrame);
    this._completionPositionFrame = 0;
  }
  _scheduleCompletionPositionUpdate() {
    if (!this._completion.open || !this._completionPopup || this._completionPositionFrame) return;
    this._completionPositionFrame = requestAnimationFrame(() => {
      this._completionPositionFrame = 0;
      if (!this._completion.open || !this._completionPopup) return;
      this._positionCompletionPopup();
      this._scrollActiveCompletionIntoView();
    });
  }
  _completionViewportRect() {
    const viewport = globalThis.visualViewport;
    const documentElement = globalThis.document?.documentElement;
    const width = Math.max(0, Number(viewport?.width) || globalThis.innerWidth || documentElement?.clientWidth || 0);
    const height = Math.max(0, Number(viewport?.height) || globalThis.innerHeight || documentElement?.clientHeight || 0);
    const left = Number(viewport?.offsetLeft) || 0;
    const top = Number(viewport?.offsetTop) || 0;
    return { left, top, right: left + width, bottom: top + height, width, height };
  }
  _scrollCompletionAnchorIntoView(anchor, surface) {
    if (!anchor || !surface || surface.scrollHeight <= surface.clientHeight) return false;
    const surfaceRect = surface.getBoundingClientRect();
    const inset = 8;
    const visibleTop = surfaceRect.top + inset;
    const visibleBottom = surfaceRect.bottom - inset;
    const delta = anchor.top < visibleTop
      ? anchor.top - visibleTop
      : anchor.bottom > visibleBottom
        ? anchor.bottom - visibleBottom
        : 0;
    if (Math.abs(delta) < 1) return false;
    const previousScrollTop = surface.scrollTop;
    surface.scrollTop += delta;
    return Math.abs(surface.scrollTop - previousScrollTop) >= 1;
  }
  _positionCompletionPopup() {
    const shell = this._shadow.querySelector(".editor-shell"); if (!shell || !this._completionPopup) return; const popup = this._completionPopup; const shellRect = shell.getBoundingClientRect();
    const surface = this._isSourceActive() ? this._sourceTextarea : this._liveEditor;
    const readAnchor = () => {
      let rect = null;
      try { const sel = this._shadow.getSelection?.() || globalThis.getSelection?.(); if (sel?.rangeCount) rect = sel.getRangeAt(0).getBoundingClientRect(); } catch {}
      if (!rect || (!rect.width && !rect.height)) { const target = this._domPositionFromSource(this._selection.start)?.editable || this._sourceTextarea; rect = target?.getBoundingClientRect?.(); }
      return rect || shellRect;
    };
    let anchor = readAnchor();
    if (this._scrollCompletionAnchorIntoView(anchor, surface)) anchor = readAnchor();
    const viewport = this._completionViewportRect();
    const margin = 8;
    const gap = 6;
    const availableWidth = Math.max(0, viewport.width - (margin * 2));
    popup.style.width = "";
    popup.style.minWidth = `${Math.min(240, availableWidth)}px`;
    popup.style.maxWidth = `${availableWidth}px`;
    popup.style.maxHeight = "";
    let popupRect = popup.getBoundingClientRect();
    popup.style.width = `${popupRect.width}px`;
    popupRect = popup.getBoundingClientRect();
    const viewportTop = viewport.top + margin;
    const viewportBottom = viewport.bottom - margin;
    const surfaceRect = surface?.getBoundingClientRect?.();
    const editorTop = Math.max(viewportTop, (surfaceRect?.top ?? viewportTop) + margin);
    const editorBottom = Math.min(viewportBottom, (surfaceRect?.bottom ?? viewportBottom) - margin);
    const editorBelowSpace = Math.max(0, editorBottom - anchor.bottom - gap);
    const editorAboveSpace = Math.max(0, anchor.top - gap - editorTop);
    const useEditorBoundary = editorBottom > editorTop
      && (editorBelowSpace >= popupRect.height || editorAboveSpace >= popupRect.height);
    const verticalTop = useEditorBoundary ? editorTop : viewportTop;
    const verticalBottom = useEditorBoundary ? editorBottom : viewportBottom;
    const belowSpace = Math.max(0, verticalBottom - anchor.bottom - gap);
    const aboveSpace = Math.max(0, anchor.top - gap - verticalTop);
    const placement = belowSpace >= popupRect.height || belowSpace >= aboveSpace ? "below" : "above";
    const availableHeight = placement === "above" ? aboveSpace : belowSpace;
    popup.style.maxHeight = `${Math.max(0, Math.min(popupRect.height, availableHeight))}px`;
    popupRect = popup.getBoundingClientRect();
    const minimumLeft = viewport.left + margin;
    const maximumLeft = Math.max(minimumLeft, viewport.right - margin - popupRect.width);
    const viewportLeft = clamp(anchor.left, minimumLeft, maximumLeft);
    const desiredTop = placement === "above"
      ? anchor.top - gap - popupRect.height
      : anchor.bottom + gap;
    const minimumTop = verticalTop;
    const maximumTop = Math.max(minimumTop, verticalBottom - popupRect.height);
    const popupTop = clamp(desiredTop, minimumTop, maximumTop);
    popup.style.left = "0px";
    popup.style.top = "0px";
    const positioningOrigin = popup.getBoundingClientRect();
    popup.dataset.boundary = useEditorBoundary ? "editor" : "viewport";
    popup.dataset.placement = placement;
    popup.style.left = `${viewportLeft - positioningOrigin.left}px`;
    popup.style.top = `${popupTop - positioningOrigin.top}px`;
  }
  _enabledCompletionIndex(...args) { return this._completionController._enabledCompletionIndex(...args); }
  _moveCompletion(...args) { return this._completionController._moveCompletion(...args); }
  _setCompletionIndex(...args) { return this._completionController._setCompletionIndex(...args); }
  _acceptCompletion(...args) { return this._completionController._acceptCompletion(...args); }

  _updateFormValue() { if (!this._internals) return; this.disabled ? this._internals.setFormValue(null) : this._internals.setFormValue(this._value); }
  _fallbackValidity() { const flags = this._computeValidityFlags(); return { valid: Object.keys(flags).length === 0, valueMissing: Boolean(flags.valueMissing), tooShort: Boolean(flags.tooShort), tooLong: Boolean(flags.tooLong), customError: Boolean(flags.customError) }; }
  _computeValidityFlags() { const flags = {}; const value = this._value; if (this._customValidityMessage) flags.customError = true; if (this.required) { const empty = DEFAULTS.emptyRequiredTrim ? value.trim().length === 0 : value.length === 0; if (empty) flags.valueMissing = true; } const min = parseLengthConstraint(this.getAttribute("minlength")); if (min != null && value.length > 0 && value.length < min) flags.tooShort = true; const max = parseLengthConstraint(this.getAttribute("maxlength")); if (max != null && value.length > max) flags.tooLong = true; return flags; }
  _updateValidity() { if (!this._sourceTextarea) return; const flags = this._computeValidityFlags(); const min = parseLengthConstraint(this.getAttribute("minlength")); const max = parseLengthConstraint(this.getAttribute("maxlength")); let message = this._customValidityMessage || ""; if (!message) { if (flags.valueMissing) message = "Please fill out this field."; else if (flags.tooShort) message = `Please lengthen this text to at least ${min} characters.`; else if (flags.tooLong) message = `Please shorten this text to no more than ${max} characters.`; } const valid = Object.keys(flags).length === 0; if (valid) this._validationVisible = false; for (const el of [this._sourceTextarea, this._liveEditor]) el?.setAttribute("aria-invalid", valid ? "false" : "true"); this._validation.textContent = !valid && this._validationVisible ? message : ""; this._validationMessage = message; const anchor = this.mode === "source" || this.mode === "split" ? this._sourceTextarea : this.mode === "preview" ? this._preview : this._liveEditor; this._internals?.setValidity(flags, message, anchor); }
  _emitSelectionChange() { this._dispatch("md-selection-change", { selectionStart: this._selection.start, selectionEnd: this._selection.end, selectionDirection: this._selection.direction || "none" }); }
  _announce(message) { if (!message || !this._status) return; this._status.textContent = ""; requestAnimationFrame(() => { this._status.textContent = message; }); }
  _debug(level, phase, detail = {}) {
    const configuredLevel = this.debug;
    if (configuredLevel < level) return null;
    const payload = {
      sequence: ++this._debugSequence,
      timestamp: now(),
      level,
      phase,
      mode: this.mode,
      valueLength: this._value.length,
      selection: { ...this._selection },
      ...detail
    };
    const event = this._dispatch("md-debug", payload);
    if (this.debugLog) globalThis.console?.debug?.("[writemark-editor]", payload);
    return event;
  }
  _dispatch(name, detail = {}, options = {}) { const event = new CustomEvent(name, { detail, bubbles: options.bubbles ?? true, composed: options.composed ?? true, cancelable: options.cancelable ?? false }); this.dispatchEvent(event); return event; }
  _emitError(phase, error, recoverable = true, extra = {}) { this._dispatch("md-error", { phase, error, recoverable, ...extra }); }
  formResetCallback() { this.reset(); }
  formDisabledCallback(disabled) {
    const next = Boolean(disabled);
    if (this._formDisabled === next) return;
    if (this._isComposing) this._onCompositionEnd();
    this._formDisabled = next;
    if (!this._hasConnected) return;
    if (next) this._closeCompletion();
    this._syncAttributesToControls();
    if (next) this.blur();
    this._renderAll({ restoreSelection: !next, force: true });
    this._updateFormValue();
    this._updateValidity();
  }
  formStateRestoreCallback(state) { if (typeof state === "string") this.value = state; }
}
