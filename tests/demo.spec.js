import { expect, test } from "@playwright/test";

test.describe("published demo", () => {
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
    await expect(page.locator("#log")).toContainText("live.delete.source-backed");
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
    expect(copied.events.map(event => event.phase)).toEqual(
      expect.arrayContaining([
        "live.beforeinput",
        "live.delete.source-backed"
      ])
    );
    expect(JSON.stringify(copied.events)).not.toContain("alpha");
    await page.locator("#clear-log").click();
    await expect(page.locator("#log")).toBeEmpty();
    await expect(copyDebug).toBeDisabled();
    await expect(page.locator("#debug-copy-status")).toHaveText("Debug log cleared.");
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
