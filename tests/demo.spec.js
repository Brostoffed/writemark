import { expect, test } from "@playwright/test";

test.describe("published demo", () => {
  test("places tag and Shift+Enter controls above the editor", async ({ page }) => {
    await page.goto("/demo/index.html");
    const controls = page.locator(".controls");
    const editor = page.locator("#editor");
    const tags = controls.getByRole("checkbox", { name: "Enable tags" });
    const behavior = controls.getByRole("combobox", { name: "Shift+Enter" });
    const initial = await editor.evaluate(element => ({ value: element.value, dirty: element.dirty }));

    await expect(tags).toBeVisible();
    await expect(behavior).toHaveValue("soft-break");
    await behavior.selectOption("smart-enter");
    await expect(editor).toHaveJSProperty("shiftEnterBehavior", "smart-enter");
    expect(await editor.evaluate(element => ({ value: element.value, dirty: element.dirty }))).toEqual(initial);

    await editor.evaluate(element => {
      element.value = "- first";
      element.commit();
      element.setSelectionRange(7, 7);
      element.focus();
    });
    await page.keyboard.press("Shift+Enter");
    await expect(editor).toHaveJSProperty("value", "- first\n- ");

    await behavior.selectOption("soft-break");
    await expect(editor).toHaveJSProperty("shiftEnterBehavior", "soft-break");
    await editor.evaluate(element => {
      element.value = "- first";
      element.commit();
      element.setSelectionRange(7, 7);
      element.focus();
    });
    await page.keyboard.press("Shift+Enter");
    await expect(editor).toHaveJSProperty("value", "- first  \n");
  });

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

test.describe("main demo 1.9.0 examples", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/index.html");
    await expect(page.locator("#editor")).toBeVisible();
  });

  test("links directly to the cursor demo and readable release notes", async ({ page }) => {
    const links = page.getByRole("navigation", { name: "New in 1.9.0" });
    await expect(links.getByRole("link", { name: "Try the cursor demo" })).toHaveAttribute("href", "./cursors/index.html");
    await expect(links.getByRole("link", { name: "Read the 1.9.0 release notes" })).toHaveAttribute("href", "../CHANGELOG.md#190---2026-11-19");
    await links.getByRole("link", { name: "Try textarea enhancement" }).click();
    await expect(page.getByRole("heading", { name: "Native textarea", exact: true })).toBeInViewport();
    await links.getByRole("link", { name: "Try checked external edits" }).click();
    await expect(page.getByRole("heading", { name: "External edits", exact: true })).toBeInViewport();
  });

  test("applies an external insertion at the saved keyboard selection and supports undo and redo", async ({ page }) => {
    const editor = page.locator("#editor");
    await page.locator("#mode").selectOption("source");
    await editor.locator("textarea").fill("Alpha beta");
    await editor.locator("textarea").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#state-selection")).toHaveText("5–5");
    const beforeRevision = await editor.evaluate(element => element.revision);
    await page.locator("#external-insert-text").fill(" inserted");
    await page.getByRole("button", { name: "Apply current edit", exact: true }).click();
    await expect(editor).toHaveJSProperty("value", "Alpha inserted beta");
    await expect(page.locator("#external-revision")).toHaveText(String(beforeRevision + 1));
    await expect(page.locator("#state-origin")).toHaveText("external: demo.external-edit");
    await expect(page.locator("#log")).toContainText('"beforeRevision"');
    await expect(page.locator("#log")).toContainText('"revision"');
    await expect(page.locator("#log")).toContainText('"origin"');
    await expect(page.locator("#log")).toContainText('"demo.external-edit"');
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(editor).toHaveJSProperty("value", "Alpha beta");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(editor).toHaveJSProperty("value", "Alpha inserted beta");
  });

  test("rejects a saved stale request without changing text, revision, or selection", async ({ page }) => {
    const editor = page.locator("#editor");
    await page.locator("#mode").selectOption("source");
    const source = editor.locator("textarea");
    await source.fill("Before");
    await page.locator("#external-insert-text").fill(" saved");
    await page.getByRole("button", { name: "Save request", exact: true }).click();
    await expect(page.locator("#external-saved-request")).toContainText("Saved revision");
    await source.focus();
    await page.keyboard.press("End");
    await page.keyboard.type(" changed");
    const before = await editor.evaluate(element => ({ value: element.value, revision: element.revision, start: element.selectionStart, end: element.selectionEnd }));
    await page.getByRole("button", { name: "Apply saved request", exact: true }).click();
    await expect(page.locator("#external-edit-status")).toContainText("Rejected: stale-revision.");
    expect(await editor.evaluate(element => ({ value: element.value, revision: element.revision, start: element.selectionStart, end: element.selectionEnd }))).toEqual(before);
  });

  test("enhances and restores a real native form without losing text or duplicating its field", async ({ page }) => {
    const native = page.locator("#native-demo-textarea");
    const form = page.locator("#native-demo-form");
    await expect(native).toBeVisible();
    await native.fill("Native keyboard draft");
    await page.getByRole("button", { name: "Enhance textarea", exact: true }).click();
    const enhanced = form.locator("writemark-editor");
    await expect(enhanced).toHaveJSProperty("mode", "source");
    await expect(enhanced).toHaveJSProperty("value", "Native keyboard draft");
    await enhanced.locator("textarea").focus();
    await page.keyboard.press("End");
    await page.keyboard.type(" plus edit");
    const expected = "Native keyboard draft plus edit";
    await expect(page.locator("#native-demo-count")).toHaveText("1");
    await expect(page.locator("#native-demo-value")).toHaveText(JSON.stringify([expected], null, 2));
    await page.getByRole("button", { name: "Read form value", exact: true }).click();
    expect(await form.evaluate(element => new FormData(element).getAll("nativeBody"))).toEqual([expected]);
    await page.getByRole("button", { name: "Restore textarea", exact: true }).click();
    await expect(native).toBeVisible();
    await expect(native).toHaveValue(expected);
    await expect(enhanced).toHaveCount(0);
    await page.getByRole("button", { name: "Enhance textarea", exact: true }).click();
    await expect(enhanced).toHaveCount(1);
    await expect(enhanced).toHaveJSProperty("value", expected);
    expect(await form.evaluate(element => ({ all: Array.from(new FormData(element)), count: new FormData(element).getAll("nativeBody").length }))).toEqual({ all: [["nativeBody", expected]], count: 1 });
  });

  test("keeps revision state current after silent default changes", async ({ page }) => {
    const editor = page.locator("#editor");
    await editor.evaluate(element => { element.defaultValue = "Silent default"; });
    const revision = await editor.evaluate(element => element.revision);
    await expect(editor).toHaveJSProperty("value", "Silent default");
    await expect(page.locator("#state-revision")).toHaveText(String(revision));
    await expect(page.locator("#external-revision")).toHaveText(String(revision));
    await expect(page.locator("#state-length")).toHaveText("14 characters");
  });

  test("keeps the form preview current through native resets and canceled resets", async ({ page }) => {
    const form = page.locator("#native-demo-form");
    const native = page.locator("#native-demo-textarea");
    const reset = form.getByRole("button", { name: "Reset form", exact: true });
    const preview = page.locator("#native-demo-value");
    const initial = await native.inputValue();
    await native.fill("Native draft");
    await reset.click();
    await expect(native).toHaveValue(initial);
    await expect(preview).toHaveText(JSON.stringify([initial], null, 2));

    await native.fill("Keep native text");
    await form.evaluate(element => element.addEventListener("reset", event => event.preventDefault(), { once: true }));
    await reset.click();
    await expect(native).toHaveValue("Keep native text");
    await expect(preview).toHaveText(JSON.stringify(["Keep native text"], null, 2));

    await page.getByRole("button", { name: "Enhance textarea", exact: true }).click();
    const enhanced = form.locator("writemark-editor");
    await enhanced.locator("textarea").fill("Enhanced draft");
    await reset.click();
    await expect(enhanced).toHaveJSProperty("value", initial);
    await expect(preview).toHaveText(JSON.stringify([initial], null, 2));

    await enhanced.locator("textarea").fill("Keep enhanced text");
    await form.evaluate(element => element.addEventListener("reset", event => event.preventDefault(), { once: true }));
    await reset.click();
    await expect(enhanced).toHaveJSProperty("value", "Keep enhanced text");
    await expect(preview).toHaveText(JSON.stringify(["Keep enhanced text"], null, 2));
    expect(await form.evaluate(element => new FormData(element).getAll("nativeBody"))).toEqual(["Keep enhanced text"]);
  });

  test("keeps the new examples within a 390px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Enhance textarea", exact: true }).click();
    const result = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      panels: Array.from(document.querySelectorAll('.version-examples > section, nav[aria-label="New in 1.9.0"]')).map(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }))
    }));
    expect(result.page).toBeLessThanOrEqual(result.viewport + 1);
    for (const panel of result.panels) {
      expect(panel.left).toBeGreaterThanOrEqual(0);
      expect(panel.right).toBeLessThanOrEqual(390);
    }
  });

  test("runs the main page examples directly from disk without a network", async ({ page, context, browserName }) => {
    const networkRequests = [];
    await page.route(/^https?:/, route => {
      networkRequests.push(route.request().url());
      return route.abort();
    });
    // WebKit offline emulation blocks local file navigation.
    if (browserName !== "webkit") await context.setOffline(true);
    await page.goto(new URL("../demo/index.html", import.meta.url).href);
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();
    const before = await editor.evaluate(element => element.value);
    await page.locator("#external-insert-text").fill("Offline edit. ");
    await page.getByRole("button", { name: "Apply current edit", exact: true }).click();
    await expect(editor).toHaveJSProperty("value", "Offline edit. " + before);
    await page.locator("#native-demo-textarea").fill("Offline form text");
    await page.getByRole("button", { name: "Enhance textarea", exact: true }).click();
    await expect(page.locator("#native-demo-form writemark-editor")).toHaveJSProperty("value", "Offline form text");
    await expect(page.locator("#native-demo-value")).toHaveText(JSON.stringify(["Offline form text"], null, 2));
    await page.getByRole("button", { name: "Restore textarea", exact: true }).click();
    await expect(page.locator("#native-demo-textarea")).toHaveValue("Offline form text");
    expect(networkRequests).toEqual([]);
  });
});
