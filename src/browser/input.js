import { LIVE_STRUCTURAL_BLOCK_TYPES } from "../config.js";
import { clamp, getLineRange, nextGraphemeOffset, normalizeLineEndings, previousGraphemeOffset } from "../core/text.js";
import { applyTextChanges, diffTextChange, insertionTransaction, makeSnapshot, ok, tx } from "../core/transactions.js";
import { getFenceInfo, hasClosingFenceAfter, isInsideFence } from "../markdown/block-syntax.js";
import { parseBlocks } from "../markdown/blocks.js";

/** Owns input and composition state. */
export class InputController {
  constructor(api) {
    this.api = Object.freeze(api);
    this._beforeInputSnapshot = null;
    this._beforeInputTarget = null;
    this._compositionSnapshot = null;
    this._isComposing = false;
    this._pendingFenceOpening = null;
    this._webKitNativeInput = null;
  }
  get disabled() { return this.api.getDisabled(); }
  set disabled(value) { this.api.setDisabled(value); }
  get readonly() { return this.api.getReadonly(); }
  set readonly(value) { this.api.setReadonly(value); }
  get _sourceTextarea() { return this.api.getSourceTextarea(); }
  get _value() { return this.api.getValue(); }
  set _value(value) { this.api.setValue(value); }
  get _selection() { return this.api.getSelection(); }
  set _selection(value) { this.api.setSelection(value); }
  get _redoStack() { return this.api.getRedoStack(); }
  get _liveDirty() { return this.api.getLiveDirty(); }
  get _ignoreSelectionChangeCount() { return this.api.getIgnoreSelectionChangeCount(); }
  set _ignoreSelectionChangeCount(value) { this.api.setIgnoreSelectionChangeCount(value); }
  get _structuredSelection() { return this.api.getStructuredSelection(); }
  set _structuredSelection(value) { this.api.setStructuredSelection(value); }
  get _liveSelectionAPI() { return this.api.getLiveSelectionAPI(); }
  get _fallbackSelectionPending() { return this.api.getFallbackSelectionPending(); }
  set _fallbackSelectionPending(value) { this.api.setFallbackSelectionPending(value); }
  get _fallbackEditable() { return this.api.getFallbackEditable(); }
  set _fallbackEditable(value) { this.api.setFallbackEditable(value); }
  get shiftEnterBehavior() { return this.api.getShiftEnterBehavior(); }

  _onSourceBeforeInput(event) {
    this._beforeInputSnapshot = null;
    if (this.disabled || this.readonly) {
      event.preventDefault();
      return;
    }
    if (this._isComposing || event?.isComposing) return;
    const inputType = event?.inputType || "";
    if (inputType === "historyUndo" || inputType === "historyRedo") {
      event.preventDefault();
      inputType === "historyUndo"
        ? this.api._undo({ source: "user", inputType })
        : this.api._redo({ source: "user", inputType });
      return;
    }
    this._beforeInputSnapshot = this.api._snapshot();
  }

  _onSourceInput(event) {
    if (this.disabled || this.readonly) {
      this._sourceTextarea.value = this._value;
      this._sourceTextarea.setSelectionRange(
        this._selection.start,
        this._selection.end,
        this._selection.direction
      );
      this._beforeInputSnapshot = null;
      return;
    }
    const composing = this._isComposing || event?.isComposing;
    const before = composing
      ? null
      : (this._beforeInputSnapshot || makeSnapshot(
          this._value,
          this._selection.start,
          this._selection.end,
          this._selection.direction
        ));
    const previousValue = this._value;
    this._value = normalizeLineEndings(this._sourceTextarea.value);
    this._pendingFenceOpening = null;
    if (this._sourceTextarea.value !== this._value) this._sourceTextarea.value = this._value;
    this._selection = { start: this._sourceTextarea.selectionStart, end: this._sourceTextarea.selectionEnd, direction: this._sourceTextarea.selectionDirection || "none" };
    const after = this.api._snapshot();
    this._beforeInputSnapshot = null;
    if (previousValue === this._value) {
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
      return;
    }
    if (before) this.api._recordUndo(before, after, this.api._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward" });
    this._redoStack.length = 0;
    this.api._afterValueChanged({ source: "user", inputType: event?.inputType, restoreSelection: false, previousValue, changes: diffTextChange(previousValue, this._value) });
    if (!this._isComposing) this.api._scheduleCompletionUpdate();
  }

  _onCompositionStart() {
    if (this.disabled || this.readonly || this._isComposing) return;
    this._compositionSnapshot = this.api._snapshot();
    this._beforeInputSnapshot = null;
    this._beforeInputTarget = null;
    this._isComposing = true;
    this.api._closeCompletion();
  }

  _onCompositionEnd() {
    if (!this._isComposing) return;
    const before = this._compositionSnapshot;
    const after = this.api._snapshot();
    this._isComposing = false;
    this._compositionSnapshot = null;
    this._beforeInputSnapshot = null;
    this._beforeInputTarget = null;
    if (before?.value !== after.value) this.api._recordUndo(before, after, "composition");
    if (before?.value !== after.value) this._redoStack.length = 0;
    if (this.api._isLiveVisible() && this._liveDirty) {
      this.api._renderAll({
        restoreSelection: true,
        previousValue: before?.value ?? this._value,
        changes: before ? diffTextChange(before.value, this._value) : null,
        force: true
      });
    }
    this.api._scheduleCompletionUpdate();
  }

  _onLiveBeforeInput(event) {
    if (this._isComposing || event?.isComposing) return;
    this._ignoreSelectionChangeCount = 0;
    this._structuredSelection = null;
    this._webKitNativeInput = null;
    const inputType = event?.inputType || "";
    const targetRange = this._sourceSelectionFromBeforeInput(event);
    const inputTarget = this._inputTargetFromBeforeInput(event, targetRange);
    this._beforeInputTarget = inputTarget;
    this.api._debug(1, "live.beforeinput", {
      inputType,
      cancelable: Boolean(event?.cancelable),
      composing: Boolean(event?.isComposing),
      targetSelection: targetRange?.selection || null,
      targetStart: this.api._debugEditableInfo(targetRange?.startEditable),
      targetEnd: this.api._debugEditableInfo(targetRange?.endEditable)
    });
    if (inputType.startsWith("insert") && targetRange?.selection) {
      this._selection = { ...targetRange.selection };
      this._structuredSelection = { ...targetRange.selection };
    }
    if (this._liveSelectionAPI === false && inputTarget) {
      const targetHasSelection = inputTarget.selection.start !== inputTarget.selection.end;
      const modelHasSelection = this._selection.start !== this._selection.end;
      if (!this._fallbackSelectionPending || (targetHasSelection && !modelHasSelection)) {
        this._selection = { ...inputTarget.selection };
      }
      this._fallbackEditable = inputTarget.editable;
    }
    if (this._value.length === 0 && inputType.startsWith("delete")) {
      event.preventDefault();
      this._beforeInputTarget = null;
      this.api._ensureEmptyLiveEditable();
      return;
    }
    if (!this.api._isSourceActive() && !this.disabled && !this.readonly
      && (inputType === "historyUndo" || inputType === "historyRedo")) {
      event.preventDefault();
      this._beforeInputTarget = null;
      inputType === "historyUndo"
        ? this.api._undo({ source: "user", inputType })
        : this.api._redo({ source: "user", inputType });
      return;
    }
    if (!this.api._isSourceActive() && !this.disabled && !this.readonly
      && inputType === "insertText" && event.data != null
      && this._applyLiveMarkdownInsertBeforeInput(event, inputType)) {
      this._beforeInputTarget = null;
      return;
    }
    const preserveNativeFenceInsert = inputType === "insertText"
      && event.data != null
      && this._shouldPreserveNativeFenceInsert(this.api._getContext(), event.data);
    if (!this.api._isSourceActive() && !this.disabled && !this.readonly
      && this.api._isAppleWebKitRuntime() && !this.api._isIOSWebKitRuntime()
      && event?.isTrusted && event?.cancelable
      && !preserveNativeFenceInsert
      && (inputType === "insertText" || inputType === "insertReplacementText")
      && event.data != null
      && this._applyFallbackBeforeInput(event, inputTarget)) {
      this._beforeInputTarget = null;
      return;
    }
    if (!this.api._isSourceActive() && !this.disabled && !this.readonly
      && (inputType === "insertParagraph" || inputType === "insertLineBreak")) {
      event.preventDefault();
      this._beforeInputTarget = null;
      const ctx = this.api._getContext();
      const actionId = inputType === "insertLineBreak"
        && this.shiftEnterBehavior === "soft-break"
        && !this.api._isUnclosedFenceOpeningContext(ctx)
        ? "editor.insertSoftBreak"
        : "editor.smartEnter";
      this.api._runAction(actionId, undefined, {
        source: "user",
        inputType,
        apply: true
      });
      return;
    }
    if (!this.api._isSourceActive() && !this.disabled && !this.readonly
      && inputType.startsWith("delete")
      && this._applyLiveDeletionBeforeInput(event, inputType, targetRange)) {
      this._beforeInputTarget = null;
      return;
    }
    if (!this.api._isSourceActive() && !this.disabled && !this.readonly) {
      const ctx = this.api._getContext();
      const hasSelection = ctx.selectionStart !== ctx.selectionEnd;
      const editable = this.api._closestEditable(event.target) || this.api._activeEditableFromSelection();
      const editableRange = this.api._editableSourceRange(editable);
      const selectionInsideTableCell = editable?.dataset.editable === "cell"
        && editableRange
        && ctx.selectionStart >= editableRange.from
        && ctx.selectionEnd <= editableRange.to;
      if (hasSelection && inputType.startsWith("insert") && event.data != null && !selectionInsideTableCell) {
        event.preventDefault();
        this._beforeInputTarget = null;
        const text = normalizeLineEndings(event.data);
        this.api._applyActionResult("editor.replaceSelection", insertionTransaction(ctx, "editor.replaceSelection", text, text.length, "typing"), { source: "user", inputType });
        return;
      }
    }
    if (this._liveSelectionAPI === false && this._applyFallbackBeforeInput(event, inputTarget)) {
      this._beforeInputTarget = null;
      return;
    }
    this._beforeInputSnapshot = this.api._snapshot();
  }

  _applyLiveMarkdownInsertBeforeInput(event, inputType) {
    const ctx = this.api._getContext();
    const candidate = this._liveMarkdownInsertCandidate(ctx, event.data);
    if (!candidate) return false;
    const { actionId, result, strategy, text } = candidate;

    event.preventDefault();
    if (!event.defaultPrevented) return false;
    this.api._debug(1, "live.insert.source-backed", {
      inputType,
      strategy,
      timing: "beforeinput",
      textLength: text.length,
      selectionBefore: {
        start: ctx.selectionStart,
        end: ctx.selectionEnd,
        direction: ctx.selectionDirection
      },
      selectionAfter: result.transaction.selectionAfter
    });
    this.api._applyActionResult(actionId, result, {
      source: "user",
      inputType
    });
    return true;
  }

  _liveMarkdownInsertCandidate(ctx, input) {
    const text = normalizeLineEndings(input);
    if (!text || text.includes("\n")) return false;
    const nextValue = applyTextChanges(ctx.value, [{
      from: ctx.selectionStart,
      to: ctx.selectionEnd,
      insert: text
    }]);
    const nextCursor = ctx.selectionStart + text.length;
    const currentLine = getLineRange(ctx.value, ctx.selectionStart);
    const nextLine = getLineRange(nextValue, nextCursor);
    const smartDashBreak = /^(\s{0,3})[\u2013\u2014]-$/.exec(nextLine.text);
    if (smartDashBreak
      && currentLine.start === nextLine.start
      && ctx.selectionEnd <= currentLine.end) {
      const insert = `${smartDashBreak[1]}---`;
      const cursor = currentLine.start + insert.length;
      return {
        actionId: "editor.replaceSelection",
        result: ok(tx(
          ctx,
          "editor.replaceSelection",
          [{ from: currentLine.start, to: currentLine.end, insert }],
          { start: cursor, end: cursor, direction: "none" },
          "markdownShortcut"
        )),
        strategy: "smart-punctuation-thematic-break",
        text
      };
    }
    if (this._shouldPreserveNativeFenceInsert(ctx, text)) return false;
    let actionId = "editor.replaceSelection";
    let result = text === " " ? this.api._markdownShortcut(ctx) : null;
    let strategy = "markdown-shortcut";

    if (!result?.ok || !result.transaction) {
      result = null;
      const currentBlock = parseBlocks(ctx.value, this.api._parseOptions())
        .find(block => ctx.selectionStart >= block.from
          && ctx.selectionStart <= Math.max(block.to, block.from));
      const nextBlock = parseBlocks(nextValue, this.api._parseOptions())
        .find(block => nextCursor >= block.from
          && nextCursor <= Math.max(block.to, block.from));
      if (nextBlock?.type === "code-fence"
        && currentBlock?.type !== "code-fence") return false;
      if (!LIVE_STRUCTURAL_BLOCK_TYPES.has(nextBlock?.type)
        || currentBlock?.type === nextBlock.type) return false;
      result = insertionTransaction(
        ctx,
        actionId,
        text,
        text.length,
        "markdownShortcut"
      );
      strategy = "structural-transition";
    } else {
      actionId = "editor.markdownShortcut";
    }
    return { actionId, result, strategy, text };
  }

  _shouldPreserveNativeFenceInsert(ctx, input) {
    const text = normalizeLineEndings(input);
    if (!ctx || !text || text.includes("\n")) return false;
    if (this.api._isUnclosedFenceOpeningContext(ctx)) return true;
    const nextValue = applyTextChanges(ctx.value, [{
      from: ctx.selectionStart,
      to: ctx.selectionEnd,
      insert: text
    }]);
    const nextCursor = ctx.selectionStart + text.length;
    const currentBlock = parseBlocks(ctx.value, this.api._parseOptions())
      .find(block => ctx.selectionStart >= block.from
        && ctx.selectionStart <= Math.max(block.to, block.from));
    const nextBlock = parseBlocks(nextValue, this.api._parseOptions())
      .find(block => nextCursor >= block.from
        && nextCursor <= Math.max(block.to, block.from));
    return nextBlock?.type === "code-fence"
      && currentBlock?.type !== "code-fence";
  }

  _applyLiveMarkdownInsertAfterInput(inputType, previousValue, nextValue) {
    if (!["insertText", "insertReplacementText"].includes(inputType)
      || previousValue === nextValue) return false;
    const changes = diffTextChange(previousValue, nextValue);
    if (changes.length !== 1) return false;
    const change = changes[0];
    const selectionBefore = {
      start: change.from,
      end: change.to,
      direction: "none"
    };
    const ctx = this.api._getContext(selectionBefore);
    const candidate = this._liveMarkdownInsertCandidate(ctx, change.insert);
    if (!candidate) return false;
    const { actionId, result, strategy, text } = candidate;

    this._beforeInputSnapshot = null;
    this._beforeInputTarget = null;
    this._selection = { ...selectionBefore };
    this._structuredSelection = { ...selectionBefore };
    this.api._debug(1, "live.insert.source-backed", {
      inputType,
      strategy,
      timing: "input",
      textLength: text.length,
      selectionBefore: {
        start: ctx.selectionStart,
        end: ctx.selectionEnd,
        direction: ctx.selectionDirection
      },
      selectionAfter: result.transaction.selectionAfter
    });
    const applied = this.api._applyActionResult(actionId, result, {
      source: "user",
      inputType
    });
    if (!applied?.ok) {
      this._structuredSelection = null;
      this._selection = { ...selectionBefore };
      this.api._renderAll({ restoreSelection: true, force: true });
    }
    return true;
  }

  _isPendingFenceOpening(value, cursor, previousValue = null) {
    const line = getLineRange(value, cursor);
    if (cursor !== line.end || line.end >= value.length || value[line.end] !== "\n") {
      return false;
    }
    const match = /^(\s*)(`{3,}|~{3,})([\w+-]*)$/.exec(line.text);
    if (!match) return false;
    const opener = getFenceInfo(line.text);
    if (!opener || isInsideFence(value, line.start)) return false;
    const activePending = this._pendingFenceOpening;
    if (activePending
      && activePending.start === line.start
      && activePending.marker === opener.marker) {
      return true;
    }
    const previousCursor = clamp(
      this._selection.start,
      0,
      previousValue?.length ?? 0
    );
    const previousLine = previousValue == null
      ? null
      : getLineRange(previousValue, previousCursor);
    const createdNow = previousLine && !getFenceInfo(previousLine.text);
    if (!createdNow && hasClosingFenceAfter(value, line.end, opener)) {
      return false;
    }
    this._pendingFenceOpening = {
      start: line.start,
      marker: opener.marker
    };
    return true;
  }

  _shouldUseAppleWebKitNativeDeletion(event, inputType, targetRange) {
    if (!event?.isTrusted || !this.api._isAppleWebKitRuntime()) return false;
    if (!inputType.startsWith("delete")) return false;
    const selection = targetRange?.selection;
    if (!selection || selection.start === selection.end) return false;
    const editables = [targetRange.startEditable, targetRange.endEditable];
    return editables.every(editable => {
      if (!editable || editable.dataset.editable !== "line") return false;
      return !["task-list-item", "code-line", "horizontal-rule"].includes(
        editable.dataset.kind
      );
    });
  }

  _applyLiveDeletionBeforeInput(event, inputType, targetRange) {
    if (this._shouldUseAppleWebKitNativeDeletion(event, inputType, targetRange)) {
      const selection = targetRange.selection;
      this._webKitNativeInput = {
        changes: [{
          from: selection.start,
          to: selection.end,
          insert: ""
        }],
        inputType,
        selectionAfter: {
          start: selection.start,
          end: selection.start,
          direction: "none"
        }
      };
      this.api._debug(1, "live.delete.browser-owned", {
        inputType,
        reason: "webkit-native-selection",
        targetSelection: selection
      });
      return false;
    }
    if (!event?.cancelable) {
      this.api._debug(1, "live.delete.browser-owned", {
        inputType,
        reason: "beforeinput-not-cancelable"
      });
      return false;
    }
    const current = this.api._getCurrentSelection();
    const currentCollapsed = current.start === current.end;
    const targetSelection = targetRange?.selection || null;
    const backward = inputType.includes("Backward");
    const forward = inputType.includes("Forward");
    const caret = currentCollapsed && targetSelection
      ? (backward ? targetSelection.end : targetSelection.start)
      : (backward ? current.start : current.end);

    if (inputType === "deleteContentBackward" && currentCollapsed) {
      const smartSelection = { start: caret, end: caret, direction: "none" };
      const result = this.api._smartBackspace(this.api._getContext(smartSelection));
      if (result?.ok && result.transaction) {
        event.preventDefault();
        if (!event.defaultPrevented) return false;
        this.api._debug(1, "live.delete.source-backed", {
          inputType,
          strategy: "smart-backspace",
          targetSelection,
          selectionAfter: result.transaction.selectionAfter
        });
        this.api._applyActionResult("editor.smartBackspace", result, {
          source: "user",
          inputType
        });
        return true;
      }
    }

    let start = Math.min(current.start, current.end);
    let end = Math.max(current.start, current.end);
    if (targetSelection?.start !== targetSelection?.end) {
      start = targetSelection.start;
      end = targetSelection.end;
    } else if (start === end && backward && start > 0) {
      start = previousGraphemeOffset(this._value, start);
    } else if (start === end && forward && end < this._value.length) {
      end = nextGraphemeOffset(this._value, end);
    }

    const crossesTableBoundary = targetRange?.startEditable !== targetRange?.endEditable
      && (targetRange?.startEditable?.dataset?.editable === "cell"
        || targetRange?.endEditable?.dataset?.editable === "cell");
    event.preventDefault();
    if (!event.defaultPrevented) return false;
    if (crossesTableBoundary || start === end) {
      this.api._debug(1, "live.delete.noop", {
        inputType,
        reason: crossesTableBoundary ? "table-boundary" : "document-boundary",
        targetSelection
      });
      return true;
    }

    const selectionAfter = {
      start,
      end: start,
      direction: "none"
    };
    const changes = [{ from: start, to: end, insert: "" }];
    this.api._debug(1, "live.delete.source-backed", {
      inputType,
      strategy: targetSelection ? "target-range" : "model-selection",
      targetSelection,
      changes: this.api._debugTextChanges(changes),
      selectionAfter
    });
    this._applySourceBackedInput(inputType, changes, selectionAfter);
    return true;
  }

  _onLiveInput(event) {
    if (this.disabled || this.readonly) {
      this._beforeInputSnapshot = null;
      this._beforeInputTarget = null;
      this.api._renderAll({ restoreSelection: !this.disabled, force: true });
      return;
    }
    this._ignoreSelectionChangeCount = 0;
    this._structuredSelection = null;
    const webKitNativeInput = this._webKitNativeInput;
    this._webKitNativeInput = null;
    if (webKitNativeInput) {
      this._commitWebKitNativeInput(event, webKitNativeInput);
      return;
    }
    const inputTarget = this._beforeInputTarget;
    const editable = this.api._closestEditable(event.target) || inputTarget?.editable || this.api._activeEditableFromSelection();
    this._beforeInputTarget = null;
    this.api._debug(1, "live.input", {
      inputType: event?.inputType || "",
      composing: Boolean(this._isComposing || event?.isComposing),
      editable: this.api._debugEditableInfo(editable),
      beforeInputSelection: inputTarget?.selection || null
    });
    if (!editable) return;
    const composing = this._isComposing || event?.isComposing;
    const before = composing
      ? null
      : (this._beforeInputSnapshot || makeSnapshot(
          this._value,
          this._selection.start,
          this._selection.end,
          this._selection.direction
        ));
    const from = Number(editable.dataset.from); const to = Number(editable.dataset.to);
    const raw = this.api._plainText(editable).replace(/\n/g, "");
    const liveSelection = this.api._getLiveSelection(editable);
    const changedDisplay = inputTarget
      ? diffTextChange(inputTarget.text, raw)[0]
      : null;
    const inferredDisplayCursor = changedDisplay
      ? changedDisplay.from + changedDisplay.insert.length
      : null;
    const compositionSourceCursor = composing
      && this._compositionSnapshot?.selection
      && event?.data != null
      ? this._compositionSnapshot.selection.start + String(event.data).length
      : null;
    const compositionDisplayStart = compositionSourceCursor != null
      ? this.api._displayOffsetFromSourceOffset(
          editable,
          this._compositionSnapshot.selection.start
        )
      : null;
    const compositionDisplayCursor = compositionDisplayStart == null
      ? null
      : compositionDisplayStart + String(event.data).length;
    const tableDisplayCursor = editable.dataset.editable === "cell"
      ? (compositionDisplayCursor
        ?? this.api._displayOffsetFromSelection(editable)
        ?? inferredDisplayCursor)
      : null;
    const tableEdit = editable.dataset.editable === "cell" ? this.api._tableCellInputEdit(editable, raw, tableDisplayCursor) : null;
    if (tableEdit) {
      const previousValue = this._value;
      this._value = tableEdit.nextValue;
      this._selection = { start: tableEdit.cursor, end: tableEdit.cursor, direction: "none" };
      if (composing) {
        editable.dataset.from = String(tableEdit.cellFrom);
        editable.dataset.to = String(tableEdit.cellTo);
        const table = editable.closest(".md-table-block");
        if (table) {
          table.dataset.from = String(tableEdit.blockFrom);
          table.dataset.to = String(tableEdit.blockTo);
        }
      }
      const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction);
      this._beforeInputSnapshot = null;
      if (previousValue === this._value) {
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
        return;
      }
      if (before) this.api._recordUndo(before, after, this.api._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward" });
      this._redoStack.length = 0;
      this.api._afterValueChanged({
        source: "user",
        inputType: event?.inputType,
        restoreSelection: true,
        previousValue,
        changes: diffTextChange(previousValue, this._value),
        preserveLiveDom: this.api._isAppleWebKitRuntime()
      });
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
      return;
    }
    let insert = raw;
    let virtualPrefixLength = 0;
    if (editable.dataset.editable === "virtual-code" || editable.dataset.editable === "virtual-code-after" || editable.dataset.editable === "virtual-hr-after" || editable.dataset.editable === "virtual-setext-after" || editable.dataset.editable === "virtual-table-after") {
      const beforeSource = this._value.slice(0, from);
      if (!beforeSource.endsWith("\n")) {
        insert = `\n${raw}`;
        virtualPrefixLength = 1;
      }
    }
    const previousValue = this._value;
    const nextValue = previousValue.slice(0, from) + insert + previousValue.slice(to);
    const liveCursor = liveSelection?.end != null
      ? liveSelection.end - from
      : (inferredDisplayCursor ?? insert.length - virtualPrefixLength);
    const cursor = compositionSourceCursor == null
      ? clamp(from + virtualPrefixLength + liveCursor, from, from + insert.length)
      : clamp(compositionSourceCursor, from, from + insert.length);
    if (!composing && this._applyLiveMarkdownInsertAfterInput(
      event?.inputType || "",
      previousValue,
      nextValue
    )) return;
    const pendingFenceOpening = !composing
      && this._isPendingFenceOpening(nextValue, cursor, previousValue);
    if (pendingFenceOpening) {
      editable.dataset.to = String(from + insert.length);
    }
    this._value = nextValue;
    this._selection = { start: cursor, end: cursor, direction: "none" };
    if (composing) editable.dataset.to = String(from + insert.length);
    const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction);
    this._beforeInputSnapshot = null;
    if (previousValue === this._value) {
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
      return;
    }
    if (before) this.api._recordUndo(before, after, this.api._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward" });
    this._redoStack.length = 0;
    this.api._afterValueChanged({
      source: "user",
      inputType: event?.inputType,
      restoreSelection: true,
      previousValue,
      changes: [{ from, to, insert }],
      preserveLiveDom: this.api._isAppleWebKitRuntime() || pendingFenceOpening
    });
    if (!this._isComposing) this.api._scheduleCompletionUpdate();
  }

  _commitWebKitNativeInput(event, pending) {
    const inputType = event?.inputType || pending.inputType;
    const before = this._beforeInputSnapshot || makeSnapshot(
      this._value,
      this._selection.start,
      this._selection.end,
      this._selection.direction
    );
    const previousValue = this._value;
    this._value = applyTextChanges(previousValue, pending.changes);
    this._selection = {
      start: clamp(pending.selectionAfter.start, 0, this._value.length),
      end: clamp(pending.selectionAfter.end, 0, this._value.length),
      direction: pending.selectionAfter.direction || "none"
    };
    const after = makeSnapshot(
      this._value,
      this._selection.start,
      this._selection.end,
      this._selection.direction
    );
    this._beforeInputSnapshot = null;
    this._beforeInputTarget = null;
    if (previousValue === this._value) {
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
      return;
    }
    this.api._recordUndo(before, after, this.api._undoGroupForInput(inputType), {
      coalesce: inputType === "deleteContentBackward"
        || inputType === "deleteContentForward"
    });
    this._redoStack.length = 0;
    this.api._afterValueChanged({
      source: "user",
      inputType,
      restoreSelection: false,
      previousValue,
      changes: pending.changes,
      preserveLiveDom: true
    });
    this.api._debug(1, "live.input.browser-owned", {
      inputType,
      changes: this.api._debugTextChanges(pending.changes),
      selectionAfter: { ...this._selection }
    });
    if (!this._isComposing) this.api._scheduleCompletionUpdate();
  }

  _sourceSelectionFromBeforeInput(event) {
    const range = event?.getTargetRanges?.()[0];
    if (!range) return null;
    const startElement = range.startContainer?.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer?.parentElement;
    const endElement = range.endContainer?.nodeType === Node.ELEMENT_NODE
      ? range.endContainer
      : range.endContainer?.parentElement;
    const startEditable = this.api._closestEditable(startElement);
    const endEditable = this.api._closestEditable(endElement);
    if (!startEditable || !endEditable) return null;
    const start = this.api._sourceOffsetFromDom(startEditable, range.startContainer, range.startOffset);
    const end = this.api._sourceOffsetFromDom(endEditable, range.endContainer, range.endOffset);
    if (start == null || end == null) return null;
    return {
      selection: {
        start: Math.min(start, end),
        end: Math.max(start, end),
        direction: start <= end ? "forward" : "backward"
      },
      startEditable,
      endEditable
    };
  }

  _inputTargetFromBeforeInput(event, targetRange = this._sourceSelectionFromBeforeInput(event)) {
    if (!targetRange || targetRange.startEditable !== targetRange.endEditable) return null;
    const editable = targetRange.startEditable;
    return {
      editable,
      selection: targetRange.selection,
      text: this.api._plainText(editable)
    };
  }

  _applyFallbackBeforeInput(event, inputTarget) {
    const inputType = event?.inputType || "";
    const selection = this._selection;
    const editable = inputTarget?.editable || this._fallbackEditable;
    let start = Math.min(selection.start, selection.end);
    let end = Math.max(selection.start, selection.end);
    let insert = "";
    if (inputType.startsWith("insert") && event.data != null) {
      insert = normalizeLineEndings(event.data);
    } else if (inputType.startsWith("delete")) {
      if (start === end && inputTarget?.selection.start !== inputTarget?.selection.end) {
        start = inputTarget.selection.start;
        end = inputTarget.selection.end;
      } else if (start === end && inputType.includes("Backward") && start > 0) {
        start = previousGraphemeOffset(this._value, start);
      } else if (start === end && inputType.includes("Forward") && end < this._value.length) {
        end = nextGraphemeOffset(this._value, end);
      }
      if (start === end) return false;
    } else {
      return false;
    }
    if (editable?.dataset.editable === "cell") {
      const raw = this.api._plainText(editable);
      const displayStart = this.api._displayOffsetFromSourceOffset(editable, start);
      const displayEnd = this.api._displayOffsetFromSourceOffset(editable, end);
      const nextRaw = raw.slice(0, displayStart) + insert + raw.slice(displayEnd);
      const tableEdit = this.api._tableCellInputEdit(
        editable,
        nextRaw,
        displayStart + insert.length
      );
      if (!tableEdit) return false;
      event.preventDefault();
      this._applySourceBackedInput(
        inputType,
        diffTextChange(this._value, tableEdit.nextValue),
        { start: tableEdit.cursor, end: tableEdit.cursor, direction: "none" }
      );
      return true;
    }
    if (inputType.startsWith("insert")
      && ["virtual-code", "virtual-code-after", "virtual-hr-after", "virtual-setext-after", "virtual-table-after"].includes(editable?.dataset.editable)
      && !this._value.slice(0, start).endsWith("\n")) {
      insert = `\n${insert}`;
    }
    event.preventDefault();
    this._applySourceBackedInput(inputType, [{ from: start, to: end, insert }], {
      start: start + insert.length,
      end: start + insert.length,
      direction: "none"
    });
    return true;
  }

  _applySourceBackedInput(inputType, changes, selectionAfter) {
    const before = this.api._snapshot();
    const previousValue = this._value;
    this._value = applyTextChanges(previousValue, changes);
    this._selection = {
      start: clamp(selectionAfter.start, 0, this._value.length),
      end: clamp(selectionAfter.end, 0, this._value.length),
      direction: selectionAfter.direction || "none"
    };
    const after = makeSnapshot(
      this._value,
      this._selection.start,
      this._selection.end,
      this._selection.direction
    );
    this.api._recordUndo(before, after, this.api._undoGroupForInput(inputType), {
      coalesce: inputType === "insertText"
        || inputType === "deleteContentBackward"
        || inputType === "deleteContentForward"
    });
    this._redoStack.length = 0;
    this.api._afterValueChanged({
      source: "user",
      inputType,
      restoreSelection: true,
      previousValue,
      changes
    });
    this.api._debug(1, "live.input.source-backed", {
      inputType,
      changes: this.api._debugTextChanges(changes),
      selectionAfter: { ...this._selection }
    });
    if (!this._isComposing) this.api._scheduleCompletionUpdate();
  }
}
