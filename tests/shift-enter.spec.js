import { expect, test } from "./support/editor-fixture.js";

test("uses soft breaks by default in live and source modes", async ({ editor, page }) => {
  for (const mode of ["live", "source"]) {
    await editor.reset({ value: "- first", attributes: { mode } });
    expect(await editor.host.evaluate(element => element.shiftEnterBehavior)).toBe("soft-break");
    await editor.setSelection(7);
    await page.keyboard.press("Shift+Enter");
    expect(await editor.value()).toBe("- first  \n");
  }
});

test("reflects the Shift+Enter behavior and updates it without changing Markdown", async ({ editor, page }) => {
  await editor.reset({ value: "- first" });
  const state = await editor.host.evaluate(element => {
    element.shiftEnterBehavior = "smart-enter";
    const enabled = {
      attribute: element.getAttribute("shift-enter-behavior"),
      property: element.shiftEnterBehavior,
      value: element.value,
      dirty: element.dirty
    };
    element.shiftEnterBehavior = "invalid";
    const invalid = element.shiftEnterBehavior;
    element.shiftEnterBehavior = null;
    return {
      enabled,
      invalid,
      restored: element.shiftEnterBehavior,
      attributeRemoved: !element.hasAttribute("shift-enter-behavior")
    };
  });
  expect(state).toEqual({
    enabled: { attribute: "smart-enter", property: "smart-enter", value: "- first", dirty: false },
    invalid: "soft-break",
    restored: "soft-break",
    attributeRemoved: true
  });

  await editor.host.evaluate(element => { element.shiftEnterBehavior = "smart-enter"; });
  await editor.setSelection(7);
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe("- first\n- ");
});

for (const mode of ["live", "source"]) {
  for (const { name, before, after } of [
    { name: "bullet list", before: "- first", after: "- first\n- " },
    { name: "ordered list", before: "3. first", after: "3. first\n4. " },
    { name: "task list", before: "- [x] done", after: "- [x] done\n- [ ] " },
    { name: "blockquote", before: "> quote", after: "> quote\n> " },
    { name: "empty list item", before: "- first\n- ", after: "- first\n" },
    { name: "plain text", before: "first", after: "first\n" }
  ]) {
    test(`smart Shift+Enter handles ${name} in ${mode} mode`, async ({ editor, page }) => {
      await editor.reset({ value: before, attributes: { mode, "shift-enter-behavior": "smart-enter" } });
      await editor.setSelection(before.length);
      await page.keyboard.press("Shift+Enter");
      expect(await editor.value()).toBe(after);
    });
  }
}

test("smart Shift+Enter adds a table row", async ({ editor, page }) => {
  const before = "| A | B |\n| --- | --- |\n| one | two |";
  await editor.reset({ value: before, attributes: { "shift-enter-behavior": "smart-enter" } });
  await editor.host.locator("tbody .md-cell").last().click();
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe(`${before}\n|  |  |`);
});

test("smart Shift+Enter starts a code fence while completion is open", async ({ editor, page }) => {
  await editor.reset({ value: "```py", attributes: { "shift-enter-behavior": "smart-enter" } });
  await editor.setSelection(5);
  await expect(editor.completion).toBeVisible();
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe("```py\n\n```");
});

test("live insertLineBreak uses smart Enter when configured", async ({ editor }) => {
  await editor.reset({ value: "- first", attributes: { "shift-enter-behavior": "smart-enter" } });
  await editor.setSelection(7);
  const prevented = await editor.host.evaluate(element => {
    const target = element.shadowRoot.querySelector('[data-editable="line"]');
    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertLineBreak"
    });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(await editor.value()).toBe("- first\n- ");
});
