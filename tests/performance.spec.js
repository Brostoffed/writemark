import { expect, test } from "./support/editor-fixture.js";

test.describe("preview debounce", () => {
  const cases = [
    {
      name: "Preview debounce defaults to 100ms when attribute is absent",
      value: null,
      expected: 100
    },
    {
      name: "Preview debounce uses default for invalid values",
      value: "invalid",
      expected: 100
    },
    {
      name: "Preview debounce clamps negative values to zero",
      value: "-20",
      expected: 0
    },
    {
      name: "Preview debounce clamps large values to 1000ms",
      value: "2500",
      expected: 1000
    },
    {
      name: "Preview debounce accepts in-range values",
      value: "250",
      expected: 250
    }
  ];

  for (const scenario of cases) {
    test(scenario.name, async ({ editor }) => {
      const actual = await editor.host.evaluate((element, value) => {
        if (value == null) element.removeAttribute("render-debounce-ms");
        else element.setAttribute("render-debounce-ms", value);
        return element._renderDebounceMs();
      }, scenario.value);
      expect(actual).toBe(scenario.expected);
    });
  }
});

test.describe("deferred preview rendering", () => {
  test("Hidden preview is marked dirty without rendering HTML", async ({ editor }) => {
    const state = await editor.host.evaluate(async element => {
      element.mode = "live";
      element.preview = "none";
      await new Promise(requestAnimationFrame);
      let renderEvents = 0;
      element.addEventListener("md-render", () => {
        renderEvents += 1;
      });
      const before = element.shadowRoot.querySelector(".preview").innerHTML;
      element.value = "**hidden preview**";
      await new Promise(resolve => setTimeout(resolve, 140));
      return {
        dirty: element._previewDirty,
        html: element.shadowRoot.querySelector(".preview").innerHTML,
        before,
        renderEvents
      };
    });
    expect(state).toEqual({
      dirty: true,
      html: state.before,
      before: state.before,
      renderEvents: 0
    });
  });

  test("Dirty preview renders when preview becomes visible", async ({ editor }) => {
    const state = await editor.host.evaluate(async element => {
      element.mode = "live";
      element.preview = "none";
      element.value = "**hidden preview**";
      await new Promise(resolve => setTimeout(resolve, 140));
      let renderEvents = 0;
      element.addEventListener("md-render", () => {
        renderEvents += 1;
      });
      element.preview = "below";
      await new Promise(requestAnimationFrame);
      return {
        dirty: element._previewDirty,
        renderEvents,
        strong: element.shadowRoot.querySelector(".preview strong")?.textContent
      };
    });
    expect(state).toEqual({
      dirty: false,
      renderEvents: 1,
      strong: "hidden preview"
    });
  });
});

async function performIncrementalEdit(editor) {
  return editor.host.evaluate(async element => {
    element.value = "zero\none\ntwo\nthree\nfour";
    await new Promise(requestAnimationFrame);
    const firstNode = element.shadowRoot.querySelector('[data-from="0"]');
    const offset = element.value.indexOf("two");
    element.setSelectionRange(offset + 3, offset + 3);
    const line = element.shadowRoot.querySelector(`[data-from="${offset}"]`);
    line.textContent = "twos";
    line.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: "s",
      inputType: "insertText"
    }));
    await new Promise(requestAnimationFrame);
    return {
      firstNodePreserved:
        element.shadowRoot.querySelector('[data-from="0"]') === firstNode,
      liveEditables: element._liveEditables().length,
      navigationEditables: element._liveNavigationEditables().length,
      parseMode: element._lastParseMode,
      value: element.value
    };
  });
}

test.describe("incremental live rendering", () => {
  test("Simple live text edit uses incremental block parse", async ({ editor }) => {
    const state = await performIncrementalEdit(editor);
    expect(state.value).toBe("zero\none\ntwos\nthree\nfour");
    expect(state.parseMode).toBe("incremental");
  });

  test("Dirty live render preserves unaffected DOM nodes", async ({ editor }) => {
    expect((await performIncrementalEdit(editor)).firstNodePreserved).toBe(true);
  });

  test("Live editable index is rebuilt after dirty patch", async ({ editor }) => {
    const state = await performIncrementalEdit(editor);
    expect(state.liveEditables).toBe(5);
    expect(state.navigationEditables).toBe(5);
  });
});

function largeDocument() {
  return Array.from(
    { length: 3000 },
    (_, index) => `line ${String(index).padStart(4, "0")}`
  ).join("\n");
}

test.describe("large-document virtualization", () => {
  test("Large live document uses virtualized block window", async ({ editor }) => {
    const state = await editor.host.evaluate(async (element, markdown) => {
      element.style.setProperty("--md-editor-max-height", "300px");
      element.value = markdown;
      await new Promise(requestAnimationFrame);
      return {
        active: element._virtualState.active,
        blocks: element._liveBlocks.length,
        rendered: element.shadowRoot.querySelectorAll("[data-editable]").length
      };
    }, largeDocument());
    expect(state.active).toBe(true);
    expect(state.blocks).toBe(3000);
    expect(state.rendered).toBeLessThan(800);
  });

  test("Virtualized live document can render selection near document end", async ({ editor }) => {
    const state = await editor.host.evaluate(async (element, markdown) => {
      element.style.setProperty("--md-editor-max-height", "300px");
      element.value = markdown;
      await new Promise(requestAnimationFrame);
      element.setSelectionRange(element.value.length, element.value.length);
      return {
        rendered: element._isSourceOffsetRendered(element.value.length),
        renderedRows: element.shadowRoot
          .querySelectorAll("[data-editable]").length
      };
    }, largeDocument());
    expect(state.rendered).toBe(true);
    expect(state.renderedRows).toBeLessThan(800);
  });

  test("Virtualized oversized selection restore does not throw", async ({ editor }) => {
    const markdown = largeDocument();
    const selectionEnd = markdown.split("\n").slice(0, 320).join("\n").length;
    const state = await editor.host.evaluate(async (element, options) => {
      element.style.setProperty("--md-editor-max-height", "300px");
      element.value = options.markdown;
      await new Promise(requestAnimationFrame);
      let error = null;
      try {
        element.setSelectionRange(0, options.selectionEnd);
      } catch (caught) {
        error = String(caught);
      }
      return {
        end: element.selectionEnd,
        error,
        start: element.selectionStart
      };
    }, { markdown, selectionEnd });
    expect(state).toEqual({ start: 0, end: selectionEnd, error: null });
  });
});
