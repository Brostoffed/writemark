import { expect, test } from "./support/editor-fixture.js";

for (const mode of ["live", "source", "split", "preview"]) {
  test(`keeps tags off by default in ${mode} mode`, async ({ editor }) => {
    const value = "# Heading\n\nText #Alpha and **bold**.";
    await editor.reset({ value, attributes: { mode, preview: "below" } });
    const state = await editor.host.evaluate(element => ({
      enabled: element.tagsEnabled,
      attribute: element.hasAttribute("tags-enabled"),
      tags: element.getTags(),
      html: element.getHTML(),
      value: element.value
    }));
    expect(state).toMatchObject({ enabled: false, attribute: false, tags: [], value });
    expect(state.html).toContain("#Alpha");
    expect(state.html).toContain("<strong>bold</strong>");
    expect(state.html).not.toContain('part="tag"');
    await expect(editor.host.locator(".md-tag")).toHaveCount(0);
    expect(await editor.events("md-tags-change")).toEqual([]);
  });
}

test("does not call an assigned tag provider while tags are off", async ({ editor, page }) => {
  await editor.reset({ attributes: { mode: "source" } });
  await editor.host.evaluate(element => {
    window.tagProviderCalls = 0;
    element.tagProvider = {
      allowCreate: true,
      getItems() { window.tagProviderCalls += 1; return ["alpha"]; }
    };
  });
  await editor.source.focus();
  await page.keyboard.type("#alpha");
  await editor.settle();
  expect(await page.evaluate(() => window.tagProviderCalls)).toBe(0);
  expect(await editor.value()).toBe("#alpha");
  expect(await editor.host.evaluate(element => element.getTags())).toEqual([]);
  await expect(editor.completion).toBeHidden();
  expect(await editor.events("md-tags-change")).toEqual([]);
  expect(await editor.events("md-tag-activate")).toEqual([]);
});

for (const mode of ["live", "source", "split"]) {
  test(`preserves text, selection, form state, and history when tags change in ${mode} mode`, async ({ editor }) => {
    const value = "Start #Alpha";
    await editor.reset({ value, attributes: { mode } });
    await editor.setSelection(value.length);
    await editor.host.evaluate(element => element.exec("editor.insertText", { text: " end" }));
    await editor.setSelection(2, 7, "backward");
    const states = await editor.host.evaluate(element => {
      const snapshot = () => ({
        value: element.value,
        defaultValue: element.defaultValue,
        dirty: element.dirty,
        selection: [element.selectionStart, element.selectionEnd],
        formValue: new FormData(element.form || element.closest("form")).get("body")
      });
      const before = snapshot();
      element.tagsEnabled = true;
      const enabled = { state: snapshot(), attribute: element.hasAttribute("tags-enabled"), tags: element.getTags() };
      element.removeAttribute("tags-enabled");
      const disabled = { state: snapshot(), enabled: element.tagsEnabled, tags: element.getTags() };
      element.setAttribute("tags-enabled", "");
      const reflected = element.tagsEnabled;
      element.tagsEnabled = false;
      return { before, enabled, disabled, reflected, final: snapshot(), attribute: element.hasAttribute("tags-enabled") };
    });
    expect(states.enabled.state).toEqual(states.before);
    expect(states.disabled.state).toEqual(states.before);
    expect(states.final).toEqual(states.before);
    expect(states.enabled.attribute).toBe(true);
    expect(states.enabled.tags).toHaveLength(1);
    expect(states.disabled).toMatchObject({ enabled: false, tags: [] });
    expect(states.reflected).toBe(true);
    expect(states.attribute).toBe(false);
    expect(await editor.host.evaluate(element => element.exec("history.undo"))).toBe(true);
    expect(await editor.value()).toBe(value);
    expect(await editor.host.evaluate(element => element.exec("history.redo"))).toBe(true);
    expect(await editor.value()).toBe(`${value} end`);
  });
}

test("reports index changes for the switch without changing the document", async ({ editor }) => {
  await editor.reset({ value: "#Alpha" });
  await editor.host.evaluate(element => {
    element.tagsEnabled = true;
    element.tagsEnabled = true;
    element.tagsEnabled = false;
    element.tagsEnabled = false;
  });
  expect(await editor.events("md-tags-change")).toEqual([
    expect.objectContaining({ source: "attribute", tagsAdded: ["Alpha"], tagsRemoved: [], tagsCurrent: [expect.objectContaining({ value: "Alpha" })] }),
    expect.objectContaining({ source: "attribute", tagsAdded: [], tagsRemoved: ["Alpha"], tagsCurrent: [] })
  ]);
  for (const event of ["md-input", "md-change", "md-dirty-change"]) {
    expect(await editor.events(event)).toEqual([]);
  }
  await editor.setValue("#Other");
  expect(await editor.events("md-tags-change")).toHaveLength(2);
});

test("aborts pending tag requests and rejects their results after another enable", async ({ editor, page }) => {
  await editor.reset({ value: "#al", attributes: { mode: "source", "tags-enabled": true } });
  await editor.host.evaluate(element => {
    window.pendingTagRequests = [];
    element.tagProvider = {
      getItems({ signal }) {
        return new Promise(resolve => window.pendingTagRequests.push({ signal, resolve }));
      }
    };
  });
  await editor.setSelection(3);
  await page.waitForFunction(() => window.pendingTagRequests.length > 0);
  const stopped = await editor.host.evaluate(element => {
    element.tagsEnabled = false;
    return { aborted: window.pendingTagRequests.every(request => request.signal.aborted), tags: element.getTags() };
  });
  expect(stopped).toEqual({ aborted: true, tags: [] });
  await expect(editor.completion).toBeHidden();
  await editor.host.evaluate(element => {
    element.tagProvider = { getItems: () => ["alpine"] };
    element.tagsEnabled = true;
  });
  await expect(editor.host.getByRole("option", { name: "#alpine tag", exact: true })).toBeVisible();
  await page.evaluate(() => {
    for (const request of window.pendingTagRequests) request.resolve(["alpha"]);
  });
  await editor.settle();
  await expect(editor.host.getByRole("option", { name: "#alpine tag", exact: true })).toBeVisible();
  await expect(editor.host.getByRole("option", { name: "#alpha tag", exact: true })).toHaveCount(0);
  expect(await editor.value()).toBe("#al");
});

test("preserves active composition and stops tag activation immediately", async ({ editor }) => {
  await editor.reset({ value: "#Alpha", attributes: { "tags-enabled": true, preview: "below" } });
  await editor.setSelection(6);
  const during = await editor.host.evaluate(element => {
    const live = element.shadowRoot.querySelector(".live-editor");
    const tag = live.querySelector(".md-tag");
    live.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    element.tagsEnabled = false;
    tag.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { composing: element._isComposing, nodePreserved: tag.isConnected, tags: element.getTags(), html: element.getHTML() };
  });
  expect(during).toMatchObject({ composing: true, nodePreserved: true, tags: [] });
  expect(during.html).not.toContain('part="tag"');
  expect(await editor.events("md-tag-activate")).toEqual([]);
  await editor.live.evaluate(live => live.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })));
  await expect(editor.host.locator(".md-tag")).toHaveCount(0);
  expect(await editor.value()).toBe("#Alpha");
  expect(await editor.host.evaluate(element => element.dirty)).toBe(false);
});

test("upgrades an assigned switch before custom element registration", async ({ editor }) => {
  const state = await editor.host.evaluate(async host => {
    const { WritemarkEditorElement } = await import("/dist/writemark-editor.js");
    const element = document.createElement("test-tags-upgrade");
    element.tagsEnabled = true;
    element.value = "#Early";
    host.ownerDocument.body.append(element);
    customElements.define("test-tags-upgrade", class extends WritemarkEditorElement {});
    await customElements.whenDefined("test-tags-upgrade");
    return { enabled: element.tagsEnabled, attribute: element.hasAttribute("tags-enabled"), tags: element.getTags(), text: element.shadowRoot.querySelector(".md-tag")?.textContent };
  });
  expect(state).toMatchObject({ enabled: true, attribute: true, text: "#Early", tags: [expect.objectContaining({ value: "Early" })] });
});

test("keeps the switch independent for each editor and the legacy element", async ({ editor }) => {
  const state = await editor.host.evaluate(element => {
    const other = document.createElement("md-live-editor");
    document.body.append(other);
    element.value = "#First";
    other.value = "#Second";
    element.tagsEnabled = true;
    const first = { enabled: element.tagsEnabled, tags: element.getTags().map(tag => tag.value) };
    const second = { enabled: other.tagsEnabled, tags: other.getTags() };
    other.tagsEnabled = true;
    element.tagsEnabled = false;
    return { first, second, finalFirst: element.getTags(), finalSecond: other.getTags().map(tag => tag.value) };
  });
  expect(state).toEqual({ first: { enabled: true, tags: ["First"] }, second: { enabled: false, tags: [] }, finalFirst: [], finalSecond: ["Second"] });
});

test("requires tag rendering opt-in while explicit tag parsing remains available", async ({ editor }) => {
  const state = await editor.host.evaluate(async () => {
    const { renderMarkdown, renderInlineMarkdown, parseTags } = await import("/dist/writemark-editor.js");
    const source = "# Heading #one\n\n> Quote #two\n\n- List #three\n\n[#four](/target)";
    const countTags = html => {
      const template = document.createElement("template");
      template.innerHTML = html;
      return template.content.querySelectorAll(".md-tag").length;
    };
    return {
      defaultDocument: countTags(renderMarkdown(source)),
      enabledDocument: countTags(renderMarkdown(source, { tagsEnabled: true })),
      defaultInline: renderInlineMarkdown("#Alpha"),
      enabledInline: countTags(renderInlineMarkdown("#Alpha", { tagsEnabled: true })),
      tags: parseTags("#Alpha").map(tag => tag.value)
    };
  });
  expect(state).toEqual({ defaultDocument: 0, enabledDocument: 4, defaultInline: "#Alpha", enabledInline: 1, tags: ["Alpha"] });
});
