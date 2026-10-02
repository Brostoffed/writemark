import { expect, test } from "./support/editor-fixture.js";

function parseMarkedValue(marked) {
  let value = "";
  let selectionStart = -1;
  let selectionEnd = -1;

  for (let index = 0; index < marked.length; index += 1) {
    const character = marked[index];
    if (character === "|") {
      selectionStart = value.length;
      selectionEnd = value.length;
      continue;
    }
    if (character === "[" && marked[index + 1] === "]") {
      value += character;
      continue;
    }
    if (
      character === "["
      && /^(?: |x|X)\]/.test(marked.slice(index + 1, index + 3))
    ) {
      value += character;
      continue;
    }
    if (character === "]" && /\[(?: |x|X)$/.test(value.slice(-2))) {
      value += character;
      continue;
    }
    if (character === "[" && selectionStart === -1) {
      selectionStart = value.length;
      continue;
    }
    if (
      character === "]"
      && selectionStart !== -1
      && selectionEnd === -1
    ) {
      selectionEnd = value.length;
      continue;
    }
    value += character;
  }

  if (selectionStart === -1) selectionStart = value.length;
  if (selectionEnd === -1) selectionEnd = selectionStart;
  return { selectionEnd, selectionStart, value };
}

function formatSelectionFixture(value, start, end) {
  if (start === end) {
    return `${value.slice(0, start)}|${value.slice(start)}`;
  }
  return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}

const actionCases = [
  { name: "continues bullet list", before: "- one|", action: "editor.smartEnter", after: "- one\n- |" },
  { name: "exits empty bullet list", before: "- one\n- |", action: "editor.smartEnter", after: "- one\n|" },
  { name: "continues ordered list and increments", before: "3. alpha|", action: "editor.smartEnter", after: "3. alpha\n4. |" },
  { name: "exits empty ordered list", before: "1. alpha\n2. |", action: "editor.smartEnter", after: "1. alpha\n|" },
  { name: "continues checked task as unchecked", before: "- [x] done|", action: "editor.smartEnter", after: "- [x] done\n- [ ] |" },
  { name: "exits empty task list", before: "- [ ] |", action: "editor.smartEnter", after: "|" },
  { name: "continues blockquote", before: "> quoted|", action: "editor.smartEnter", after: "> quoted\n> |" },
  { name: "exits empty blockquote", before: "> |", action: "editor.smartEnter", after: "|" },
  { name: "heading enter creates the next line", before: "## title|", action: "editor.smartEnter", after: "## title\n|" },
  { name: "enter inside code fence is raw newline", before: "```\nconst x = 1;|\n```", action: "editor.smartEnter", after: "```\nconst x = 1;\n|\n```" },
  { name: "opening code fence auto-closes", before: "```python|", action: "editor.smartEnter", after: "```python\n|\n```" },
  { name: "tab indents list item", before: "- a\n- b|", action: "editor.smartTab", after: "- a\n  - b|" },
  { name: "shift tab outdents list item", before: "- a\n  - b|", action: "editor.smartOutdent", after: "- a\n- b|" },
  { name: "backspace removes list marker", before: "- |item", action: "editor.smartBackspace", after: "|item" },
  { name: "backspace at start of paragraph joins previous line", before: "alpha\n|beta", action: "editor.smartBackspace", after: "alpha|beta" },
  { name: "backspace at empty line start joins previous line", before: "alpha\n|", action: "editor.smartBackspace", after: "alpha|" },
  { name: "delete at end of line joins next line", before: "alpha|\nbeta", action: "editor.smartDelete", after: "alpha|beta" },
  { name: "markdown shortcut converts task brackets", before: "[]|", action: "editor.markdownShortcut", after: "- [ ] |" },
  { name: "markdown shortcut adds heading space", before: "##|", action: "editor.markdownShortcut", after: "## |" },
  { name: "bold insertion no selection", before: "hello |", action: "inline.bold", after: "hello **|**" },
  { name: "bold wraps selection", before: "hello [world]", action: "inline.bold", after: "hello **world**|" },
  { name: "link wraps selection with pasted URL", before: "[OpenAI]", action: "inline.link", args: { url: "https://openai.com" }, after: "[OpenAI](https://openai.com)|" },
  { name: "code fence wraps selection", before: "[const x = 1;]", action: "block.codeFence", after: "```\nconst x = 1;|\n```" },
  { name: "table insertion includes delimiter and body row", before: "|", action: "block.table", args: { rows: 1, cols: 2 }, after: "| [Column 1] | Column 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |" },
  { name: "delete selection removes selected markdown", before: "[# Title\n\nBody]", action: "editor.deleteSelection", after: "|" },
  { name: "smart delete removes selected markdown", before: "[# Title\n\nBody]", action: "editor.smartDelete", after: "|" },
  { name: "smart backspace removes selected markdown", before: "[# Title\n\nBody]", action: "editor.smartBackspace", after: "|" }
];

test.describe("action fixtures", () => {
  for (const fixture of actionCases) {
    test(fixture.name, async ({ editor }) => {
      const before = parseMarkedValue(fixture.before);
      await editor.reset({ value: before.value });
      await editor.setSelection(before.selectionStart, before.selectionEnd);

      const executed = await editor.host.evaluate(
        (element, actionFixture) =>
          element.exec(actionFixture.action, actionFixture.args),
        fixture
      );
      expect(executed).toBe(true);

      const selection = await editor.selection();
      const actual = formatSelectionFixture(
        await editor.value(),
        selection.start,
        selection.end
      );
      expect(actual).toBe(fixture.after);
    });
  }
});

test.describe("formatting action inputs", () => {
  test("inline code uses a delimiter longer than selected backticks", async ({ editor }) => {
    await editor.reset({ value: "a`b" });
    await editor.setSelection(0, 3);
    expect(await editor.host.evaluate(element => element.exec("inline.code"))).toBe(true);
    expect(await editor.value()).toBe("``a`b``");
    expect(await editor.host.evaluate(element => element.getHTML())).toContain("<code>a`b</code>");
  });

  test("link and image actions escape fields that contain Markdown delimiters", async ({ editor }) => {
    await editor.reset({ value: "a]b" });
    await editor.setSelection(0, 3);
    expect(await editor.host.evaluate(element =>
      element.exec("inline.link", { url: "https://example.com/a_(b)" })
    )).toBe(true);
    expect(await editor.value()).toBe("[a\\]b](https://example.com/a_%28b%29)");
    const linkHtml = await editor.host.evaluate(element => element.getHTML());
    expect(linkHtml).toContain('href="https://example.com/a_%28b%29"');
    expect(linkHtml).toContain(">a]b</a>");

    await editor.reset();
    expect(await editor.host.evaluate(element =>
      element.exec("inline.image", { alt: "a]b", src: "https://example.com/a_(b)" })
    )).toBe(true);
    expect(await editor.value()).toBe("![a\\]b](https://example.com/a_%28b%29)");
    expect(await editor.host.evaluate(element => element.getHTML())).toContain('alt="a]b"');
  });

  test("code language actions reject line breaks without changing Markdown", async ({ editor }) => {
    await editor.reset({ value: "before" });
    expect(await editor.host.evaluate(element =>
      element.exec("block.codeFence", { language: "js\nattack" })
    )).toBe(false);
    expect(await editor.value()).toBe("before");

    await editor.reset({ value: "~~~text\ncode\n~~~" });
    await editor.setSelection(9);
    expect(await editor.host.evaluate(element =>
      element.exec("code.setLanguage", { language: "js\nattack" })
    )).toBe(false);
    expect(await editor.value()).toBe("~~~text\ncode\n~~~");
  });

  test("code fences use a marker longer than selected backtick runs", async ({ editor }) => {
    await editor.reset({ value: "before\n```\ninside\n```\nafter" });
    await editor.setSelection(0, (await editor.value()).length);
    expect(await editor.host.evaluate(element => element.exec("block.codeFence"))).toBe(true);
    expect(await editor.value()).toMatch(/^````\n/);
    expect(await editor.value()).toMatch(/\n````$/);
    expect(await editor.host.evaluate(element => element.getHTML())).toContain("<pre><code");
  });
});
