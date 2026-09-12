import { expect, test } from "./support/editor-fixture.js";

test.use({ tagsEnabled: true });

test.describe("tags", () => {
  test("parses tags and skips Markdown code, destinations, definitions, and escapes", async ({ editor }) => {
    const markdown = [
      "# Heading",
      "Use #Alpha, #projects/Editor, #123abc, and #123.",
      "`#inline` and \\#escaped.",
      "[#label](https://example.com/#target)",
      "[ref]: https://example.com/#definition",
      "```js",
      "#fenced",
      "```",
      "https://example.com/#fragment",
      "Again #alpha and #café."
    ].join("\n");
    const result = await editor.host.evaluate((element, value) => {
      element.value = value;
      return element.getTags();
    }, markdown);

    expect(result.map(tag => ({ count: tag.count, key: tag.key, value: tag.value }))).toEqual([
      { count: 2, key: "alpha", value: "Alpha" },
      { count: 1, key: "projects/editor", value: "projects/Editor" },
      { count: 1, key: "123abc", value: "123abc" },
      { count: 1, key: "label", value: "label" },
      { count: 1, key: "café", value: "café" }
    ]);
    expect(result[0].ranges).toHaveLength(2);
  });

  test("renders tags without changing canonical Markdown", async ({ editor }) => {
    const value = "See #Alpha and `#code`.";
    await editor.reset({ value, attributes: { preview: "below" } });

    await expect(editor.live.locator(".md-tag")).toHaveCount(1);
    await expect(editor.preview.locator(".md-tag")).toHaveCount(1);
    await expect(editor.preview.locator("code")).toHaveText("#code");
    expect(await editor.value()).toBe(value);
    expect(await editor.host.evaluate(element => element.getHTML())).toContain('part="tag"');
  });

  test("reports the derived tag index after the input event", async ({ editor }) => {
    await editor.reset();
    await editor.setValue("See #One.");

    const events = await editor.events();
    const inputIndex = events.findIndex(event => event.type === "md-input");
    const tagsIndex = events.findIndex(event => event.type === "md-tags-change");
    expect(tagsIndex).toBeGreaterThan(inputIndex);
    expect(events[tagsIndex]).toMatchObject({
      tagsAdded: ["One"],
      tagsRemoved: [],
      tagsCurrent: [{ count: 1, key: "one", value: "One" }]
    });
    expect(await editor.host.evaluate(element => element.getTags())).toEqual([
      { count: 1, key: "one", ranges: [{ from: 4, to: 8 }], value: "One" }
    ]);

    await editor.setValue("See #Two.");
    const changed = (await editor.events("md-tags-change")).at(-1);
    expect(changed).toMatchObject({ tagsAdded: ["Two"], tagsRemoved: ["One"] });
  });

  test("completes tags from the current document", async ({ editor, page }) => {
    const value = "Keep #Alpha here.\n\n#al";
    await editor.reset({ value });
    await editor.setSelection(value.length);

    await expect(editor.completion).toBeVisible();
    await expect(editor.host.getByRole("option", { name: /#Alpha/ })).toBeVisible();
    await page.keyboard.press("Enter");

    expect(await editor.value()).toBe("Keep #Alpha here.\n\n#Alpha ");
    expect((await editor.events("md-completion-accept")).at(-1)).toMatchObject({
      itemKind: "tag",
      itemValue: "Alpha",
      providerId: "tags"
    });
  });

  test("merges host tags and emits an explicit catalog addition", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate(element => {
      element.tagProvider = {
        allowCreate: true,
        async getItems({ query, documentTags, signal }) {
          globalThis.tagProviderRequest = { documentTags, query, signalAborted: signal.aborted };
          return [{ id: "platform", value: "platform", detail: "workspace tag" }];
        }
      };
      element.focus();
    });
    await page.keyboard.type("#new-tag");

    await expect(editor.completion).toBeVisible();
    await expect(editor.host.getByRole("option", {
      name: "Add #new-tag to catalog save for autocomplete"
    })).toBeVisible();
    expect(await page.evaluate(() => globalThis.tagProviderRequest)).toMatchObject({
      documentTags: [{ count: 1, key: "new-tag", value: "new-tag" }],
      query: "new-tag",
      signalAborted: false
    });

    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("#new-tag ");
    expect((await editor.events("md-completion-accept")).at(-1)).toMatchObject({
      itemKind: "tag-create",
      itemValue: "new-tag",
      providerId: "tags"
    });
  });

  test("activates rendered tags by pointer and keyboard", async ({ editor, page }) => {
    await editor.reset({ value: "Open #Alpha.", attributes: { mode: "preview" } });
    const tag = editor.preview.getByRole("button", { name: "#Alpha" });

    await tag.click();
    await tag.focus();
    await page.keyboard.press("Enter");

    expect(await editor.events("md-tag-activate")).toEqual([
      expect.objectContaining({ key: "alpha", surface: "preview", tag: "Alpha" }),
      expect.objectContaining({ key: "alpha", surface: "preview", tag: "Alpha" })
    ]);
  });
});

test.describe("tag syntax", () => {
  test("supports punctuation, Unicode, nested segments, and nonnumeric mixed tags", async ({ editor }) => {
    const value = [
      "(#alpha), #café #日本語 #добро #123abc",
      "#under_score #hyphen-tag #parent/child #one/two/three"
    ].join("\n");
    await editor.reset({ value });

    expect((await editor.host.evaluate(element => element.getTags())).map(tag => tag.value)).toEqual([
      "alpha",
      "café",
      "日本語",
      "добро",
      "123abc",
      "under_score",
      "hyphen-tag",
      "parent/child",
      "one/two/three"
    ]);
  });

  test("normalizes case and Unicode composition while preserving first spelling", async ({ editor }) => {
    const composed = "café";
    const decomposed = "cafe\u0301";
    await editor.reset({ value: `#Alpha #alpha #ALPHA #${composed} #${decomposed}` });

    const tags = await editor.host.evaluate(element => element.getTags());
    expect(tags).toHaveLength(2);
    expect(tags[0]).toMatchObject({ count: 3, key: "alpha", value: "Alpha" });
    expect(tags[1]).toMatchObject({ count: 2, key: "café", value: composed });
  });

  test("finds tags across supported Markdown blocks and link labels", async ({ editor }) => {
    await editor.reset({
      value: [
        "# Heading #heading-tag",
        "> quote #quote-tag",
        "- list #list-tag",
        "| Cell #table-tag | Other |",
        "| --- | --- |",
        "| Body | Value |",
        "[#inline-link](https://example.com)",
        "[#reference-link][ref]",
        "[ref]: https://example.com"
      ].join("\n")
    });

    expect((await editor.host.evaluate(element => element.getTags())).map(tag => tag.value)).toEqual([
      "heading-tag",
      "quote-tag",
      "list-tag",
      "table-tag",
      "inline-link",
      "reference-link"
    ]);
  });

  test("rejects headings, numeric tags, attached hashes, malformed nesting, and URL fragments", async ({ editor }) => {
    await editor.reset({
      value: [
        "# Heading",
        "## Heading",
        "#123",
        "word#attached C#sharp",
        "#/start #end/ #two//levels",
        "https://example.com/#fragment",
        "https://example.com/?topic=#fragment",
        "www.example.com/#fragment"
      ].join("\n")
    });

    expect(await editor.host.evaluate(element => element.getTags())).toEqual([]);
  });

  test("rejects tags in code, escaped text, destinations, and reference definitions", async ({ editor }) => {
    await editor.reset({
      value: [
        "`#inline` and \\#escaped",
        "``#multi``",
        "[label](https://example.com/#destination)",
        "[ref]: https://example.com/#definition",
        "```md",
        "#fenced",
        "```",
        "~~~",
        "#tilde-fenced",
        "~~~"
      ].join("\n")
    });

    expect(await editor.host.evaluate(element => element.getTags())).toEqual([]);
  });

  test("uses normalized line endings for exported parser ranges", async ({ editor }) => {
    const result = await editor.host.evaluate(async () => {
      const { parseTags } = await import("/dist/writemark-editor.js");
      return parseTags("one\r\n#alpha\r\n#beta");
    });

    expect(result).toEqual([
      { count: 1, key: "alpha", ranges: [{ from: 4, to: 10 }], value: "alpha" },
      { count: 1, key: "beta", ranges: [{ from: 11, to: 16 }], value: "beta" }
    ]);
  });

  test("returns defensive copies from getTags", async ({ editor }) => {
    await editor.reset({ value: "#alpha #alpha" });
    const result = await editor.host.evaluate(element => {
      const first = element.getTags();
      first[0].value = "changed";
      first[0].ranges[0].from = 999;
      first.push({ value: "extra" });
      return element.getTags();
    });

    expect(result).toEqual([
      {
        count: 2,
        key: "alpha",
        ranges: [{ from: 0, to: 6 }, { from: 7, to: 13 }],
        value: "alpha"
      }
    ]);
  });

  test("keeps all ranges bounded for long and repeated tags", async ({ editor }) => {
    const longTag = `tag-${"a".repeat(4096)}`;
    const value = Array.from({ length: 200 }, () => `#${longTag}`).join(" ");
    await editor.reset({ value });
    const tags = await editor.host.evaluate(element => element.getTags());

    expect(tags).toHaveLength(1);
    expect(tags[0].count).toBe(200);
    expect(tags[0].ranges).toHaveLength(200);
    for (const range of tags[0].ranges) {
      expect(range.from).toBeGreaterThanOrEqual(0);
      expect(range.to).toBeLessThanOrEqual(value.length);
      expect(value.slice(range.from, range.to)).toBe(`#${longTag}`);
    }
  });
});

test.describe("tag events", () => {
  test("makes the new index available during md-input", async ({ editor }) => {
    const observed = await editor.host.evaluate(element => new Promise(resolve => {
      element.addEventListener("md-input", () => resolve(element.getTags()), { once: true });
      element.value = "Ready #now";
    }));

    expect(observed).toEqual([
      { count: 1, key: "now", ranges: [{ from: 6, to: 10 }], value: "now" }
    ]);
  });

  test("does not emit a tag event when tag facts and ranges stay unchanged", async ({ editor }) => {
    await editor.reset({ value: "#one" });
    await editor.setValue("#one later");

    expect(await editor.events("md-input")).toHaveLength(1);
    expect(await editor.events("md-tags-change")).toEqual([]);
  });

  test("reports range and count changes without false additions or removals", async ({ editor }) => {
    await editor.reset({ value: "#one" });
    await editor.setValue("x #one #one");

    const event = (await editor.events("md-tags-change")).at(-1);
    expect(event).toMatchObject({ tagsAdded: [], tagsRemoved: [] });
    expect(event.tagsCurrent).toEqual([
      {
        count: 2,
        key: "one",
        ranges: [{ from: 2, to: 6 }, { from: 7, to: 11 }],
        value: "one"
      }
    ]);
  });

  test("reports the input source and input type for real source typing", async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.source.focus();
    await page.keyboard.type("#typed");

    const event = (await editor.events("md-tags-change")).at(-1);
    expect(event).toMatchObject({ inputType: "insertText", source: "user" });
  });

  test("bubbles composed tag events across the component boundary", async ({ editor }) => {
    const result = await editor.host.evaluate(element => new Promise(resolve => {
      const wrapper = element.parentElement;
      wrapper.addEventListener("md-tags-change", event => resolve({
        bubbles: event.bubbles,
        composed: event.composed,
        targetMatches: event.target === element
      }), { once: true });
      element.value = "#outside";
    }));

    expect(result).toEqual({ bubbles: true, composed: true, targetMatches: true });
  });

  test("does not emit initial tag events for a newly connected element", async ({ editor }) => {
    const result = await editor.host.evaluate(async host => {
      const element = host.ownerDocument.createElement("writemark-editor");
      element.tagsEnabled = true;
      element.setAttribute("value", "#initial");
      let events = 0;
      element.addEventListener("md-tags-change", () => { events += 1; });
      host.ownerDocument.body.append(element);
      await new Promise(requestAnimationFrame);
      return { events, tags: element.getTags() };
    });

    expect(result.events).toBe(0);
    expect(result.tags).toEqual([
      { count: 1, key: "initial", ranges: [{ from: 0, to: 8 }], value: "initial" }
    ]);
  });

  test("reset restores the prior tag index and commit emits no tag change", async ({ editor, page }) => {
    await editor.reset({ value: "#default" });
    await editor.setValue("#changed");
    await editor.host.evaluate(element => element.commit());
    const afterCommit = await editor.events("md-tags-change");
    expect(afterCommit).toHaveLength(1);

    await editor.setValue("#temporary");
    await page.evaluate(() => { window.testEvents.length = 0; });
    await editor.host.evaluate(element => element.reset());

    expect(await editor.host.evaluate(element => element.getTags())).toEqual([
      { count: 1, key: "changed", ranges: [{ from: 0, to: 8 }], value: "changed" }
    ]);
    expect((await editor.events("md-tags-change")).at(-1)).toMatchObject({
      tagsAdded: ["changed"],
      tagsRemoved: ["temporary"]
    });
  });
});
