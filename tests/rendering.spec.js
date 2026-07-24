import { expect, test } from "./support/editor-fixture.js";

const richMarkdown = [
  "# H1",
  "",
  "## H2",
  "",
  "**bold** and *italic* and `code`",
  "",
  "---",
  "",
  "| A | B |",
  "| --- | --- |",
  "| C | D |",
  "",
  "```python",
  "print(1)",
  "```",
  "",
  "- [ ] task"
].join("\n");

test.describe("live rendering", () => {
  test.beforeEach(async ({ editor }) => {
    await editor.reset({ value: richMarkdown });
  });

  const visibleCases = [
    ["live editor renders H1 class", ".md-h1"],
    ["live editor renders H2 class", ".md-h2"],
    ["live editor decorates bold", "strong"],
    ["live editor decorates italic", "em"],
    ["live editor decorates inline code", ".md-line code"],
    ["live editor renders table grid", ".md-table"],
    ["live editor renders code block", ".md-code-block"],
    ["live editor renders task checkbox", "[data-task-checkbox]"],
    ["live horizontal rule renders divider", ".md-hr-line"]
  ];

  for (const [name, selector] of visibleCases) {
    test(name, async ({ editor }) => {
      await expect(editor.host.locator(selector)).toBeVisible();
    });
  }

  test("Editor advertises light and dark color schemes for adaptive system colors", async ({ editor }) => {
    const schemes = await editor.host.evaluate(element =>
      getComputedStyle(element).colorScheme.split(/\s+/)
    );
    expect(schemes).toEqual(expect.arrayContaining(["light", "dark"]));
  });

  test("writemark-editor custom element is registered", async ({ page }) => {
    expect(await page.evaluate(() =>
      typeof customElements.get("writemark-editor") === "function"
    )).toBe(true);
  });

  test("legacy md-live-editor alias remains registered", async ({ page }) => {
    const registration = await page.evaluate(async () => {
      const compatibility = await import("/dist/md-live-editor.js");
      return {
        element: typeof customElements.get("md-live-editor") === "function",
        legacyExport: typeof compatibility.MdLiveEditorElement === "function",
        mainExport: typeof compatibility.WritemarkEditorElement === "function"
      };
    });
    expect(registration).toEqual({
      element: true,
      legacyExport: true,
      mainExport: true
    });
  });

  test("live code block hides raw fence markers", async ({ editor }) => {
    await expect(editor.host.locator(".md-code-block")).not.toContainText("```");
  });

  test("live code block renders language header", async ({ editor }) => {
    await expect(editor.host.locator(".md-code-label")).toHaveText("python");
  });

  test("live task item hides duplicate Markdown marker", async ({ editor }) => {
    await expect(editor.host.locator(".md-task-line")).toHaveText("task");
  });

  test("live task checkbox has a task-specific accessible name", async ({ editor }) => {
    await expect(editor.host.locator("[data-task-checkbox]"))
      .toHaveAttribute("aria-label", "Mark task complete: task");
  });

  test("live horizontal rule hides raw marker text", async ({ editor }) => {
    await expect(editor.host.locator(".md-hr-line")).toHaveText("");
  });

  test("live horizontal rule is not a text-editable row", async ({ editor }) => {
    await expect(editor.host.locator(".md-hr-line")).not.toHaveAttribute("data-editable");
  });

  test("active live line has no default blue inset focus ring", async ({ editor }) => {
    await editor.setSelection(1);
    const boxShadow = await editor.host.locator(".md-h1").evaluate(element =>
      getComputedStyle(element).boxShadow
    );
    expect(boxShadow).toBe("none");
  });

  const absentCases = [
    ["component renders no global toolbar", '[part="toolbar"], [part="mobile-toolbar"]'],
    ["code block renders no embedded action buttons", "[data-code-copy], [data-code-lang]"],
    ["table renders no embedded table controls", "[data-table-action]"]
  ];

  for (const [name, selector] of absentCases) {
    test(name, async ({ editor }) => {
      await expect(editor.host.locator(selector)).toHaveCount(0);
    });
  }
});

test.describe("mode and empty-state rendering", () => {
  test("empty live editor exposes placeholder without inserting placeholder text", async ({ editor }) => {
    await editor.reset({ attributes: { placeholder: "Start writing" } });
    await expect(editor.host.locator('[data-kind="blank"]'))
      .toHaveAttribute("data-placeholder", "Start writing");
    expect(await editor.value()).toBe("");
    await expect(editor.host.locator("[data-editable]")).toHaveCount(1);
  });

  test("split mode shows source textarea and preview without live editor", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "split" },
      value: "# Split mode"
    });
    await expect(editor.live).toBeHidden();
    await expect(editor.source).toBeVisible();
    await expect(editor.preview).toBeVisible();
    await expect(editor.preview.locator("h1")).toHaveText("Split mode");
  });

  test("preview mode focus targets rendered preview surface", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "preview" },
      value: "# Preview"
    });
    await editor.host.evaluate(element => element.focus());
    await expect(editor.preview).toBeFocused();
  });

  test("unfinished single fence line stays source-editable until Enter", async ({ editor }) => {
    await editor.reset({ value: "```" });
    await expect(editor.host.locator(".md-code-block")).toHaveCount(0);
    await expect(editor.host.locator("[data-editable]")).toHaveText("```");
  });
});

const previewCases = [
  {
    name: "preview renderer groups ordered list items into one ol",
    markdown: "1. one\n2. two",
    selector: "ol",
    count: 1,
    childSelector: ":scope > li",
    childCount: 2
  },
  {
    name: "preview renderer keeps soft-wrapped paragraph as one paragraph",
    markdown: "soft\nwrapped",
    selector: "p",
    count: 1,
    text: "soft\nwrapped"
  },
  {
    name: "preview renderer supports underscore strong and emphasis",
    markdown: "__strong__ and _emphasis_",
    selector: "strong, em",
    count: 2
  },
  {
    name: "preview renderer supports setext h1 and h2 headings",
    markdown: "Alpha\n=====\n\nBeta\n-----",
    selector: "h1, h2",
    count: 2
  },
  {
    name: "preview renderer supports tilde fenced code blocks",
    markdown: "~~~js\nconst x = 1;\n~~~",
    selector: "pre code",
    count: 1,
    text: "const x = 1;\n"
  },
  {
    name: "preview renderer supports empty labels and nested parentheses in links",
    markdown: "[](https://example.com/a_(b))",
    selector: 'a[href="https://example.com/a_(b)"]',
    count: 1,
    text: ""
  },
  {
    name: "preview renderer supports nested parentheses and titles in images",
    markdown: '![alt](https://example.com/a_(b).png "Title")',
    selector: 'img[src="https://example.com/a_(b).png"][title="Title"]',
    count: 1
  },
  {
    name: "Relative and fragment links preserve their href targets",
    markdown: "[relative](../guide.md) [fragment](#target)",
    selector: 'a[href="../guide.md"], a[href="#target"]',
    count: 2
  },
  {
    name: "ATX headings receive stable unique fragment IDs",
    markdown: "# Résumé\n\n# Résumé",
    selector: "#resume, #resume-1",
    count: 2
  }
];

test.describe("preview rendering semantics", () => {
  for (const scenario of previewCases) {
    test(scenario.name, async ({ editor }) => {
      await editor.reset({
        attributes: { mode: "preview" },
        value: scenario.markdown
      });
      const locator = editor.preview.locator(scenario.selector);
      await expect(locator).toHaveCount(scenario.count);
      if (scenario.text != null) await expect(locator).toHaveText(scenario.text);
      if (scenario.childSelector) {
        await expect(locator.locator(scenario.childSelector))
          .toHaveCount(scenario.childCount);
      }
    });
  }

  test("plain text extraction preserves table row and cell separators", async ({ editor }) => {
    await editor.reset({ value: "| A | B |\n| --- | --- |\n| C | D |" });
    expect(await editor.host.evaluate(element => element.getPlainText()))
      .toBe("A\tB\nC\tD");
  });

  test("commonmark mode does not render GFM table task checkbox or strikethrough", async ({ editor }) => {
    await editor.reset({
      attributes: { "markdown-flavor": "commonmark", mode: "preview" },
      value: "| A | B |\n| --- | --- |\n| C | D |\n\n- [ ] task\n\n~~strike~~"
    });
    await expect(editor.preview.locator("table, input[type=checkbox], del")).toHaveCount(0);
  });
});

test.describe("live Markdown rendering semantics", () => {
  const cases = [
    {
      name: "live renderer supports underscore strong and emphasis",
      markdown: "__strong__ and _emphasis_",
      selector: "strong, em",
      count: 2
    },
    {
      name: "live renderer supports setext h1 and h2 headings",
      markdown: "Alpha\n=====\n\nBeta\n-----",
      selector: ".md-heading",
      count: 2
    },
    {
      name: "live renderer supports tilde fenced code blocks",
      markdown: "~~~js\nconst x = 1;\n~~~",
      selector: ".md-code-block",
      count: 1
    },
    {
      name: "live renderer decorates nested-parenthesis links without truncating URLs",
      markdown: "[site](https://example.com/a_(b))",
      selector: 'a[href="https://example.com/a_(b)"]',
      count: 1
    },
    {
      name: "Live renderer preserves advanced link source text and targets",
      markdown: "[a [nested] label](<https://example.com/a b>)",
      selector: "a",
      count: 1
    }
  ];

  for (const scenario of cases) {
    test(scenario.name, async ({ editor }) => {
      await editor.reset({ value: scenario.markdown });
      await expect(editor.host.locator(scenario.selector)).toHaveCount(scenario.count);
    });
  }
});
