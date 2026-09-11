import { expect, test } from "./support/editor-fixture.js";

const editorModes = [
  { live: true, mode: "live", preview: false, source: false },
  { live: false, mode: "source", preview: false, source: true },
  { live: false, mode: "split", preview: true, source: true },
  { live: false, mode: "preview", preview: true, source: false }
];

test.describe("tag component integration", () => {
  for (const scenario of editorModes) {
    test(`keeps tags canonical in ${scenario.mode} mode`, async ({ editor }) => {
      const value = "Mode #alpha";
      await editor.reset({ value, attributes: { mode: scenario.mode } });

      scenario.live
        ? await expect(editor.live).toBeVisible()
        : await expect(editor.live).toBeHidden();
      scenario.source
        ? await expect(editor.source).toHaveValue(value)
        : await expect(editor.source).toBeHidden();
      scenario.preview
        ? await expect(editor.preview.getByRole("button", { name: "#alpha" })).toBeVisible()
        : await expect(editor.preview).toBeHidden();
      if (scenario.live) await expect(editor.live.locator(".md-tag")).toHaveText("#alpha");
      expect(await editor.value()).toBe(value);
      expect(await editor.host.evaluate(element => element.getTags())).toHaveLength(1);
    });
  }

  for (const preview of ["below", "side", "inline-split"]) {
    test(`renders tags in the ${preview} companion preview`, async ({ editor }) => {
      await editor.reset({ value: "Preview #alpha", attributes: { mode: "live", preview } });

      await expect(editor.live.locator(".md-tag")).toHaveText("#alpha");
      await expect(editor.preview.getByRole("button", { name: "#alpha" })).toBeVisible();
    });
  }

  test("supports tags through both custom element names and both module builds", async ({ editor }) => {
    const result = await editor.host.evaluate(async host => {
      const main = await import("/dist/writemark-editor.js");
      const legacy = await import("/dist/md-live-editor.js");
      const tags = [];
      for (const name of ["writemark-editor", "md-live-editor"]) {
        const element = host.ownerDocument.createElement(name);
        element.value = `#${name}`;
        host.ownerDocument.body.append(element);
        await new Promise(requestAnimationFrame);
        tags.push({
          name,
          rendered: element.shadowRoot.querySelector(".md-tag")?.textContent,
          tags: element.getTags()
        });
        element.remove();
      }
      return {
        globalParser: typeof globalThis.WritemarkEditor?.parseTags,
        legacyParser: typeof legacy.parseTags,
        mainParser: typeof main.parseTags,
        tags
      };
    });

    expect(result).toMatchObject({
      globalParser: "undefined",
      legacyParser: "function",
      mainParser: "function"
    });
    expect(result.tags.map(entry => entry.rendered)).toEqual([
      "#writemark-editor",
      "#md-live-editor"
    ]);
    expect(result.tags.every(entry => entry.tags.length === 1)).toBe(true);
  });

  test("exposes parseTags through the classic global build", async ({ editor }) => {
    const result = await editor.host.evaluate(async host => {
      const script = host.ownerDocument.createElement("script");
      script.src = "/dist/writemark-editor.global.js";
      host.ownerDocument.head.append(script);
      await new Promise((resolve, reject) => {
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", reject, { once: true });
      });
      return globalThis.WritemarkEditor.parseTags("#global");
    });

    expect(result).toEqual([
      { count: 1, key: "global", ranges: [{ from: 0, to: 7 }], value: "global" }
    ]);
  });

  test("keeps tag providers and indexes isolated across editor instances", async ({ editor }) => {
    const result = await editor.host.evaluate(async first => {
      const second = first.ownerDocument.createElement("writemark-editor");
      first.ownerDocument.body.append(second);
      first.value = "#first";
      second.value = "#second";
      first.tagProvider = { getItems: () => ["first-catalog"] };
      second.tagProvider = { getItems: () => ["second-catalog"] };
      const context = element => ({
        block: { kind: "paragraph" },
        currentLine: { start: 0, text: "#" },
        inline: { insideInlineCode: false },
        selectionEnd: 1,
        selectionStart: 1
      });
      const match = { from: 0, query: "", to: 1 };
      const firstItems = await first._getTagItems(match, context(first), new AbortController().signal);
      const secondItems = await second._getTagItems(match, context(second), new AbortController().signal);
      return {
        firstItems: firstItems.map(item => item.value),
        firstTags: first.getTags().map(tag => tag.value),
        secondItems: secondItems.map(item => item.value),
        secondTags: second.getTags().map(tag => tag.value)
      };
    });

    expect(result).toEqual({
      firstItems: ["first", "first-catalog"],
      firstTags: ["first"],
      secondItems: ["second", "second-catalog"],
      secondTags: ["second"]
    });
  });

  test("submits and resets raw Markdown tags through a native form", async ({ editor, page }) => {
    await editor.reset({ value: "Form #default", attributes: { name: "body" } });
    await editor.setValue("Form #changed");

    expect(await editor.host.evaluate(element => new FormData(element.closest("form")).get("body")))
      .toBe("Form #changed");
    await page.evaluate(() => document.querySelector("#editor-form").reset());
    await editor.settle();

    expect(await editor.value()).toBe("Form #default");
    expect((await editor.host.evaluate(element => element.getTags())).map(tag => tag.value))
      .toEqual(["default"]);
  });

  test("keeps derived tags available while readonly or disabled", async ({ editor }) => {
    for (const attribute of ["readonly", "disabled"]) {
      await editor.reset({ value: "State #alpha", attributes: { [attribute]: true } });
      expect((await editor.host.evaluate(element => element.getTags())).map(tag => tag.value))
        .toEqual(["alpha"]);
      expect(await editor.host.evaluate(element => element.getHTML())).toContain("data-md-tag=\"alpha\"");
      await expect(editor.completion).toBeHidden();
    }
  });

  test("activates preview tags while readonly without changing Markdown", async ({ editor }) => {
    await editor.reset({
      value: "Readonly #alpha",
      attributes: { mode: "preview", readonly: true }
    });
    await editor.preview.getByRole("button", { name: "#alpha" }).click();

    expect(await editor.value()).toBe("Readonly #alpha");
    expect((await editor.events("md-tag-activate")).at(-1)).toMatchObject({
      key: "alpha",
      surface: "preview",
      tag: "alpha"
    });
  });

  test("sets a tag provider before connection without opening a popup", async ({ editor }) => {
    const result = await editor.host.evaluate(async host => {
      const element = host.ownerDocument.createElement("writemark-editor");
      element.value = "#a";
      element.tagProvider = { getItems: () => ["alpha"] };
      const before = { connected: element.isConnected, open: element._completion.open };
      host.ownerDocument.body.append(element);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        before,
        connected: element.isConnected,
        providerSet: Boolean(element.tagProvider),
        tags: element.getTags()
      };
    });

    expect(result.before).toEqual({ connected: false, open: false });
    expect(result.connected).toBe(true);
    expect(result.providerSet).toBe(true);
    expect(result.tags).toHaveLength(1);
  });
});

test.describe("tag completion integration", () => {
  for (const mode of ["live", "source", "split"]) {
    test(`completes a host tag with real keyboard input in ${mode} mode`, async ({ editor, page }) => {
      await editor.reset({ attributes: { mode } });
      await editor.host.evaluate(element => {
        element.tagProvider = { getItems: () => ["platform"] };
        element.focus();
      });
      await page.keyboard.type("#pla");
      await expect(editor.host.getByRole("option", { name: /#platform/ })).toBeVisible();
      await page.keyboard.press("Enter");

      expect(await editor.value()).toBe("#platform ");
      expect(await editor.selection()).toEqual({ start: 10, end: 10 });
    });
  }

  test("supports nested tag queries", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = { getItems: () => ["projects/editor", "projects/docs"] };
      element.focus();
    });
    await page.keyboard.type("#projects/");

    await expect(editor.host.getByRole("option", { name: /#projects\/editor/ })).toBeVisible();
    await expect(editor.host.getByRole("option", { name: /#projects\/docs/ })).toBeVisible();
  });

  test("merges case-insensitive duplicates and keeps host metadata", async ({ editor, page }) => {
    const value = "Existing #Alpha\n\n#al";
    await editor.reset({ value, attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = {
        getItems: () => [{ value: "alpha", label: "#ALPHA", detail: "host metadata" }]
      };
    });
    await editor.setSelection(value.length);

    const options = editor.host.getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options).toHaveText(/#ALPHAhost metadata/);
  });

  test("filters malformed, numeric, and unsafe provider items", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = {
        getItems: () => [
          "valid",
          "123",
          "two words",
          "/start",
          "end/",
          "two//levels",
          { value: "safe", label: "<img src=x onerror=alert(1)>" }
        ]
      };
      element.focus();
    });
    await page.keyboard.type("#");

    await expect(editor.host.getByRole("option")).toHaveCount(2);
    await expect(editor.host.locator(".completion-popup img")).toHaveCount(0);
    await expect(editor.host.getByRole("option").nth(1)).toContainText("<img src=x onerror=alert(1)>");
  });

  test("limits provider results to 24 items", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = {
        getItems: () => Array.from({ length: 100 }, (_, index) => `tag-${index}`)
      };
      element.focus();
    });
    await page.keyboard.type("#");

    await expect(editor.host.getByRole("option")).toHaveCount(24);
  });

  test("does not offer catalog additions for numeric, malformed, or exact tags", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = { allowCreate: true, getItems: () => ["alpha"] };
      element.focus();
    });

    await page.keyboard.type("#123");
    await expect(editor.completion).toBeHidden();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("#alpha");
    await expect(editor.host.getByRole("option", { name: /#alpha/ })).toBeVisible();
    await expect(editor.host.getByRole("option", { name: /Add #alpha to catalog/ })).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("#two//");
    await expect(editor.completion).toBeHidden();
  });

  test("does not complete in code, escapes, attached words, destinations, or selections", async ({ editor }) => {
    const cases = [
      { selection: 4, value: "`#ta`" },
      { value: "\\#ta" },
      { value: "word#ta" },
      { selection: 27, value: "[x](https://example.com/#ta)" },
      { selection: 9, value: "```\n#ta\n```" },
      { selectionEnd: 3, selectionStart: 1, value: "#ta" }
    ];

    for (const scenario of cases) {
      await editor.reset({ value: scenario.value, attributes: { mode: "source" } });
      await editor.host.evaluate(element => {
        element.tagProvider = { allowCreate: true, getItems: () => ["target"] };
      });
      const start = scenario.selectionStart ?? scenario.selection ?? scenario.value.length;
      const end = scenario.selectionEnd ?? scenario.selection ?? scenario.value.length;
      await editor.setSelection(start, end);
      await expect(editor.completion).toBeHidden();
    }
  });

  for (const mode of ["live", "source"]) {
    for (const placement of [
      { label: "at line start", value: "#demo/writemark." },
      { label: "after text", value: "Use #demo/writemark." }
    ]) {
      test(`does not complete from a caret inside an existing tag ${placement.label} in ${mode} mode`, async ({ editor }) => {
        await editor.reset({ value: placement.value, attributes: { mode } });
        await editor.host.evaluate(element => {
          element.tagProvider = {
            allowCreate: true,
            getItems: () => ["demo/writemark", "demo/write"]
          };
        });
        await editor.setSelection(placement.value.indexOf("#de") + 3);

        await expect(editor.completion).toBeHidden();
        await expect(editor.host.getByRole("option")).toHaveCount(0);
      });
    }
  }

  test("aborts stale asynchronous catalog requests", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      globalThis.tagRequests = [];
      element.tagProvider = {
        getItems({ query, signal }) {
          const request = { aborted: false, query };
          globalThis.tagRequests.push(request);
          signal.addEventListener("abort", () => { request.aborted = true; }, { once: true });
          return new Promise(resolve => setTimeout(() => resolve([`${query || "all"}-result`]), 40));
        }
      };
      element.focus();
    });
    await page.keyboard.type("#ab", { delay: 5 });

    await expect(editor.host.getByRole("option", { name: /#ab-result/ })).toBeVisible();
    const requests = await page.evaluate(() => globalThis.tagRequests);
    expect(requests.at(-1)).toMatchObject({ aborted: false, query: "ab" });
    expect(requests.slice(0, -1).some(request => request.aborted)).toBe(true);
  });

  test("emits a recoverable completion error and closes the popup", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = { getItems: () => { throw new Error("catalog failed"); } };
      element.focus();
    });
    await page.keyboard.type("#a");

    await expect.poll(async () => (await editor.events("md-error")).length).toBeGreaterThan(0);
    expect((await editor.events("md-error")).at(-1)).toMatchObject({ phase: "completion" });
    await expect(editor.completion).toBeHidden();
  });

  test("clears host results when tagProvider becomes null", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = { getItems: () => ["alpha"] };
      element.focus();
    });
    await page.keyboard.type("#a");
    await expect(editor.completion).toBeVisible();
    await editor.host.evaluate(element => { element.tagProvider = null; });
    await expect(editor.completion).toBeHidden();
  });

  test("rejects invalid tagProvider assignments", async ({ editor }) => {
    const messages = await editor.host.evaluate(element => [null, 1, "provider", {}, () => []].map(value => {
      try {
        element.tagProvider = value;
        return null;
      } catch (error) {
        return error.message;
      }
    }));

    expect(messages).toEqual([
      null,
      "tagProvider requires a getItems function.",
      "tagProvider requires a getItems function.",
      "tagProvider requires a getItems function.",
      "tagProvider requires a getItems function."
    ]);
  });

  test("supports pointer acceptance and records before and after snapshots", async ({ editor }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      globalThis.tagAcceptance = null;
      element.tagProvider = { getItems: () => ["alpha"] };
      element.addEventListener("md-completion-accept", event => {
        globalThis.tagAcceptance = event.detail;
      }, { once: true });
      element.focus();
    });
    await editor.source.pressSequentially("#a");
    await editor.host.getByRole("option", { name: /#alpha/ }).click();

    expect(await editor.value()).toBe("#alpha ");
    expect(await editor.host.evaluate(() => ({
      after: globalThis.tagAcceptance.after.value,
      before: globalThis.tagAcceptance.before.value,
      kind: globalThis.tagAcceptance.item.kind,
      providerId: globalThis.tagAcceptance.providerId
    }))).toEqual({ after: "#alpha ", before: "#a", kind: "tag", providerId: "tags" });
  });

  test("undoes and redoes an accepted tag completion", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = { getItems: () => ["alpha"] };
      element.focus();
    });
    await page.keyboard.type("#a");
    await expect(editor.host.getByRole("option", { name: /#alpha/ })).toBeVisible();
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("#alpha ");

    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("#a");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("#alpha ");
  });

  test("does not persist a catalog addition without host action", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = { allowCreate: true, getItems: () => [] };
      element.focus();
    });
    await page.keyboard.type("#new-tag");
    await expect(editor.host.getByRole("option", {
      name: "Add #new-tag to catalog save for autocomplete"
    })).toBeVisible();
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("#new-tag ");

    await editor.setValue("");
    await editor.setSelection(0);
    await page.keyboard.type("#new");
    await expect(editor.host.getByRole("option", { name: /Add #new to catalog/ })).toBeVisible();
    await expect(editor.host.getByRole("option", { name: /^#new-tag/ })).toHaveCount(0);
  });

  test("rejects a stale completion after the query changes", async ({ editor }) => {
    const result = await editor.host.evaluate(element => {
      element.value = "#az";
      element.setSelectionRange(3, 3);
      element._completion = {
        ...element._completion,
        activeIndex: 0,
        items: [{ id: "tag:alpha", kind: "tag", label: "#alpha", value: "alpha" }],
        match: { from: 0, providerId: "tags", query: "a", to: 2, trigger: "#" },
        open: true,
        providerId: "tags"
      };
      const accepted = element._acceptCompletion("action");
      return { accepted, open: element._completion.open, value: element.value };
    });

    expect(result).toMatchObject({ accepted: { ok: false }, open: false, value: "#az" });
  });

  test("accepts a visible tag when the current query safely refines its shown query", async ({ editor }) => {
    const result = await editor.host.evaluate(element => {
      element.value = "#pla";
      element.setSelectionRange(4, 4);
      element._completion = {
        ...element._completion,
        activeIndex: 0,
        items: [{
          id: "tag:platform",
          kind: "tag",
          label: "#platform",
          value: "platform"
        }],
        match: { from: 0, providerId: "tags", query: "p", to: 2, trigger: "#" },
        open: true,
        providerId: "tags"
      };
      const accepted = element._acceptCompletion("action");
      return {
        accepted,
        open: element._completion.open,
        selection: { end: element.selectionEnd, start: element.selectionStart },
        value: element.value
      };
    });

    expect(result).toMatchObject({
      accepted: { ok: true },
      open: false,
      selection: { end: 10, start: 10 },
      value: "#platform "
    });
  });

  test("closes tag completion when readonly or disabled becomes active", async ({ editor, page }) => {
    for (const property of ["readonly", "disabled"]) {
      await editor.reset({ attributes: { mode: "source" } });
      await editor.host.evaluate(element => {
        element.tagProvider = { getItems: () => ["alpha"] };
        element.focus();
      });
      await page.keyboard.type("#a");
      await expect(editor.completion).toBeVisible();
      await editor.host.evaluate((element, name) => { element[name] = true; }, property);
      await expect(editor.completion).toBeHidden();
    }
  });
});

test.describe("tag activation integration", () => {
  test("does not open completion when a pointer activates an existing tag", async ({ editor }) => {
    await editor.reset({ value: "Open #demo/writemark now" });
    await editor.host.evaluate(element => {
      element.tagProvider = {
        allowCreate: true,
        getItems: () => ["demo/writemark", "demo/write"]
      };
    });
    await editor.live.locator(".md-tag").click();

    expect((await editor.events("md-tag-activate")).at(-1)).toMatchObject({
      key: "demo/writemark",
      surface: "live",
      tag: "demo/writemark"
    });
    await expect(editor.completion).toBeHidden();
  });

  test("activates a live tag without changing Markdown", async ({ editor }) => {
    await editor.reset({ value: "Open #alpha now" });
    await editor.live.locator(".md-tag").click();

    expect(await editor.value()).toBe("Open #alpha now");
    expect((await editor.events("md-tag-activate")).at(-1)).toMatchObject({
      key: "alpha",
      surface: "live",
      tag: "alpha"
    });
  });

  test("supports Space activation for preview tags", async ({ editor, page }) => {
    await editor.reset({ value: "Open #alpha", attributes: { mode: "preview" } });
    await editor.preview.getByRole("button", { name: "#alpha" }).focus();
    await page.keyboard.press("Space");

    expect((await editor.events("md-tag-activate")).at(-1)).toMatchObject({
      key: "alpha",
      surface: "preview",
      tag: "alpha"
    });
  });

  test("emits no activation for code or escaped hashes", async ({ editor }) => {
    await editor.reset({
      value: "`#code` and \\#escaped",
      attributes: { mode: "preview" }
    });

    await expect(editor.preview.locator(".md-tag")).toHaveCount(0);
    expect(await editor.events("md-tag-activate")).toEqual([]);
  });
});
