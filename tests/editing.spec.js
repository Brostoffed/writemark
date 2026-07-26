import { expect, test } from "./support/editor-fixture.js";

test.describe("real editing workflows", () => {
  test("types a heading through the live contenteditable surface", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());

    await page.keyboard.type("#");
    await page.keyboard.press("Space");
    await page.keyboard.type("Roadmap");

    await expect.poll(() => editor.value()).toBe("# Roadmap");
    await expect(editor.host.locator(".md-heading")).toHaveText("# Roadmap");
    await expect(editor.host.locator("#roadmap")).toBeVisible();
    expect(await editor.selection()).toEqual({ start: 9, end: 9 });
  });

  test("Enter at the end of a heading creates one following line", async ({ editor, page }) => {
    await editor.reset({ value: "## Roadmap" });
    await editor.setSelection((await editor.value()).length);

    await page.keyboard.press("Enter");

    await expect.poll(() => editor.value()).toBe("## Roadmap\n");
    expect(await editor.selection()).toEqual({ start: 11, end: 11 });
    await expect(editor.host.locator(".md-heading")).toHaveCount(1);
    await expect(editor.host.locator('[data-kind="blank"]')).toHaveCount(1);
  });

  test("continues and exits a bullet list with real Enter presses", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());

    await page.keyboard.type("- first");
    await page.keyboard.press("Enter");
    await page.keyboard.type("second");
    expect(await editor.value()).toBe("- first\n- second");

    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("- first\n- second\n- ");
    await page.keyboard.press("Enter");

    await expect.poll(() => editor.value()).toBe("- first\n- second\n");
    await expect(editor.host.locator(".md-list")).toHaveCount(2);
  });

  test("indents and outdents list items with Tab and Shift+Tab", async ({ editor, page }) => {
    await editor.reset({ value: "- parent\n- child" });
    const end = (await editor.value()).length;
    await editor.setSelection(end);

    await page.keyboard.press("Tab");
    expect(await editor.value()).toBe("- parent\n  - child");
    await page.keyboard.press("Shift+Tab");
    expect(await editor.value()).toBe("- parent\n- child");
  });

  test("applies inline keyboard shortcuts and supports undo and redo", async ({ editor, page }) => {
    await editor.reset({ value: "hello world" });
    await editor.setSelection(6, 11);

    await page.keyboard.press("ControlOrMeta+b");
    expect(await editor.value()).toBe("hello **world**");
    await expect(editor.host.locator("strong")).toHaveText("world");

    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("hello world");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("hello **world**");
  });

  test("toggles a task by clicking its rendered checkbox", async ({ editor }) => {
    await editor.reset({ value: "- [ ] Ship release" });

    const checkbox = editor.host.getByRole("checkbox", { name: "Ship release" });
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    expect(await editor.value()).toBe("- [x] Ship release");

    const events = await editor.events("md-action");
    expect(events.at(-1)?.actionId).toBe("block.taskDone");
    expect(events.at(-1)?.source).toBe("pointer");
  });

  test("edits canonical Markdown directly in source mode", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "source" },
      value: "before"
    });

    await editor.source.fill("# Source\n\nAfter");

    await expect.poll(() => editor.value()).toBe("# Source\n\nAfter");
    await expect(editor.source).toHaveValue("# Source\n\nAfter");
    const inputEvents = await editor.events("md-input");
    expect(inputEvents.at(-1)).toMatchObject({
      source: "user",
      value: "# Source\n\nAfter"
    });
  });

  test("preserves the final editable line after repeated deletion", async ({ editor, page }) => {
    await editor.reset({ value: "x" });
    await editor.setSelection(0, 1);

    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Delete");

    expect(await editor.value()).toBe("");
    await expect(editor.host.locator("[data-editable]")).toHaveCount(1);

    await page.keyboard.type("#");
    await page.keyboard.press("Space");
    await page.keyboard.type("Recovered");
    expect(await editor.value()).toBe("# Recovered");
    await expect(editor.host.locator(".md-heading")).toHaveText("# Recovered");
  });

  test("blocks editing while readonly or disabled and preserves focus navigation", async ({ editor, page }) => {
    await editor.reset({
      attributes: { readonly: true },
      value: "locked"
    });
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("ignored");
    expect(await editor.value()).toBe("locked");
    await expect(editor.host.locator("[data-editable]")).toHaveAttribute("contenteditable", "false");

    await editor.host.evaluate(element => {
      element.readonly = false;
      element.disabled = true;
    });
    await page.locator("#before-editor").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#after-editor")).toBeFocused();
    expect(await editor.value()).toBe("locked");
  });

  const sectionDocument = [
    "# Section",
    "",
    "Paragraph text",
    "",
    "## Child",
    "",
    "Child text",
    "",
    "# Next",
    "",
    "End"
  ].join("\n");

  test("Cmd/Ctrl+A expansion first selects current block", async ({ editor }) => {
    await editor.reset({ value: sectionDocument });
    const start = sectionDocument.indexOf("Paragraph");
    await editor.setSelection(start);
    await editor.host.evaluate(element => element.exec("editor.selectAllExpand"));
    expect(await editor.selection()).toEqual({
      start,
      end: start + "Paragraph text".length
    });
  });

  test("Cmd/Ctrl+A expansion then selects current heading section", async ({ editor }) => {
    await editor.reset({ value: sectionDocument });
    const start = sectionDocument.indexOf("Paragraph");
    await editor.setSelection(start);
    await editor.host.evaluate(element => {
      element.exec("editor.selectAllExpand");
      element.exec("editor.selectAllExpand");
    });
    expect(await editor.selection()).toEqual({
      start: 0,
      end: sectionDocument.indexOf("# Next")
    });
  });

  test("Cmd/Ctrl+A expansion then selects full document", async ({ editor }) => {
    await editor.reset({ value: sectionDocument });
    const start = sectionDocument.indexOf("Paragraph");
    await editor.setSelection(start);
    await editor.host.evaluate(element => {
      element.exec("editor.selectAllExpand");
      element.exec("editor.selectAllExpand");
      element.exec("editor.selectAllExpand");
    });
    expect(await editor.selection()).toEqual({
      start: 0,
      end: sectionDocument.length
    });
  });

  test("programmatic select all then Delete clears live editor source", async ({ editor }) => {
    await editor.reset({
      value: "# Delete Me\n\nParagraph\n\n| A | B |\n| --- | --- |\n| C | D |"
    });
    await editor.host.evaluate(element => element.select());
    await editor.live.press("Delete");
    expect(await editor.value()).toBe("");
    expect(await editor.selection()).toEqual({ start: 0, end: 0 });
  });

  test("full live selection then Backspace clears source", async ({ editor }) => {
    const markdown = "# Delete Me\n\nParagraph";
    await editor.reset({ value: markdown });
    await editor.setSelection(0, markdown.length);
    await editor.live.press("Backspace");
    expect(await editor.value()).toBe("");
  });

  test("Redundant Backspace preserves final empty editable line", async ({ editor }) => {
    await editor.reset();
    await editor.live.press("Backspace");
    await expect(editor.host.locator("[data-editable]")).toHaveCount(1);
    expect(await editor.value()).toBe("");
  });

  test("Typing and Enter stay source-backed after redundant Backspace", async ({ editor, page }) => {
    await editor.reset();
    await editor.live.press("Backspace");
    await page.keyboard.type("# title");
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("# title\n");
    await expect(editor.host.locator(".md-heading")).toBeVisible();
  });

  test("find selects matching source range", async ({ editor }) => {
    await editor.reset({ value: "one two one" });
    const match = await editor.host.evaluate(element => element.find("two"));
    expect(match).toEqual({ start: 4, end: 7, text: "two" });
    expect(await editor.selection()).toEqual({ start: 4, end: 7 });
  });

  test("replace changes selected match", async ({ editor }) => {
    await editor.reset({ value: "one two one" });
    await editor.host.evaluate(element => element.find("two"));
    expect(await editor.host.evaluate(element =>
      element.replace("two", "three")
    )).toBe(1);
    expect(await editor.value()).toBe("one three one");
  });

  test("replaceAll changes all matches", async ({ editor }) => {
    await editor.reset({ value: "one three one" });
    expect(await editor.host.evaluate(element =>
      element.replaceAll("one", "1")
    )).toBe(2);
    expect(await editor.value()).toBe("1 three 1");
  });
});
