import fc from "fast-check";
import { expect, test } from "./support/editor-fixture.js";

const twoColumnTable = "| A | B |\n| --- | --- |\n| one | two |";

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

test("invalid behavior uses a soft break and Enter remains smart", async ({ editor, page }) => {
  for (const mode of ["live", "source", "split"]) {
    await editor.reset({ value: "- first", attributes: { mode, "shift-enter-behavior": "invalid" } });
    await editor.setSelection(7);
    await page.keyboard.press("Shift+Enter");
    expect(await editor.value()).toBe("- first  \n");

    await editor.reset({ value: "- first", attributes: { mode, "shift-enter-behavior": "smart-enter" } });
    await editor.setSelection(7);
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("- first\n- ");
  }
});

test("upgrades a behavior property set before connection", async ({ editor }) => {
  const result = await editor.host.evaluate(element => {
    const second = document.createElement("writemark-editor");
    Object.defineProperty(second, "shiftEnterBehavior", {
      configurable: true,
      value: "smart-enter",
      writable: true
    });
    element.after(second);
    const state = {
      first: element.shiftEnterBehavior,
      second: second.shiftEnterBehavior,
      attribute: second.getAttribute("shift-enter-behavior"),
      ownsProperty: Object.hasOwn(second, "shiftEnterBehavior")
    };
    second.remove();
    return state;
  });
  expect(result).toEqual({
    first: "soft-break",
    second: "smart-enter",
    attribute: "smart-enter",
    ownsProperty: false
  });
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
  await editor.reset({ value: twoColumnTable, attributes: { "shift-enter-behavior": "smart-enter" } });
  await editor.host.locator("tbody .md-cell").last().click();
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe(`${twoColumnTable}\n|  |  |`);
});

test("default Shift+Enter exits a table without adding a row", async ({ editor, page }) => {
  await editor.reset({ value: twoColumnTable });
  await editor.host.locator("tbody .md-cell").last().click();
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe(twoColumnTable);
  await expect(editor.host.locator("tbody tr")).toHaveCount(1);
  expect((await editor.events("md-action")).at(-1)?.actionId).toBe("table.exit");
});

test("smart Shift+Enter starts a code fence while completion is open", async ({ editor, page }) => {
  await editor.reset({ value: "```py", attributes: { "shift-enter-behavior": "smart-enter" } });
  await editor.setSelection(5);
  await expect(editor.completion).toBeVisible();
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe("```py\n\n```");
});

test("default Shift+Enter accepts a visible completion", async ({ editor, page }) => {
  await editor.reset({ value: "```py" });
  await editor.setSelection(5);
  await expect(editor.completion).toBeVisible();
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe("```python");
  expect((await editor.events("md-completion-accept"))).toHaveLength(1);
});

test("smart Shift+Enter records one action and remains undoable", async ({ editor, page }) => {
  await editor.reset({ value: "- first", attributes: { "shift-enter-behavior": "smart-enter" } });
  await editor.setSelection(7);
  await page.keyboard.press("Shift+Enter");
  expect(await editor.value()).toBe("- first\n- ");
  expect((await editor.events("md-action")).map(event => event.actionId)).toEqual(["editor.smartEnter"]);
  expect(await editor.events("md-input")).toHaveLength(1);

  await page.keyboard.press("ControlOrMeta+z");
  expect(await editor.value()).toBe("- first");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  expect(await editor.value()).toBe("- first\n- ");
});

for (const state of ["readonly", "disabled"]) {
  test(`smart Shift+Enter does not edit a ${state} editor`, async ({ editor, page }) => {
    await editor.reset({ value: "- first", attributes: { "shift-enter-behavior": "smart-enter", [state]: true } });
    await editor.host.evaluate(element => {
      const target = element.shadowRoot.querySelector(".live-editor");
      target.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        shiftKey: true
      }));
    });
    await page.keyboard.press("Shift+Enter");
    expect(await editor.value()).toBe("- first");
    expect(await editor.events("md-input")).toHaveLength(0);
  });
}

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

test("live insertLineBreak keeps the default soft break", async ({ editor }) => {
  await editor.reset({ value: "- first" });
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
  expect(await editor.value()).toBe("- first  \n");
});

test("extra marker spaces keep the live caret at the line end", async ({ editor, page }) => {
  for (const { before, next } of [
    { before: "-  a", next: "- " },
    { before: "3.  a", next: "4. " },
    { before: "- [x]  a", next: "- [ ] " }
  ]) {
    for (const behavior of ["soft-break", "smart-enter"]) {
      await editor.reset({ value: before, attributes: { "shift-enter-behavior": behavior } });
      await editor.setSelection(before.length);
      expect(await editor.selection()).toEqual({ start: before.length, end: before.length });
      await page.keyboard.press("Shift+Enter");
      expect(await editor.value()).toBe(behavior === "soft-break" ? `${before}  \n` : `${before}\n${next}`);
    }
  }
});

test("generated smart Shift+Enter cases match Enter", async ({ editor, page }) => {
  test.setTimeout(300_000);
  const text = fc.array(fc.constantFrom("a", "b", " ", "0", "-", "é", "東", "🙂"), {
    minLength: 1,
    maxLength: 14
  }).map(characters => characters.join(""));
  const scenario = fc.record({
    kind: fc.constantFrom("plain", "bullet", "ordered", "task", "quote", "heading"),
    mode: fc.constantFrom("live", "source"),
    position: fc.constantFrom("end", "middle", "select-tail"),
    text
  });
  const seed = Number(process.env.SHIFT_ENTER_FUZZ_SEED ?? 0x51e7);
  const numRuns = Number(process.env.SHIFT_ENTER_FUZZ_RUNS ?? 40);
  const path = process.env.SHIFT_ENTER_FUZZ_PATH;

  await fc.assert(fc.asyncProperty(scenario, async ({ kind, mode, position, text: body }) => {
    const before = ({
      plain: body,
      bullet: `- ${body}`,
      ordered: `3. ${body}`,
      task: `- [x] ${body}`,
      quote: `> ${body}`,
      heading: `## ${body}`
    })[kind];
    const middle = Math.max(0, before.length - Math.ceil(body.length / 2));
    const start = position === "end" ? before.length : middle;
    const end = position === "select-tail" ? before.length : start;
    const run = async key => {
      await editor.reset({ value: before, attributes: { mode, "shift-enter-behavior": "smart-enter" } });
      await editor.setSelection(start, end);
      await page.keyboard.press(key);
      return {
        value: await editor.value(),
        selection: await editor.selection()
      };
    };
    expect(await run("Shift+Enter")).toEqual(await run("Enter"));
  }), { seed, numRuns, path, verbose: true });
});

test("generated default Shift+Enter cases keep the hard break", async ({ editor, page }) => {
  test.setTimeout(300_000);
  const text = fc.array(fc.constantFrom("a", "b", " ", "0", "-", "é", "東", "🙂"), {
    minLength: 1,
    maxLength: 14
  }).map(characters => characters.join(""));
  const scenario = fc.record({
    behavior: fc.constantFrom(null, "soft-break", "invalid"),
    kind: fc.constantFrom("plain", "bullet", "ordered", "task", "quote"),
    mode: fc.constantFrom("live", "source"),
    text
  });
  const seed = Number(process.env.SHIFT_ENTER_FUZZ_SEED ?? 0x51e8);
  const numRuns = Number(process.env.SHIFT_ENTER_FUZZ_RUNS ?? 40);
  const path = process.env.SHIFT_ENTER_FUZZ_PATH;

  await fc.assert(fc.asyncProperty(scenario, async ({ behavior, kind, mode, text: body }) => {
    const before = ({
      plain: body,
      bullet: `- ${body}`,
      ordered: `3. ${body}`,
      task: `- [x] ${body}`,
      quote: `> ${body}`
    })[kind];
    const attributes = { mode };
    if (behavior != null) attributes["shift-enter-behavior"] = behavior;
    await editor.reset({ value: before, attributes });
    await editor.setSelection(before.length);
    await page.keyboard.press("Shift+Enter");
    expect(await editor.value()).toBe(`${before}  \n`);
    expect((await editor.events("md-action")).at(-1)?.actionId).toBe("editor.insertSoftBreak");
  }), { seed, numRuns, path, verbose: true });
});
