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
      if (start?.editable === target && end?.editable === target) {
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
    const targetSelection = element._inputTargetFromBeforeInput(event)?.selection
      || null;
    target.dispatchEvent(event);
    return {
      defaultPrevented: event.defaultPrevented,
      selectionEnd: element.selectionEnd,
      selectionStart: element.selectionStart,
      targetSelection,
      value: element.value
    };
  }, { data, forceFallback, inputType, isComposing, targetRange });
}

async function applyLiveDomInput(editor, {
  data,
  inputType = "insertText"
}) {
  return editor.host.evaluate((element, options) => {
    element.focus();
    const target = element._activeEditableFromSelection()
      || element.shadowRoot.querySelector("[data-editable]");
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const startPosition = element._domPositionFromSource(start);
    const endPosition = element._domPositionFromSource(end);
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
      data: options.data,
      inputType: options.inputType
    });
    Object.defineProperty(beforeInput, "getTargetRanges", {
      value: () => ranges
    });
    target.dispatchEvent(beforeInput);

    let inputDispatched = false;
    if (!beforeInput.defaultPrevented) {
      const nextValue = element.value.slice(0, start)
        + options.data
        + element.value.slice(end);
      const cursor = start + options.data.length;
      target.textContent = nextValue;
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
  }, { data, inputType });
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
