import { test, expect } from "@playwright/test";

const fixture = "/tests/fixtures/textarea-enhancement.html";

test.beforeEach(async ({ page }) => {
  await page.goto(fixture);
  await expect(page.locator("writemark-editor")).toHaveCount(2);
});

test("enhances opt-in textareas and submits one native value", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea, enhanceTextareas } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const first = enhanceTextarea(textarea);
    const second = enhanceTextarea(textarea);
    first.editor.value = "**Changed**";
    const data = new FormData(document.querySelector("form"));
    return {
      same: first === second,
      count: enhanceTextareas().length,
      values: data.getAll("body"),
      external: data.getAll("external"),
      native: document.querySelector("#plain").hidden,
      value: textarea.value
    };
  });
  expect(result).toEqual({ same: true, count: 2, values: ["**Changed**"], external: ["External"], native: false, value: "**Changed**" });
});

test("synchronizes native writes and preserves reset cancellation", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    textarea.value = "native write";
    const written = editor.value;
    const form = textarea.form;
    form.addEventListener("reset", event => event.preventDefault(), { once: true });
    form.reset();
    await Promise.resolve();
    const canceled = editor.value;
    form.reset();
    await Promise.resolve();
    return { written, canceled, reset: editor.value, native: textarea.value, defaultValue: textarea.defaultValue };
  });
  expect(result).toEqual({ written: "native write", canceled: "native write", reset: "# Hello", native: "# Hello", defaultValue: "# Hello" });
});

test("destroys, restores, and enhances the same textarea", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const handle = enhanceTextarea(textarea);
    handle.editor.value = "retained";
    handle.destroy();
    handle.destroy();
    const restored = !textarea.hidden && !Object.hasOwn(textarea, "value");
    const next = enhanceTextarea(textarea);
    return { restored, fresh: next !== handle, value: next.editor.value, values: new FormData(textarea.form).getAll("body") };
  });
  expect(result).toEqual({ restored: true, fresh: true, value: "retained", values: ["retained"] });
});

test("keeps hostile source as text across repeated API changes", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    const sources = ["</textarea><script>window.compromised=true</script>", "\u0000\r\n<svg onload=alert(1)>", "😀e\u0301", "", "x".repeat(20000)];
    let exact = true;
    for (let index = 0; index < 80; index++) {
      const source = sources[index % sources.length] + index;
      editor.setMarkdown(source);
      exact &&= textarea.value === editor.value && new FormData(textarea.form).getAll("body").length === 1;
    }
    return { exact, compromised: Boolean(window.compromised), scripts: document.querySelectorAll("script").length };
  });
  expect(result).toEqual({ exact: true, compromised: false, scripts: 1 });
});

test("copies constraints and runtime state", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    textarea.required = true;
    textarea.readOnly = true;
    textarea.dir = "rtl";
    textarea.spellcheck = false;
    textarea.setCustomValidity("Host error");
    await new Promise(resolve => setTimeout(resolve, 0));
    return { required: editor.required, readonly: editor.readonly, dir: editor.dir, spellcheck: editor.spellcheck, message: editor.validationMessage };
  });
  expect(result).toEqual({ required: true, readonly: true, dir: "rtl", spellcheck: false, message: "Host error" });
});

test("routes label focus and tracks a disabled fieldset", async ({ page }) => {
  await page.getByText("Body", { exact: true }).first().click();
  expect(await page.locator("#body + writemark-editor").evaluate(editor => editor.matches(":focus-within"))).toBe(true);
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const fieldset = document.createElement("fieldset");
    const textarea = document.createElement("textarea");
    textarea.name = "nested";
    textarea.value = "Kept";
    fieldset.append(textarea);
    document.querySelector("form").append(fieldset);
    const { editor } = enhanceTextarea(textarea);
    fieldset.disabled = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    const disabled = editor.disabled;
    const omitted = !new FormData(textarea.form).has("nested");
    fieldset.disabled = false;
    await new Promise(resolve => setTimeout(resolve, 0));
    return { disabled, omitted, enabled: !editor.disabled };
  });
  expect(result).toEqual({ disabled: true, omitted: true, enabled: true });
});

test("keeps a usable fallback when initialization fails", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextareas } = await import("/dist/writemark-editor.js");
    const textarea = document.createElement("textarea");
    textarea.name = "fallback";
    textarea.dataset.writemark = "";
    Object.defineProperty(textarea, "value", { configurable: true, value: "Fallback", writable: true });
    document.querySelector("form").append(textarea);
    const handles = enhanceTextareas(textarea);
    return { count: handles.length, hidden: textarea.hidden, next: textarea.nextElementSibling?.localName || null, value: textarea.value };
  });
  expect(result).toEqual({ count: 0, hidden: false, next: null, value: "Fallback" });
});

test("restores the textarea when the editor leaves its parent", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const handle = enhanceTextarea(textarea);
    handle.editor.value = "Saved";
    handle.editor.remove();
    await new Promise(resolve => setTimeout(resolve, 0));
    return { visible: !textarea.hidden, value: textarea.value, restored: !Object.hasOwn(textarea, "value") };
  });
  expect(result).toEqual({ visible: true, value: "Saved", restored: true });
});

test("keeps editor defaults after commit and sibling mutations", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    editor.value = "Committed";
    editor.commit();
    const committed = textarea.defaultValue;
    textarea.parentNode.append(document.createElement("span"));
    await new Promise(resolve => setTimeout(resolve, 0));
    const afterMutation = editor.defaultValue;
    editor.defaultValue = "New default";
    const changedDefault = textarea.defaultValue;
    textarea.form.reset();
    await new Promise(resolve => setTimeout(resolve, 0));
    return { committed, afterMutation, changedDefault, reset: editor.value };
  });
  expect(result).toEqual({ committed: "Committed", afterMutation: "Committed", changedDefault: "New default", reset: "New default" });
});

test("preserves selection direction and restores focus", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const handle = enhanceTextarea(textarea);
    handle.editor.focus();
    handle.editor.setSelectionRange(1, 4, "backward");
    const direction = textarea.selectionDirection;
    handle.destroy();
    return { direction, focused: document.activeElement === textarea, start: textarea.selectionStart, end: textarea.selectionEnd };
  });
  expect(result).toEqual({ direction: "backward", focused: true, start: 1, end: 4 });
});

test("tracks native names and external form reassociation", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    const form = document.createElement("form");
    form.id = "other";
    document.body.append(form);
    textarea.name = "renamed";
    textarea.setAttribute("form", "other");
    await new Promise(resolve => setTimeout(resolve, 0));
    return { original: new FormData(document.querySelector("#post")).has("body"), values: new FormData(form).getAll("renamed"), editorForm: editor.getAttribute("form"), editorName: editor.name };
  });
  expect(result).toEqual({ original: false, values: ["# Hello"], editorForm: "other", editorName: "" });
});

test("preserves native whitespace validity and routes invalid focus", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    textarea.required = true;
    textarea.value = "   ";
    await new Promise(resolve => setTimeout(resolve, 0));
    const whitespaceValid = textarea.form.checkValidity();
    textarea.value = "";
    const invalid = !textarea.reportValidity();
    return { whitespaceValid, invalid, focused: editor.matches(":focus-within") };
  });
  expect(result).toEqual({ whitespaceValid: true, invalid: true, focused: true });
});

test("keeps a native draft that differs from its default", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.createElement("textarea");
    textarea.defaultValue = "Default";
    textarea.value = "Draft";
    textarea.setSelectionRange(1, 3, "backward");
    document.querySelector("form").append(textarea);
    const { editor } = enhanceTextarea(textarea);
    return { value: editor.value, native: textarea.value, defaultValue: editor.defaultValue, direction: textarea.selectionDirection, start: editor.selectionStart, end: editor.selectionEnd };
  });
  expect(result).toEqual({ value: "Draft", native: "Draft", defaultValue: "Default", direction: "backward", start: 1, end: 3 });
});

test("keeps an autosaved draft before the classic script starts", async ({ page }) => {
  await page.route("**/dist/writemark-editor.global.js", async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: 'document.querySelector("#body").value = "Autosaved draft";\n' + await response.text() });
  });
  await page.goto(fixture);
  await expect(page.locator("writemark-editor")).toHaveCount(2);
  expect(await page.locator("#body + writemark-editor").evaluate(editor => ({ value: editor.value, defaultValue: editor.defaultValue }))).toEqual({ value: "Autosaved draft", defaultValue: "# Hello" });
});

test("keeps newer text from reentrant native synchronization", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    editor.addEventListener("md-input", () => { editor.value = "Newer"; }, { once: true });
    textarea.value = "Outer";
    const immediate = [textarea.value, editor.value];
    textarea.parentElement.append(document.createElement("span"));
    await new Promise(resolve => setTimeout(resolve, 0));
    editor.addEventListener("md-value-sync", () => { editor.value = "Newest"; }, { once: true });
    textarea.defaultValue = "New default";
    return { immediate, later: textarea.value, editor: editor.value, defaultValue: textarea.defaultValue };
  });
  expect(result).toEqual({ immediate: ["Newer", "Newer"], later: "Newest", editor: "Newest", defaultValue: "New default" });
});

test("applies a native default before a same-task reset", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    textarea.value = "Draft";
    textarea.defaultValue = "New default";
    textarea.form.reset();
    await Promise.resolve();
    const reset = [textarea.value, editor.value, textarea.defaultValue];
    textarea.value = "Edited";
    textarea.form.addEventListener("reset", event => event.preventDefault(), { once: true });
    textarea.defaultValue = "Canceled default";
    textarea.form.reset();
    await Promise.resolve();
    return { reset, canceled: [textarea.value, editor.value, textarea.defaultValue, editor.defaultValue] };
  });
  expect(result).toEqual({ reset: ["New default", "New default", "New default"], canceled: ["Edited", "Edited", "Canceled default", "Canceled default"] });
});

test("hides the native control against author CSS and restores its style", async ({ page }) => {
  await page.addStyleTag({ content: "textarea { display: block !important; }" });
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.createElement("textarea");
    textarea.style.setProperty("display", "inline-block", "important");
    textarea.style.color = "red";
    document.body.append(textarea);
    const handle = enhanceTextarea(textarea);
    const hidden = getComputedStyle(textarea).display === "none";
    handle.destroy();
    return { hidden, display: textarea.style.display, priority: textarea.style.getPropertyPriority("display"), color: textarea.style.color, native: !textarea.hidden };
  });
  expect(result).toEqual({ hidden: true, display: "inline-block", priority: "important", color: "red", native: true });
});

test("supports labels and reset inside a closed shadow root", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "closed" });
    const form = document.createElement("form");
    const label = document.createElement("label");
    label.htmlFor = "shadow-body";
    label.textContent = "Shadow body";
    const textarea = document.createElement("textarea");
    textarea.id = "shadow-body";
    textarea.defaultValue = "Default";
    form.append(label, textarea);
    shadow.append(form);
    const { editor } = enhanceTextarea(textarea);
    label.click();
    const focused = editor.matches(":focus-within");
    textarea.value = "Draft";
    form.reset();
    await Promise.resolve();
    return { focused, value: editor.value, native: textarea.value, label: editor.label, accessibleLabel: editor.getAttribute("aria-label") };
  });
  expect(result).toEqual({ focused: true, value: "Default", native: "Default", label: "", accessibleLabel: "Shadow body" });
});

test("submits real keyboard edits through the native form control", async ({ page }) => {
  await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    enhanceTextarea(document.querySelector("#body")).editor.mode = "source";
    document.querySelector("form").addEventListener("submit", event => {
      event.preventDefault();
      window.submittedBody = new FormData(event.target).getAll("body");
    });
  });
  const input = page.locator("#body + writemark-editor").locator("textarea");
  await input.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Typed Markdown **body**");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(await page.evaluate(() => window.submittedBody)).toEqual(["Typed Markdown **body**"]);
});

test("keeps an accessible native control when the script fails", async ({ page }) => {
  await page.route("**/dist/writemark-editor.global.js", route => route.abort());
  await page.goto(fixture);
  const textarea = page.getByRole("textbox", { name: "Body", exact: true });
  await expect(textarea).toBeVisible();
  await textarea.fill("Native fallback");
  expect(await textarea.evaluate(element => new FormData(element.form).getAll("body"))).toEqual(["Native fallback"]);
  await expect(page.locator("writemark-editor")).toHaveCount(0);
});

test("keeps one visible label and starts without editor focus", async ({ page }) => {
  const result = await page.evaluate(() => {
    const editor = document.querySelector("#body + writemark-editor");
    return {
      active: document.activeElement.localName,
      label: editor.label,
      accessibleLabel: editor.getAttribute("aria-label"),
      visibleEditorLabels: Array.from(editor.shadowRoot.querySelectorAll("label")).filter(label => !label.hidden).map(label => label.textContent)
    };
  });
  expect(result).toEqual({ active: "body", label: "", accessibleLabel: "Body", visibleEditorLabels: [] });
  await expect(page.locator('label[for="body"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Body", exact: true })).toBeVisible();
});

test("keeps another control focused during native and observer synchronization", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    const other = document.querySelector("#plain");
    document.body.style.minHeight = "3000px";
    other.focus({ preventScroll: true });
    window.scrollTo(0, 300);
    const beforeScroll = window.scrollY;
    textarea.parentElement.append(document.createElement("span"));
    await new Promise(resolve => setTimeout(resolve, 0));
    const afterMutation = document.activeElement === other;
    textarea.value = "Native draft";
    textarea.setSelectionRange(1, 4, "backward");
    await new Promise(resolve => setTimeout(resolve, 0));
    return { afterMutation, afterValue: document.activeElement === other, beforeScroll, afterScroll: window.scrollY, value: editor.value, start: editor.selectionStart, end: editor.selectionEnd, direction: textarea.selectionDirection };
  });
  expect(result).toEqual({ afterMutation: true, afterValue: true, beforeScroll: 300, afterScroll: 300, value: "Native draft", start: 1, end: 4, direction: "backward" });
});

test("restores remembered native selection without changing focus", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.createElement("textarea");
    textarea.value = "Remembered selection";
    document.querySelector("form").append(textarea);
    textarea.setSelectionRange(2, 8, "backward");
    const other = document.querySelector("#plain");
    other.focus();
    const { editor } = enhanceTextarea(textarea);
    return { focused: document.activeElement === other, start: editor.selectionStart, end: editor.selectionEnd, direction: textarea.selectionDirection };
  });
  expect(result).toEqual({ focused: true, start: 2, end: 8, direction: "backward" });
});

test("keeps explicit native accessible labels", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    textarea.setAttribute("aria-label", "Explicit body");
    const { editor } = enhanceTextarea(textarea);
    await new Promise(resolve => setTimeout(resolve, 0));
    return { label: editor.label, accessibleLabel: editor.getAttribute("aria-label") };
  });
  expect(result).toEqual({ label: "", accessibleLabel: "Explicit body" });
});

for (const mode of ["source", "live"]) {
  test(`${mode} forwards one native event per edit and one change on focus exit`, async ({ page }) => {
    await page.evaluate(async mode => {
      const { enhanceTextarea } = await import("/dist/writemark-editor.js");
      const { editor } = enhanceTextarea(document.querySelector("#body"));
      editor.mode = mode;
      editor.value = "";
      window.nativeEvents = [];
      const form = document.querySelector("form");
      for (const type of ["input", "change"]) form.addEventListener(type, event => {
        window.nativeEvents.push({ type, target: event.target.id, value: event.target.value });
      });
    }, mode);
    const editor = page.locator("#body + writemark-editor");
    const input = mode === "source" ? editor.locator("textarea") : editor.locator(".live-editor");
    await input.focus();
    await page.keyboard.type("abc");
    expect(await page.evaluate(() => window.nativeEvents)).toEqual([
      { type: "input", target: "body", value: "a" },
      { type: "input", target: "body", value: "ab" },
      { type: "input", target: "body", value: "abc" }
    ]);
    await editor.evaluate(element => element.commit());
    expect(await page.evaluate(() => window.nativeEvents.filter(event => event.type === "change"))).toEqual([]);
    await page.locator("#plain").focus();
    await expect.poll(() => page.evaluate(() => window.nativeEvents.filter(event => event.type === "change"))).toEqual([
      { type: "change", target: "body", value: "abc" }
    ]);
    await input.focus();
    await page.locator("#plain").focus();
    expect(await page.evaluate(() => window.nativeEvents.filter(event => event.type === "change").length)).toBe(1);
  });
}

test("keeps the native fallback with an older registered constructor", async ({ page }) => {
  await page.route("**/dist/writemark-editor.global.js", async route => {
    const response = await route.fetch();
    const oldConstructor = 'customElements.define("writemark-editor", class extends HTMLElement {});\n';
    await route.fulfill({ response, body: oldConstructor + await response.text() });
  });
  await page.goto(fixture);
  const textarea = page.getByRole("textbox", { name: "Body", exact: true });
  await expect(textarea).toBeVisible();
  expect(await textarea.evaluate(element => ({ value: element.value, wrapped: Object.hasOwn(element, "value"), hidden: element.hidden }))).toEqual({ value: "# Hello", wrapped: false, hidden: false });
  await expect(page.locator("writemark-editor")).toHaveCount(0);
});

test("synchronizes native selection synchronously before queued select events", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const handle = enhanceTextarea(textarea);
    document.querySelector("#plain").focus();
    textarea.value = "Native draft";
    textarea.setSelectionRange(1, 4, "backward");
    const immediate = [handle.editor.selectionStart, handle.editor.selectionEnd, textarea.selectionDirection];
    await new Promise(resolve => setTimeout(resolve, 0));
    const later = [handle.editor.selectionStart, handle.editor.selectionEnd, textarea.selectionDirection];
    handle.destroy();
    return { immediate, later, restored: !Object.hasOwn(textarea, "setSelectionRange") };
  });
  expect(result).toEqual({ immediate: [1, 4, "backward"], later: [1, 4, "backward"], restored: true });
});

test("automatically enhances inserted and late opted-in textareas once", async ({ page }) => {
  await page.evaluate(() => {
    const wrapper = document.createElement("div");
    wrapper.id = "dynamic-wrapper";
    const opted = document.createElement("textarea");
    opted.id = "dynamic-body";
    opted.name = "dynamic";
    opted.dataset.writemark = "";
    opted.value = "Dynamic draft";
    const late = document.createElement("textarea");
    late.id = "late-body";
    wrapper.append(opted, late);
    document.querySelector("form").append(wrapper);
  });
  await expect(page.locator("#dynamic-wrapper writemark-editor")).toHaveCount(1);
  await page.locator("#late-body").evaluate(textarea => { textarea.dataset.writemark = ""; });
  await expect(page.locator("#dynamic-wrapper writemark-editor")).toHaveCount(2);
  const result = await page.evaluate(async () => {
    const { enhanceTextarea, enhanceTextareas } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#dynamic-body");
    const first = enhanceTextarea(textarea);
    const script = document.createElement("script");
    script.src = "/dist/writemark-editor.global.js";
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
    enhanceTextareas(document.querySelector("#dynamic-wrapper"));
    const again = enhanceTextarea(textarea);
    return { same: first === again, value: again.editor.value, values: new FormData(textarea.form).getAll("dynamic") };
  });
  expect(result).toEqual({ same: true, value: "Dynamic draft", values: ["Dynamic draft"] });
  await expect(page.locator("#dynamic-wrapper writemark-editor")).toHaveCount(2);
});

for (const mode of ["select", "start", "end", "preserve"]) {
  test(`setRangeText preserves native ${mode} selection semantics`, async ({ page }) => {
    const result = await page.evaluate(async mode => {
      const { enhanceTextarea } = await import("/dist/writemark-editor.js");
      const textarea = document.querySelector("#body");
      const { editor } = enhanceTextarea(textarea);
      const native = document.createElement("textarea");
      native.value = textarea.value = "abcdef";
      native.setSelectionRange(1, 5, "backward");
      textarea.setSelectionRange(1, 5, "backward");
      native.setRangeText("Z", 2, 4, mode);
      textarea.setRangeText("Z", 2, 4, mode);
      return { editor: { value: editor.value, start: editor.selectionStart, end: editor.selectionEnd }, actual: { value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection }, native: { value: native.value, start: native.selectionStart, end: native.selectionEnd, direction: native.selectionDirection } };
    }, mode);
    expect(result.actual).toEqual(result.native);
    expect(result.editor).toEqual({ value: result.native.value, start: result.native.start, end: result.native.end });
  });
}

test("setRangeText restores its descriptor and keeps native exceptions", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.createElement("textarea");
    textarea.value = "abcdef";
    const original = textarea.setRangeText;
    Object.defineProperty(textarea, "setRangeText", { configurable: true, enumerable: true, writable: true, value: original });
    document.body.append(textarea);
    const before = Object.getOwnPropertyDescriptor(textarea, "setRangeText");
    const handle = enhanceTextarea(textarea);
    textarea.setSelectionRange(1, 4);
    textarea.setRangeText("NEW");
    const value = handle.editor.value;
    let invalid;
    try { textarea.setRangeText("x", 4, 1); } catch (error) { invalid = error.name; }
    handle.destroy();
    const after = Object.getOwnPropertyDescriptor(textarea, "setRangeText");
    return { value, invalid, restored: before.value === after.value && before.enumerable === after.enumerable && before.writable === after.writable && before.configurable === after.configurable };
  });
  expect(result).toEqual({ value: "aNEWef", invalid: "IndexSizeError", restored: true });
});

test("cleans detached ancestors and enhances reinserted opt-in controls", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const wrapper = document.createElement("section");
    const textarea = document.createElement("textarea");
    textarea.dataset.writemark = "";
    textarea.value = "Before";
    wrapper.append(textarea);
    document.body.append(wrapper);
    const first = enhanceTextarea(textarea);
    first.editor.value = "Retained";
    wrapper.remove();
    await new Promise(resolve => setTimeout(resolve, 0));
    const detached = { native: !textarea.hidden, wrapped: Object.hasOwn(textarea, "value"), count: wrapper.querySelectorAll("writemark-editor").length };
    document.body.append(wrapper);
    await new Promise(resolve => setTimeout(resolve, 0));
    const second = enhanceTextarea(textarea);
    return { detached, newHandle: second !== first, value: second.editor.value, count: wrapper.querySelectorAll("writemark-editor").length };
  });
  expect(result).toEqual({ detached: { native: true, wrapped: false, count: 0 }, newHandle: true, value: "Retained", count: 1 });
});

test("manual enhancement releases document and external form listeners after ancestor removal", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const docAdd = document.addEventListener;
    const docRemove = document.removeEventListener;
    const clicks = new Set();
    document.addEventListener = function(type, listener, options) { if (type === "click") clicks.add(listener); return docAdd.call(this, type, listener, options); };
    document.removeEventListener = function(type, listener, options) { if (type === "click") clicks.delete(listener); return docRemove.call(this, type, listener, options); };
    const wrapper = document.createElement("section");
    const textarea = document.createElement("textarea");
    textarea.setAttribute("form", "post");
    textarea.setCustomValidity("Kept error");
    wrapper.append(textarea);
    document.body.append(wrapper);
    const handle = enhanceTextarea(textarea);
    const attachedClicks = clicks.size;
    wrapper.remove();
    await new Promise(resolve => setTimeout(resolve, 0));
    document.addEventListener = docAdd;
    document.removeEventListener = docRemove;
    const detached = { listeners: clicks.size, native: !textarea.hidden, wrapped: Object.hasOwn(textarea, "setRangeText"), validity: textarea.validationMessage };
    document.body.append(wrapper);
    await new Promise(resolve => setTimeout(resolve, 0));
    const stayedNative = !textarea.hidden;
    const next = enhanceTextarea(textarea);
    return { attachedClicks, detached, stayedNative, newHandle: next !== handle };
  });
  expect(result).toEqual({ attachedClicks: 1, detached: { listeners: 0, native: true, wrapped: false, validity: "Kept error" }, stayedNative: true, newHandle: true });
});

test("discovers open shadow roots and supports registered late shadow opt-in", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextareas } = await import("/dist/writemark-editor.js");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const textarea = document.createElement("textarea");
    textarea.dataset.writemark = "";
    shadow.append(textarea);
    document.body.append(host);
    await new Promise(resolve => setTimeout(resolve, 0));
    const discovered = shadow.querySelectorAll("writemark-editor").length;
    host.remove();
    await new Promise(resolve => setTimeout(resolve, 0));
    const detached = !textarea.hidden && !Object.hasOwn(textarea, "value");
    document.body.append(host);
    await new Promise(resolve => setTimeout(resolve, 0));
    const reinserted = shadow.querySelectorAll("writemark-editor").length;
    const lateHost = document.createElement("div");
    document.body.append(lateHost);
    await new Promise(resolve => setTimeout(resolve, 0));
    const closed = lateHost.attachShadow({ mode: "closed" });
    enhanceTextareas(closed);
    const late = document.createElement("textarea");
    closed.append(late);
    late.dataset.writemark = "";
    await new Promise(resolve => setTimeout(resolve, 0));
    return { discovered, detached, reinserted, late: closed.querySelectorAll("writemark-editor").length };
  });
  expect(result).toEqual({ discovered: 1, detached: true, reinserted: 1, late: 1 });
});

for (const mode of ["open", "closed"]) {
  test(`preserves a handle when its wrapper moves into a connected ${mode} shadow root`, async ({ page }) => {
    const result = await page.evaluate(async mode => {
      const { enhanceTextarea } = await import("/dist/writemark-editor.js");
      const wrapper = document.createElement("section");
      const label = document.createElement("label");
      label.htmlFor = "moving-control";
      label.textContent = "Moving body";
      const textarea = document.createElement("textarea");
      textarea.id = "moving-control";
      textarea.value = "Retained draft";
      textarea.setCustomValidity("Retained error");
      wrapper.append(label, textarea);
      document.body.append(wrapper);
      const handle = enhanceTextarea(textarea);
      const other = document.querySelector("#plain");
      other.focus({ preventScroll: true });
      const host = document.createElement("div");
      document.body.append(host);
      const root = host.attachShadow({ mode });
      root.append(wrapper);
      await new Promise(resolve => setTimeout(resolve, 0));
      const keptFocus = document.activeElement === other;
      const sameHandle = enhanceTextarea(textarea) === handle;
      label.click();
      const labelFocused = handle.editor.matches(":focus-within");
      other.focus({ preventScroll: true });
      const parent = document.createElement("div");
      root.append(parent);
      parent.append(textarea, handle.editor);
      await new Promise(resolve => setTimeout(resolve, 0));
      const sameAfterParentMove = enhanceTextarea(textarea) === handle;
      const noFocusJump = document.activeElement === other;
      handle.editor.remove();
      await new Promise(resolve => setTimeout(resolve, 0));
      const fallback = { visible: !textarea.hidden, wrapped: Object.hasOwn(textarea, "value"), value: textarea.value, error: textarea.validationMessage };
      const next = enhanceTextarea(textarea);
      return { keptFocus, sameHandle, labelFocused, sameAfterParentMove, noFocusJump, fallback, newHandle: next !== handle, count: parent.querySelectorAll("writemark-editor").length };
    }, mode);
    expect(result).toEqual({ keptFocus: true, sameHandle: true, labelFocused: true, sameAfterParentMove: true, noFocusJump: true, fallback: { visible: true, wrapped: false, value: "Retained draft", error: "Retained error" }, newHandle: true, count: 1 });
  });
}

test("rebinds disabled fieldset observation after a connected parent move", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const first = document.createElement("fieldset");
    const second = document.createElement("fieldset");
    const wrapper = document.createElement("section");
    const textarea = document.createElement("textarea");
    wrapper.append(textarea);
    first.append(wrapper);
    document.body.append(first, second);
    const handle = enhanceTextarea(textarea);
    second.append(wrapper);
    await new Promise(resolve => setTimeout(resolve, 0));
    first.disabled = true;
    second.disabled = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    const disabled = handle.editor.disabled;
    second.disabled = false;
    await new Promise(resolve => setTimeout(resolve, 0));
    return { disabled, enabled: !handle.editor.disabled, sameHandle: enhanceTextarea(textarea) === handle };
  });
  expect(result).toEqual({ disabled: true, enabled: true, sameHandle: true });
});

test("refreshes form and label binding when a wrapper changes ancestors", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const first = document.createElement("form");
    const second = document.createElement("form");
    const firstLabel = document.createElement("label");
    const secondLabel = document.createElement("label");
    firstLabel.append("First label");
    secondLabel.append("Second label");
    first.append(firstLabel);
    second.append(secondLabel);
    const wrapper = document.createElement("section");
    const textarea = document.createElement("textarea");
    wrapper.append(textarea);
    firstLabel.append(wrapper);
    document.body.append(first, second);
    const firstAdd = first.addEventListener;
    const firstRemove = first.removeEventListener;
    const resets = new Set();
    first.addEventListener = function(type, listener, options) { if (type === "reset") resets.add(listener); return firstAdd.call(this, type, listener, options); };
    first.removeEventListener = function(type, listener, options) { if (type === "reset") resets.delete(listener); return firstRemove.call(this, type, listener, options); };
    const handle = enhanceTextarea(textarea);
    const initialListeners = resets.size;
    secondLabel.append(wrapper);
    await new Promise(resolve => setTimeout(resolve, 0));
    const moved = { same: enhanceTextarea(textarea) === handle, label: handle.editor.getAttribute("aria-label"), form: textarea.form === second, oldListeners: resets.size };
    first.addEventListener = firstAdd;
    first.removeEventListener = firstRemove;
    return { initialListeners, moved };
  });
  expect(result).toEqual({ initialListeners: 1, moved: { same: true, label: "Second label", form: true, oldListeners: 0 } });
});

test("programmatic length validation follows a native textarea oracle", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const textarea = document.querySelector("#body");
    const { editor } = enhanceTextarea(textarea);
    textarea.minLength = 5;
    textarea.maxLength = 8;
    const oracleForm = document.createElement("form");
    const oracle = document.createElement("textarea");
    oracle.minLength = 5;
    oracle.maxLength = 8;
    oracleForm.append(oracle);
    document.body.append(oracleForm);
    await new Promise(resolve => setTimeout(resolve, 0));
    const cases = [];
    const check = label => cases.push({ label, native: { valid: oracleForm.checkValidity(), short: oracle.validity.tooShort, long: oracle.validity.tooLong }, enhanced: { valid: textarea.form.checkValidity(), short: editor.validity.tooShort, long: editor.validity.tooLong } });
    for (const value of ["x", "123456789012"]) {
      oracle.value = textarea.value = value;
      check("native value");
      oracle.value = value;
      editor.value = value;
      check("editor value");
      oracle.setRangeText("z", 0, 1, "preserve");
      textarea.setRangeText("z", 0, 1, "preserve");
      check("native range");
    }
    return cases;
  });
  for (const item of result) expect(item.enhanced, item.label).toEqual(item.native);
});

for (const mode of ["source", "live"]) {
  test(`${mode} user length validation follows native keyboard edits and clears on changed API writes`, async ({ page }) => {
    await page.evaluate(async mode => {
      const { enhanceTextarea } = await import("/dist/writemark-editor.js");
      const textarea = document.querySelector("#body");
      textarea.minLength = 5;
      textarea.maxLength = 8;
      const { editor } = enhanceTextarea(textarea);
      editor.mode = mode;
      textarea.value = "123";
      const oracleForm = document.createElement("form");
      oracleForm.id = "validation-oracle-form";
      const oracle = document.createElement("textarea");
      oracle.id = "validation-oracle";
      oracle.name = "oracleBody";
      oracle.minLength = 5;
      oracle.maxLength = 8;
      oracle.value = "123";
      oracleForm.append(oracle);
      document.body.append(oracleForm);
    }, mode);
    const oracle = page.locator("#validation-oracle");
    const editor = page.locator("#body + writemark-editor");
    const editable = mode === "source" ? editor.locator("textarea") : editor.locator(".live-editor");
    await oracle.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await editable.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    const read = () => page.evaluate(() => {
      const oracle = document.querySelector("#validation-oracle");
      const textarea = document.querySelector("#body");
      const editor = textarea.nextElementSibling;
      // WebKit can return true from native checkValidity() with a length error.
      return {
        native: { valid: oracle.validity.valid, short: oracle.validity.tooShort, long: oracle.validity.tooLong },
        nativeWillValidate: oracle.willValidate,
        enhanced: { valid: textarea.form.checkValidity(), short: editor.validity.tooShort, long: editor.validity.tooLong },
        value: editor.value,
        oracleValue: oracle.value
      };
    });
    const short = await read();
    expect(short.nativeWillValidate).toBe(true);
    expect(short.enhanced).toEqual(short.native);
    expect(short.enhanced.short).toBe(true);
    expect(short.value).toBe(short.oracleValue);
    await page.evaluate(() => {
      const editor = document.querySelector("#body").nextElementSibling;
      editor.value = editor.value;
    });
    const noOp = await read();
    expect(noOp.enhanced).toEqual(short.enhanced);
    await page.evaluate(() => {
      document.querySelector("#validation-oracle").value = "x";
      document.querySelector("#body").nextElementSibling.value = "x";
    });
    const reset = await read();
    expect(reset.enhanced).toEqual(reset.native);
    expect(reset.enhanced.valid).toBe(true);
    await page.evaluate(() => {
      document.querySelector("#validation-oracle").value = "123456789012";
      document.querySelector("#body").value = "123456789012";
    });
    await oracle.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await editable.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    const long = await read();
    expect(long.enhanced).toEqual(long.native);
    expect(long.enhanced.long).toBe(true);
    expect(long.value).toBe(long.oracleValue);
  });
}

test("updates associated label text, target, and wrapping label content", async ({ page }) => {
  await page.locator('label[for="body"]').evaluate(label => { label.firstChild.nodeValue = "Changed label"; });
  await expect(page.locator("#body + writemark-editor")).toHaveAttribute("aria-label", "Changed label");
  await page.evaluate(() => {
    const label = document.querySelector('label[for="body"]');
    label.htmlFor = "plain";
  });
  await expect(page.locator("#body + writemark-editor")).toHaveAttribute("aria-label", "");
  await page.evaluate(() => {
    const label = document.querySelector('label[for="plain"]');
    document.querySelector("#body").id = "renamed-body";
    label.htmlFor = "renamed-body";
  });
  await expect(page.locator("#renamed-body + writemark-editor")).toHaveAttribute("aria-label", "Changed label");
  const wrapping = await page.evaluate(async () => {
    const { enhanceTextarea } = await import("/dist/writemark-editor.js");
    const label = document.createElement("label");
    label.append("Wrapped text");
    const textarea = document.createElement("textarea");
    textarea.defaultValue = "This is control content";
    label.append(textarea);
    document.body.append(label);
    return enhanceTextarea(textarea).editor.getAttribute("aria-label");
  });
  expect(wrapping).toBe("Wrapped text");
});

for (const mode of ["source", "live", "split"]) {
  test(`${mode} preserves native tabindex and one keyboard focus stop`, async ({ page }) => {
    await page.evaluate(async mode => {
      const { enhanceTextarea } = await import("/dist/writemark-editor.js");
      const parent = document.createElement("section");
      const before = document.createElement("button");
      before.id = "native-tab-before";
      before.textContent = "Before native";
      const textarea = document.createElement("textarea");
      textarea.id = "native-tab-control";
      textarea.tabIndex = -1;
      const after = document.createElement("button");
      after.id = "native-tab-after";
      after.textContent = "After native";
      parent.append(before, textarea, after);
      document.body.append(parent);
      enhanceTextarea(textarea).editor.mode = mode;
    }, mode);
    await page.locator("#native-tab-before").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#native-tab-after")).toBeFocused();
    await page.locator("#native-tab-control").evaluate(textarea => { textarea.tabIndex = 0; });
    await expect(page.locator("#native-tab-control + writemark-editor")).toHaveJSProperty("tabIndex", 0);
    await page.locator("#native-tab-before").focus();
    await page.keyboard.press("Tab");
    expect(await page.locator("#native-tab-control + writemark-editor").evaluate(editor => editor.matches(":focus-within") && Boolean(editor.shadowRoot.activeElement))).toBe(true);
    await page.keyboard.press("Tab");
    await expect(page.locator("#native-tab-after")).toBeFocused();
    await page.locator("#native-tab-control").evaluate(textarea => { textarea.tabIndex = 3; });
    await expect(page.locator("#native-tab-control + writemark-editor")).toHaveJSProperty("tabIndex", 3);
    const indices = await page.locator("#native-tab-control + writemark-editor").evaluate(editor => ({ source: editor.shadowRoot.querySelector("textarea").tabIndex, live: editor.shadowRoot.querySelector(".live-editor").tabIndex }));
    expect(indices).toEqual({ source: 3, live: 3 });
  });
}
