import { LIVE_ARROW_KEYS, NAVIGATION_KEYS } from "../config.js";
import { clamp, getLineRange } from "../core/text.js";

/** Owns DOM selection and source mapping state. */
export class SelectionController {
  constructor(api) {
    this.api = Object.freeze(api);
    this._boundLiveMouseEnd = undefined;
    this._boundLiveMouseMove = undefined;
    this._liveEditablesCache = [];
    this._liveNavigationCache = [];
    this._liveIndexDirty = true;
    this._liveSelectionAPI = null;
    this._fallbackEditable = null;
    this._fallbackSelectionPending = false;
    this._selectionRestoreRequest = 0;
    this._pointerSelection = null;
    this._suppressLiveClick = false;
    this._structuredSelection = null;
    this._ignoreSelectionChangeCount = 0;
  }
  get disabled() { return this.api.getDisabled(); }
  get readonly() { return this.api.getReadonly(); }
  get mode() { return this.api.getMode(); }
  get _selection() { return this.api.getSelection(); }
  set _selection(value) { this.api.setSelection(value); }
  get ownerDocument() { return this.api.getOwnerDocument(); }
  get _isComposing() { return this.api.getIsComposing(); }
  set _isComposing(value) { this.api.setIsComposing(value); }
  get _value() { return this.api.getValue(); }
  get _shadow() { return this.api.getShadow(); }
  get _sourceTextarea() { return this.api.getSourceTextarea(); }
  get _preview() { return this.api.getPreview(); }
  get _liveEditor() { return this.api.getLiveEditor(); }
  set _liveEditor(value) { this.api.setLiveEditor(value); }
  get _virtualState() { return this.api.getVirtualState(); }
  get isConnected() { return this.api.getIsConnected(); }
  get _liveBlocks() { return this.api.getLiveBlocks(); }
  set _liveBlocks(value) { this.api.setLiveBlocks(value); }

  disconnect() {
    const doc = this.ownerDocument || document;
    doc.removeEventListener("mousemove", this._boundLiveMouseMove, true);
    doc.removeEventListener("mouseup", this._boundLiveMouseEnd, true);
    this._pointerSelection = null;
  }

  _onLiveMouseDown(event) {
    if (this.disabled || this.readonly || this.mode === "source" || event.button !== 0 || event.detail > 1) return;
    if (event.target.closest?.("[data-task-checkbox]")) return;
    const anchor = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
    if (anchor == null) return;
    const editable = this._liveEditableFromPoint(event.clientX, event.clientY);
    this.api._closeCompletion();
    if (this._liveSelectionAPI === false || this.api.isAppleWebKitRuntime()) {
      if (this._liveSelectionAPI === false) this._fallbackEditable = editable;
      this._fallbackSelectionPending = false;
      this._selection = { start: anchor, end: anchor, direction: "none" };
      this._pointerSelection = {
        anchor,
        focus: anchor,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        native: true
      };
      this._bindPointerSelectionListeners();
      return;
    }
    event.preventDefault();
    this._pointerSelection = { anchor, focus: anchor, startX: event.clientX, startY: event.clientY, moved: false, native: false };
    this.api.setSelectionRange(anchor, anchor, "none");
    this._bindPointerSelectionListeners();
  }

  _bindPointerSelectionListeners() {
    this._boundLiveMouseMove ??= mouseEvent => this._onLiveMouseMove(mouseEvent);
    this._boundLiveMouseEnd ??= mouseEvent => this._onLiveMouseEnd(mouseEvent);
    const doc = this.ownerDocument || document;
    doc.addEventListener("mousemove", this._boundLiveMouseMove, true);
    doc.addEventListener("mouseup", this._boundLiveMouseEnd, true);
  }

  _onLiveMouseMove(event) {
    const state = this._pointerSelection;
    if (!state) return;
    const focus = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
    if (focus == null) return;
    if (state.native) {
      state.focus = focus;
      state.moved = state.moved || Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 2;
      this._setFallbackPointerSelection(state.anchor, focus);
      return;
    }
    event.preventDefault();
    state.focus = focus;
    state.moved = state.moved || Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 2;
    this._setLivePointerSelection(state.anchor, focus);
  }

  _onLiveMouseEnd(event) {
    const state = this._pointerSelection;
    if (!state) return;
    const focus = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
    if (focus != null) {
      if (state.native) this._setFallbackPointerSelection(state.anchor, focus);
      else this._setLivePointerSelection(state.anchor, focus);
    }
    this._suppressLiveClick = state.moved;
    if (this._suppressLiveClick) globalThis.setTimeout?.(() => { this._suppressLiveClick = false; }, 0);
    this._pointerSelection = null;
    const doc = this.ownerDocument || document;
    doc.removeEventListener("mousemove", this._boundLiveMouseMove, true);
    doc.removeEventListener("mouseup", this._boundLiveMouseEnd, true);
    if (!state.native) event.preventDefault();
    else {
      this.api._emitSelectionChange();
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
    }
  }

  _setLivePointerSelection(anchor, focus) {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    const direction = anchor <= focus ? "forward" : "backward";
    this.api.setSelectionRange(start, end, direction);
  }

  _setFallbackPointerSelection(anchor, focus) {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    this._selection = {
      start,
      end,
      direction: anchor <= focus ? "forward" : "backward"
    };
  }

  _onNavigationKey(event) { if (NAVIGATION_KEYS.has(event.key)) this._onSelectionChanged(); }

  _maybeHandleLineBoundaryKey(event, activeCell = null, activeEditable = null) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || activeCell || this.mode === "preview") return false;
    const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "")
      || (this.api.isAppleWebKitRuntime() && !this.api.isIOSWebKitRuntime());
    let boundary = null;
    if (!event.metaKey && (event.key === "Home" || event.key === "End")) boundary = event.key === "Home" ? "start" : "end";
    else if (isMac && event.metaKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) boundary = event.key === "ArrowLeft" ? "start" : "end";
    if (!boundary) return false;
    const selection = this._getCurrentSelection();
    const focus = selection.direction === "backward" ? selection.start : selection.end;
    const anchor = selection.direction === "backward" ? selection.end : selection.start;
    const line = getLineRange(this._value, focus);
    const editableRange = !this._isSourceActive() ? this._editableSourceRange(activeEditable) : null;
    const target = boundary === "start" ? (editableRange?.from ?? line.start) : (editableRange?.to ?? line.end);
    event.preventDefault();
    if (event.shiftKey) this._setSourceBackedSelection(anchor, target);
    else this.api.setSelectionRange(target, target, "none");
    return true;
  }

  _maybeHandleLiveArrowKey(event, activeEditable = null) {
    if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return false;
    if (!LIVE_ARROW_KEYS.has(event.key)) return false;
    const editable = activeEditable || this.api._activeEditableFromEvent(event);
    if (!editable || editable.dataset.editable === "cell") return false;
    const selection = this._getLiveSelection() || this._getCurrentSelection();
    if (!selection) return false;
    if (selection.start !== selection.end && !event.shiftKey) {
      const target = (event.key === "ArrowLeft" || event.key === "ArrowUp") ? selection.start : selection.end;
      event.preventDefault();
      this.api.setSelectionRange(target, target, "none");
      return true;
    }
    if (event.shiftKey) return this._maybeExtendLiveArrowSelection(event, selection);
    if (selection.start !== selection.end) return false;
    const direction = (event.key === "ArrowLeft" || event.key === "ArrowUp") ? -1 : 1;
    let target = (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ? this._horizontalArrowTarget(editable, selection.start, direction)
      : this._verticalArrowTarget(editable, selection.start, direction);
    if (target == null && this._liveSelectionAPI === false) {
      target = (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ? this._fallbackHorizontalArrowTarget(editable, selection.start, direction)
        : this._fallbackVerticalArrowTarget(editable, selection.start, direction);
    }
    if (target == null || target === selection.start) return false;
    event.preventDefault();
    this.api.setSelectionRange(target, target, "none");
    return true;
  }

  _maybeExtendLiveArrowSelection(event, selection = this._getCurrentSelection()) {
    const focus = selection.direction === "backward" ? selection.start : selection.end;
    const anchor = selection.direction === "backward" ? selection.end : selection.start;
    const pos = this._domPositionFromSource(focus);
    const editable = pos?.editable;
    if (!editable || editable.dataset.editable === "cell") return false;
    const direction = (event.key === "ArrowLeft" || event.key === "ArrowUp") ? -1 : 1;
    let target = (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ? this._horizontalArrowTarget(editable, focus, direction)
      : this._verticalArrowTarget(editable, focus, direction);
    if (target == null && this._liveSelectionAPI === false) {
      target = (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ? this._fallbackHorizontalArrowTarget(editable, focus, direction)
        : this._fallbackVerticalArrowTarget(editable, focus, direction);
    }
    if (target == null || target === focus) return false;
    event.preventDefault();
    this._setSourceBackedSelection(anchor, target);
    return true;
  }

  _setSourceBackedSelection(anchor, focus) {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    const direction = anchor <= focus ? "forward" : "backward";
    this.api.setSelectionRange(start, end, direction);
  }

  _horizontalArrowTarget(editable, offset, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    if (direction < 0 && offset <= from) {
      const previous = this._adjacentLiveEditable(editable, -1);
      return previous ? Number(previous.dataset.to) : null;
    }
    if (direction > 0 && offset >= to) {
      const next = this._adjacentLiveEditable(editable, 1);
      return next ? Number(next.dataset.from) : null;
    }
    return null;
  }

  _fallbackHorizontalArrowTarget(editable, offset, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    if (direction < 0 && offset > from) {
      return offset - (Array.from(this._value.slice(from, offset)).at(-1)?.length || 1);
    }
    if (direction > 0 && offset < to) {
      return offset + (Array.from(this._value.slice(offset, to))[0]?.length || 1);
    }
    return null;
  }

  _fallbackVerticalArrowTarget(editable, offset, direction) {
    const caret = this._caretRectForSourceOffset(offset, editable);
    const box = editable.getBoundingClientRect();
    if (!caret || !box || box.height === 0) return null;
    const lineHeight = this._computedLineHeight(editable);
    const clientX = caret.left;
    const clientY = ((caret.top + caret.bottom) / 2) + direction * lineHeight;
    if (clientY <= box.top || clientY >= box.bottom) return null;
    const fromPoint = this._sourceOffsetFromPoint(editable, clientX, clientY);
    if (fromPoint != null) return fromPoint;
    return this._nearestSourceOffsetInEditable(editable, clientX, clientY);
  }

  _verticalArrowTarget(editable, offset, direction) {
    if (!this._isCaretOnVisualBoundary(editable, offset, direction)) return null;
    const targetEditable = this._adjacentLiveEditable(editable, direction);
    if (!targetEditable) return null;
    if (this._isSingleVisualRow(editable) && this._isSingleVisualRow(targetEditable)) {
      const sourceColumn = clamp(offset - Number(editable.dataset.from), 0, this._plainText(editable).length);
      return Number(targetEditable.dataset.from) + Math.min(sourceColumn, this._plainText(targetEditable).length);
    }
    const caretRect = this._caretRectForSourceOffset(offset, editable);
    const fallbackRect = editable.getBoundingClientRect();
    const clientX = caretRect?.left ?? fallbackRect.left;
    return this._sourceOffsetInEditableAtX(targetEditable, clientX, direction);
  }

  _isSingleVisualRow(editable) {
    const box = editable.getBoundingClientRect();
    if (!box || box.height === 0) return true;
    return box.height <= this._computedLineHeight(editable) * 1.65;
  }

  _adjacentLiveEditable(editable, direction) {
    const editables = this._liveNavigationEditables();
    const index = editables.indexOf(editable);
    return index === -1 ? null : editables[index + direction] || null;
  }

  _computedLineHeight(el) {
    const style = globalThis.getComputedStyle?.(el);
    const parsed = Number.parseFloat(style?.lineHeight || "");
    if (Number.isFinite(parsed)) return parsed;
    const fontSize = Number.parseFloat(style?.fontSize || "");
    return Number.isFinite(fontSize) ? fontSize * 1.2 : 18;
  }

  _isCaretOnVisualBoundary(editable, offset, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    const rect = this._caretRectForSourceOffset(offset, editable);
    const box = editable.getBoundingClientRect();
    if (!rect || !box || box.height === 0) return direction < 0 ? offset <= from : offset >= to;
    const tolerance = this._computedLineHeight(editable) * 0.65;
    return direction < 0
      ? rect.top <= box.top + tolerance
      : rect.bottom >= box.bottom - tolerance;
  }

  _caretRectForSourceOffset(offset, preferredEditable = null) {
    const pos = preferredEditable
      ? this._textPositionInElement(preferredEditable, this._displayOffsetFromSourceOffset(preferredEditable, offset))
      : this._domPositionFromSource(offset);
    if (!pos) return null;
    return this._caretRectFromDomPosition(pos.node, pos.offset);
  }

  _caretRectFromDomPosition(node, offset) {
    const range = document.createRange();
    try { range.setStart(node, offset); } catch { return null; }
    range.collapse(true);
    const rect = range.getClientRects()[0] || range.getBoundingClientRect();
    return rect && Number.isFinite(rect.left) && (rect.height > 0 || rect.width > 0) ? rect : null;
  }

  _sourceOffsetInEditableAtX(editable, clientX, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    const box = editable.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return direction < 0 ? to : from;
    const lineHeight = this._computedLineHeight(editable);
    const x = clamp(clientX, box.left + 1, box.right - 1);
    const rowOffset = Math.min(Math.max(lineHeight / 2, 1), Math.max(box.height / 2, 1));
    const y = direction < 0 ? box.bottom - rowOffset : box.top + rowOffset;
    const fromPoint = this._sourceOffsetFromPoint(editable, x, y);
    if (fromPoint != null) return clamp(fromPoint, from, to);
    return this._nearestSourceOffsetInEditable(editable, x, y);
  }

  _sourceOffsetFromPoint(editable, clientX, clientY) {
    const doc = editable.ownerDocument || document;
    let node = null;
    let offset = 0;
    if (doc.caretPositionFromPoint) {
      try {
        const pos = doc.caretPositionFromPoint(clientX, clientY, { shadowRoots: [this._shadow] });
        if (pos) { node = pos.offsetNode; offset = pos.offset; }
      } catch {
        const pos = doc.caretPositionFromPoint(clientX, clientY);
        if (pos) { node = pos.offsetNode; offset = pos.offset; }
      }
    }
    if (!node && doc.caretRangeFromPoint) {
      const range = doc.caretRangeFromPoint(clientX, clientY);
      if (range) { node = range.startContainer; offset = range.startOffset; }
    }
    if (!node || (node !== editable && !editable.contains(node))) return null;
    return this._sourceOffsetFromDom(editable, node, offset);
  }

  _liveEditableFromPoint(clientX, clientY) {
    const direct = this._shadow.elementFromPoint?.(clientX, clientY);
    const directEditable = this._closestEditable(direct);
    if (directEditable) return directEditable;
    const editables = this._liveEditables();
    let best = null;
    let bestScore = Infinity;
    for (const el of editables) {
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) continue;
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const score = dy * 10000 + dx;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  _sourceOffsetForClientPoint(clientX, clientY) {
    const editable = this._liveEditableFromPoint(clientX, clientY);
    if (!editable) return null;
    const rect = editable.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return Number(editable.dataset.from);
    const x = clamp(clientX, rect.left + 1, rect.right - 1);
    const y = clamp(clientY, rect.top + 1, rect.bottom - 1);
    const fromPoint = this._sourceOffsetFromPoint(editable, x, y);
    if (fromPoint != null) return clamp(fromPoint, Number(editable.dataset.from), Number(editable.dataset.to));
    return this._nearestSourceOffsetInEditable(editable, x, y);
  }

  _nearestSourceOffsetInEditable(editable, clientX, clientY) {
    const from = Number(editable.dataset.from);
    const length = this._plainText(editable).length;
    if (!length) return from;
    let bestOffset = 0;
    let bestScore = Infinity;
    for (let offset = 0; offset <= length; offset += 1) {
      const pos = this._textPositionInElement(editable, offset);
      const rect = this._caretRectFromDomPosition(pos.node, pos.offset);
      if (!rect) continue;
      const rowDistance = Math.abs(((rect.top + rect.bottom) / 2) - clientY);
      const columnDistance = Math.abs(rect.left - clientX);
      const score = (rowDistance * 1000) + columnDistance;
      if (score < bestScore) { bestScore = score; bestOffset = offset; }
    }
    return this._sourceOffsetFromDisplayOffset(editable, bestOffset) ?? from;
  }

  _onSelectionChanged() {
    if (this._ignoreSelectionChangeCount > 0) {
      this._ignoreSelectionChangeCount -= 1;
      this.api._debug(2, "live.selection.change-ignored", {
        remaining: this._ignoreSelectionChangeCount,
        selection: { ...this._selection }
      });
      this.api._emitSelectionChange();
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
      return;
    }
    this._structuredSelection = null;
    this._selection = this._getCurrentSelection();
    const exposedSelection = this._exposedLiveSelection();
    const selectionEndpoints = this._liveSelectionEndpoints(exposedSelection);
    this.api._debug(2, "live.selection.changed", {
      selection: { ...this._selection },
      active: this.api._debugEditableInfo(this._activeEditableFromSelection()),
      selectionReadStrategy: selectionEndpoints?.strategy || null
    });
    this.api._emitSelectionChange();
    if (!this._isComposing) this.api._scheduleCompletionUpdate();
  }

  _isSourceActive() { return this._shadow.activeElement === this._sourceTextarea || this.mode === "source" || this.mode === "split"; }

  _focusEditable(options) {
    if (this.disabled) return;
    if (this.mode === "source" || this.mode === "split") { this._sourceTextarea?.focus(options); this._sourceTextarea?.setSelectionRange(this._selection.start, this._selection.end, this._selection.direction); return; }
    if (this.mode === "preview") { this._preview?.focus(options); return; }
    this._liveEditor?.focus(options); this._restoreLiveSelection(this._selection);
  }

  _displayOffsetFromSourceOffset(editable, sourceOffset) {
    const range = this._editableSourceRange(editable);
    if (!range) return 0;
    const raw = this._cellRawSource(editable);
    const rel = clamp(Number(sourceOffset) - range.from, 0, range.to - range.from);
    if (raw == null) return clamp(rel, 0, this._plainText(editable).length);
    let display = 0;
    for (let i = 0; i < raw.length && i < rel;) {
      if (raw[i] === "\\" && (raw[i + 1] === "|" || raw[i + 1] === "\\")) {
        if (rel <= i + 1) return display;
        display += 1;
        i += 2;
      } else {
        display += 1;
        i += 1;
      }
    }
    return clamp(display, 0, this._plainText(editable).length);
  }

  _sourceOffsetFromDisplayOffset(editable, displayOffset) {
    const range = this._editableSourceRange(editable);
    if (!range) return null;
    const raw = this._cellRawSource(editable);
    const target = clamp(Number(displayOffset) || 0, 0, this._plainText(editable).length);
    if (raw == null) return clamp(range.from + target, range.from, Math.max(range.to, range.from + this._plainText(editable).length));
    let display = 0;
    for (let i = 0; i < raw.length;) {
      if (display >= target) return range.from + i;
      if (raw[i] === "\\" && (raw[i + 1] === "|" || raw[i + 1] === "\\")) {
        if (display + 1 >= target) return range.from + i + 2;
        display += 1;
        i += 2;
      } else {
        if (display + 1 >= target) return range.from + i + 1;
        display += 1;
        i += 1;
      }
    }
    return range.to;
  }

  _getCurrentSelection() {
    if (this._isSourceActive() && this._sourceTextarea) return { start: this._sourceTextarea.selectionStart, end: this._sourceTextarea.selectionEnd, direction: this._sourceTextarea.selectionDirection || "none" };
    if (this._structuredSelection) return { ...this._structuredSelection };
    const live = this._getLiveSelection();
    return live || this._selection || { start: 0, end: 0, direction: "none" };
  }

  _getLiveSelection(preferredEditable = null) {
    if (this._liveSelectionAPI === false) {
      if (!this._selection) return null;
      if (preferredEditable) {
        const range = this._editableSourceRange(preferredEditable);
        if (!range
          || this._selection.start < range.from
          || this._selection.end > range.to) return null;
      }
      return { ...this._selection };
    }
    return this._readLiveSelection(preferredEditable);
  }

  _readLiveSelection(preferredEditable = null) {
    const sel = this._exposedLiveSelection();
    if (!sel) return null;
    const endpoints = this._liveSelectionEndpoints(sel);
    if (!endpoints) return null;
    const anchorEditable = preferredEditable || this._closestEditable(endpoints.anchorNode?.nodeType === Node.ELEMENT_NODE ? endpoints.anchorNode : endpoints.anchorNode?.parentElement);
    const focusEditable = preferredEditable || this._closestEditable(endpoints.focusNode?.nodeType === Node.ELEMENT_NODE ? endpoints.focusNode : endpoints.focusNode?.parentElement);
    if (!anchorEditable || !focusEditable) return null;
    if (preferredEditable
      && ((!preferredEditable.contains(endpoints.anchorNode) && preferredEditable !== endpoints.anchorNode)
        || (!preferredEditable.contains(endpoints.focusNode) && preferredEditable !== endpoints.focusNode))) return null;
    const start = this._sourceOffsetFromDom(anchorEditable, endpoints.anchorNode, endpoints.anchorOffset);
    const end = this._sourceOffsetFromDom(focusEditable, endpoints.focusNode, endpoints.focusOffset);
    if (start == null || end == null) return null;
    return { start: Math.min(start, end), end: Math.max(start, end), direction: start <= end ? "forward" : "backward" };
  }



  _isLiveSelectionNode(node) {
    return Boolean(node && (
      node === this._liveEditor
      || this._liveEditor?.contains(node)
    ));
  }

  _liveComposedSelectionRange(selection) {
    if (!selection
      || typeof selection.getComposedRanges !== "function"
      || !this.api.isAppleWebKitRuntime()
      || this.api.isIOSWebKitRuntime()) return null;
    const attempts = [
      () => selection.getComposedRanges(this._shadow),
      () => selection.getComposedRanges({ shadowRoots: [this._shadow] })
    ];
    for (const read of attempts) {
      let range = null;
      try {
        range = read()?.[0] || null;
      } catch {
        continue;
      }
      if (this._isLiveSelectionNode(range?.startContainer)
        && this._isLiveSelectionNode(range?.endContainer)) return range;
    }
    return null;
  }

  _liveSelectionEndpoints(selection) {
    if (!selection || selection.rangeCount === 0) return null;
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (this._isLiveSelectionNode(anchorNode)
      && this._isLiveSelectionNode(focusNode)) {
      return {
        anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode,
        focusOffset: selection.focusOffset,
        strategy: "direct"
      };
    }
    const composed = this._liveComposedSelectionRange(selection);
    if (!composed) return null;
    const startEditable = this._closestEditable(
      composed.startContainer?.nodeType === Node.ELEMENT_NODE
        ? composed.startContainer
        : composed.startContainer?.parentElement
    );
    const endEditable = this._closestEditable(
      composed.endContainer?.nodeType === Node.ELEMENT_NODE
        ? composed.endContainer
        : composed.endContainer?.parentElement
    );
    const composedStart = startEditable
      ? this._sourceOffsetFromDom(
        startEditable,
        composed.startContainer,
        composed.startOffset
      )
      : null;
    const composedEnd = endEditable
      ? this._sourceOffsetFromDom(
        endEditable,
        composed.endContainer,
        composed.endOffset
      )
      : null;
    const explicitDirection = selection.direction;
    const previous = this._selection;
    const inferredBackward = composedStart != null
      && composedEnd != null
      && composedStart !== composedEnd
      && (
        (previous?.start === previous?.end
          && composedEnd === previous.end)
        || (previous?.direction === "backward"
          && composedEnd === previous.end)
      );
    const backward = explicitDirection === "backward"
      || (!["forward", "backward"].includes(explicitDirection)
        && inferredBackward);
    return {
      anchorNode: backward ? composed.endContainer : composed.startContainer,
      anchorOffset: backward ? composed.endOffset : composed.startOffset,
      focusNode: backward ? composed.startContainer : composed.endContainer,
      focusOffset: backward ? composed.startOffset : composed.endOffset,
      strategy: "composed-range"
    };
  }

  _exposedLiveSelection() {
    if (!this._liveEditor) return null;
    const candidate = this.api.readSelectionCandidates().find(({ selection }) => {
      return Boolean(this._liveSelectionEndpoints(selection));
    });
    return candidate?.selection || null;
  }



  _displayOffsetFromSelection(editable) {
    const sel = this._exposedLiveSelection();
    const endpoints = this._liveSelectionEndpoints(sel);
    const node = endpoints?.focusNode;
    if (!endpoints || !node || (node !== editable && !editable.contains(node))) return null;
    const range = document.createRange();
    range.selectNodeContents(editable);
    try { range.setEnd(node, endpoints.focusOffset); } catch { return null; }
    return range.toString().replace(/\u00a0/g, " ").replace(/\n/g, "").length;
  }

  _sourceOffsetFromDom(editable, node, offset) {
    const from = Number(editable.dataset.from); if (!Number.isFinite(from)) return null;
    const range = document.createRange(); range.selectNodeContents(editable);
    try { range.setEnd(node, offset); } catch { return from; }
    const text = range.toString().replace(/\u00a0/g, " ").replace(/\n/g, "");
    return this._sourceOffsetFromDisplayOffset(editable, text.length) ?? from;
  }

  _restoreLiveSelection(selection = this._selection, options = {}) {
    const deferredAttempt = options.deferredAttempt || 0;
    const requestId = options.requestId ?? ++this._selectionRestoreRequest;
    if (requestId !== this._selectionRestoreRequest) return;
    if (!this._liveEditor || this.mode === "source" || this.disabled) return;
    if (this._virtualState.active && !this.api._ensureVirtualSelectionVisible(selection)) { this._liveEditor.focus(); return; }
    const startPos = this._domPositionFromSource(selection.start);
    const endPos = this._domPositionFromSource(selection.end);
    if (!startPos || !endPos) { this._liveEditor.focus(); return; }
    if (!this._isLiveDomPositionConnected(startPos) || !this._isLiveDomPositionConnected(endPos)) { this._liveEditor.focus(); return; }
    const focusEditable = selection.direction === "backward" ? startPos.editable : endPos.editable;
    const focusTarget = this._liveSelectionAPI === false
      ? (focusEditable || startPos.editable)
      : this._liveEditor;
    const activeElement = this._shadow?.activeElement || null;
    const focusRequired = Boolean(focusTarget && (
      focusTarget === this._liveEditor
        ? !this.api.hasComponentFocus()
        : activeElement !== focusTarget && !focusTarget.contains(activeElement)
    ));
    this.api._debug(2, "live.selection.restore-requested", {
      requested: { ...selection },
      deferredAttempt,
      focusRequired,
      start: this.api._debugEditableInfo(startPos.editable),
      end: this.api._debugEditableInfo(endPos.editable)
    });
    if (focusRequired) {
      try {
        focusTarget?.focus?.({ preventScroll: true });
      } catch {
        focusTarget?.focus?.();
      }
    }
    const range = document.createRange();
    try {
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
    } catch {
      this._liveEditor.focus();
      return;
    }
    const candidates = this.api.readSelectionCandidates();
    const strictDocumentRestore = options.strictDocumentRestore ?? Boolean(
      candidates.length === 1
      && candidates[0].channel === "document"
      && this.api.isAppleWebKitRuntime()
    );
    let actual = null;
    let observed = null;
    let selectionChannel = null;
    let selectionReadStrategy = null;
    let selectionStrategy = null;
    let selectionVerification = null;
    let opaqueDocumentWrite = null;
    for (const candidate of candidates) {
      const sel = candidate.selection;
      const strategies = [];
      if (strictDocumentRestore && typeof sel.setBaseAndExtent === "function") {
        strategies.push({
          name: "setBaseAndExtent",
          apply: () => {
            if (selection.direction === "backward") sel.setBaseAndExtent(endPos.node, endPos.offset, startPos.node, startPos.offset);
            else sel.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
          }
        });
      }
      if (selection.start === selection.end && !strictDocumentRestore) {
        strategies.push({
          name: "addRange",
          apply: () => sel.addRange(range)
        });
      }
      if (!strictDocumentRestore && typeof sel.setBaseAndExtent === "function") {
        strategies.push({
          name: "setBaseAndExtent",
          apply: () => {
            if (selection.direction === "backward") sel.setBaseAndExtent(endPos.node, endPos.offset, startPos.node, startPos.offset);
            else sel.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
          }
        });
      }
      if (selection.start === selection.end && typeof sel.setPosition === "function") {
        strategies.push({
          name: "setPosition",
          apply: () => sel.setPosition(startPos.node, startPos.offset)
        });
      }
      if (selection.start === selection.end && typeof sel.collapse === "function") {
        strategies.push({
          name: "collapse",
          apply: () => sel.collapse(startPos.node, startPos.offset)
        });
      }
      if (selection.start !== selection.end) {
        strategies.push({
          name: "addRange",
          apply: () => sel.addRange(range)
        });
      }
      for (const strategy of strategies) {
        try {
          sel.removeAllRanges();
          strategy.apply();
        } catch {
          continue;
        }
        observed = this._readLiveSelection();
        if (observed) {
          selectionReadStrategy = this._liveSelectionEndpoints(
            this._exposedLiveSelection()
          )?.strategy || null;
        }
        if (!observed) {
          if (strictDocumentRestore
            && candidate.channel === "document"
            && strategy.name === "setBaseAndExtent") {
            opaqueDocumentWrite = {
              actual: {
                start: Math.min(selection.start, selection.end),
                end: Math.max(selection.start, selection.end),
                direction: selection.direction === "backward" ? "backward" : "forward"
              },
              selectionChannel: candidate.channel,
              selectionStrategy: strategy.name
            };
            break;
          }
          continue;
        }
        if (strictDocumentRestore
          && (observed.start !== Math.min(selection.start, selection.end)
            || observed.end !== Math.max(selection.start, selection.end))) continue;
        actual = observed;
        selectionChannel = candidate.channel;
        selectionStrategy = strategy.name;
        selectionVerification = "read-back";
        break;
      }
      if (actual) break;
    }
    if (!actual) {
      const deferDocumentRestore = options.deferDocumentRestore
        ?? strictDocumentRestore;
      if (deferDocumentRestore && deferredAttempt < 2 && this.isConnected) {
        this.api._debug(2, "live.selection.restore-deferred", {
          requested: { ...selection },
          deferredAttempt: deferredAttempt + 1,
          observed,
          selectionChannels: candidates.map(candidate => candidate.channel)
        });
        requestAnimationFrame(() => {
          if (requestId !== this._selectionRestoreRequest) return;
          this._restoreLiveSelection(selection, {
            deferredAttempt: deferredAttempt + 1,
            deferDocumentRestore,
            requestId,
            strictDocumentRestore
          });
        });
        return;
      }
      if (strictDocumentRestore && opaqueDocumentWrite) {
        actual = opaqueDocumentWrite.actual;
        selectionChannel = opaqueDocumentWrite.selectionChannel;
        selectionStrategy = opaqueDocumentWrite.selectionStrategy;
        selectionVerification = "write-only";
      }
    }
    if (!actual) {
      if (this.api.isAppleWebKitRuntime()) {
        this._liveSelectionAPI = true;
        this._fallbackEditable = null;
        this._fallbackSelectionPending = false;
        this._liveEditor.contentEditable = this.api._lineEditable();
        this.api._syncLiveEditingHosts();
        this.api._debug(1, "live.selection.native-preserved", {
          requested: { ...selection },
          reason: candidates.length ? "selection-verification-failed" : "selection-api-unavailable",
          deferredAttempt,
          observed,
          selectionChannels: candidates.map(candidate => candidate.channel)
        });
        return;
      }
      this.api._debug(1, "live.selection.restore-fallback", {
        requested: { ...selection },
        reason: candidates.length ? "selection-verification-failed" : "selection-api-unavailable",
        deferredAttempt,
        observed,
        selectionChannels: candidates.map(candidate => candidate.channel)
      });
      this._useFallbackLiveSelection(focusEditable || startPos.editable);
      return;
    }
    this.api._debug(2, "live.selection.restored", {
      requested: { ...selection },
      actual,
      deferredAttempt,
      focusRequired,
      selectionChannel,
      selectionReadStrategy,
      selectionStrategy,
      selectionVerification
    });
    const recoveredFromFallback = this._liveSelectionAPI === false;
    this._liveSelectionAPI = true;
    this._fallbackEditable = null;
    this._fallbackSelectionPending = false;
    if (recoveredFromFallback) {
      this._liveEditor.contentEditable = this.api._lineEditable();
      this.api._syncLiveEditingHosts();
    }
  }

  _domPositionFromSource(offset) {
    const safe = clamp(offset, 0, this._value.length);
    if (this._virtualState.active && !this.api._isSourceOffsetRendered(safe)) {
      const blocks = this._liveBlocks?.length ? this._liveBlocks : this.api._getBlocks();
      this.api._renderLiveVirtual(blocks, { anchorOffset: safe, force: true });
      this._rebuildLiveIndex();
    }
    const editables = this._liveEditables();
    if (!editables.length) return null;
    let previous = null;
    for (const el of editables) {
      const from = Number(el.dataset.from);
      const to = Number(el.dataset.to);
      if (safe < from) {
        if (!previous) return this._textPositionInElement(el, 0);
        const prevTo = Number(previous.dataset.to);
        return (safe - prevTo <= from - safe)
          ? this._textPositionInElement(previous, this._plainText(previous).length)
          : this._textPositionInElement(el, 0);
      }
      if (safe >= from && safe <= to) return this._textPositionInElement(el, this._displayOffsetFromSourceOffset(el, safe));
      previous = el;
    }
    return this._textPositionInElement(previous, this._plainText(previous).length);
  }

  _rebuildLiveIndex() {
    const editables = [...this._liveEditor.querySelectorAll("[data-editable]")]
      .filter(el => Number.isFinite(Number(el.dataset.from)) && Number.isFinite(Number(el.dataset.to)))
      .sort((a, b) => Number(a.dataset.from) - Number(b.dataset.from));
    this._liveEditablesCache = editables;
    this._liveNavigationCache = editables.filter(el => el.dataset.editable !== "cell" && el.dataset.kind !== "horizontal-rule");
    this._liveIndexDirty = false;
  }

  _liveEditables() {
    if (this._liveIndexDirty) this._rebuildLiveIndex();
    return this._liveEditablesCache || [];
  }

  _liveNavigationEditables() {
    if (this._liveIndexDirty) this._rebuildLiveIndex();
    return this._liveNavigationCache || [];
  }

  _isLiveDomPositionConnected(pos) {
    return Boolean(pos?.node?.isConnected && pos?.editable?.isConnected && this._liveEditor?.contains(pos.editable));
  }

  _textPositionInElement(el, offset) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remaining = clamp(offset, 0, this._plainText(el).length);
    let lastText = null;
    while (walker.nextNode()) {
      const node = walker.currentNode; const len = node.nodeValue.length; lastText = node;
      if (remaining <= len) return { node, offset: remaining, editable: el };
      remaining -= len;
    }
    if (lastText) return { node: lastText, offset: lastText.nodeValue.length, editable: el };
    const text = document.createTextNode(""); el.appendChild(text); return { node: text, offset: 0, editable: el };
  }

  _useFallbackLiveSelection(editable) {
    this._liveSelectionAPI = false;
    this._fallbackEditable = editable || this._domPositionFromSource(this._selection.end)?.editable || null;
    this._fallbackSelectionPending = true;
    if (this._liveEditor) this._liveEditor.contentEditable = "false";
    this.api._syncLiveEditingHosts();
    this.api._debug(1, "live.selection.fallback-enabled", {
      editable: this.api._debugEditableInfo(this._fallbackEditable)
    });
    const focusTarget = this._fallbackEditable || this._liveEditor;
    focusTarget?.blur();
    try {
      focusTarget?.focus?.({ preventScroll: true });
    } catch {
      focusTarget?.focus?.();
    }
  }

  _ensureEmptyLiveEditable() {
    if (this._value.length !== 0 || !this._liveEditor) return;
    if (!this._liveEditor.querySelector("[data-editable]")) {
      const blocks = this.api._getBlocks();
      this.api._renderLiveFull(blocks);
      this._liveBlocks = blocks;
      this._rebuildLiveIndex();
    }
    this._selection = { start: 0, end: 0, direction: "none" };
    this._restoreLiveSelection(this._selection);
  }

  _activeEditableFromSelection() {
    const sel = this._exposedLiveSelection();
    if (sel) {
      const endpoints = this._liveSelectionEndpoints(sel);
      const node = endpoints?.focusNode || endpoints?.anchorNode;
      const editable = this._closestEditable(node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement);
      if (editable) return editable;
    }
    const focus = this._selection.direction === "backward"
      ? this._selection.start
      : this._selection.end;
    return this._domPositionFromSource(focus)?.editable || this._fallbackEditable;
  }

  _cellRawSource(editable) {
    const range = this._editableSourceRange(editable);
    return range && editable?.dataset?.editable === "cell" ? this._value.slice(range.from, range.to) : null;
  }

  _closestEditable(target) { return target?.closest?.("[data-editable]") ?? null; }

  _editableSourceRange(editable) {
    const from = Number(editable?.dataset?.from);
    const to = Number(editable?.dataset?.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    return { from, to: Math.max(from, to) };
  }

  _plainText(el) { return (el.innerText ?? el.textContent ?? "").replace(/\u00a0/g, " ").replace(/\n+$/g, ""); }




}
