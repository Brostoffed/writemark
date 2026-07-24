import { expect, test } from "./support/editor-fixture.js";

test.describe("component contract", () => {
  test("registers both entry points and exposes an accessible live editor", async ({ editor, page }) => {
    const exports = await page.evaluate(async () => {
      const main = await import("/dist/writemark-editor.js");
      const legacy = await import("/dist/md-live-editor.js");
      return {
        legacyElement: Boolean(customElements.get("md-live-editor")),
        legacyExport: typeof legacy.MdLiveEditorElement === "function",
        mainElement: Boolean(customElements.get("writemark-editor")),
        mainExport: typeof main.WritemarkEditorElement === "function"
      };
    });

    expect(exports).toEqual({
      legacyElement: true,
      legacyExport: true,
      mainElement: true,
      mainExport: true
    });
    await expect(page.getByRole("textbox", { name: "Body" })).toBeVisible();
    await expect(editor.live).toHaveAttribute("aria-multiline", "true");
    await expect(editor.live).toHaveAttribute("aria-expanded", "false");
  });

  test("renders rich Markdown from the canonical value and sanitizes unsafe output", async ({ editor }) => {
    await editor.setValue([
      "# Intro",
      "",
      "**bold** and *italic* with [safe](https://example.com)",
      "",
      "| A | B |",
      "| :--- | ---: |",
      "| one | two |",
      "",
      "- [x] shipped",
      "",
      "<script>alert(1)</script>",
      "",
      "[unsafe](javascript:alert(1))"
    ].join("\n"));

    await expect(editor.host.locator(".md-heading")).toHaveText("# Intro");
    await expect(editor.host.locator("strong")).toHaveText("bold");
    await expect(editor.host.locator("em")).toHaveText("italic");
    await expect(editor.host.locator(".md-table")).toBeVisible();
    await expect(editor.host.locator("[data-task-checkbox]")).toBeChecked();

    const rendered = await editor.host.evaluate(element => element.getHTML());
    expect(rendered).toContain('<h1 id="intro">Intro</h1>');
    expect(rendered).toContain("<strong>bold</strong>");
    expect(rendered).toContain('style="text-align:left"');
    expect(rendered).not.toContain("<script>");
    expect(rendered).not.toContain('href="javascript:');
    expect(rendered).toContain("unsafe");
  });

  test("creates stable unique heading fragments in live and preview output", async ({ editor }) => {
    await editor.reset({
      attributes: { preview: "below" },
      value: "# Résumé & Notes\n\n[Jump](#resume-notes)\n\n## Résumé & Notes"
    });

    await expect(editor.host.locator(".md-heading")).toHaveCount(2);
    await expect(editor.host.locator(".live-editor #resume-notes")).toHaveText("# Résumé & Notes");
    await expect(editor.host.locator(".live-editor #resume-notes-1")).toHaveText("## Résumé & Notes");
    await expect(editor.host.locator(".preview #resume-notes")).toHaveText("Résumé & Notes");
    await expect(editor.host.locator('.live-editor a[href="#resume-notes"]')).toBeVisible();

    await editor.host.locator('.live-editor a[href="#resume-notes"]').click();
    expect(await editor.selection()).toEqual({ start: 0, end: 0 });
  });

  test("switches live, source, split, and preview modes without changing Markdown", async ({ editor }) => {
    const markdown = "# Title\n\nBody";
    await editor.reset({ value: markdown });
    await editor.setSelection(2, 7);

    await editor.host.evaluate(element => {
      element.mode = "source";
    });
    await expect(editor.source).toBeVisible();
    await expect(editor.live).toBeHidden();
    await expect(editor.source).toHaveValue(markdown);
    expect(await editor.selection()).toEqual({ start: 2, end: 7 });

    await editor.host.evaluate(element => {
      element.mode = "split";
    });
    await expect(editor.source).toBeVisible();
    await expect(editor.preview).toBeVisible();

    await editor.host.evaluate(element => {
      element.mode = "preview";
    });
    await expect(editor.source).toBeHidden();
    await expect(editor.preview).toBeVisible();
    await expect(editor.host.locator(".preview h1")).toHaveText("Title");

    await editor.host.evaluate(element => {
      element.mode = "live";
    });
    await expect(editor.live).toBeVisible();
    expect(await editor.value()).toBe(markdown);
    expect(await editor.selection()).toEqual({ start: 2, end: 7 });
  });

  test("public actions, find and replace share one undoable source-backed model", async ({ editor, page }) => {
    await editor.reset({ value: "hello world TODO TODO" });
    await editor.setSelection(6, 11);

    const result = await editor.host.evaluate(element => ({
      bold: element.exec("inline.bold"),
      unknown: element.exec("not-an-action")
    }));
    expect(result).toEqual({ bold: true, unknown: false });
    expect(await editor.value()).toBe("hello **world** TODO TODO");

    const replacements = await editor.host.evaluate(element => ({
      match: element.find("world"),
      replaced: element.replaceAll("TODO", "Done")
    }));
    expect(replacements.match).toEqual({ start: 8, end: 13, text: "world" });
    expect(replacements.replaced).toBe(2);
    expect(await editor.value()).toBe("hello **world** Done Done");

    await editor.host.evaluate(element => element.focus());
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("hello **world** TODO TODO");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("hello **world** Done Done");

    const actionEvents = await editor.events("md-action");
    expect(actionEvents.map(event => event.actionId)).toContain("inline.bold");
  });

  test("participates in FormData, validity, disabled state, and native reset", async ({ editor, page }) => {
    await editor.reset({
      attributes: { maxlength: 20, minlength: 3, required: true },
      value: "original"
    });

    const initial = await editor.host.evaluate(element => ({
      formValue: new FormData(document.querySelector("#editor-form")).get("body"),
      valid: element.checkValidity()
    }));
    expect(initial).toEqual({ formValue: "original", valid: true });

    await editor.setValue("");
    const missing = await editor.host.evaluate(element => ({
      message: element.validationMessage,
      valid: element.checkValidity(),
      valueMissing: element.validity.valueMissing
    }));
    expect(missing.valid).toBe(false);
    expect(missing.valueMissing).toBe(true);
    expect(missing.message).not.toBe("");

    await editor.setValue("changed");
    await page.locator("#reset-form").click();
    await expect.poll(() => editor.value()).toBe("original");

    await editor.host.evaluate(element => {
      element.disabled = true;
    });
    expect(await editor.host.evaluate(() =>
      new FormData(document.querySelector("#editor-form")).has("body")
    )).toBe(false);
    await expect(editor.live).toHaveAttribute("aria-disabled", "true");
  });

  test("keeps multiple editor instances isolated", async ({ editor, page }) => {
    await editor.setValue("first");
    await page.evaluate(async () => {
      const second = document.createElement("writemark-editor");
      second.id = "second-editor";
      second.label = "Second body";
      second.value = "second";
      document.querySelector("main").append(second);
      await new Promise(requestAnimationFrame);
    });

    const second = page.locator("#second-editor");
    await expect(page.getByRole("textbox", { name: "Second body" })).toBeVisible();
    await second.evaluate(element => {
      element.setSelectionRange(element.value.length, element.value.length);
      element.insertMarkdown(" updated");
    });

    expect(await editor.value()).toBe("first");
    expect(await second.evaluate(element => element.value)).toBe("second updated");
  });
});
