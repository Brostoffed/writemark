import { expect, test } from "./support/editor-fixture.js";

async function renderedHtml(editor, markdown) {
  await editor.reset({ value: markdown });
  return editor.host.evaluate(element => element.getHTML());
}

const htmlCases = [
  {
    name: "ATX heading keeps trailing hash when it is not a closing sequence",
    markdown: "# title#",
    contains: "<h1",
    text: "title#"
  },
  {
    name: "ATX heading removes space-delimited closing sequence",
    markdown: "# title #",
    contains: "<h1",
    text: "title"
  },
  {
    name: "ATX parser supports empty headings",
    markdown: "###",
    contains: "<h3"
  },
  {
    name: "Escaped punctuation remains literal instead of becoming emphasis",
    markdown: "\\*literal\\*",
    contains: "*literal*",
    excludes: "<em>"
  },
  {
    name: "Multi-backtick code span can contain a backtick",
    markdown: "``a ` b``",
    contains: "<code>a ` b</code>"
  },
  {
    name: "Unmatched backtick run stays literal instead of parsing from inside opener",
    markdown: "``unmatched ` inner",
    contains: "``unmatched ` inner",
    excludes: "<code>"
  },
  {
    name: "Link parser supports balanced brackets in labels",
    markdown: "[a [nested] label](https://example.com)",
    contains: ">a [nested] label</a>"
  },
  {
    name: "Link parser supports empty and angle-bracket destinations",
    markdown: "[empty]() [angle](<https://example.com/a(b)>)",
    contains: 'href="https://example.com/a(b)"'
  },
  {
    name: "Tilde fence accepts backticks in info string",
    markdown: "~~~lang`meta\nx\n~~~",
    contains: "<pre"
  },
  {
    name: "Backtick fence accepts tildes in info string",
    markdown: "```lang~meta\nx\n```",
    contains: "<pre"
  },
  {
    name: "preview renderer applies GFM table column alignment",
    markdown: "| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |",
    contains: 'style="text-align:center"'
  },
  {
    name: "table renderer unescapes escaped pipe characters inside cells",
    markdown: "| A |\n| --- |\n| left\\|right |",
    contains: "left|right"
  }
];

test.describe("Markdown parser output", () => {
  for (const scenario of htmlCases) {
    test(scenario.name, async ({ editor }) => {
      const html = await renderedHtml(editor, scenario.markdown);
      expect(html).toContain(scenario.contains);
      if (scenario.text != null) {
        const text = await editor.host.evaluate((_, markup) => {
          const document = new DOMParser().parseFromString(markup, "text/html");
          return document.body.textContent;
        }, html);
        expect(text).toContain(scenario.text);
      }
      if (scenario.excludes) expect(html).not.toContain(scenario.excludes);
    });
  }

  test("preview renderer supports nested parentheses and titles in images", async ({ editor }) => {
    const html = await renderedHtml(
      editor,
      '![alt](https://example.com/a_(b).png "Title")'
    );
    expect(html).toContain('src="https://example.com/a_(b).png"');
    expect(html).toContain('title="Title"');
  });

  test("preview renderer supports empty labels and nested parentheses in links", async ({ editor }) => {
    const html = await renderedHtml(editor, "[](https://example.com/a_(b))");
    expect(html).toContain('href="https://example.com/a_(b)"');
    expect(html).toContain("></a>");
  });
});

test.describe("heading editing", () => {
  test("Backspace at content start removes full spaced heading marker", async ({ editor, page }) => {
    await editor.reset({ value: "### heading" });
    await editor.setSelection(4);
    await page.keyboard.press("Backspace");
    expect(await editor.value()).toBe("heading");
    expect(await editor.selection()).toEqual({ start: 0, end: 0 });
  });

  test("Heading shortcut works after Enter in an empty editor", async ({ editor, page }) => {
    await editor.reset();
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.press("Enter");
    await page.keyboard.type("#");
    await page.keyboard.press("Space");
    expect(await editor.value()).toBe("\n# ");
    await expect(editor.host.locator(".md-heading")).toBeVisible();
  });
});

test.describe("code fence actions", () => {
  test("code.setLanguage updates opening fence language", async ({ editor }) => {
    await editor.reset({ value: "```\nconst x = 1;\n```" });
    await editor.setSelection(5);
    expect(await editor.host.evaluate(element =>
      element.exec("code.setLanguage", { language: "javascript" })
    )).toBe(true);
    expect(await editor.value()).toBe("```javascript\nconst x = 1;\n```");
  });

  test("code.setLanguage preserves tilde fence marker", async ({ editor }) => {
    await editor.reset({ value: "~~~\nconst x = 1;\n~~~" });
    await editor.setSelection(5);
    expect(await editor.host.evaluate(element =>
      element.exec("code.setLanguage", { language: "javascript" })
    )).toBe(true);
    expect(await editor.value()).toBe("~~~javascript\nconst x = 1;\n~~~");
  });

  test("smart Enter closes tilde fence with matching marker", async ({ editor, page }) => {
    await editor.reset({ value: "~~~python" });
    await editor.setSelection(9);
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("~~~python\n\n~~~");
  });

  test("enter inside backtick fence inserts a raw newline", async ({ editor, page }) => {
    const markdown = "```\nconst x = 1;\n```";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.indexOf(";") + 1);
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("```\nconst x = 1;\n\n```");
  });

  test("enter inside tilde fence inserts a raw newline", async ({ editor, page }) => {
    const markdown = "~~~\nconst x = 1;\n~~~";
    await editor.reset({ value: markdown });
    await editor.setSelection(markdown.indexOf(";") + 1);
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("~~~\nconst x = 1;\n\n~~~");
  });
});

test.describe("heading fragments", () => {
  test("Live fragment link navigates to matching heading", async ({ editor }) => {
    await editor.reset({ value: "# Target\n\n[Jump](#target)" });
    await editor.host.locator('.live-editor a[href="#target"]').click();
    expect(await editor.selection()).toEqual({ start: 0, end: 0 });
  });

  test("Preview fragment link navigates to matching heading", async ({ editor }) => {
    await editor.reset({
      attributes: { preview: "below" },
      value: "# Target\n\n[Jump](#target)"
    });
    await editor.preview.locator('a[href="#target"]').click();
    const top = await editor.preview.locator("#target").evaluate(element =>
      element.getBoundingClientRect().top
    );
    expect(Number.isFinite(top)).toBe(true);
  });
});

test.describe("table and task source preservation", () => {
  test("editing live table cell re-escapes pipe characters in Markdown source", async ({ editor }) => {
    await editor.reset({ value: "| A | B |\n| --- | --- |\n| value | keep |" });
    await editor.replaceEditable(
      editor.host.locator("tbody .md-cell").first(),
      "left|right"
    );
    await expect.poll(() => editor.value())
      .toBe("| A | B |\n| --- | --- |\n| left\\|right | keep |");
  });

  test("Editing rendered task text preserves hidden Markdown task marker", async ({ editor }) => {
    await editor.reset({ value: "- [x] original" });
    await editor.replaceEditable(
      editor.host.locator(".md-task-source"),
      "updated"
    );
    await expect.poll(() => editor.value()).toBe("- [x] updated");
  });

  test("Keyboard task toggle updates source and preserves checkbox focus", async ({ editor }) => {
    await editor.reset({ value: "- [ ] keyboard task" });
    const checkbox = editor.host.getByRole("checkbox", { name: "keyboard task" });
    await checkbox.focus();
    await expect(checkbox).toBeFocused();
    await checkbox.press("Space");
    expect(await editor.value()).toBe("- [x] keyboard task");
    await expect(checkbox).toBeFocused();
  });
});
