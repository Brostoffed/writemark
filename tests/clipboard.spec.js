import { expect, test } from "./support/editor-fixture.js";

async function paste(editor, markdown, data, selection = [0, 0]) {
  return editor.host.evaluate((element, options) => {
    element.value = options.markdown;
    element.setSelectionRange(options.selection[0], options.selection[1]);
    let prevented = false;
    const clipboardData = {
      files: [],
      getData(type) {
        return options.data[type] || "";
      },
      setData() {}
    };
    element._onPaste({
      clipboardData,
      preventDefault() {
        prevented = true;
      }
    });
    return { prevented, value: element.value };
  }, { data, markdown, selection });
}

async function copy(editor, markdown, selection) {
  return editor.host.evaluate((element, options) => {
    element.value = options.markdown;
    element.setSelectionRange(options.selection[0], options.selection[1]);
    const output = {};
    let prevented = false;
    const clipboardData = {
      files: [],
      getData(type) {
        return output[type] || "";
      },
      setData(type, value) {
        output[type] = value;
      }
    };
    element._onLiveCopy({
      clipboardData,
      preventDefault() {
        prevented = true;
      }
    });
    return { output, prevented };
  }, { markdown, selection });
}

test.describe("paste", () => {
  test("live paste intercepts plain Markdown and inserts canonical source", async ({ editor }) => {
    const result = await paste(editor, "", {
      "text/plain": "# Pasted\n\n**bold**"
    });
    expect(result).toEqual({
      prevented: true,
      value: "# Pasted\n\n**bold**"
    });
  });

  test("pasted Markdown renders immediately in live mode", async ({ editor }) => {
    await paste(editor, "", { "text/plain": "# Pasted\n\n**bold**" });
    await expect(editor.host.locator(".md-h1")).toBeVisible();
    await expect(editor.host.locator("strong")).toHaveText("bold");
  });

  test("block Markdown paste separates from surrounding inline text", async ({ editor }) => {
    const result = await paste(
      editor,
      "before after",
      { "text/plain": "# Block" },
      [6, 6]
    );
    expect(result.value).toBe("before\n# Block\n after");
  });

  test("tab-separated paste converts to Markdown table", async ({ editor }) => {
    const result = await paste(editor, "", {
      "text/plain": "Name\tAge\nAda\t37"
    });
    expect(result.value).toBe(
      "| Name | Age |\n| --- | --- |\n| Ada | 37 |"
    );
  });

  test("rich HTML paste converts to Markdown when plain text is not Markdown-like", async ({ editor }) => {
    const result = await paste(editor, "", {
      "text/plain": "Bold site",
      "text/html": '<p><strong>Bold</strong> <a href="https://example.com">site</a></p>'
    });
    expect(result.value).toBe("**Bold** [site](https://example.com)");
  });
});

test.describe("copy", () => {
  const markdown = "**bold** and [site](https://example.com) and `code`";

  test("copying visible bold text includes Markdown delimiters", async ({ editor }) => {
    const result = await copy(editor, markdown, [2, 6]);
    expect(result.prevented).toBe(true);
    expect(result.output).toMatchObject({
      "text/plain": "**bold**",
      "text/markdown": "**bold**",
      "text/x-markdown": "**bold**"
    });
  });

  test("copying visible link label includes Markdown link target", async ({ editor }) => {
    const start = markdown.indexOf("site");
    const result = await copy(editor, markdown, [start, start + 4]);
    expect(result.output["text/plain"]).toBe("[site](https://example.com)");
  });

  test("copying visible inline code includes backticks", async ({ editor }) => {
    const start = markdown.indexOf("code");
    const result = await copy(editor, markdown, [start, start + 4]);
    expect(result.output["text/plain"]).toBe("`code`");
  });

  test("Copying multi-backtick code content includes matching delimiters", async ({ editor }) => {
    const source = "``a`b``";
    const result = await copy(editor, source, [2, 5]);
    expect(result.output).toMatchObject({
      "text/plain": source,
      "text/markdown": source
    });
  });

  test("Copying balanced-bracket link label includes complete link target", async ({ editor }) => {
    const source = "[outer [inner]](https://example.com)";
    const start = source.indexOf("outer");
    const result = await copy(editor, source, [start, start + 13]);
    expect(result.output["text/plain"]).toBe(source);
  });

  test("Copying escaped emphasis content does not add formatting markers", async ({ editor }) => {
    const source = "\\*literal*";
    const start = source.indexOf("literal");
    const result = await copy(editor, source, [start, start + 7]);
    expect(result.output["text/plain"]).toBe("literal");
  });

  test("Copying escaped link text does not expand to a link", async ({ editor }) => {
    const source = "\\[site](https://example.com)";
    const start = source.indexOf("site");
    const result = await copy(editor, source, [start, start + 4]);
    expect(result.output["text/plain"]).toBe("site");
  });
});
