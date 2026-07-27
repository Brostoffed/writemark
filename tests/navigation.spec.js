import { expect, test } from "./support/editor-fixture.js";

const lineNavigationCases = [
  {
    name: "Backspace at live line start joins with previous line",
    markdown: "alpha\nbeta",
    selection: 6,
    key: "Backspace",
    value: "alphabeta",
    expected: { start: 5, end: 5 }
  },
  {
    name: "ArrowLeft at live line start moves to previous line end",
    markdown: "abc\ndef",
    selection: 4,
    key: "ArrowLeft",
    expected: { start: 3, end: 3 }
  },
  {
    name: "ArrowRight at live line end moves to next line start",
    markdown: "abc\ndef",
    selection: 3,
    key: "ArrowRight",
    expected: { start: 4, end: 4 }
  },
  {
    name: "ArrowUp from live line end moves to previous line end",
    markdown: "abc\ndef",
    selection: 7,
    key: "ArrowUp",
    expected: { start: 3, end: 3 }
  },
  {
    name: "ArrowDown from live line start moves to next line start",
    markdown: "abc\ndef",
    selection: 0,
    key: "ArrowDown",
    expected: { start: 4, end: 4 }
  },
  {
    name: "ArrowUp preserves column when moving to previous live line",
    markdown: "abc\ndef",
    selection: 6,
    key: "ArrowUp",
    expected: { start: 2, end: 2 }
  },
  {
    name: "Shift+ArrowDown from live line start selects to next line start",
    markdown: "abc\ndef",
    selection: 0,
    key: "Shift+ArrowDown",
    expected: { start: 0, end: 4 }
  },
  {
    name: "Shift+ArrowDown from live line end selects to next line end",
    markdown: "abc\ndef",
    selection: 3,
    key: "Shift+ArrowDown",
    expected: { start: 3, end: 7 }
  },
  {
    name: "Shift+ArrowUp from live line start selects to previous line start",
    markdown: "abc\ndef",
    selection: 4,
    key: "Shift+ArrowUp",
    expected: { start: 0, end: 4 },
    direction: "backward"
  },
  {
    name: "Shift+ArrowDown from live line middle preserves column",
    markdown: "abc\ndef",
    selection: 2,
    key: "Shift+ArrowDown",
    expected: { start: 2, end: 6 }
  },
  {
    name: "Shift+ArrowDown preserves source column across proportional text",
    markdown: "www\niii",
    selection: 2,
    key: "Shift+ArrowDown",
    expected: { start: 2, end: 6 }
  },
  {
    name: "ArrowLeft collapses multi-line live selection to start",
    markdown: "abc\ndef",
    selection: [1, 5],
    key: "ArrowLeft",
    expected: { start: 1, end: 1 }
  },
  {
    name: "ArrowRight collapses multi-line live selection to end",
    markdown: "abc\ndef",
    selection: [1, 5],
    key: "ArrowRight",
    expected: { start: 5, end: 5 }
  },
  {
    name: "Shift+ArrowRight at live row end selects into next row",
    markdown: "abc\ndef",
    selection: 3,
    key: "Shift+ArrowRight",
    expected: { start: 3, end: 4 },
    direction: "forward"
  },
  {
    name: "Shift+ArrowLeft at live row start selects from previous row",
    markdown: "abc\ndef",
    selection: 4,
    key: "Shift+ArrowLeft",
    expected: { start: 3, end: 4 },
    direction: "backward"
  },
  {
    name: "End in live mode moves to rendered row end",
    markdown: "abc\ndef",
    selection: 1,
    key: "End",
    expected: { start: 3, end: 3 }
  },
  {
    name: "Home in live mode moves to rendered row start",
    markdown: "abc\ndef",
    selection: 2,
    key: "Home",
    expected: { start: 0, end: 0 }
  },
  {
    name: "Shift+End in live mode selects only to rendered row end",
    markdown: "abc\ndef",
    selection: 1,
    key: "Shift+End",
    expected: { start: 1, end: 3 },
    direction: "forward"
  }
];

test.describe("live line navigation", () => {
  for (const scenario of lineNavigationCases) {
    test(scenario.name, async ({ editor }) => {
      await editor.reset({ value: scenario.markdown });
      const [start, end] = Array.isArray(scenario.selection)
        ? scenario.selection
        : [scenario.selection, scenario.selection];
      await editor.setSelection(start, end);
      await editor.live.press(scenario.key);

      if (scenario.value != null) expect(await editor.value()).toBe(scenario.value);
      expect(await editor.selection()).toEqual(scenario.expected);
      if (scenario.direction) {
        expect(await editor.host.evaluate(element => element._selection.direction))
          .toBe(scenario.direction);
      }
    });
  }

  test("ArrowDown skips live horizontal rule instead of trapping caret", async ({ editor }) => {
    const markdown = "alpha\n---\nbeta\ngamma";
    await editor.reset({ value: markdown });
    await editor.setSelection(1);
    await editor.live.press("ArrowDown");
    expect(await editor.selection()).toEqual({
      start: markdown.indexOf("beta") + 1,
      end: markdown.indexOf("beta") + 1
    });
  });

  test("ArrowDown continues after skipping live horizontal rule", async ({ editor }) => {
    const markdown = "alpha\n---\nbeta\ngamma";
    await editor.reset({ value: markdown });
    await editor.setSelection(1);
    await editor.live.press("ArrowDown");
    await editor.live.press("ArrowDown");
    expect(await editor.selection()).toEqual({
      start: markdown.indexOf("gamma") + 1,
      end: markdown.indexOf("gamma") + 1
    });
  });

  test("Repeated Shift+ArrowDown extends from original anchor", async ({ editor }) => {
    await editor.reset({ value: "abc\ndef\nghi" });
    await editor.setSelection(2);
    await editor.live.press("Shift+ArrowDown");
    await editor.live.press("Shift+ArrowDown");
    expect(await editor.selection()).toEqual({ start: 2, end: 10 });
  });

  test("Repeated Shift+ArrowDown updates the DOM selection across rows", async ({ editor }) => {
    await editor.reset({ value: "abc\ndef\nghi" });
    await editor.setSelection(2);
    await editor.live.press("Shift+ArrowDown");
    await editor.live.press("Shift+ArrowDown");
    const selection = await editor.host.evaluate(element => element._getLiveSelection());
    expect(selection).toMatchObject({ start: 2, end: 10, direction: "forward" });
  });

  test("Repeated Shift+ArrowUp preserves backward DOM selection direction", async ({ editor }) => {
    await editor.reset({ value: "abc\ndef\nghi" });
    await editor.setSelection(10);
    await editor.live.press("Shift+ArrowUp");
    await editor.live.press("Shift+ArrowUp");
    const selection = await editor.host.evaluate(element => element._getLiveSelection());
    expect(selection).toMatchObject({ start: 2, end: 10, direction: "backward" });
  });

  test("Shift+Arrow can shrink backward selection and continue forward", async ({ editor }) => {
    await editor.reset({ value: "abc\ndef\nghi\njkl" });
    await editor.setSelection(2, 10, "backward");
    await editor.live.press("Shift+ArrowDown");
    await editor.live.press("Shift+ArrowDown");
    await editor.live.press("Shift+ArrowDown");
    expect(await editor.selection()).toEqual({ start: 10, end: 14 });
    expect(await editor.host.evaluate(element => element._selection.direction))
      .toBe("forward");
  });
});

test.describe("source navigation", () => {
  test("End in source mode moves to current line end", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "abc\ndef"
    });
    await editor.setSelection(1);
    await editor.source.press("End");
    expect(await editor.selection()).toEqual({ start: 3, end: 3 });
  });

  test("Home in source mode moves to current line start", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "abc\ndef"
    });
    await editor.setSelection(2);
    await editor.source.press("Home");
    expect(await editor.selection()).toEqual({ start: 0, end: 0 });
  });
});

test.describe("task navigation", () => {
  test("Home in rendered task item moves to visible text start", async ({ editor }) => {
    const markdown = "- [ ] task";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.live.press("Home");
    expect(await editor.selection()).toEqual({ start: 6, end: 6 });
  });

  test("Shift+Home in rendered task item excludes hidden Markdown marker", async ({ editor }) => {
    const markdown = "- [ ] task";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.live.press("Shift+Home");
    expect(await editor.selection()).toEqual({ start: 6, end: markdown.length });
  });

  test("ArrowRight crosses between rendered task texts without entering hidden markers", async ({ editor }) => {
    const markdown = "- [ ] one\n- [ ] two";
    await editor.reset({ value: markdown });
    const firstEnd = markdown.indexOf("one") + 3;
    await editor.setSelection(firstEnd);
    await editor.live.press("ArrowRight");
    const secondStart = markdown.indexOf("two");
    expect(await editor.selection()).toEqual({
      start: secondStart,
      end: secondStart
    });
  });
});

const tableMarkdown = "| A | B |\n| --- | --- |\n| C | D |";

test.describe("table cell navigation", () => {
  const cases = [
    {
      name: "ArrowRight at live table cell end moves to next cell",
      start: () => tableMarkdown.indexOf("A") + 1,
      key: "ArrowRight",
      expected: () => tableMarkdown.indexOf("B")
    },
    {
      name: "ArrowLeft at live table cell start moves to previous cell end",
      start: () => tableMarkdown.indexOf("B"),
      key: "ArrowLeft",
      expected: () => tableMarkdown.indexOf("A") + 1
    },
    {
      name: "ArrowDown in live table moves to same-column body cell",
      start: () => tableMarkdown.indexOf("A"),
      key: "ArrowDown",
      expected: () => tableMarkdown.indexOf("C")
    },
    {
      name: "ArrowUp in live table moves to same-column header cell",
      start: () => tableMarkdown.indexOf("C"),
      key: "ArrowUp",
      expected: () => tableMarkdown.indexOf("A")
    },
    {
      name: "End in live table cell moves to cell end",
      start: () => tableMarkdown.indexOf("B"),
      key: "End",
      expected: () => tableMarkdown.indexOf("B") + 1
    },
    {
      name: "Home in live table cell moves to cell start",
      start: () => tableMarkdown.indexOf("B") + 1,
      key: "Home",
      expected: () => tableMarkdown.indexOf("B")
    }
  ];

  for (const scenario of cases) {
    test(scenario.name, async ({ editor }) => {
      await editor.reset({ value: tableMarkdown });
      await editor.setSelection(scenario.start());
      await editor.live.press(scenario.key);
      const expected = scenario.expected();
      expect(await editor.selection()).toEqual({ start: expected, end: expected });
    });
  }

  test("Tab in live table selects next cell contents", async ({ editor }) => {
    await editor.reset({ value: tableMarkdown });
    await editor.setSelection(tableMarkdown.indexOf("A"));
    await editor.live.press("Tab");
    const offset = tableMarkdown.indexOf("B");
    expect(await editor.selection()).toEqual({ start: offset, end: offset + 1 });
  });

  test("Tab from final nonempty table cell creates a new row", async ({ editor }) => {
    await editor.reset({ value: tableMarkdown });
    await editor.setSelection(tableMarkdown.indexOf("D") + 1);
    await editor.live.press("Tab");
    expect(await editor.value()).toBe(`${tableMarkdown}\n|  |  |`);
  });

  test("Tab from terminal empty table row exits without editing source", async ({ editor }) => {
    const markdown = `${tableMarkdown}\n|  |  |`;
    await editor.reset({ value: markdown });
    const finalEmptyCell = editor.host.locator("tbody tr").last().locator(".md-cell").last();
    await editor.setSelection(Number(await finalEmptyCell.getAttribute("data-from")));
    await editor.live.press("Tab");
    expect(await editor.value()).toBe(markdown);
    expect(await editor.selection()).toEqual({ start: markdown.length, end: markdown.length });
  });

  for (const [name, key] of [
    ["Escape exits terminal live table without editing source", "Escape"],
    ["Shift+Enter exits terminal live table without editing source", "Shift+Enter"]
  ]) {
    test(name, async ({ editor }) => {
      await editor.reset({ value: tableMarkdown });
      await editor.setSelection(tableMarkdown.indexOf("D") + 1);
      await editor.live.press(key);
      expect(await editor.value()).toBe(tableMarkdown);
      expect(await editor.selection()).toEqual({
        start: tableMarkdown.length,
        end: tableMarkdown.length
      });
    });
  }
});

test.describe("terminal block navigation", () => {
  test("Terminal live horizontal rule restores caret below divider", async ({ editor }) => {
    await editor.reset({ value: "---" });
    await editor.setSelection(3);
    const position = await editor.host.evaluate(element =>
      element._domPositionFromSource(element.value.length)?.editable?.dataset.editable
    );
    expect(position).toBe("virtual-hr-after");
  });

  test("Typing below terminal live horizontal rule creates following paragraph", async ({ editor, page }) => {
    await editor.reset({ value: "---" });
    await editor.setSelection(3);
    await page.keyboard.type("after");
    expect(await editor.value()).toBe("---\nafter");
  });

  test("ArrowDown exits terminal live code block to below-block anchor", async ({ editor }) => {
    const markdown = "```\nconst x = 1;\n```";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.indexOf(";") + 1);
    await editor.live.press("ArrowDown");
    expect(await editor.selection()).toEqual({
      start: markdown.length,
      end: markdown.length
    });
  });

  test("Enter on terminal live code block after-anchor creates trailing blank line", async ({ editor }) => {
    const markdown = "```\nconst x = 1;\n```";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.live.press("Enter");
    expect(await editor.value()).toBe(`${markdown}\n`);
  });

  test("Typing below terminal live code block creates following paragraph", async ({ editor, page }) => {
    const markdown = "```\nconst x = 1;\n```";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await page.keyboard.type("after");
    expect(await editor.value()).toBe(`${markdown}\nafter`);
  });

  test("Terminal live table restores EOF caret below grid", async ({ editor }) => {
    await editor.reset({ value: tableMarkdown });
    await editor.setSelection(tableMarkdown.length);
    const position = await editor.host.evaluate(element =>
      element._domPositionFromSource(element.value.length)?.editable?.dataset.editable
    );
    expect(position).toBe("virtual-table-after");
  });

  test("ArrowDown exits terminal live table without editing source", async ({ editor }) => {
    await editor.reset({ value: tableMarkdown });
    await editor.setSelection(tableMarkdown.indexOf("D"));
    await editor.live.press("ArrowDown");
    expect(await editor.value()).toBe(tableMarkdown);
    expect(await editor.selection()).toEqual({
      start: tableMarkdown.length,
      end: tableMarkdown.length
    });
  });

  test("ArrowDown exits live table into following paragraph without inserting blank line", async ({ editor }) => {
    const markdown = `${tableMarkdown}\nafter`;
    await editor.reset({ value: markdown });
    await editor.setSelection(tableMarkdown.indexOf("D"));
    await editor.live.press("ArrowDown");
    expect(await editor.value()).toBe(markdown);
    const offset = markdown.indexOf("after");
    expect(await editor.selection()).toEqual({ start: offset, end: offset });
  });

  test("Enter on terminal live table after-anchor creates trailing blank line", async ({ editor }) => {
    await editor.reset({ value: tableMarkdown });
    await editor.setSelection(tableMarkdown.length);
    await editor.live.press("Enter");
    expect(await editor.value()).toBe(`${tableMarkdown}\n`);
  });

  test("Typing below terminal live table creates following paragraph", async ({ editor, page }) => {
    await editor.reset({ value: tableMarkdown });
    await editor.setSelection(tableMarkdown.length);
    await page.keyboard.type("after");
    expect(await editor.value()).toBe(`${tableMarkdown}\nafter`);
  });
});

async function dragSourceSelection(editor, page, start, end) {
  const points = await editor.host.evaluate((element, offsets) => {
    const point = offset => {
      const rect = element._caretRectForSourceOffset(offset);
      return {
        x: rect.left,
        y: (rect.top + rect.bottom) / 2
      };
    };
    return {
      end: point(offsets.end),
      start: point(offsets.start)
    };
  }, { end, start });
  await page.mouse.move(points.start.x, points.start.y);
  await page.mouse.down();
  await page.mouse.move(points.end.x, points.end.y, { steps: 8 });
  await page.mouse.up();
}

test.describe("pointer selection", () => {
  test("Mouse drag can select across multiple live text rows", async ({ editor, page }) => {
    const markdown = "alpha\nbeta\ngamma";
    const end = markdown.indexOf("gamma") + 3;
    await editor.reset({ value: markdown });
    await dragSourceSelection(editor, page, 1, end);
    expect(await editor.selection()).toEqual({ start: 1, end });
  });

  for (const runtime of [
    { ios: true, label: "iOS" },
    { ios: false, label: "desktop Safari" }
  ]) {
    test(`${runtime.label} browser-owned drag can select across multiple live blocks`, async ({ editor, page }) => {
      const markdown = "alpha\nbeta\ngamma";
      const end = markdown.indexOf("gamma") + 3;
      await editor.reset({ value: markdown });
      await editor.host.evaluate((element, ios) => {
        element._testOriginalAppleWebKitRuntime = element._isAppleWebKitRuntime;
        element._testOriginalIOSWebKitRuntime = element._isIOSWebKitRuntime;
        element._isAppleWebKitRuntime = () => true;
        element._isIOSWebKitRuntime = () => ios;
      }, runtime.ios);

      await dragSourceSelection(editor, page, 1, end);
      const state = await editor.host.evaluate(element => {
        const live = element.shadowRoot.querySelector(".live-editor");
        const nativeSelection = element._readLiveSelection();
        element._isAppleWebKitRuntime = element._testOriginalAppleWebKitRuntime;
        element._isIOSWebKitRuntime = element._testOriginalIOSWebKitRuntime;
        delete element._testOriginalAppleWebKitRuntime;
        delete element._testOriginalIOSWebKitRuntime;
        return {
          modelSelection: { ...element._selection },
          nativeSelection,
          nestedEditingHosts: live.querySelectorAll(
            '[data-editable][contenteditable="true"]'
          ).length,
          rootEditingHost: live.getAttribute("contenteditable")
        };
      });

      expect(state).toEqual({
        modelSelection: { direction: "forward", end, start: 1 },
        nativeSelection: { direction: "forward", end, start: 1 },
        nestedEditingHosts: 0,
        rootEditingHost: "true"
      });
    });
  }

  test("Mouse hit testing below live horizontal rule reaches following row", async ({ editor }) => {
    const markdown = "alpha\n***\nbeta\ngamma";
    await editor.reset({ value: markdown });
    const offset = await editor.host.evaluate(element => {
      const rect = element.shadowRoot.querySelector(".md-hr-line")
        .getBoundingClientRect();
      return element._sourceOffsetForClientPoint(rect.left + 25, rect.bottom - 2);
    });
    expect(offset).toBeGreaterThan(markdown.indexOf("beta"));
  });

  test("Mouse drag can select downward across live horizontal rule", async ({ editor, page }) => {
    const markdown = "alpha\n***\nbeta\ngamma";
    const end = markdown.indexOf("gamma") + 3;
    await editor.reset({ value: markdown });
    await dragSourceSelection(editor, page, 1, end);
    expect(await editor.selection()).toEqual({ start: 1, end });
  });
});

test.describe("terminal setext heading navigation", () => {
  const markdown = "Setext title\n---";

  test("Terminal live setext heading restores caret below hidden underline", async ({ editor }) => {
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    const state = await editor.host.evaluate(element => {
      const heading = element.shadowRoot.querySelector(".md-heading");
      const anchor = element.shadowRoot.querySelector(
        '[data-editable="virtual-setext-after"]'
      );
      const position = element._domPositionFromSource(element.value.length);
      return {
        anchorTop: anchor.getBoundingClientRect().top,
        headingBottom: heading.getBoundingClientRect().bottom,
        mappedToAnchor: position.editable === anchor
      };
    });
    expect(state.mappedToAnchor).toBe(true);
    expect(state.anchorTop).toBeGreaterThanOrEqual(state.headingBottom - 1);
    expect(await editor.selection()).toEqual({
      start: markdown.length,
      end: markdown.length
    });
  });

  test("ArrowDown exits terminal live setext heading to below-heading anchor", async ({ editor }) => {
    await editor.reset({ value: markdown });
    await editor.setSelection("Setext title".length);
    await editor.live.press("ArrowDown");
    expect(await editor.selection()).toEqual({
      start: markdown.length,
      end: markdown.length
    });
  });

  test("Enter on terminal live setext after-anchor creates trailing blank line", async ({ editor }) => {
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.live.press("Enter");
    expect(await editor.value()).toBe(`${markdown}\n`);
  });

  test("Typing below terminal live setext heading creates following paragraph", async ({ editor, page }) => {
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await page.keyboard.type("next");
    expect(await editor.value()).toBe(`${markdown}\nnext`);
  });

  test("Live setext heading preserves title source spacing for caret mapping", async ({ editor }) => {
    await editor.reset({ value: "  Padded setext  \n===" });
    await expect(editor.host.locator(".md-heading")).toHaveText("  Padded setext  ");
    await expect(editor.host.locator('[data-editable="virtual-setext-after"]'))
      .toHaveCount(1);
  });
});
