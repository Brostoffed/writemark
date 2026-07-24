import { expect, test } from "./support/editor-fixture.js";

const twoColumnTable = [
  "| A | B |",
  "| --- | --- |",
  "| one | two |"
].join("\n");

test.describe("table editing", () => {
  test("inserts a source-backed table through the public action API", async ({ editor }) => {
    const inserted = await editor.host.evaluate(element =>
      element.exec("block.table", { cols: 2, rows: 1 })
    );

    expect(inserted).toBe(true);
    expect(await editor.value()).toBe(
      "| Column 1 | Column 2 |\n" +
      "| --- | --- |\n" +
      "| Cell 1 | Cell 2 |"
    );
    await expect(editor.host.locator("thead .md-cell")).toHaveCount(2);
    await expect(editor.host.locator("tbody .md-cell")).toHaveCount(2);
    expect(await editor.selection()).toEqual({ start: 2, end: 10 });
  });

  test("edits a rendered table cell and escapes literal pipe characters", async ({ editor }) => {
    await editor.reset({ value: twoColumnTable });

    const firstBodyCell = editor.host.locator("tbody .md-cell").first();
    await firstBodyCell.fill("left|right");

    await expect.poll(() => editor.value()).toBe(
      "| A | B |\n" +
      "| --- | --- |\n" +
      "| left\\|right | two |"
    );
    await expect(firstBodyCell).toHaveText("left|right");
  });

  test("uses Tab to move cells and inserts a row after the final populated cell", async ({ editor, page }) => {
    await editor.reset({ value: twoColumnTable });

    const cells = editor.host.locator(".md-cell");
    const firstHeader = cells.nth(0);
    await firstHeader.click();
    await page.keyboard.press("Home");
    await page.keyboard.press("Tab");
    expect(await editor.selection()).toEqual({
      start: twoColumnTable.indexOf("B"),
      end: twoColumnTable.indexOf("B") + 1
    });

    const finalCell = editor.host.locator("tbody .md-cell").last();
    await finalCell.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Tab");

    expect(await editor.value()).toBe(`${twoColumnTable}\n|  |  |`);
    await expect(editor.host.locator("tbody .md-cell")).toHaveCount(4);
    const newRowStart = (await editor.value()).lastIndexOf("|  |  |") + 2;
    expect(await editor.selection()).toEqual({ start: newRowStart, end: newRowStart });
  });

  test("supports row and column actions with undo", async ({ editor, page }) => {
    await editor.reset({ value: twoColumnTable });
    const cellOffset = twoColumnTable.indexOf("two");
    await editor.setSelection(cellOffset);

    const actionResults = await editor.host.evaluate(element => {
      const column = element.exec("table.insertColumnAfter");
      const bodyCellOffset = element.value.indexOf("two");
      element.setSelectionRange(bodyCellOffset, bodyCellOffset);
      const row = element.exec("table.insertRowAfter");
      return { column, row };
    });
    expect(actionResults).toEqual({ column: true, row: true });
    await expect(editor.host.locator("thead .md-cell")).toHaveCount(3);
    await expect(editor.host.locator("tbody tr")).toHaveCount(2);

    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor.host.locator("tbody tr")).toHaveCount(1);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor.host.locator("thead .md-cell")).toHaveCount(2);
    expect(await editor.value()).toBe(twoColumnTable);
  });

  test("applies GFM alignment consistently in live and generated HTML", async ({ editor }) => {
    const markdown = [
      "| Left | Center | Right |",
      "| :--- | :---: | ---: |",
      "| a | b | c |"
    ].join("\n");
    await editor.reset({ value: markdown });

    const liveAlignments = await editor.host.locator("thead th").evaluateAll(cells =>
      cells.map(cell => cell.style.textAlign)
    );
    expect(liveAlignments).toEqual(["left", "center", "right"]);

    const generatedAlignments = await editor.host.evaluate(element => {
      const document = new DOMParser().parseFromString(element.getHTML(), "text/html");
      return [...document.querySelectorAll("thead th")].map(cell => cell.style.textAlign);
    });
    expect(generatedAlignments).toEqual(["left", "center", "right"]);
  });

  test("table.deleteColumn targets selected table column", async ({ editor }) => {
    const markdown = "| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |";
    await editor.reset({ value: markdown });
    const offset = markdown.indexOf("2");
    await editor.setSelection(offset, offset + 1);
    expect(await editor.host.evaluate(element =>
      element.exec("table.deleteColumn")
    )).toBe(true);
    expect(await editor.value()).toBe("| A | C |\n| --- | --- |\n| 1 | 3 |");
  });

  test("table.deleteRow targets selected table row", async ({ editor }) => {
    const markdown = "| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |";
    await editor.reset({ value: markdown });
    const offset = markdown.indexOf("3");
    await editor.setSelection(offset, offset + 1);
    expect(await editor.host.evaluate(element =>
      element.exec("table.deleteRow")
    )).toBe(true);
    expect(await editor.value()).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
  });

  test("live renderer applies GFM table column alignment", async ({ editor }) => {
    await editor.reset({
      value: "| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |"
    });
    const alignments = await editor.host.locator("thead th").evaluateAll(
      cells => cells.map(cell => cell.style.textAlign)
    );
    expect(alignments).toEqual(["left", "center", "right"]);
  });

  test("Enter in table source inserts row below instead of inside cell", async ({ editor }) => {
    const markdown = "| A | B |\n| --- | --- |\n| Cell 1 | Cell 2 |";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    expect(await editor.host.evaluate(element =>
      element.exec("editor.smartEnter")
    )).toBe(true);
    expect(await editor.value()).toBe(`${markdown}\n|  |  |`);
  });

  test("Enter in table source places cursor in new first cell", async ({ editor }) => {
    const markdown = "| A | B |\n| --- | --- |\n| Cell 1 | Cell 2 |";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.host.evaluate(element => element.exec("editor.smartEnter"));
    const expected = (await editor.value()).lastIndexOf("|  |  |") + 2;
    expect(await editor.selection()).toEqual({ start: expected, end: expected });
  });

  test("Backspace clears selected live table cell contents", async ({ editor }) => {
    const markdown = "| A | B |\n| --- | --- |\n| Cell 1 | Cell 2 |";
    await editor.reset({ value: markdown });
    const start = markdown.indexOf("Cell 1");
    await editor.setSelection(start, start + "Cell 1".length);
    await editor.live.press("Backspace");
    expect(await editor.value()).toBe(
      "| A | B |\n| --- | --- |\n|  | Cell 2 |"
    );
  });

  test("Backspace removes empty live table body row", async ({ editor }) => {
    const markdown = "| A | B |\n| --- | --- |\n|  |  |";
    await editor.reset({ value: markdown });
    const offset = await editor.host.locator("tbody .md-cell").first()
      .getAttribute("data-from");
    await editor.setSelection(Number(offset));
    await editor.live.press("Backspace");
    expect(await editor.value()).toBe("| A | B |\n| --- | --- |");
  });

  test("Typing in auto-created empty table body cell creates a Markdown row", async ({ editor }) => {
    const markdown = "| Col A | Col B |\n| --- | ---";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.host.locator("tbody .md-cell").first().fill("a");
    await expect.poll(() => editor.value()).toBe(`${markdown} |\n| a |  |`);
  });

  test("First character in empty table cell keeps caret after typed character", async ({ editor }) => {
    const markdown = "| Col A | Col B |\n| --- | ---";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    const cell = editor.host.locator("tbody .md-cell").first();
    await cell.fill("a");
    const state = await editor.host.evaluate(element => {
      const selection = element.shadowRoot.getSelection?.() || getSelection();
      return {
        focusOffset: selection.focusOffset,
        selectionEnd: element.selectionEnd,
        selectionStart: element.selectionStart
      };
    });
    expect(state.focusOffset).toBe(1);
    expect(state.selectionStart).toBe(state.selectionEnd);
    expect(state.selectionStart).toBe((await editor.value()).lastIndexOf("| a |  |") + 3);
  });

  test("Escaped live table pipe maps between source and displayed offsets", async ({ editor }) => {
    const markdown = "| A | B |\n| --- | --- |\n| a\\|b | c |";
    await editor.reset({ value: markdown });
    const mapping = await editor.host.evaluate(element => {
      const cell = element.shadowRoot.querySelector(
        '.md-cell[data-row="0"][data-col="0"]'
      );
      const sourceOffset = element.value.indexOf("a\\|b") + 3;
      const displayOffset = element._displayOffsetFromSourceOffset(
        cell,
        sourceOffset
      );
      const position = element._domPositionFromSource(sourceOffset);
      return {
        displayOffset,
        domRoundTrip: element._sourceOffsetFromDom(
          position.editable,
          position.node,
          position.offset
        ),
        sourceOffset,
        sourceRoundTrip: element._sourceOffsetFromDisplayOffset(
          cell,
          displayOffset
        )
      };
    });
    expect(mapping.displayOffset).toBe(2);
    expect(mapping.sourceRoundTrip).toBe(mapping.sourceOffset);
    expect(mapping.domRoundTrip).toBe(mapping.sourceOffset);
  });
});
