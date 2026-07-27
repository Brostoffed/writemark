import { expect, test } from "./support/editor-fixture.js";

async function dispatchLiveBeforeInput(editor, {
  data = null,
  forceFallback = false,
  inputType,
  isComposing = false,
  targetRange = null
}) {
  return editor.host.evaluate((element, options) => {
    element.focus();
    const target = element._activeEditableFromSelection()
      || element.shadowRoot.querySelector("[data-editable]");
    if (options.forceFallback) {
      element._useFallbackLiveSelection(target);
      element._fallbackSelectionPending = false;
    }

    const ranges = [];
    if (options.targetRange) {
      const start = element._domPositionFromSource(options.targetRange[0]);
      const end = element._domPositionFromSource(options.targetRange[1]);
      if (start && end) {
        ranges.push({
          endContainer: end.node,
          endOffset: end.offset,
          startContainer: start.node,
          startOffset: start.offset
        });
      }
    }

    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data: options.data,
      inputType: options.inputType,
      isComposing: options.isComposing
    });
    if (event.inputType !== options.inputType) {
      Object.defineProperty(event, "inputType", {
        value: options.inputType
      });
    }
    Object.defineProperty(event, "getTargetRanges", {
      value: () => ranges
    });
    const sourceTargetSelection =
      element._sourceSelectionFromBeforeInput(event)?.selection || null;
    const targetSelection = element._inputTargetFromBeforeInput(event)?.selection
      || null;
    target.dispatchEvent(event);
    return {
      defaultPrevented: event.defaultPrevented,
      selectionEnd: element.selectionEnd,
      selectionStart: element.selectionStart,
      sourceTargetSelection,
      targetSelection,
      value: element.value
    };
  }, { data, forceFallback, inputType, isComposing, targetRange });
}

async function applyLiveDomInput(editor, options) {
  const {
    data,
    inputType = "insertText"
  } = options;
  const beforeInputData = Object.hasOwn(options, "beforeInputData")
    ? options.beforeInputData
    : data;
  return editor.host.evaluate((element, options) => {
    element.focus();
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const startPosition = element._domPositionFromSource(start);
    const endPosition = element._domPositionFromSource(end);
    const target = startPosition?.editable === endPosition?.editable
      ? startPosition.editable
      : element._activeEditableFromSelection()
        || element.shadowRoot.querySelector("[data-editable]");
    const ranges = startPosition?.editable === target && endPosition?.editable === target
      ? [{
          endContainer: endPosition.node,
          endOffset: endPosition.offset,
          startContainer: startPosition.node,
          startOffset: startPosition.offset
        }]
      : [];
    const beforeInput = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data: options.beforeInputData,
      inputType: options.inputType
    });
    Object.defineProperty(beforeInput, "getTargetRanges", {
      value: () => ranges
    });
    target.dispatchEvent(beforeInput);

    let inputDispatched = false;
    if (!beforeInput.defaultPrevented) {
      const targetFrom = Number(target.dataset.from);
      const targetText = element._plainText(target);
      const localStart = Math.max(0, start - targetFrom);
      const localEnd = Math.max(localStart, end - targetFrom);
      const nextTargetText = targetText.slice(0, localStart)
        + options.data
        + targetText.slice(localEnd);
      const cursor = localStart + options.data.length;
      target.textContent = nextTargetText;
      const position = element._textPositionInElement(target, cursor);
      const range = document.createRange();
      range.setStart(position.node, position.offset);
      range.collapse(true);
      const selection = element.shadowRoot.getSelection?.()
        || globalThis.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: options.data,
        inputType: options.inputType
      }));
      inputDispatched = true;
    }

    return {
      beforePrevented: beforeInput.defaultPrevented,
      inputDispatched
    };
  }, { beforeInputData, data, inputType });
}

async function runNativeSelectAll(editor, offset) {
  return editor.host.evaluate((element, sourceOffset) => {
    element.setSelectionRange(sourceOffset, sourceOffset);
    if (typeof element.shadowRoot.getSelection === "function") {
      document.execCommand("selectAll");
      const nativeSelection = element._readLiveSelection();
      if (nativeSelection) return nativeSelection;
    }

    // Firefox does not expose execCommand's shadow-tree selection. Exercise
    // the same browser-owned Selection range without using the component API.
    const selection = element._exposedLiveSelection();
    const start = element._domPositionFromSource(0);
    const end = element._domPositionFromSource(element.value.length);
    selection.removeAllRanges();
    selection.setBaseAndExtent(
      start.node,
      start.offset,
      end.node,
      end.offset
    );
    return element._readLiveSelection();
  }, offset);
}

async function applySourceDomInput(editor, {
  data,
  inputType = "insertText"
}) {
  return editor.source.evaluate((textarea, options) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeInput = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data: options.data,
      inputType: options.inputType
    });
    textarea.dispatchEvent(beforeInput);
    if (!beforeInput.defaultPrevented) {
      textarea.value = textarea.value.slice(0, start)
        + options.data
        + textarea.value.slice(end);
      const cursor = start + options.data.length;
      textarea.setSelectionRange(cursor, cursor);
      textarea.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: options.data,
        inputType: options.inputType
      }));
    }
    return { defaultPrevented: beforeInput.defaultPrevented };
  }, { data, inputType });
}

async function dispatchSourceBeforeInput(editor, inputType) {
  return editor.source.evaluate((textarea, nextInputType) => {
    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: nextInputType
    });
    if (event.inputType !== nextInputType) {
      Object.defineProperty(event, "inputType", {
        value: nextInputType
      });
    }
    textarea.dispatchEvent(event);
    return { defaultPrevented: event.defaultPrevented };
  }, inputType);
}

async function installStaleIOSShadowSelection(editor, {
  deferDocumentSelection = false,
  opaqueDocumentSelection = false,
  unavailableDocumentSelection = false
} = {}) {
  await editor.host.evaluate((element, options) => {
    const nativeGetSelection = globalThis.getSelection?.bind(globalThis);
    const initialStart = element._domPositionFromSource(
      element.selectionStart
    );
    const initialEnd = element._domPositionFromSource(
      element.selectionEnd
    );
    let anchorNode = initialStart.node;
    let anchorOffset = initialStart.offset;
    let focusNode = initialEnd.node;
    let focusOffset = initialEnd.offset;
    let rangeCount = 1;
    let selectionWriteCount = 0;
    let documentSelectionReady = !options.deferDocumentSelection;
    let unlockScheduled = false;
    const applyWhenReady = callback => {
      if (documentSelectionReady) {
        callback();
        return;
      }
      if (unlockScheduled) return;
      unlockScheduled = true;
      requestAnimationFrame(() => {
        documentSelectionReady = true;
      });
    };
    const documentSelectionProxy = {
      addRange() {},
      get anchorNode() {
        return options.opaqueDocumentSelection ? element : anchorNode;
      },
      get anchorOffset() {
        return options.opaqueDocumentSelection ? 0 : anchorOffset;
      },
      collapse: (node, offset) => applyWhenReady(() => {
        anchorNode = node;
        anchorOffset = offset;
        focusNode = node;
        focusOffset = offset;
        rangeCount = 1;
      }),
      get focusNode() {
        return options.opaqueDocumentSelection ? element : focusNode;
      },
      get focusOffset() {
        return options.opaqueDocumentSelection ? 0 : focusOffset;
      },
      get rangeCount() { return rangeCount; },
      removeAllRanges: () => applyWhenReady(() => {
        anchorNode = null;
        anchorOffset = 0;
        focusNode = null;
        focusOffset = 0;
        rangeCount = 0;
      }),
      setBaseAndExtent: (
        nextAnchorNode,
        nextAnchorOffset,
        nextFocusNode,
        nextFocusOffset
      ) => {
        selectionWriteCount += 1;
        applyWhenReady(() => {
          if (options.opaqueDocumentSelection) return;
          anchorNode = nextAnchorNode;
          anchorOffset = nextAnchorOffset;
          focusNode = nextFocusNode;
          focusOffset = nextFocusOffset;
          rangeCount = 1;
        });
      },
      setPosition: (node, offset) => applyWhenReady(() => {
        anchorNode = node;
        anchorOffset = offset;
        focusNode = node;
        focusOffset = offset;
        rangeCount = 1;
      }),
      toString: () => nativeGetSelection?.()?.toString?.() || ""
    };
    element._iosSelectionSimulation = {
      getSelectionDescriptor: Object.getOwnPropertyDescriptor(
        globalThis,
        "getSelection"
      ),
      isIOSWebKitRuntime: element._isIOSWebKitRuntime,
      selectionWriteCount: () => selectionWriteCount
    };
    element._isIOSWebKitRuntime = () => true;
    Object.defineProperty(element.shadowRoot, "activeElement", {
      configurable: true,
      get: () => null
    });
    Object.defineProperty(element.shadowRoot, "getSelection", {
      configurable: true,
      value: () => null
    });
    Object.defineProperty(globalThis, "getSelection", {
      configurable: true,
      value: () => options.unavailableDocumentSelection
        ? null
        : documentSelectionProxy
    });
  }, {
    deferDocumentSelection,
    opaqueDocumentSelection,
    unavailableDocumentSelection
  });
}

async function removeStaleIOSShadowSelection(editor) {
  return editor.host.evaluate(element => {
    const descriptor = element._iosSelectionSimulation
      ?.getSelectionDescriptor;
    const liveSelection = element._readLiveSelection();
    const modelSelection = { ...element._selection };
    const selectionWriteCount = element._iosSelectionSimulation
      ?.selectionWriteCount?.() || 0;
    const liveSelectionAPI = element._liveSelectionAPI;
    const liveContentEditable = element._liveEditor.contentEditable;
    delete element.shadowRoot.activeElement;
    delete element.shadowRoot.getSelection;
    element._isIOSWebKitRuntime = element._iosSelectionSimulation
      .isIOSWebKitRuntime;
    if (descriptor) {
      Object.defineProperty(globalThis, "getSelection", descriptor);
    } else {
      delete globalThis.getSelection;
    }
    const nativeLiveSelection = element._readLiveSelection();
    delete element._iosSelectionSimulation;
    return {
      liveContentEditable,
      liveSelection,
      liveSelectionAPI,
      modelSelection,
      nativeLiveSelection,
      selectionWriteCount
    };
  });
}

async function composeLive(editor, updates) {
  return editor.host.evaluate((element, nextUpdates) => {
    element.focus();
    const target = element._activeEditableFromSelection()
      || element.shadowRoot.querySelector("[data-editable]");
    const originalTarget = target;
    const initialValue = element.value;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const modes = [];
    const values = [];
    let stableDuringUpdates = true;

    target.dispatchEvent(new CompositionEvent("compositionstart", {
      bubbles: true,
      data: ""
    }));
    modes.push(element._getContext().mode);

    for (const update of nextUpdates) {
      target.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: update,
        inputType: "insertCompositionText",
        isComposing: true
      }));
      target.dispatchEvent(new CompositionEvent("compositionupdate", {
        bubbles: true,
        data: update
      }));

      const nextValue = initialValue.slice(0, start)
        + update
        + initialValue.slice(end);
      target.textContent = nextValue;
      const cursor = start + update.length;
      const position = element._textPositionInElement(target, cursor);
      const range = document.createRange();
      range.setStart(position.node, position.offset);
      range.collapse(true);
      const selection = element.shadowRoot.getSelection?.()
        || globalThis.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: update,
        inputType: "insertCompositionText",
        isComposing: true
      }));

      modes.push(element._getContext().mode);
      values.push(element.value);
      stableDuringUpdates &&= originalTarget.isConnected
        && element.shadowRoot.querySelector("[data-editable]") === originalTarget;
    }

    target.dispatchEvent(new CompositionEvent("compositionend", {
      bubbles: true,
      data: nextUpdates.at(-1) || ""
    }));
    modes.push(element._getContext().mode);

    return {
      modes,
      stableDuringUpdates,
      values
    };
  }, updates);
}

async function composeSource(editor, updates) {
  return editor.source.evaluate((textarea, nextUpdates) => {
    const initialValue = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const host = textarea.getRootNode().host;
    const modes = [];
    const values = [];

    textarea.dispatchEvent(new CompositionEvent("compositionstart", {
      bubbles: true,
      data: ""
    }));
    modes.push(host._getContext().mode);

    for (const update of nextUpdates) {
      textarea.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: update,
        inputType: "insertCompositionText",
        isComposing: true
      }));
      textarea.dispatchEvent(new CompositionEvent("compositionupdate", {
        bubbles: true,
        data: update
      }));
      textarea.value = initialValue.slice(0, start)
        + update
        + initialValue.slice(end);
      const cursor = start + update.length;
      textarea.setSelectionRange(cursor, cursor);
      textarea.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: update,
        inputType: "insertCompositionText",
        isComposing: true
      }));
      modes.push(host._getContext().mode);
      values.push(host.value);
    }

    textarea.dispatchEvent(new CompositionEvent("compositionend", {
      bubbles: true,
      data: nextUpdates.at(-1) || ""
    }));
    modes.push(host._getContext().mode);
    return { modes, values };
  }, updates);
}

test.describe("live input contract", () => {
  test("real keyboard input reports canonical value, source, and input type", async ({ editor, page }) => {
    await editor.reset({ value: "ab" });
    await editor.setSelection(1);

    await page.keyboard.type("X");

    expect(await editor.value()).toBe("aXb");
    expect(await editor.selection()).toEqual({ start: 2, end: 2 });
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "insertText",
        source: "user",
        value: "aXb"
      })
    ]);
  });

  test("DOM input reconciles into the canonical model and one undo unit", async ({ editor, page }) => {
    await editor.reset({ value: "ab" });
    await editor.setSelection(1);

    await applyLiveDomInput(editor, { data: "X" });

    expect(await editor.value()).toBe("aXb");
    expect(await editor.selection()).toEqual({ start: 2, end: 2 });
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "insertText",
        source: "user",
        value: "aXb"
      })
    ]);

    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("ab");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("aXb");
  });

  for (const inputType of [
    "insertText",
    "insertReplacementText",
    "insertFromComposition"
  ]) {
    test(`${inputType} replaces a cross-block source selection`, async ({ editor }) => {
      await editor.reset({ value: "alpha\nbeta" });
      await editor.setSelection(2, 8);

      const result = await dispatchLiveBeforeInput(editor, {
        data: "X",
        inputType
      });

      expect(result.defaultPrevented).toBe(true);
      expect(await editor.value()).toBe("alXta");
      expect(await editor.selection()).toEqual({ start: 3, end: 3 });
      expect(await editor.events("md-input")).toEqual([
        expect.objectContaining({
          inputType,
          source: "user",
          value: "alXta"
        })
      ]);
    });
  }

  for (const inputType of [
    "deleteContentBackward",
    "deleteContentForward",
    "deleteWordBackward",
    "deleteSoftLineForward"
  ]) {
    test(`${inputType} removes the exact cross-block selection`, async ({ editor }) => {
      await editor.reset({ value: "alpha\nbeta" });
      await editor.setSelection(2, 8);

      const result = await dispatchLiveBeforeInput(editor, { inputType });

      expect(result.defaultPrevented).toBe(true);
      expect(await editor.value()).toBe("alta");
      expect(await editor.selection()).toEqual({ start: 2, end: 2 });
      expect(await editor.events("md-input")).toEqual([
        expect.objectContaining({
          inputType,
          source: "user",
          value: "alta"
        })
      ]);
    });
  }

  test("software-keyboard Backspace keeps a mid-line caret after the deleted character", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta"
    });
    await editor.setSelection(8);
    await installStaleIOSShadowSelection(editor);

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward",
      targetRange: [7, 8]
    });
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);
    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("alpha\nbta");
    expect(restored.liveSelection).toEqual({
      direction: "forward",
      end: 7,
      start: 7
    });
    expect(restored.modelSelection).toMatchObject({ end: 7, start: 7 });
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.selection.restored",
      selectionChannel: "document",
      selectionStrategy: "setBaseAndExtent"
    }));
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "deleteContentBackward",
        source: "user",
        value: "alpha\nbta"
      })
    ]);
  });

  test("iOS selection restoration retries on the next frame before enabling fallback", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta"
    });
    await editor.setSelection(8);
    await installStaleIOSShadowSelection(editor, {
      deferDocumentSelection: true
    });

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward",
      targetRange: [7, 8]
    });
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);
    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("alpha\nbta");
    expect(restored.liveSelection).toEqual({
      direction: "forward",
      end: 7,
      start: 7
    });
    expect(restored.modelSelection).toMatchObject({ end: 7, start: 7 });
    expect(diagnostics).toContainEqual(expect.objectContaining({
      deferredAttempt: 1,
      phase: "live.selection.restore-deferred"
    }));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      deferredAttempt: 1,
      phase: "live.selection.restored",
      selectionChannel: "document",
      selectionStrategy: "setBaseAndExtent"
    }));
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
  });

  test("iOS keeps the requested caret when document selection read-back is opaque", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta"
    });
    await editor.setSelection(8);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    await editor.host.evaluate(() => {
      window.testEvents.length = 0;
    });

    await editor.live.press("Backspace");
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(await editor.value()).toBe("alpha\nbta");
    expect(restored).toMatchObject({
      liveContentEditable: "true",
      liveSelection: null,
      liveSelectionAPI: true,
      modelSelection: { end: 7, start: 7 },
      nativeLiveSelection: { end: 7, start: 7 }
    });
    expect(restored.selectionWriteCount).toBe(0);
    expect(diagnostics).toContainEqual(expect.objectContaining({
      inputType: "deleteContentBackward",
      phase: "live.delete.browser-owned"
    }));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      inputType: "deleteContentBackward",
      phase: "live.input.browser-owned"
    }));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.dom.native-preserved"
    }));
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.fallback-enabled"
    )).toBe(false);
  });

  test("physical Backspace on a blank line keeps the native caret when iOS read-back is opaque", async ({ editor }) => {
    const value = "## Formatting\n\nUse **bold** and *italic*.";
    const blankStart = value.indexOf("\n") + 1;
    await editor.reset({
      attributes: { debug: 2 },
      value
    });
    await editor.setSelection(blankStart);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    await editor.host.evaluate(() => {
      window.testEvents.length = 0;
    });

    await editor.host.evaluate(element => {
      element._testOriginalOnKeyDown = element._onKeyDown;
      element._onKeyDown = () => {};
    });
    await editor.live.press("Backspace");
    await editor.host.evaluate(element => {
      element._onKeyDown = element._testOriginalOnKeyDown;
      delete element._testOriginalOnKeyDown;
    });
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(await editor.value()).toBe(
      "## Formatting\nUse **bold** and *italic*."
    );
    expect(restored).toMatchObject({
      liveContentEditable: "true",
      liveSelection: null,
      liveSelectionAPI: true,
      modelSelection: {
        end: blankStart - 1,
        start: blankStart - 1
      },
      nativeLiveSelection: {
        end: blankStart - 1,
        start: blankStart - 1
      }
    });
    expect(restored.selectionWriteCount).toBe(0);
    expect(diagnostics).toContainEqual(expect.objectContaining({
      inputType: "deleteContentBackward",
      phase: "live.delete.browser-owned"
    }));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      inputType: "deleteContentBackward",
      phase: "live.input.browser-owned"
    }));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.dom.native-preserved"
    }));
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.fallback-enabled"
    )).toBe(false);
  });

  test("physical text input keeps the native caret when iOS selection read-back is opaque", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta"
    });
    await editor.setSelection(8);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    await editor.host.evaluate(() => {
      window.testEvents.length = 0;
    });

    await editor.live.press("X");
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(await editor.value()).toBe("alpha\nbeXta");
    expect(restored).toMatchObject({
      liveContentEditable: "true",
      liveSelection: null,
      liveSelectionAPI: true,
      modelSelection: { end: 9, start: 9 },
      nativeLiveSelection: { end: 9, start: 9 }
    });
    expect(restored.selectionWriteCount).toBe(0);
    expect(diagnostics).toContainEqual(expect.objectContaining({
      inputType: "insertText",
      phase: "live.input"
    }));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.dom.native-preserved"
    }));
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-requested"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
  });

  test("physical iOS pointer placement stays browser-owned when selection read-back is opaque", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta\ngamma"
    });
    await editor.setSelection(0);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    await editor.host.evaluate(() => {
      window.testEvents.length = 0;
    });

    await editor.live.click();
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(restored.liveSelectionAPI).toBe(true);
    expect(restored.selectionWriteCount).toBe(0);
    expect(restored.nativeLiveSelection).not.toBeNull();
    expect(restored.nativeLiveSelection.start).toBeGreaterThanOrEqual(0);
    expect(restored.nativeLiveSelection.end).toBeLessThanOrEqual(16);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-requested"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.fallback-enabled"
    )).toBe(false);
  });

  test("iOS selection-channel failure preserves one document editing host", async ({ editor }) => {
    const value = "# Heading\n\nParagraph\n\nTail";
    const blankStart = value.indexOf("\n\n") + 1;
    await editor.reset({
      attributes: { debug: 2 },
      value
    });
    await editor.setSelection(blankStart);
    await installStaleIOSShadowSelection(editor, {
      unavailableDocumentSelection: true
    });
    await editor.host.evaluate((element, offset) => {
      window.testEvents.length = 0;
      element.setSelectionRange(offset, offset);
      element.focus();
    }, blankStart);
    await editor.settle();

    const state = await editor.host.evaluate(element => {
      const live = element.shadowRoot.querySelector(".live-editor");
      return {
        liveSelectionAPI: element._liveSelectionAPI,
        nestedEditingHosts: live.querySelectorAll(
          '[data-editable][contenteditable="true"]'
        ).length,
        rootEditingHost: live.getAttribute("contenteditable")
      };
    });
    const diagnostics = await editor.events("md-debug");
    await removeStaleIOSShadowSelection(editor);

    expect(state).toEqual({
      liveSelectionAPI: true,
      nestedEditingHosts: 0,
      rootEditingHost: "true"
    });
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.selection.native-preserved",
      reason: "selection-api-unavailable"
    }));
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
      || event.phase === "live.selection.fallback-enabled"
    )).toBe(false);
    expect(await runNativeSelectAll(editor, blankStart)).toEqual({
      direction: "forward",
      end: value.length,
      start: 0
    });
  });

  test("browser Copy after opaque iOS Select All writes canonical Markdown", async ({ editor }) => {
    const source = [
      "# Heading",
      "",
      "- [x] Built as a web component",
      "",
      "---",
      "",
      "| Feature | Status |",
      "| --- | --- |",
      "| Table | Works |",
      "",
      "```js",
      "code()",
      "```"
    ].join("\n");
    const blankStart = source.indexOf("\n\n") + 1;
    await editor.reset({
      attributes: { debug: 2 },
      value: source
    });
    await editor.setSelection(blankStart);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    const commandState = await editor.host.evaluate(element => {
      window.testEvents.length = 0;
      const selectAll = document.execCommand("selectAll");
      const selectionText = element._liveSelectionCandidates()[0]
        ?.selection?.toString?.() || "";
      const inferredRange = element._opaqueIOSFullDocumentClipboardRange();
      const copy = document.execCommand("copy");
      return {
        copy,
        inferredRange,
        selectAll,
        selectionTextLength: selectionText.length
      };
    });

    await editor.settle();
    const copyEvents = await editor.events("md-copy");
    const diagnostics = await editor.events("md-debug");
    await removeStaleIOSShadowSelection(editor);

    expect(commandState, JSON.stringify(commandState, null, 2)).toMatchObject({
      inferredRange: { end: source.length, start: 0 },
      selectionTextLength: expect.any(Number)
    });
    expect(commandState.selectionTextLength).toBeGreaterThan(0);
    expect(copyEvents).toEqual([
      expect.objectContaining({
        markdown: source
      })
    ]);
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.clipboard.full-selection-inferred"
    }));
  });

  test("non-iOS selection-channel failure retains the scoped fallback host", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta"
    });

    const state = await editor.host.evaluate(element => {
      const originalCandidates = element._liveSelectionCandidates;
      const originalRuntime = element._isIOSWebKitRuntime;
      element._liveSelectionCandidates = () => [];
      element._isIOSWebKitRuntime = () => false;
      element.setSelectionRange(2, 2);
      const live = element.shadowRoot.querySelector(".live-editor");
      const result = {
        liveSelectionAPI: element._liveSelectionAPI,
        nestedEditingHosts: live.querySelectorAll(
          '[data-editable][contenteditable="true"]'
        ).length,
        rootEditingHost: live.getAttribute("contenteditable")
      };
      element._liveSelectionCandidates = originalCandidates;
      element._isIOSWebKitRuntime = originalRuntime;
      element._liveSelectionAPI = true;
      element._fallbackEditable = null;
      element._fallbackSelectionPending = false;
      live.contentEditable = element._lineEditable();
      element._syncLiveEditingHosts();
      return result;
    });

    expect(state.liveSelectionAPI).toBe(false);
    expect(state.rootEditingHost).toBe("false");
    expect(state.nestedEditingHosts).toBeGreaterThan(0);
    expect(await editor.events("md-debug")).toContainEqual(
      expect.objectContaining({
        phase: "live.selection.fallback-enabled"
      })
    );
  });

  test("text input continues from the native caret after iOS blank-line Backspace", async ({ editor }) => {
    const value = "## Formatting\n\nUse **bold** and *italic*.";
    const blankStart = value.indexOf("\n") + 1;
    await editor.reset({
      attributes: { debug: 2 },
      value
    });
    await editor.setSelection(blankStart);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    await editor.host.evaluate(element => {
      window.testEvents.length = 0;
      element._testOriginalOnKeyDown = element._onKeyDown;
      element._onKeyDown = () => {};
    });

    await editor.live.press("Backspace");
    await editor.host.evaluate(element => {
      element._onKeyDown = element._testOriginalOnKeyDown;
      delete element._testOriginalOnKeyDown;
    });
    await editor.live.press("X");
    await editor.settle();
    const diagnostics = await editor.events("md-debug");
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(await editor.value()).toBe(
      "## FormattingX\nUse **bold** and *italic*."
    );
    expect(restored).toMatchObject({
      liveContentEditable: "true",
      liveSelection: null,
      liveSelectionAPI: true,
      modelSelection: {
        end: blankStart,
        start: blankStart
      },
      nativeLiveSelection: {
        end: blankStart,
        start: blankStart
      }
    });
    expect(restored.selectionWriteCount).toBe(0);
    expect(diagnostics.filter(event =>
      event.phase === "live.dom.native-preserved"
    )).toHaveLength(2);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-requested"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
  });

  test("iOS native DOM redecoration waits until focus leaves the live surface", async ({ editor, page }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\n- [ ] task"
    });
    await editor.setSelection(5);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });

    await editor.live.press("X");
    await editor.host.locator("[data-task-checkbox]").focus();
    await page.evaluate(() => Promise.resolve());
    expect(await editor.host.evaluate(element =>
      element._nativeLiveDomDirty
    )).toBe(true);

    await page.locator("#reset-form").focus();
    await editor.settle();
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(await editor.value()).toBe("alphaX\n- [ ] task");
    expect(restored.liveSelectionAPI).toBe(true);
    expect(await editor.host.evaluate(element =>
      element._nativeLiveDomDirty
    )).toBe(false);
  });

  test("software-keyboard Backspace joins lines from a cross-block target range", async ({ editor }) => {
    await editor.reset({ value: "alpha\nbeta" });
    await editor.setSelection(6);

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward",
      targetRange: [5, 6]
    });

    expect(result.defaultPrevented).toBe(true);
    expect(result.targetSelection).toBeNull();
    expect(result.sourceTargetSelection).toEqual({
      direction: "forward",
      end: 6,
      start: 5
    });
    expect(await editor.value()).toBe("alphabeta");
    expect(await editor.selection()).toEqual({ start: 5, end: 5 });
    expect(await editor.events("md-action")).toContainEqual(
      expect.objectContaining({
        actionId: "editor.smartBackspace",
        source: "user"
      })
    );
  });

  test("software-keyboard Backspace joins lines without a target range", async ({ editor }) => {
    await editor.reset({ value: "alpha\nbeta" });
    await editor.setSelection(6);

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward"
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("alphabeta");
    expect(await editor.selection()).toEqual({ start: 5, end: 5 });
  });

  const grapheme = "e\u0301";
  const emoji = "👩‍💻";
  for (const scenario of [
    {
      expected: `A${emoji}B`,
      inputType: "deleteContentBackward",
      name: "backward fallback deletion removes one combining grapheme",
      selection: 1 + grapheme.length,
      value: `A${grapheme}${emoji}B`
    },
    {
      expected: `A${emoji}B`,
      inputType: "deleteContentForward",
      name: "forward fallback deletion removes one combining grapheme",
      selection: 1,
      value: `A${grapheme}${emoji}B`
    },
    {
      expected: `A${grapheme}B`,
      inputType: "deleteContentBackward",
      name: "fallback deletion removes one ZWJ emoji grapheme",
      selection: 1 + grapheme.length + emoji.length,
      value: `A${grapheme}${emoji}B`
    }
  ]) {
    test(scenario.name, async ({ editor }) => {
      await editor.reset({ value: scenario.value });
      await editor.setSelection(scenario.selection);

      const result = await dispatchLiveBeforeInput(editor, {
        forceFallback: true,
        inputType: scenario.inputType
      });

      expect(result.defaultPrevented).toBe(true);
      expect(await editor.value()).toBe(scenario.expected);
    });
  }

  test("target ranges define word deletion when the model selection is collapsed", async ({ editor }) => {
    await editor.reset({ value: "one two" });
    await editor.setSelection(7);

    await dispatchLiveBeforeInput(editor, {
      forceFallback: true,
      inputType: "deleteWordBackward",
      targetRange: [4, 7]
    });

    expect(await editor.value()).toBe("one ");
    expect(await editor.selection()).toEqual({ start: 4, end: 4 });
  });

  test("insertParagraph supports software-keyboard list continuation", async ({ editor }) => {
    await editor.reset({ value: "- first" });
    await editor.setSelection(7);

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "insertParagraph"
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("- first\n- ");
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "insertParagraph",
        source: "user",
        value: "- first\n- "
      })
    ]);
  });

  test("insertParagraph exits an empty software-keyboard list item", async ({ editor }) => {
    await editor.reset({ value: "- first\n- " });
    await editor.setSelection(10);

    await dispatchLiveBeforeInput(editor, {
      inputType: "insertParagraph"
    });

    expect(await editor.value()).toBe("- first\n");
    expect(await editor.selection()).toEqual({ start: 8, end: 8 });
  });

  for (const scenario of [
    {
      kind: "heading",
      marker: "##",
      rendered: ".md-heading",
      value: "## "
    },
    {
      kind: "bullet list",
      marker: "-",
      rendered: '[data-kind="bullet-list-item"]',
      value: "- "
    },
    {
      kind: "ordered list",
      marker: "1.",
      rendered: '[data-kind="ordered-list-item"]',
      value: "1. "
    },
    {
      kind: "blockquote",
      marker: ">",
      rendered: '[data-kind="blockquote"]',
      value: "> "
    },
    {
      kind: "unchecked task",
      marker: "[]",
      rendered: '[data-kind="task-list-item"]',
      value: "- [ ] "
    },
    {
      kind: "checked task",
      marker: "[x]",
      rendered: '[data-kind="task-list-item"]',
      value: "- [x] "
    }
  ]) {
    test(`software-keyboard Space creates a ${scenario.kind}`, async ({ editor }) => {
      await editor.reset({ value: scenario.marker });
      await editor.setSelection(scenario.marker.length);

      const result = await dispatchLiveBeforeInput(editor, {
        data: " ",
        inputType: "insertText",
        targetRange: [scenario.marker.length, scenario.marker.length]
      });

      expect(result.defaultPrevented).toBe(true);
      expect(await editor.value()).toBe(scenario.value);
      expect(await editor.selection()).toEqual({
        start: scenario.value.length,
        end: scenario.value.length
      });
      await expect(editor.host.locator(scenario.rendered)).toBeVisible();
      expect(await editor.events("md-action")).toContainEqual(
        expect.objectContaining({
          actionId: "editor.markdownShortcut",
          source: "user"
        })
      );
    });
  }

  test("software-keyboard input immediately creates a thematic break", async ({ editor }) => {
    await editor.reset({ value: "--" });
    await editor.setSelection(2);

    const result = await dispatchLiveBeforeInput(editor, {
      data: "-",
      inputType: "insertText",
      targetRange: [2, 2]
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("---");
    expect(await editor.selection()).toEqual({ start: 3, end: 3 });
    await expect(editor.host.locator(".md-hr-line")).toBeVisible();
    await expect(editor.host.locator('[data-editable="virtual-hr-after"]'))
      .toBeVisible();
  });

  for (const smartDash of ["—", "–"]) {
    test(`software-keyboard input recovers a thematic break after ${smartDash} substitution`, async ({ editor }) => {
      await editor.reset({ value: smartDash });
      await editor.setSelection(smartDash.length);

      const result = await dispatchLiveBeforeInput(editor, {
        data: "-",
        inputType: "insertText",
        targetRange: [smartDash.length, smartDash.length]
      });

      expect(result.defaultPrevented).toBe(true);
      expect(await editor.value()).toBe("---");
      expect(await editor.selection()).toEqual({ start: 3, end: 3 });
      await expect(editor.host.locator(".md-hr-line")).toBeVisible();
    });
  }

  test("data-less iOS input recovers a thematic break after smart-dash substitution", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "—"
    });
    await editor.setSelection(1);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });

    const result = await applyLiveDomInput(editor, {
      beforeInputData: null,
      data: "-"
    });
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(result).toEqual({
      beforePrevented: false,
      inputDispatched: true
    });
    expect(await editor.value()).toBe("---");
    expect(restored.modelSelection).toEqual({
      start: 3,
      end: 3,
      direction: "none"
    });
    await expect(editor.host.locator(".md-hr-line")).toBeVisible();
    const diagnostics = await editor.events("md-debug");
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.insert.source-backed"
    }));
    expect(diagnostics.some(event =>
      event.phase === "live.dom.native-preserved"
    )).toBe(false);
  });

  test("iOS replacement input recovers a thematic break when smart punctuation and the final hyphen arrive together", async ({ editor }) => {
    await editor.reset({ value: "-" });
    await editor.setSelection(0, 1);

    const result = await applyLiveDomInput(editor, {
      beforeInputData: null,
      data: "—-",
      inputType: "insertReplacementText"
    });

    expect(result).toEqual({
      beforePrevented: false,
      inputDispatched: true
    });
    expect(await editor.value()).toBe("---");
    expect(await editor.selection()).toEqual({ start: 3, end: 3 });
    await expect(editor.host.locator(".md-hr-line")).toBeVisible();
  });

  test("smart dash followed by a hyphen in prose remains literal text", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "word —"
    });
    await editor.setSelection(6);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });

    const result = await applyLiveDomInput(editor, {
      beforeInputData: null,
      data: "-"
    });
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(result).toEqual({
      beforePrevented: false,
      inputDispatched: true
    });
    expect(await editor.value()).toBe("word —-");
    expect(restored.modelSelection).toEqual({
      start: 7,
      end: 7,
      direction: "none"
    });
    await expect(editor.host.locator(".md-hr-line")).toHaveCount(0);
    const diagnostics = await editor.events("md-debug");
    expect(diagnostics.some(event =>
      event.phase === "live.insert.source-backed"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.dom.native-preserved"
    )).toBe(true);
  });

  test("software-keyboard input immediately creates a Setext heading", async ({ editor }) => {
    const before = "Title\n";
    await editor.reset({ value: before });
    await editor.setSelection(before.length);

    const result = await dispatchLiveBeforeInput(editor, {
      data: "-",
      inputType: "insertText",
      targetRange: [before.length, before.length]
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("Title\n-");
    await expect(editor.host.locator(".md-heading")).toHaveText("Title");
    await expect(editor.host.locator('[data-editable="virtual-setext-after"]'))
      .toBeVisible();
  });

  test("software-keyboard input immediately creates a GFM table", async ({ editor }) => {
    const before = "A | B\n--- | --";
    await editor.reset({ value: before });
    await editor.setSelection(before.length);

    const result = await dispatchLiveBeforeInput(editor, {
      data: "-",
      inputType: "insertText",
      targetRange: [before.length, before.length]
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("A | B\n--- | ---");
    await expect(editor.host.locator(".md-table-block")).toBeVisible();
    await expect(editor.host.locator("th")).toHaveCount(2);
  });

  for (const scenario of [
    {
      data: " ",
      kind: "heading",
      marker: "##",
      rendered: ".md-heading",
      value: "## "
    },
    {
      data: " ",
      kind: "task",
      marker: "[]",
      rendered: '[data-kind="task-list-item"]',
      value: "- [ ] "
    },
    {
      data: "-",
      kind: "thematic break",
      marker: "--",
      rendered: ".md-hr-line",
      value: "---"
    },
    {
      data: "-",
      kind: "Setext heading",
      marker: "Title\n",
      rendered: ".md-heading",
      value: "Title\n-"
    },
    {
      data: "-",
      kind: "GFM table",
      marker: "A | B\n--- | --",
      rendered: ".md-table-block",
      value: "A | B\n--- | ---"
    }
  ]) {
    test(`data-less iOS beforeinput creates a ${scenario.kind} after DOM input`, async ({ editor }) => {
      await editor.reset({
        attributes: { debug: 2 },
        value: scenario.marker
      });
      await editor.setSelection(scenario.marker.length);
      await installStaleIOSShadowSelection(editor, {
        opaqueDocumentSelection: true
      });

      const result = await applyLiveDomInput(editor, {
        beforeInputData: null,
        data: scenario.data
      });
      const restored = await removeStaleIOSShadowSelection(editor);

      expect(result).toEqual({
        beforePrevented: false,
        inputDispatched: true
      });
      expect(await editor.value()).toBe(scenario.value);
      expect(restored.modelSelection).toEqual({
        start: scenario.value.length,
        end: scenario.value.length,
        direction: "none"
      });
      await expect(editor.host.locator(scenario.rendered)).toBeVisible();
      const diagnostics = await editor.events("md-debug");
      expect(diagnostics.some(event =>
        event.phase === "live.insert.source-backed"
      )).toBe(true);
      expect(diagnostics.some(event =>
        event.phase === "live.dom.native-preserved"
      )).toBe(false);
    });
  }

  test("ordinary input remains browser-owned when iOS beforeinput data is absent", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "plain"
    });
    await editor.setSelection(5);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });

    const result = await applyLiveDomInput(editor, {
      beforeInputData: null,
      data: " "
    });
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(result).toEqual({
      beforePrevented: false,
      inputDispatched: true
    });
    expect(await editor.value()).toBe("plain ");
    expect(restored.modelSelection).toEqual({
      start: 6,
      end: 6,
      direction: "none"
    });
    const diagnostics = await editor.events("md-debug");
    expect(diagnostics.some(event =>
      event.phase === "live.insert.source-backed"
    )).toBe(false);
    expect(diagnostics.some(event =>
      event.phase === "live.dom.native-preserved"
    )).toBe(true);
  });

  test("software-keyboard Return auto-closes a fence at its target range", async ({ editor }) => {
    const opening = "```python";
    await editor.reset({ value: opening });
    await editor.setSelection(opening.length);
    await installStaleIOSShadowSelection(editor, {
      opaqueDocumentSelection: true
    });
    await editor.host.evaluate(element => {
      element._selection = {
        start: 0,
        end: 0,
        direction: "none"
      };
    });

    const keydown = await editor.host.evaluate(element => {
      const target = element.shadowRoot.querySelector("[data-editable]");
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        shiftKey: true
      });
      target.dispatchEvent(event);
      return { defaultPrevented: event.defaultPrevented };
    });
    expect(keydown.defaultPrevented).toBe(false);
    expect(await editor.value()).toBe(opening);

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "insertParagraph",
      targetRange: [opening.length, opening.length]
    });
    const restored = await removeStaleIOSShadowSelection(editor);

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("```python\n\n```");
    expect(restored.modelSelection).toEqual({
      start: opening.length + 1,
      end: opening.length + 1,
      direction: "none"
    });
    await expect(editor.host.locator(".md-code-block")).toBeVisible();
    await expect(editor.host.locator(".md-code-label")).toHaveText("python");
  });

  for (const fence of ["```", "~~~"]) {
    test(`insertLineBreak auto-closes an unfinished ${fence} fence before following content`, async ({ editor, page }) => {
      const following = "## Table\n\nFollowing paragraph.";
      await editor.reset({ value: `\n${following}` });
      await editor.setSelection(0);
      await page.keyboard.type(fence);
      await expect(editor.completion).toBeVisible();
      await installStaleIOSShadowSelection(editor, {
        opaqueDocumentSelection: true
      });

      const result = await dispatchLiveBeforeInput(editor, {
        inputType: "insertLineBreak",
        targetRange: [fence.length, fence.length]
      });
      const restored = await removeStaleIOSShadowSelection(editor);

      expect(result.defaultPrevented).toBe(true);
      expect(await editor.value()).toBe(
        `${fence}\n\n${fence}\n${following}`
      );
      expect(restored.modelSelection).toEqual({
        start: fence.length + 1,
        end: fence.length + 1,
        direction: "none"
      });
      await expect(editor.host.locator(".md-code-block")).toHaveCount(1);
      await expect(editor.host.locator(".md-code-block"))
        .not.toContainText("Table");
      await expect(editor.host.locator(".md-heading")).toHaveText("## Table");
    });
  }

  test("software-keyboard Return inserts at its target range when model selection is stale", async ({ editor }) => {
    await editor.reset({ value: "alpha" });
    await editor.setSelection(5);
    await editor.host.evaluate(element => {
      element._selection = {
        start: 0,
        end: 0,
        direction: "none"
      };
    });

    await dispatchLiveBeforeInput(editor, {
      inputType: "insertParagraph",
      targetRange: [5, 5]
    });

    expect(await editor.value()).toBe("alpha\n");
    expect(await editor.selection()).toEqual({ start: 6, end: 6 });
  });

  test("ordinary software-keyboard Space stays browser-owned", async ({ editor }) => {
    await editor.reset({ value: "plain" });
    await editor.setSelection(5);

    const result = await dispatchLiveBeforeInput(editor, {
      data: " ",
      inputType: "insertText",
      targetRange: [5, 5]
    });

    expect(result.defaultPrevented).toBe(false);
    expect(await editor.value()).toBe("plain");
    expect(await editor.events("md-action")).toEqual([]);
  });

  test("software-keyboard Space inside inline code does not create a heading", async ({ editor }) => {
    await editor.reset({ value: "`#" });
    await editor.setSelection(2);

    const result = await dispatchLiveBeforeInput(editor, {
      data: " ",
      inputType: "insertText",
      targetRange: [2, 2]
    });

    expect(result.defaultPrevented).toBe(false);
    expect(await editor.value()).toBe("`#");
    await expect(editor.host.locator(".md-heading")).toHaveCount(0);
  });

  test("an incomplete thematic-break marker stays browser-owned", async ({ editor }) => {
    await editor.reset({ value: "-" });
    await editor.setSelection(1);

    const result = await dispatchLiveBeforeInput(editor, {
      data: "-",
      inputType: "insertText",
      targetRange: [1, 1]
    });

    expect(result.defaultPrevented).toBe(false);
    expect(await editor.value()).toBe("-");
    await expect(editor.host.locator(".md-hr-line")).toHaveCount(0);
  });

  test("insertLineBreak applies the Markdown soft-break contract", async ({ editor }) => {
    await editor.reset({ value: "first" });
    await editor.setSelection(5);

    await dispatchLiveBeforeInput(editor, {
      inputType: "insertLineBreak"
    });

    expect(await editor.value()).toBe("first  \n");
    expect(await editor.selection()).toEqual({ start: 8, end: 8 });
  });

  test("new native input after undo invalidates stale redo", async ({ editor, page }) => {
    await editor.reset({ value: "a" });
    await editor.setSelection(1);
    await editor.host.evaluate(element => element.insertMarkdown("b"));
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("a");

    await applyLiveDomInput(editor, { data: "x" });
    await page.keyboard.press("ControlOrMeta+Shift+z");

    expect(await editor.value()).toBe("ax");
  });

  test("fallback replacement normalizes CRLF before updating canonical source", async ({ editor }) => {
    await editor.reset({ value: "ab" });
    await editor.setSelection(1);

    const result = await dispatchLiveBeforeInput(editor, {
      data: "X\r\nY",
      forceFallback: true,
      inputType: "insertReplacementText"
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("aX\nYb");
    expect(await editor.selection()).toEqual({ start: 4, end: 4 });
  });

  test("target-range replacement preserves decorated Markdown delimiters", async ({ editor }) => {
    await editor.reset({ value: "**bold**" });
    await editor.setSelection(2);

    const result = await dispatchLiveBeforeInput(editor, {
      data: "X",
      forceFallback: true,
      inputType: "insertReplacementText",
      targetRange: [2, 6]
    });

    expect(result.targetSelection).toEqual({
      direction: "forward",
      end: 6,
      start: 2
    });
    expect(await editor.value()).toBe("**X**");
    expect(await editor.selection()).toEqual({ start: 3, end: 3 });
    await expect(editor.host.locator("strong")).toHaveText("X");
  });

  test("boundary deletion is a prevented no-op with no input or history entry", async ({ editor }) => {
    await editor.reset();

    const result = await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward"
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("");
    expect(await editor.events("md-input")).toEqual([]);
    expect(await editor.host.evaluate(element => element._undoStack.length)).toBe(0);
  });

  test("live mode uses one document editing host instead of nested block hosts", async ({ editor }) => {
    await editor.reset({
      value: [
        "# Heading",
        "",
        "Paragraph",
        "",
        "| A | B |",
        "| - | - |",
        "| C | D |",
        "",
        "```",
        "code",
        "```"
      ].join("\n")
    });

    const state = await editor.host.evaluate(element => {
      const live = element.shadowRoot.querySelector(".live-editor");
      const editables = [...live.querySelectorAll("[data-editable]")];
      return {
        allDescendantsInheritEditing: editables.every(editable =>
          editable.isContentEditable
          && !editable.hasAttribute("contenteditable")),
        nestedEditingHosts: live.querySelectorAll(
          '[data-editable][contenteditable="true"]'
        ).length,
        rootEditingHost: live.getAttribute("contenteditable")
      };
    });

    expect(state).toEqual({
      allDescendantsInheritEditing: true,
      nestedEditingHosts: 0,
      rootEditingHost: "true"
    });
  });

  test("native Select All from a text block selects the whole document", async ({ editor }) => {
    const value = "# Heading\n\nParagraph\n\nTail";
    await editor.reset({ value });

    expect(await runNativeSelectAll(editor, value.indexOf("Paragraph") + 3))
      .toEqual({ direction: "forward", end: value.length, start: 0 });
  });

  test("native Select All from an empty line selects the whole document", async ({ editor }) => {
    const value = "# Heading\n\nParagraph";
    await editor.reset({ value });

    expect(await runNativeSelectAll(editor, value.indexOf("\n\n") + 1))
      .toEqual({ direction: "forward", end: value.length, start: 0 });
  });

  test("native Select All from a table cell selects the whole document", async ({ editor }) => {
    const value = [
      "Before",
      "",
      "| Alpha | Beta |",
      "| --- | --- |",
      "| One | Two |",
      "",
      "After"
    ].join("\n");
    await editor.reset({ value });

    expect(await runNativeSelectAll(editor, value.indexOf("Alpha") + 2))
      .toEqual({ direction: "forward", end: value.length, start: 0 });
  });

  test("browser-owned selection can span separate rendered blocks", async ({ editor }) => {
    const value = "alpha\nbeta\ngamma";
    const end = value.indexOf("gamma") + 3;
    await editor.reset({ value });

    const state = await editor.host.evaluate((element, offsets) => {
      const live = element.shadowRoot.querySelector(".live-editor");
      const start = element._domPositionFromSource(offsets.start);
      const endPosition = element._domPositionFromSource(offsets.end);
      const selection = element._exposedLiveSelection();
      live.focus({ preventScroll: true });
      selection.removeAllRanges();
      selection.setBaseAndExtent(
        start.node,
        start.offset,
        endPosition.node,
        endPosition.offset
      );
      element._onSelectionChanged();
      return {
        differentBlocks: start.editable !== endPosition.editable,
        selection: element._readLiveSelection()
      };
    }, { end, start: 1 });

    expect(state).toEqual({
      differentBlocks: true,
      selection: { direction: "forward", end, start: 1 }
    });
  });

  test("blank-line Backspace restores through the iOS document selection after refocusing", async ({ editor }) => {
    const value = "## Formatting\n\nUse **bold** and *italic*.";
    const blankStart = value.indexOf("\n") + 1;
    await editor.reset({
      attributes: { debug: 2 },
      value
    });
    await editor.setSelection(blankStart);
    await installStaleIOSShadowSelection(editor);

    await editor.host.evaluate(element => {
      const originalFocus = HTMLElement.prototype.focus;
      const originalHasComponentFocus = element._hasComponentFocus;
      globalThis.iosFocusRegression = {
        calls: 0,
        originalFocus,
        originalHasComponentFocus,
        simulatedLostFocus: false
      };
      element._hasComponentFocus = function hasComponentFocus() {
        if (!globalThis.iosFocusRegression.simulatedLostFocus) {
          globalThis.iosFocusRegression.simulatedLostFocus = true;
          return false;
        }
        return originalHasComponentFocus.call(this);
      };
      HTMLElement.prototype.focus = function focus(options) {
        originalFocus.call(this, options);
        if (!this.matches?.(".live-editor")) return;
        globalThis.iosFocusRegression.calls += 1;
        globalThis.iosFocusRegression.options = options ?? null;
        const heading = this.querySelector(".md-heading");
        const position = element._textPositionInElement(heading, 0);
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        const selection = globalThis.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      };
    });

    await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward",
      targetRange: [blankStart - 1, blankStart]
    });

    const state = await editor.host.evaluate(element => {
      const regression = globalThis.iosFocusRegression;
      HTMLElement.prototype.focus = regression.originalFocus;
      element._hasComponentFocus = regression.originalHasComponentFocus;
      delete globalThis.iosFocusRegression;
      const liveSelectionAPI = element._liveSelectionAPI;
      const selection = element._readLiveSelection();
      const getSelectionDescriptor = element._iosSelectionSimulation
        ?.getSelectionDescriptor;
      const isIOSWebKitRuntime = element._iosSelectionSimulation
        ?.isIOSWebKitRuntime;
      delete element.shadowRoot.activeElement;
      delete element.shadowRoot.getSelection;
      if (isIOSWebKitRuntime) {
        element._isIOSWebKitRuntime = isIOSWebKitRuntime;
      }
      if (getSelectionDescriptor) {
        Object.defineProperty(
          globalThis,
          "getSelection",
          getSelectionDescriptor
        );
      } else {
        delete globalThis.getSelection;
      }
      delete element._iosSelectionSimulation;
      return {
        focusCalls: regression.calls,
        liveSelectionAPI,
        selection,
        value: element.value
      };
    });
    const diagnostics = await editor.events("md-debug");

    expect(state).toMatchObject({
      liveSelectionAPI: true,
      selection: {
        direction: "forward",
        end: blankStart - 1,
        start: blankStart - 1
      },
      value: "## Formatting\nUse **bold** and *italic*."
    });
    expect(state.focusCalls).toBeGreaterThanOrEqual(1);
    expect(diagnostics.some(event =>
      event.phase === "live.selection.restore-fallback"
    )).toBe(false);
    expect(diagnostics).toContainEqual(expect.objectContaining({
      phase: "live.selection.restored",
      selectionChannel: "document",
      selectionStrategy: "setBaseAndExtent"
    }));
  });

  test("data-less replacement remains browser-owned and does not mutate eagerly", async ({ editor }) => {
    await editor.reset({ value: "text" });
    await editor.setSelection(1, 3);

    const result = await dispatchLiveBeforeInput(editor, {
      data: null,
      inputType: "insertReplacementText"
    });

    expect(result.defaultPrevented).toBe(false);
    expect(await editor.value()).toBe("text");
    expect(await editor.selection()).toEqual({ start: 1, end: 3 });
    expect(await editor.events("md-input")).toEqual([]);
    expect(await editor.host.evaluate(element => element._undoStack.length)).toBe(0);
  });

  test("canceled replacement preserves value, selection, events, and history", async ({ editor, page }) => {
    await editor.reset({ value: "alpha\nbeta" });
    await editor.setSelection(2, 8);
    await editor.host.evaluate(element => {
      element.addEventListener("md-before-change", event => {
        event.preventDefault();
      }, { once: true });
    });

    const result = await dispatchLiveBeforeInput(editor, {
      data: "X",
      inputType: "insertReplacementText"
    });

    expect(result.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("alpha\nbeta");
    expect(await editor.selection()).toEqual({ start: 2, end: 8 });
    expect(await editor.events("md-input")).toEqual([]);
    expect(await editor.events("md-action")).toEqual([]);
    expect(await editor.host.evaluate(element => element._undoStack.length)).toBe(0);
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("alpha\nbeta");
  });

  for (const state of ["readonly", "disabled"]) {
    test(`${state} live input restores mutated DOM without changing source`, async ({ editor }) => {
      await editor.reset({
        attributes: { [state]: true },
        value: "locked"
      });

      await editor.host.evaluate(element => {
        const target = element.shadowRoot.querySelector("[data-editable]");
        target.textContent = "mutated";
        target.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          data: "mutated",
          inputType: "insertText"
        }));
      });

      expect(await editor.value()).toBe("locked");
      await expect(editor.host.locator("[data-editable]")).toHaveText("locked");
      expect(await editor.events("md-input")).toEqual([]);
      expect(await editor.host.evaluate(element => element._undoStack.length)).toBe(0);
    });
  }

  test("md-input crosses the host boundary and remains non-cancelable", async ({ editor }) => {
    await editor.reset({ value: "ab" });
    await editor.setSelection(1);
    await editor.host.evaluate(element => {
      globalThis.inputContractEvent = null;
      document.addEventListener("md-input", event => {
        globalThis.inputContractEvent = {
          bubbles: event.bubbles,
          cancelable: event.cancelable,
          composed: event.composed,
          source: event.detail.source,
          value: event.detail.value
        };
        event.preventDefault();
      }, { once: true });
    });

    await applyLiveDomInput(editor, { data: "X" });

    expect(await editor.host.evaluate(() => globalThis.inputContractEvent)).toEqual({
      bubbles: true,
      cancelable: false,
      composed: true,
      source: "user",
      value: "aXb"
    });
    expect(await editor.value()).toBe("aXb");
  });

  test("beforeinput history preserves origin metadata and emits one action", async ({ editor }) => {
    await editor.reset({ value: "a" });
    await editor.setSelection(1);
    await editor.host.evaluate(element => {
      element.insertMarkdown("b");
      globalThis.testEvents.length = 0;
    });

    const undo = await dispatchLiveBeforeInput(editor, {
      inputType: "historyUndo"
    });

    expect(undo.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("a");
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "historyUndo",
        source: "undo",
        value: "a"
      })
    ]);
    expect(await editor.events("md-action")).toEqual([
      expect.objectContaining({
        actionId: "history.undo",
        source: "user"
      })
    ]);

    await editor.host.evaluate(() => {
      globalThis.testEvents.length = 0;
    });
    const redo = await dispatchLiveBeforeInput(editor, {
      inputType: "historyRedo"
    });
    expect(redo.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("ab");
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "historyRedo",
        source: "redo",
        value: "ab"
      })
    ]);
    expect(await editor.events("md-action")).toHaveLength(1);
  });

  test("public history actions do not duplicate md-action events", async ({ editor }) => {
    await editor.reset({ value: "a" });
    await editor.setSelection(1);
    const result = await editor.host.evaluate(element => {
      element.insertMarkdown("b");
      globalThis.testEvents.length = 0;
      return element.exec("history.undo");
    });

    expect(result).toBe(true);
    expect(await editor.value()).toBe("a");
    expect(await editor.events("md-action")).toEqual([
      expect.objectContaining({
        actionId: "history.undo",
        source: "api"
      })
    ]);
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        source: "undo",
        value: "a"
      })
    ]);
  });

  test("unchanged live input emits no mutation event or history entry", async ({ editor }) => {
    await editor.reset({ value: "text" });
    await editor.setSelection(2);

    await editor.host.evaluate(element => {
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: null,
        inputType: "insertText"
      }));
    });

    expect(await editor.value()).toBe("text");
    expect(await editor.events("md-input")).toEqual([]);
    expect(await editor.host.evaluate(element => element._undoStack.length)).toBe(0);
  });

  test("live input without beforeinput remains undoable", async ({ editor, page }) => {
    await editor.reset({ value: "ab" });
    await editor.setSelection(1);

    await editor.host.evaluate(element => {
      const target = element._activeEditableFromSelection();
      target.textContent = "aXb";
      const position = element._textPositionInElement(target, 2);
      const range = document.createRange();
      range.setStart(position.node, position.offset);
      range.collapse(true);
      const selection = element.shadowRoot.getSelection?.()
        || globalThis.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: "X",
        inputType: "insertText"
      }));
    });

    expect(await editor.value()).toBe("aXb");
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("ab");
    expect(await editor.selection()).toEqual({ start: 1, end: 1 });
  });
});

test.describe("debug diagnostics", () => {
  test("debugging defaults to level zero and emits nothing", async ({ editor }) => {
    const state = await editor.host.evaluate(element => ({
      debug: element.debug,
      debugLog: element.debugLog,
      emitted: Boolean(element._debug(1, "test.disabled"))
    }));

    expect(state).toEqual({
      debug: 0,
      debugLog: false,
      emitted: false
    });
    expect(await editor.events("md-debug")).toEqual([]);
  });

  test("debug events expose the source-backed deletion and selection path", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 2 },
      value: "alpha\nbeta"
    });
    await editor.setSelection(8);

    await dispatchLiveBeforeInput(editor, {
      inputType: "deleteContentBackward",
      targetRange: [7, 8]
    });

    const events = await editor.events("md-debug");
    expect(events.map(event => event.phase)).toEqual(
      expect.arrayContaining([
        "live.beforeinput",
        "live.delete.source-backed",
        "live.input.source-backed",
        "live.selection.restore-requested",
        "live.selection.restored"
      ])
    );
    expect(events.every(event =>
      Number.isInteger(event.sequence)
      && event.level >= 1
      && typeof event.phase === "string"
      && Number.isInteger(event.selection?.start)
      && Number.isInteger(event.selection?.end)
    )).toBe(true);
    expect(await editor.value()).toBe("alpha\nbta");
    expect(await editor.selection()).toEqual({ start: 7, end: 7 });
  });

  test("debug change summaries never expose inserted Markdown", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 1 },
      value: "alpha"
    });

    await editor.host.evaluate(element => {
      element._applySourceBackedInput(
        "insertText",
        [{ from: 5, to: 5, insert: " private" }],
        { start: 13, end: 13, direction: "none" }
      );
    });

    const event = (await editor.events("md-debug"))
      .find(entry => entry.phase === "live.input.source-backed");
    expect(event?.changes).toEqual([{
      from: 5,
      insertedLength: 8,
      removedLength: 0,
      to: 5
    }]);
    expect(JSON.stringify(event)).not.toContain("private");
    expect(await editor.value()).toBe("alpha private");
  });

  test("source-backed Markdown insertion diagnostics expose length, not text", async ({ editor }) => {
    await editor.reset({
      attributes: { debug: 1 },
      value: "--"
    });
    await editor.setSelection(2);
    await editor.host.evaluate(element => {
      globalThis.__rawInputDebugEvents = [];
      element.addEventListener("md-debug", event => {
        globalThis.__rawInputDebugEvents.push(event.detail);
      });
    });

    await dispatchLiveBeforeInput(editor, {
      data: "-",
      inputType: "insertText",
      targetRange: [2, 2]
    });

    const event = await editor.host.evaluate(() => {
      const match = globalThis.__rawInputDebugEvents.find(entry =>
        entry.phase === "live.insert.source-backed"
      );
      delete globalThis.__rawInputDebugEvents;
      return match;
    });
    expect(event).toMatchObject({
      inputType: "insertText",
      strategy: "structural-transition",
      textLength: 1
    });
    expect(event).not.toHaveProperty("text");
  });

  test("debug-log optionally mirrors the same event payload to console.debug", async ({ editor }) => {
    const state = await editor.host.evaluate(element => {
      const calls = [];
      const originalDebug = console.debug;
      let eventDetail = null;
      console.debug = (...args) => calls.push(args);
      element.addEventListener("md-debug", event => {
        eventDetail = event.detail;
      }, { once: true });
      element.debug = 1;
      element.debugLog = true;
      element._debug(1, "test.console", { sample: true });
      console.debug = originalDebug;
      return {
        callLabel: calls[0]?.[0],
        callPayload: calls[0]?.[1],
        eventDetail,
        reflectedDebug: element.getAttribute("debug"),
        reflectedDebugLog: element.hasAttribute("debug-log")
      };
    });

    expect(state.callLabel).toBe("[writemark-editor]");
    expect(state.callPayload).toEqual(state.eventDetail);
    expect(state.eventDetail).toMatchObject({
      level: 1,
      phase: "test.console",
      sample: true
    });
    expect(state.reflectedDebug).toBe("1");
    expect(state.reflectedDebugLog).toBe(true);
  });
});

test.describe("source input contract", () => {
  test("source input preserves selection and event metadata", async ({ editor, page }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "ab"
    });
    await editor.setSelection(1);

    await applySourceDomInput(editor, {
      data: "日",
      inputType: "insertReplacementText"
    });

    expect(await editor.value()).toBe("a日b");
    expect(await editor.selection()).toEqual({ start: 2, end: 2 });
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "insertReplacementText",
        source: "user",
        value: "a日b"
      })
    ]);

    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("ab");
    expect(await editor.selection()).toEqual({ start: 1, end: 1 });
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("a日b");
    expect(await editor.selection()).toEqual({ start: 2, end: 2 });
  });

  for (const state of ["readonly", "disabled"]) {
    test(`${state} source input cannot mutate canonical state`, async ({ editor }) => {
      await editor.reset({
        attributes: { mode: "source", [state]: true },
        value: "locked"
      });

      await editor.source.evaluate(textarea => {
        textarea.value = "mutated";
        textarea.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          data: "mutated",
          inputType: "insertText"
        }));
      });

      expect(await editor.value()).toBe("locked");
      await expect(editor.source).toHaveValue("locked");
      expect(await editor.events("md-input")).toEqual([]);
    });
  }

  test("new source input after undo invalidates stale redo", async ({ editor, page }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "a"
    });
    await editor.setSelection(1);
    await editor.host.evaluate(element => element.insertMarkdown("b"));
    await page.keyboard.press("ControlOrMeta+z");

    await applySourceDomInput(editor, { data: "x" });
    await page.keyboard.press("ControlOrMeta+Shift+z");

    expect(await editor.value()).toBe("ax");
  });

  test("source beforeinput history is source-backed and preserves input type", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "a"
    });
    await editor.setSelection(1);
    await editor.host.evaluate(element => {
      element.insertMarkdown("b");
      globalThis.testEvents.length = 0;
    });

    const undo = await dispatchSourceBeforeInput(editor, "historyUndo");

    expect(undo.defaultPrevented).toBe(true);
    expect(await editor.value()).toBe("a");
    expect(await editor.selection()).toEqual({ start: 1, end: 1 });
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "historyUndo",
        source: "undo",
        value: "a"
      })
    ]);
    expect(await editor.events("md-action")).toHaveLength(1);
  });

  test("unchanged source input emits no mutation event or history entry", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "text"
    });
    await editor.setSelection(2);

    await editor.source.dispatchEvent("input");

    expect(await editor.value()).toBe("text");
    expect(await editor.events("md-input")).toEqual([]);
    expect(await editor.host.evaluate(element => element._undoStack.length)).toBe(0);
  });

  test("source input without beforeinput remains undoable", async ({ editor, page }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "ab"
    });
    await editor.setSelection(1);

    await editor.source.evaluate(textarea => {
      textarea.value = "aXb";
      textarea.setSelectionRange(2, 2);
      textarea.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: "X",
        inputType: "insertText"
      }));
    });

    expect(await editor.value()).toBe("aXb");
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("ab");
    expect(await editor.selection()).toEqual({ start: 1, end: 1 });
  });
});

test.describe("IME composition contract", () => {
  test("live preedit keeps one DOM target and commits as one undo unit", async ({ editor, page }) => {
    await editor.reset({ value: "hello x" });
    await editor.setSelection(6, 7);

    const result = await composeLive(editor, ["にほ", "日本"]);

    expect(result.stableDuringUpdates).toBe(true);
    expect(result.values).toEqual(["hello にほ", "hello 日本"]);
    expect(result.modes).toEqual([
      "composing-ime",
      "composing-ime",
      "composing-ime",
      "idle"
    ]);
    expect(await editor.value()).toBe("hello 日本");
    expect(await editor.selection()).toEqual({ start: 8, end: 8 });
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({
        inputType: "insertCompositionText",
        source: "user",
        value: "hello にほ"
      }),
      expect.objectContaining({
        inputType: "insertCompositionText",
        source: "user",
        value: "hello 日本"
      })
    ]);

    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("hello x");
    expect(await editor.selection()).toEqual({ start: 6, end: 7 });
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("hello x");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("hello 日本");
    expect(await editor.selection()).toEqual({ start: 8, end: 8 });
  });

  test("live composition preserves UTF-16 selection offsets for astral text", async ({ editor }) => {
    await editor.reset({ value: "A?" });
    await editor.setSelection(1, 2);

    await composeLive(editor, ["😀"]);

    expect(await editor.value()).toBe("A😀");
    expect(await editor.selection()).toEqual({ start: 3, end: 3 });
  });

  test("decorated inline preedit preserves Markdown markers across length changes", async ({ editor }) => {
    await editor.reset({ value: "**x**" });
    await editor.setSelection(2, 3);

    const result = await composeLive(editor, ["にほ", "日本"]);

    expect(result.stableDuringUpdates).toBe(true);
    expect(result.values).toEqual(["**にほ**", "**日本**"]);
    expect(await editor.value()).toBe("**日本**");
    expect(await editor.selection()).toEqual({ start: 4, end: 4 });
    await expect(editor.host.locator("strong")).toHaveText("日本");
  });

  test("table-cell preedit keeps offsets current across escaped length changes", async ({ editor }) => {
    const markdown = [
      "| A | B |",
      "| --- | --- |",
      "| x | y |"
    ].join("\n");
    const start = markdown.lastIndexOf("| x |") + 2;
    await editor.reset({ value: markdown });
    await editor.setSelection(start, start + 1);

    const result = await editor.host.evaluate((element, updates) => {
      const target = element._activeEditableFromSelection();
      const originalTarget = target;
      const values = [];
      let stableDuringUpdates = true;
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      for (const update of updates) {
        target.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          data: update,
          inputType: "insertCompositionText",
          isComposing: true
        }));
        target.textContent = update;
        const position = element._textPositionInElement(target, update.length);
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        const selection = element.shadowRoot.getSelection?.()
          || globalThis.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        target.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          data: update,
          inputType: "insertCompositionText",
          isComposing: true
        }));
        values.push(element.value);
        stableDuringUpdates &&= originalTarget.isConnected
          && element.shadowRoot.querySelector('[data-editable="cell"][data-row="0"][data-col="0"]')
            === originalTarget;
      }
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data: updates.at(-1)
      }));
      return { stableDuringUpdates, values };
    }, ["a|b", "日本"]);

    expect(result.stableDuringUpdates).toBe(true);
    expect(result.values).toEqual([
      "| A | B |\n| --- | --- |\n| a\\|b | y |",
      "| A | B |\n| --- | --- |\n| 日本 | y |"
    ]);
    expect(await editor.value()).toBe(
      "| A | B |\n| --- | --- |\n| 日本 | y |"
    );
    expect(await editor.selection()).toEqual({
      start: start + 2,
      end: start + 2
    });
  });

  test("source composition has live parity and one atomic history entry", async ({ editor, page }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "hello x"
    });
    await editor.setSelection(6, 7);

    const result = await composeSource(editor, ["に", "日本"]);

    expect(result.values).toEqual(["hello に", "hello 日本"]);
    expect(result.modes).toEqual([
      "composing-ime",
      "composing-ime",
      "composing-ime",
      "idle"
    ]);
    expect(await editor.value()).toBe("hello 日本");
    expect(await editor.selection()).toEqual({ start: 8, end: 8 });

    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("hello x");
    expect(await editor.selection()).toEqual({ start: 6, end: 7 });
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("hello x");
  });

  test("composition does not intercept structural or history key events", async ({ editor }) => {
    await editor.reset({ value: "text" });
    await editor.setSelection(4);

    const state = await editor.host.evaluate(element => {
      element.focus();
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      const keyCases = [
        { key: "Enter" },
        { key: "Tab" },
        { key: "Escape" },
        { key: "b", ctrlKey: true },
        { key: "a", ctrlKey: true },
        { key: "z", ctrlKey: true },
        { key: "Backspace" }
      ];
      const prevented = keyCases.map(options => {
        const event = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          isComposing: true,
          ...options
        });
        target.dispatchEvent(event);
        return event.defaultPrevented;
      });
      const during = {
        mode: element._getContext().mode,
        selectionEnd: element.selectionEnd,
        selectionStart: element.selectionStart,
        value: element.value
      };
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true
      }));
      return { during, prevented };
    });

    expect(state.prevented).toEqual([false, false, false, false, false, false, false]);
    expect(state.during).toEqual({
      mode: "composing-ime",
      selectionEnd: 4,
      selectionStart: 4,
      value: "text"
    });
  });

  test("structural actions are blocked while composition-safe actions remain available", async ({ editor }) => {
    await editor.reset({ value: "text" });
    await editor.setSelection(4);

    const state = await editor.host.evaluate(element => {
      element.registerAction({
        id: "composition.safe",
        structural: false,
        run: () => {
          element.dataset.safeRuns = String(
            Number(element.dataset.safeRuns || 0) + 1
          );
          return { ok: true };
        }
      });
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      const during = {
        canBold: element.canExec("inline.bold"),
        canSafe: element.canExec("composition.safe"),
        execBold: element.exec("inline.bold"),
        execSafe: element.exec("composition.safe"),
        mode: element._getContext().mode,
        safeRuns: Number(element.dataset.safeRuns || 0),
        value: element.value
      };
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true
      }));
      return during;
    });

    expect(state).toEqual({
      canBold: false,
      canSafe: true,
      execBold: false,
      execSafe: true,
      mode: "composing-ime",
      safeRuns: 1,
      value: "text"
    });
  });

  test("completion closes for preedit and is evaluated after compositionend", async ({ editor }) => {
    await editor.reset();
    const state = await editor.host.evaluate(async element => {
      element.registerCompletionProvider({
        id: "ime-audit",
        priority: 999,
        match: context => context.value === "日本"
          ? { from: 0, query: context.value, to: context.value.length }
          : null,
        getItems: () => [{ id: "jp", label: "日本語" }],
        apply: () => ({ ok: false })
      });
      element.focus();
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      target.textContent = "日本";
      const position = element._textPositionInElement(target, 2);
      const range = document.createRange();
      range.setStart(position.node, position.offset);
      range.collapse(true);
      const selection = element.shadowRoot.getSelection?.()
        || globalThis.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: "日本",
        inputType: "insertCompositionText",
        isComposing: true
      }));
      await new Promise(requestAnimationFrame);
      const openDuring = element._completion.open;
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data: "日本"
      }));
      await new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      return {
        openAfter: element._completion.open,
        openDuring,
        providerId: element._completion.providerId
      };
    });

    expect(state).toEqual({
      openAfter: true,
      openDuring: false,
      providerId: "ime-audit"
    });
  });

  test("compositionstart closes an already-open completion immediately", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("/");
    await expect(editor.completion).toBeVisible();

    const state = await editor.host.evaluate(element => {
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      const during = {
        mode: element._getContext().mode,
        open: element._completion.open,
        popupHidden: element.shadowRoot.querySelector(".completion-popup").hidden
      };
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true
      }));
      return during;
    });

    expect(state).toEqual({
      mode: "composing-ime",
      open: false,
      popupHidden: true
    });
    expect(await editor.events("md-completion-close")).toHaveLength(1);
  });

  test("canceled composition leaves no undo entry after reverting preedit", async ({ editor, page }) => {
    await editor.reset({ value: "ax" });
    await editor.setSelection(1, 2);

    const state = await editor.host.evaluate(element => {
      const target = element._activeEditableFromSelection();
      const update = replacement => {
        target.textContent = `a${replacement}`;
        const position = element._textPositionInElement(
          target,
          1 + replacement.length
        );
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        const selection = element.shadowRoot.getSelection?.()
          || globalThis.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        target.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          data: replacement,
          inputType: "insertCompositionText",
          isComposing: true
        }));
      };
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      update("日本");
      update("x");
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data: ""
      }));
      return {
        undoEntries: element._undoStack.length,
        value: element.value
      };
    });

    expect(state).toEqual({
      undoEntries: 0,
      value: "ax"
    });
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("ax");
    expect(await editor.events("md-input")).toEqual([
      expect.objectContaining({ value: "a日本" }),
      expect.objectContaining({ value: "ax" })
    ]);
  });

  for (const transition of ["readonly", "source mode"]) {
    test(`${transition} transition finalizes active preedit cleanly`, async ({ editor }) => {
      await editor.reset({ value: "ax" });
      await editor.setSelection(1, 2);

      const state = await editor.host.evaluate((element, nextTransition) => {
        const target = element._activeEditableFromSelection();
        target.dispatchEvent(new CompositionEvent("compositionstart", {
          bubbles: true
        }));
        target.textContent = "a日本";
        const position = element._textPositionInElement(target, 3);
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        const selection = element.shadowRoot.getSelection?.()
          || globalThis.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        target.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          data: "日本",
          inputType: "insertCompositionText",
          isComposing: true
        }));
        if (nextTransition === "readonly") element.readonly = true;
        else element.mode = "source";
        return {
          composing: element._isComposing,
          mode: element.mode,
          readonly: element.readonly,
          sourceValue: element.shadowRoot.querySelector("textarea").value,
          undoEntries: element._undoStack.length,
          value: element.value
        };
      }, transition);

      expect(state).toEqual({
        composing: false,
        mode: transition === "source mode" ? "source" : "live",
        readonly: transition === "readonly",
        sourceValue: "a日本",
        undoEntries: 1,
        value: "a日本"
      });
      await editor.host.evaluate(element => {
        element.readonly = false;
        element.exec("history.undo");
      });
      expect(await editor.value()).toBe("ax");
    });
  }

  test("fieldset disabled transition finalizes active preedit cleanly", async ({ editor }) => {
    await editor.reset({ value: "ax" });
    await editor.setSelection(1, 2);

    const state = await editor.host.evaluate(element => {
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true
      }));
      target.textContent = "a日本";
      const position = element._textPositionInElement(target, 3);
      const range = document.createRange();
      range.setStart(position.node, position.offset);
      range.collapse(true);
      const selection = element.shadowRoot.getSelection?.()
        || globalThis.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: "日本",
        inputType: "insertCompositionText",
        isComposing: true
      }));

      const fieldset = document.createElement("fieldset");
      element.before(fieldset);
      fieldset.append(element);
      fieldset.disabled = true;

      return {
        composing: element._isComposing,
        disabled: element.disabled,
        formDisabled: element._formDisabled,
        mode: element._getContext().mode,
        sourceValue: element.shadowRoot.querySelector("textarea").value,
        undoEntries: element._undoStack.length,
        value: element.value
      };
    });

    expect(state).toEqual({
      composing: false,
      disabled: true,
      formDisabled: true,
      mode: "disabled",
      sourceValue: "a日本",
      undoEntries: 1,
      value: "a日本"
    });
    await editor.host.evaluate(element => {
      element.closest("fieldset").disabled = false;
      element.exec("history.undo");
    });
    expect(await editor.value()).toBe("ax");
  });

  for (const state of ["readonly", "disabled"]) {
    test(`${state} editor ignores composition lifecycle`, async ({ editor }) => {
      await editor.reset({
        attributes: { [state]: true },
        value: "locked"
      });

      const result = await editor.host.evaluate(element => {
        const target = element.shadowRoot.querySelector("[data-editable]");
        target.dispatchEvent(new CompositionEvent("compositionstart", {
          bubbles: true
        }));
        const during = {
          composing: element._isComposing,
          mode: element._getContext().mode
        };
        target.dispatchEvent(new CompositionEvent("compositionend", {
          bubbles: true
        }));
        return {
          ...during,
          compositionSnapshot: element._compositionSnapshot
        };
      });

      expect(result).toEqual({
        composing: false,
        compositionSnapshot: null,
        mode: state
      });
      expect(await editor.events("md-input")).toEqual([]);
    });
  }

  test("compositionend without compositionstart is an inert no-op", async ({ editor }) => {
    await editor.reset({ value: "text" });
    await editor.setSelection(2);

    const state = await editor.host.evaluate(element => {
      const target = element._activeEditableFromSelection();
      target.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data: "ignored"
      }));
      return {
        composing: element._isComposing,
        undoEntries: element._undoStack.length,
        value: element.value
      };
    });

    expect(state).toEqual({
      composing: false,
      undoEntries: 0,
      value: "text"
    });
    expect(await editor.events("md-input")).toEqual([]);
  });

  test("an empty composition creates no history entry or input event", async ({ editor, page }) => {
    await editor.reset({ value: "unchanged" });
    await editor.setSelection(4);

    await composeLive(editor, []);
    await page.keyboard.press("ControlOrMeta+z");

    expect(await editor.value()).toBe("unchanged");
    expect(await editor.selection()).toEqual({ start: 4, end: 4 });
    expect(await editor.events("md-input")).toEqual([]);
  });
});
