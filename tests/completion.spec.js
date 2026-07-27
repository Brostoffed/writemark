import { expect, test } from "./support/editor-fixture.js";

async function openDisabledCompletion(editor, page) {
  await editor.reset();
  await editor.host.evaluate(element => {
    element.registerCompletionProvider({
      id: "audit-disabled",
      priority: 1_000,
      triggers: ["@"],
      match(context) {
        return context.currentLine.text.endsWith("@")
          ? { from: context.selectionStart - 1, query: "", to: context.selectionStart }
          : null;
      },
      getItems() {
        return [
          { id: "unavailable", kind: "audit", label: "Unavailable", disabled: true },
          { id: "available", kind: "audit", label: "Available" }
        ];
      },
      apply() {
        throw new Error("A disabled completion item must not be applied.");
      }
    });
  });
  await editor.host.evaluate(element => element.focus());
  await page.keyboard.type("@");
  await expect(editor.completion).toBeVisible();
}

test.describe("completion UI", () => {
  test("Completion skips disabled option and exposes disabled state", async ({ editor, page }) => {
    await openDisabledCompletion(editor, page);
    const options = editor.host.getByRole("option");
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toHaveAttribute("aria-disabled", "true");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("Keyboard and pointer completion navigation cannot activate disabled option", async ({ editor, page }) => {
    await openDisabledCompletion(editor, page);
    await page.keyboard.press("ArrowUp");
    const unavailable = editor.host.locator(
      '[role="option"][aria-disabled="true"]'
    );
    await unavailable.click({ force: true });
    await expect(editor.completion).toBeVisible();
    await expect(editor.host.getByRole("option", { name: "Available", exact: true }))
      .toHaveAttribute("aria-selected", "true");
    expect(await editor.value()).toBe("@");
  });

  test("opens the slash menu with correct ARIA state and inserts a command by pointer", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());

    await page.keyboard.type("/tab");

    await expect(editor.completion).toBeVisible();
    await expect(editor.live).toHaveAttribute("aria-expanded", "true");
    const tableOption = editor.host.getByRole("option", { name: /Table/ });
    await expect(tableOption).toBeVisible();
    await expect(tableOption).toHaveAttribute("aria-selected", "true");

    await tableOption.click();

    await expect(editor.completion).toBeHidden();
    await expect(editor.live).toHaveAttribute("aria-expanded", "false");
    expect(await editor.value()).toBe(
      "| Column 1 | Column 2 | Column 3 |\n" +
      "| --- | --- | --- |\n" +
      "| Cell 1 | Cell 2 | Cell 3 |"
    );
    await expect(editor.host.locator(".md-table")).toBeVisible();

    const accepted = await editor.events("md-completion-accept");
    expect(accepted.at(-1)?.providerId).toBe("slash");
  });

  test("navigates slash options with the keyboard and accepts the active command", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("/heading");

    await expect(editor.completion).toBeVisible();
    const firstSelected = editor.host.locator('[role="option"][aria-selected="true"]');
    await expect(firstSelected).toHaveCount(1);
    const firstLabel = await firstSelected.locator(".completion-label").textContent();

    await page.keyboard.press("ArrowDown");
    const secondSelected = editor.host.locator('[role="option"][aria-selected="true"]');
    await expect(secondSelected).toHaveCount(1);
    expect(await secondSelected.locator(".completion-label").textContent()).not.toBe(firstLabel);

    const expectedPrefix = await secondSelected.locator(".completion-label").textContent();
    await page.keyboard.press("Enter");

    await expect(editor.completion).toBeHidden();
    expect(await editor.value()).toMatch(/^#{1,6} $/);
    expect(expectedPrefix).toMatch(/^Heading [1-6]$/);
  });

  test("keeps wrapped keyboard selection visible inside the popover", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("/");
    await expect(editor.completion).toBeVisible();

    const completionViewport = () => editor.completion.evaluate(popup => {
      const selected = popup.querySelector('[role="option"][aria-selected="true"]');
      const popupRect = popup.getBoundingClientRect();
      const selectedRect = selected?.getBoundingClientRect();
      return {
        activeIndex: Number(selected?.dataset.index),
        itemCount: popup.querySelectorAll('[role="option"]').length,
        overflowed: popup.scrollHeight > popup.clientHeight,
        scrollTop: popup.scrollTop,
        selectedVisible: Boolean(
          selectedRect
          && selectedRect.top >= popupRect.top - 1
          && selectedRect.bottom <= popupRect.bottom + 1
        )
      };
    });

    const initial = await completionViewport();
    expect(initial).toMatchObject({
      activeIndex: 0,
      overflowed: true,
      selectedVisible: true
    });

    await page.keyboard.press("ArrowUp");
    await expect.poll(completionViewport).toMatchObject({
      activeIndex: initial.itemCount - 1,
      overflowed: true,
      selectedVisible: true
    });
    const wrappedToBottom = await completionViewport();
    expect(wrappedToBottom.scrollTop).toBeGreaterThan(0);

    await page.keyboard.press("ArrowDown");
    await expect.poll(completionViewport).toMatchObject({
      activeIndex: 0,
      overflowed: true,
      selectedVisible: true
    });
  });

  test("offers fenced-code languages and closes on Escape", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("```py");

    await expect.poll(() => editor.value()).toBe("```py");
    await expect(editor.completion).toBeVisible();
    const python = editor.host.getByRole("option", { name: /python/ });
    await expect(python).toBeVisible();
    await python.click();
    expect(await editor.value()).toBe("```python");

    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("```python\n\n```");
    await expect(editor.host.locator(".md-code-block")).toBeVisible();

    await editor.reset();
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("/");
    await expect(editor.completion).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor.completion).toBeHidden();
    expect(await editor.value()).toBe("/");
  });

  for (const scenario of [
    { fence: "```", name: "backtick" },
    { fence: "~~~", name: "tilde" }
  ]) {
    test(`language completion closes an unfinished ${scenario.name} fence before following content`, async ({ editor, page }) => {
      const following = "Following **paragraph**.";
      await editor.reset({ value: `\n${following}` });
      await editor.setSelection(0);

      await page.keyboard.type(`${scenario.fence}py`);

      await expect(editor.completion).toBeVisible();
      await expect(editor.host.locator(".md-code-block")).toHaveCount(0);
      await expect(editor.host.locator(".md-line")).toContainText([
        `${scenario.fence}py`,
        following
      ]);

      await editor.host.getByRole("option", { name: /python/ }).click();

      const opening = `${scenario.fence}python`;
      expect(await editor.value()).toBe(
        `${opening}\n\n${scenario.fence}\n${following}`
      );
      expect(await editor.selection()).toEqual({
        start: opening.length + 1,
        end: opening.length + 1
      });
      await expect(editor.host.locator(".md-code-block")).toHaveCount(1);
      await expect(editor.host.locator(".md-code-block")).not.toContainText(
        "Following paragraph."
      );
      await expect(editor.host.locator(".md-line")).toContainText(
        following
      );
      await expect(editor.host.locator(".md-line strong"))
        .toHaveText("paragraph");
    });
  }

  test("unfiltered language completion closes an unfinished fence before following content", async ({ editor, page }) => {
    const following = "## Table\n\nFollowing paragraph.";
    await editor.reset({ value: `\n${following}` });
    await editor.setSelection(0);

    await page.keyboard.type("```");

    await expect(editor.completion).toBeVisible();
    const selected = editor.host.locator(
      '[role="option"][aria-selected="true"]'
    );
    await expect(selected).toHaveCount(1);
    const language = await selected.locator(".completion-label").textContent();
    await selected.click();

    expect(await editor.value()).toBe(
      `\`\`\`${language}\n\n\`\`\`\n${following}`
    );
    await expect(editor.host.locator(".md-code-block")).toHaveCount(1);
    await expect(editor.host.locator(".md-code-block"))
      .not.toContainText("Table");
    await expect(editor.host.locator(".md-heading")).toHaveText("## Table");
  });

  test("real blank-line typing does not let a later code block swallow intervening content", async ({ editor, page }) => {
    const following = [
      "## Table",
      "",
      "Following paragraph.",
      "",
      "```python",
      'print("existing")',
      "```"
    ].join("\n");
    await editor.reset({ value: `---\n\n${following}` });

    await editor.host.locator('[data-kind="blank"]').first().click();
    await page.keyboard.type("```py");

    await expect(editor.completion).toBeVisible();
    await expect(editor.host.locator(".md-code-block")).toHaveCount(1);
    await expect(editor.host.locator(".md-heading")).toHaveText("## Table");
    await expect(editor.host.getByText("Following paragraph.", {
      exact: true
    })).toBeVisible();

    await editor.host.getByRole("option", { name: /python/ }).click();

    expect(await editor.value()).toBe(
      `---\n\`\`\`python\n\n\`\`\`\n${following}`
    );
    await expect(editor.host.locator(".md-code-block")).toHaveCount(2);
    await expect(editor.host.locator(".md-code-block").first())
      .not.toContainText("Table");
    await expect(editor.host.locator(".md-heading")).toHaveText("## Table");
  });

  test("desktop Safari fallback preserves a pending fence before following content", async ({ editor, page }) => {
    const following = "Following paragraph.";
    await editor.reset({ value: `\n${following}` });
    await editor.setSelection(0);
    await editor.host.evaluate(element => {
      element._testOriginalAppleWebKitRuntime = element._isAppleWebKitRuntime;
      element._testOriginalIOSWebKitRuntime = element._isIOSWebKitRuntime;
      element._isAppleWebKitRuntime = () => true;
      element._isIOSWebKitRuntime = () => false;
    });

    await page.keyboard.type("```py");

    await expect(editor.completion).toBeVisible();
    expect(await editor.value()).toBe(`\`\`\`py\n${following}`);
    await expect(editor.host.locator(".md-code-block")).toHaveCount(0);
    await expect(editor.host.locator(".md-line")).toContainText([
      "```py",
      following
    ]);

    await editor.host.evaluate(element => {
      element._isAppleWebKitRuntime = element._testOriginalAppleWebKitRuntime;
      element._isIOSWebKitRuntime = element._testOriginalIOSWebKitRuntime;
      delete element._testOriginalAppleWebKitRuntime;
      delete element._testOriginalIOSWebKitRuntime;
    });
  });

  test("does not offer languages from a closing code fence", async ({ editor }) => {
    const markdown = "```\nconst x = 1;\n```";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.length);
    await editor.settle();

    await expect(editor.completion).toBeHidden();
    await editor.live.press("Enter");

    await expect.poll(() => editor.value()).toBe(`${markdown}\n`);
    await expect(editor.completion).toBeHidden();
  });

  test("supports a host-provided async completion provider", async ({ editor, page }) => {
    await editor.host.evaluate(element => {
      element.registerCompletionProvider({
        id: "people",
        priority: 200,
        triggers: ["@"],
        match(context) {
          const before = context.currentLine.text.slice(
            0,
            context.selectionStart - context.currentLine.start
          );
          const found = /@([\w-]*)$/.exec(before);
          if (!found) return null;
          return {
            from: context.selectionStart - found[0].length,
            providerId: "people",
            query: found[1],
            to: context.selectionStart,
            trigger: "@"
          };
        },
        async getItems() {
          await Promise.resolve();
          return [
            { id: "ada", kind: "person", label: "Ada Lovelace" },
            { id: "grace", kind: "person", label: "Grace Hopper" }
          ];
        },
        apply(item, match, context) {
          const text = `@${item.id}`;
          const cursor = match.from + text.length;
          return {
            announcement: `${item.label}.`,
            ok: true,
            transaction: {
              actionId: "people.insert",
              changes: [{ from: match.from, insert: text, to: match.to }],
              selectionAfter: { direction: "none", end: cursor, start: cursor },
              selectionBefore: {
                direction: context.selectionDirection,
                end: context.selectionEnd,
                start: context.selectionStart
              },
              undoGroup: "people"
            }
          };
        }
      });
    });
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("@");

    const grace = editor.host.getByRole("option", { name: /Grace Hopper/ });
    await expect(grace).toBeVisible();
    await grace.click();

    expect(await editor.value()).toBe("@grace");
    const accepted = await editor.events("md-completion-accept");
    expect(accepted.at(-1)?.providerId).toBe("people");
  });
});
