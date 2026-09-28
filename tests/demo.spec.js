import { expect, test } from "@playwright/test";

test.describe("published demo", () => {
  test("starts with tags off and switches them without changing Markdown", async ({ page }) => {
    await page.goto("/demo/index.html");
    const editor = page.locator("#editor");
    const toggle = page.getByRole("checkbox", { name: "Enable tags", exact: true });
    const value = await editor.evaluate(element => element.value);
    await expect(toggle).not.toBeChecked();
    await expect(editor).toHaveJSProperty("tagsEnabled", false);
    await expect(editor.locator(".md-tag")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Insert tag", exact: true })).toBeDisabled();
    await expect(page.locator("#document-tag-summary")).toHaveText("(off)");
    await toggle.check();
    await expect(editor).toHaveJSProperty("tagsEnabled", true);
    await expect(page.getByRole("button", { name: "Focus #editor, 2 occurrences" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Insert tag", exact: true })).toBeEnabled();
    await toggle.uncheck();
    await expect(editor.locator(".md-tag")).toHaveCount(0);
    await expect(page.locator("#state-tags")).toHaveText("off");
    expect(await editor.evaluate(element => ({ value: element.value, dirty: element.dirty, tags: element.getTags() })))
      .toEqual({ value, dirty: false, tags: [] });
  });

  test("keeps focus on the tag switch during keyboard changes", async ({ page }) => {
    await page.goto("/demo/index.html");
    const editor = page.locator("#editor");
    const toggle = page.getByRole("checkbox", { name: "Enable tags", exact: true });
    const value = await editor.evaluate(element => element.value);

    await toggle.focus();
    await expect(toggle).toBeFocused();
    for (const enabled of [true, false]) {
      await page.keyboard.press("Space");
      await expect(toggle).toBeChecked({ checked: enabled });
      await expect(editor).toHaveJSProperty("tagsEnabled", enabled);
      await expect(toggle).toBeFocused();
    }

    expect(await editor.evaluate(element => ({ value: element.value, dirty: element.dirty, tags: element.getTags() })))
      .toEqual({ value, dirty: false, tags: [] });
  });

  test("keeps the GIF capture page aligned with document and catalog tag states", async ({ page }) => {
    await page.goto("/demo/gif.html");
    await page.waitForFunction(() => window.gifDemoReady === true);

    const documentSection = page.locator(".side-section").filter({
      has: page.getByRole("heading", { name: "Tags in this document" })
    });
    const catalogSection = page.locator(".side-section").filter({
      has: page.getByRole("heading", { name: "Autocomplete catalog" })
    });

    await page.evaluate(() => window.gifDemo.prepareLine("QA owner: "));
    await page.keyboard.type("#fresh/demo");

    await expect(documentSection.getByText("#fresh/demo", { exact: true })).toBeVisible();
    await expect(catalogSection.getByText("#fresh/demo", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("option", {
      name: "Add #fresh/demo to catalog save for autocomplete"
    })).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(catalogSection.getByText("#fresh/demo", { exact: true })).toBeVisible();
  });

  test("connects controls, editor state, output, and form submission", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    await page.goto("/demo/index.html");
    const editor = page.locator("#editor");
    await expect(page.getByRole("textbox", { name: "Body" })).toBeVisible();
    await expect(editor.locator(".md-heading").first()).toHaveText("# Live inline markdown editor");
    await expect(editor).toHaveJSProperty("markdownFlavor", "gfm");
    const demoValue = await editor.evaluate(element => element.value);
    expect(demoValue).toContain("Use **bold**, *italic*, ***bold italic***");
    expect(demoValue).toContain("> Standard blockquote\n> > Nested blockquote");
    expect(demoValue).toContain("- Press Tab to indent\n  - Press Shift+Tab to outdent");
    expect(demoValue).not.toContain("[features]:");
    expect(demoValue).not.toContain("Hard breaks:");

    await page.locator("#markdown-flavor").selectOption("commonmark");
    await expect(editor).toHaveJSProperty("markdownFlavor", "commonmark");
    await page.locator("#markdown-flavor").selectOption("gfm");
    await expect(editor).toHaveJSProperty("markdownFlavor", "gfm");

    await page.locator("#mode").selectOption("source");
    await expect(editor.locator("textarea")).toBeVisible();
    await page.locator("#preview-mode").selectOption("side");
    await expect(editor.locator(".preview")).toBeVisible();

    await page.locator("#mode").selectOption("live");
    await page.getByRole("button", { name: "Log HTML" }).click();
    await expect(page.locator("#log")).toContainText("HTML");
    await expect(page.locator("#log")).toContainText("<h1");

    await page.getByRole("button", { name: "Submit form" }).click();
    await expect(page.locator("#log")).toContainText("form submit");
    await expect(page.locator("#log")).toContainText('"body"');
    expect(pageErrors).toEqual([]);
  });

  test("copies event-first diagnostics with the iOS-compatible fallback and clears them", async ({ page }) => {
    await page.goto("/demo/index.html");
    const editor = page.locator("#editor");
    const copyDebug = page.getByRole("button", { name: "Copy debug info" });
    await expect(copyDebug).toBeDisabled();
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined
      });
      document.execCommand = command => {
        if (command !== "copy") return false;
        globalThis.copiedDebugInfo = document.activeElement?.value || "";
        return true;
      };
    });
    await page.locator("#debug-level").selectOption("2");
    await page.locator("#debug-log").check();
    await editor.evaluate(element => {
      element.value = "alpha\nbeta";
      element.setSelectionRange(8, 8);
      element.focus();
    });

    await page.keyboard.press("Backspace");

    await expect(editor).toHaveJSProperty("debug", 2);
    await expect(editor).toHaveJSProperty("debugLog", true);
    await expect(page.locator("#log")).toContainText("md-debug live.beforeinput");
    await expect(page.locator("#log")).toContainText(
      /live\.delete\.(?:source-backed|browser-owned)/
    );
    await expect(copyDebug).toBeEnabled();
    await copyDebug.click();
    await expect(page.locator("#debug-copy-status")).toContainText(/^Copied \d+ debug events?\.$/);
    const copied = await page.evaluate(() =>
      JSON.parse(globalThis.copiedDebugInfo)
    );
    expect(copied).toMatchObject({
      debugLevel: 2,
      format: "writemark-debug-v1",
      url: expect.stringContaining("/demo/index.html"),
      userAgent: expect.any(String)
    });
    const phases = copied.events.map(event => event.phase);
    expect(phases).toContain("live.beforeinput");
    expect(phases.some(phase =>
      phase === "live.delete.source-backed"
      || phase === "live.delete.browser-owned"
    )).toBe(true);
    expect(JSON.stringify(copied.events)).not.toContain("alpha");
    await page.locator("#clear-log").click();
    await expect(page.locator("#log")).toBeEmpty();
    await expect(copyDebug).toBeDisabled();
    await expect(page.locator("#debug-copy-status")).toHaveText("Debug log cleared.");
  });

  test("shows document tag facts and manages the demo host catalog", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto("/demo/index.html");
    await page.getByRole("checkbox", { name: "Enable tags", exact: true }).check();
    const editor = page.locator("#editor");

    await expect(page.getByRole("button", { name: "Focus #editor, 2 occurrences" }))
      .toBeVisible();
    await expect(page.locator("#document-tag-summary")).toHaveText("(3 unique, 4 total)");

    await page.getByRole("button", { name: "Focus #editor, 2 occurrences" }).click();
    const firstEditorRange = await editor.evaluate(element =>
      element.getTags().find(tag => tag.key === "editor").ranges[0]
    );
    await expect(page.locator("#state-selection"))
      .toHaveText(`${firstEditorRange.from}–${firstEditorRange.to}`);
    await expect(page.locator("#tag-activity"))
      .toContainText("Focused the first #editor occurrence");

    await page.getByRole("textbox", { name: "Add an autocomplete choice" })
      .fill("product/demo");
    await page.getByRole("button", { name: "Add catalog tag" }).click();
    await expect(page.getByRole("button", { name: "Insert #product/demo" }))
      .toBeVisible();
    await expect(page.locator("#tag-activity"))
      .toHaveText("Added #product/demo to the host catalog.");

    await editor.evaluate(element => {
      element.setSelectionRange(element.value.length, element.value.length);
    });
    await page.getByRole("textbox", { name: "Insert a tag at the selection" })
      .fill("product/demo");
    await page.getByRole("button", { name: "Insert tag" }).click();
    expect((await editor.evaluate(element => element.value)).endsWith("#product/demo "))
      .toBe(true);
    await expect(page.getByRole("button", { name: "Focus #product/demo, 1 occurrence" }))
      .toBeVisible();

    await page.getByRole("button", { name: "Remove #product/demo from catalog" }).click();
    await expect(page.getByRole("button", { name: "Insert #product/demo" }))
      .toHaveCount(0);
    await expect(page.getByRole("button", { name: "Focus #product/demo, 1 occurrence" }))
      .toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("persists explicit catalog additions and supports tag activation", async ({ page }) => {
    await page.goto("/demo/index.html");
    await page.getByRole("checkbox", { name: "Enable tags", exact: true }).check();
    const editor = page.locator("#editor");

    await page.locator("#mode").selectOption("source");
    await editor.evaluate(element => {
      element.setSelectionRange(element.value.length, element.value.length);
      element.focus();
    });
    await page.keyboard.type("#fresh/demo");
    await expect(editor.getByRole("option", {
      name: "Add #fresh/demo to catalog save for autocomplete"
    }))
      .toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("button", { name: "Insert #fresh/demo" }))
      .toBeVisible();
    await expect(page.locator("#tag-activity"))
      .toHaveText("Added #fresh/demo to the autocomplete catalog.");
    await expect(page.getByRole("button", { name: "Focus #fresh/demo, 1 occurrence" }))
      .toBeVisible();

    await page.locator("#mode").selectOption("live");
    await editor.locator(".md-tag").filter({ hasText: "#editor" }).first().click();
    await expect(page.locator("#tag-activity"))
      .toHaveText("Activated #editor in the live surface.");

    await page.getByRole("checkbox", { name: "Offer catalog additions" }).uncheck();
    expect(await editor.evaluate(element => element.tagProvider.allowCreate)).toBe(false);
    await expect(page.locator("#tag-activity"))
      .toHaveText("Autocomplete now shows existing document and host tags only.");
  });

  test("runs host actions and reports dirty, readonly, and disabled state", async ({ page }) => {
    await page.goto("/demo/index.html");
    const editor = page.locator("#editor");
    const initialValue = await editor.evaluate(element => element.value);
    await expect(page.locator("#status-dirty")).toHaveText("clean");

    await editor.evaluate(element => {
      element.setSelectionRange(element.value.length, element.value.length);
    });
    await page.getByRole("button", { name: "Bold" }).click();
    expect((await editor.evaluate(element => element.value)).endsWith("****"))
      .toBe(true);
    await expect(page.locator("#status-dirty")).toHaveText("dirty");
    await expect(page.locator("#state-action")).toHaveText("inline.bold");

    await page.getByRole("button", { name: "Undo" }).click();
    expect(await editor.evaluate(element => element.value)).toBe(initialValue);
    await expect(page.locator("#status-dirty")).toHaveText("clean");

    await page.getByRole("button", { name: "Bold" }).click();
    await page.getByRole("button", { name: "Commit" }).click();
    await expect(page.locator("#status-dirty")).toHaveText("clean");
    await expect(page.locator("#state-action")).toHaveText("commit");

    await page.getByRole("checkbox", { name: "Readonly" }).check();
    await expect(editor).toHaveJSProperty("readonly", true);
    await expect(page.getByRole("button", { name: "Bold" })).toBeDisabled();
    await expect(page.locator("#status-mode")).toHaveText("live, readonly");

    await page.getByRole("checkbox", { name: "Readonly" }).uncheck();
    await page.getByRole("checkbox", { name: "Disabled" }).check();
    await expect(editor).toHaveJSProperty("disabled", true);
    await expect(page.locator("#status-mode")).toHaveText("live, disabled");
    await expect(page.locator("#status-validity")).toHaveText("not validated");
  });
});

test.describe("published demo sizing controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/index.html");
    await expect(page.locator("#editor")).toBeVisible();
  });

  const heightCases = [
    {
      name: "Max height input preserves partial value while typing",
      value: "52",
      expectedInput: "52",
      expectedStyle: ""
    },
    {
      name: "Max height input applies complete in-range value",
      value: "520",
      expectedInput: "520",
      expectedStyle: "520px"
    },
    {
      name: "Max height input supports 100px minimum",
      value: "100",
      expectedInput: "100",
      expectedStyle: "100px"
    }
  ];

  for (const scenario of heightCases) {
    test(scenario.name, async ({ page }) => {
      const input = page.locator("#max-height");
      await input.fill(scenario.value);
      await expect(input).toHaveValue(scenario.expectedInput);
      expect(await page.locator("#editor").evaluate(element =>
        element.style.getPropertyValue("--md-editor-max-height")
      )).toBe(scenario.expectedStyle);
    });
  }

  test("Max height input clamps only on commit", async ({ page }) => {
    const input = page.locator("#max-height");
    await input.fill("5");
    expect(await page.locator("#editor").evaluate(element =>
      element.style.getPropertyValue("--md-editor-max-height")
    )).toBe("");
    await input.blur();
    await expect(input).toHaveValue("100");
    expect(await page.locator("#editor").evaluate(element =>
      element.style.getPropertyValue("--md-editor-max-height")
    )).toBe("100px");
  });

  const fontCases = [
    {
      name: "Base font size input preserves partial value while typing",
      value: "2",
      expectedInput: "2",
      expectedStyle: "15px"
    },
    {
      name: "Base font size input applies complete in-range value",
      value: "20",
      expectedInput: "20",
      expectedStyle: "20px"
    },
    {
      name: "Base font size input supports 10px minimum",
      value: "10",
      expectedInput: "10",
      expectedStyle: "10px"
    }
  ];

  for (const scenario of fontCases) {
    test(scenario.name, async ({ page }) => {
      const input = page.locator("#font-size");
      await input.fill(scenario.value);
      await expect(input).toHaveValue(scenario.expectedInput);
      expect(await page.locator("#editor").evaluate(element =>
        element.style.getPropertyValue("--md-editor-font-size")
      )).toBe(scenario.expectedStyle);
    });
  }

  test("Base font size input clamps only on commit", async ({ page }) => {
    const input = page.locator("#font-size");
    await input.fill("2");
    expect(await page.locator("#editor").evaluate(element =>
      element.style.getPropertyValue("--md-editor-font-size")
    )).toBe("15px");
    await input.blur();
    await expect(input).toHaveValue("10");
    expect(await page.locator("#editor").evaluate(element =>
      element.style.getPropertyValue("--md-editor-font-size")
    )).toBe("10px");
  });

  test("Clearing max height restores original editor minimum height", async ({ page }) => {
    const input = page.locator("#max-height");
    await input.fill("100");
    await input.fill("");
    await input.blur();
    const styles = await page.locator("#editor").evaluate(element => ({
      maxHeight: element.style.getPropertyValue("--md-editor-max-height"),
      minHeight: element.style.getPropertyValue("--md-editor-min-height")
    }));
    expect(styles).toEqual({ maxHeight: "", minHeight: "" });
  });
});
