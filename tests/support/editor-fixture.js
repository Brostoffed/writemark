import { expect, test as base } from "@playwright/test";

const configurableAttributes = [
  "aria-label",
  "aria-labelledby",
  "disabled",
  "label",
  "maxlength",
  "minlength",
  "mode",
  "name",
  "placeholder",
  "preview",
  "readonly",
  "required",
  "tab-behavior",
  "value"
];

class EditorDriver {
  constructor(page) {
    this.page = page;
    this.host = page.locator("#editor");
    this.live = this.host.locator(".live-editor");
    this.source = this.host.locator("textarea");
    this.preview = this.host.locator(".preview");
    this.completion = this.host.locator(".completion-popup");
  }

  async reset({ value = "", attributes = {} } = {}) {
    await this.host.evaluate((editor, options) => {
      for (const name of options.configurableAttributes) {
        editor.removeAttribute(name);
      }

      const defaults = {
        label: "Body",
        mode: "live",
        name: "body",
        placeholder: "Write Markdown",
        preview: "none"
      };
      for (const [name, nextValue] of Object.entries({
        ...defaults,
        ...options.attributes
      })) {
        if (nextValue === false || nextValue == null) continue;
        editor.setAttribute(name, nextValue === true ? "" : String(nextValue));
      }

      editor.value = options.value;
      editor.setSelectionRange(0, 0);
      editor.commit();
      window.testEvents.length = 0;
      document.querySelector("#submitted-value").value = "";
    }, { configurableAttributes, attributes, value });
    await this.settle();
  }

  async settle() {
    await this.page.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
  }

  async setValue(value) {
    await this.host.evaluate((editor, markdown) => {
      editor.value = markdown;
    }, value);
    await this.settle();
  }

  async value() {
    return this.host.evaluate(editor => editor.value);
  }

  async setSelection(start, end = start, direction = "none") {
    await this.host.evaluate((editor, selection) => {
      editor.setSelectionRange(
        selection.start,
        selection.end,
        selection.direction
      );
      editor.focus();
    }, { direction, end, start });
  }

  async selection() {
    return this.host.evaluate(editor => ({
      end: editor.selectionEnd,
      start: editor.selectionStart
    }));
  }

  async events(type = null) {
    return this.page.evaluate(eventType => window.testEvents
      .filter(event => !eventType || event.type === eventType), type);
  }
}

export const test = base.extend({
  editor: async ({ page }, use) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", error => {
      pageErrors.push(error.stack || error.message);
    });
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/tests/fixtures/editor.html");
    await expect(page.locator("body")).toHaveAttribute("data-ready", "true");

    const editor = new EditorDriver(page);
    await use(editor);

    expect.soft(
      pageErrors,
      `Uncaught page errors:\n${pageErrors.join("\n\n")}`
    ).toEqual([]);
    expect.soft(
      consoleErrors,
      `Browser console errors:\n${consoleErrors.join("\n")}`
    ).toEqual([]);
  }
});

export { expect };
