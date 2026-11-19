import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "./support/editor-fixture.js";

const fuzzRuns = Math.max(1, Math.min(10000, Number.parseInt(process.env.WRITEMARK_FUZZ_RUNS || "256", 10) || 256));
const fuzzSeed = Number(process.env.WRITEMARK_FUZZ_SEED || "0x61c0ffee") >>> 0;

const root = new URL("./fixtures/clipboard-corpus/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
const corpus = manifest.fixtures.map(fixture => ({
  ...fixture,
  input: readFileSync(new URL(fixture.html, root), "utf8")
}));

for (const capture of manifest.nativeCaptures) {
  for (const format of ["text/html", "text/plain", "both"]) {
    for (const mode of ["source", "live"]) {
      test(`${capture.producer} native clipboard keeps cell text in ${mode} with ${format}`, async ({ editor }) => {
        const payload = [];
        for (const entry of capture.formats) {
          if (format !== "both" && format !== entry.browserType) continue;
          const bytes = readFileSync(new URL(entry.file, root));
          expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
          payload.push([entry.browserType, bytes.toString("utf8")]);
        }
        await editor.reset({ attributes: { mode } });
        const result = await editor.host.evaluate((host, payload) => {
          const clipboard = new DataTransfer();
          for (const [type, text] of payload) clipboard.setData(type, text);
          const target = host.shadowRoot.querySelector(host.mode === "source" ? "textarea" : ".live-editor");
          const event = new Event("paste", { bubbles: true, cancelable: true });
          Object.defineProperty(event, "clipboardData", { value: clipboard });
          target.dispatchEvent(event);
          const preview = document.createElement("template");
          preview.innerHTML = host.getHTML();
          return {
            prevented: event.defaultPrevented,
            preview: Array.from(preview.content.querySelectorAll("tr"), row => Array.from(row.children, cell => cell.textContent)),
            live: Array.from(host.shadowRoot.querySelectorAll(".md-cell"), cell => cell.textContent ? cell.innerText : ""),
            text: host.getText()
          };
        }, payload);
        expect(result.prevented).toBe(true);
        expect(result.preview).toEqual(capture.rows);
        expect(result.text).toBe(capture.rows.map(row => row.join("\t")).join("\n"));
        if (mode === "live") expect(result.live).toEqual(capture.rows.flat());
      });
    }
  }
}

for (const fixture of corpus) {
  test(`${fixture.id}: converter matches the reviewed corpus`, async ({ editor, page }) => {
    expect(createHash("sha256").update(fixture.input).digest("hex")).toBe(fixture.sha256);
    expect(readFileSync(new URL(fixture.text, root), "utf8")).toBe(fixture.expectedMarkdown);
    const output = await page.evaluate(async html => {
      const { htmlToMarkdown } = await import("/dist/writemark-editor.js");
      return htmlToMarkdown(html);
    }, fixture.input);
    expect(output).toBe(fixture.expectedMarkdown);
  });
  for (const mode of ["source", "live"]) {
    test(`${fixture.id}: ${mode} paste keeps canonical Markdown`, async ({ editor }) => {
      await editor.reset({ attributes: { mode } });
      const result = await editor.host.evaluate((element, html) => {
        const target = element.shadowRoot.querySelector(element.mode === "source" ? "textarea" : ".live-editor");
        const clipboardData = new DataTransfer();
        clipboardData.setData("text/html", html);
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: clipboardData });
        target.dispatchEvent(event);
        return { prevented: event.defaultPrevented, value: element.value };
      }, fixture.input);
      expect(result.prevented).toBe(true);
      expect(result.value).toBe(fixture.expectedMarkdown);
      const rendered = await editor.host.evaluate(element => {
        const before = element.value;
        const html = element.getHTML();
        return { before, after: element.value, html };
      });
      expect(rendered.after).toBe(rendered.before);
      expect(rendered.html).not.toMatch(/<script|onerror=|javascript:/i);
      if (fixture.id === "table") expect(rendered.html).toContain("<table");
      if (fixture.id === "code-whitespace") expect(rendered.html).toContain(" 01 \n 23 ");
      if (fixture.id === "google-docs") expect(rendered.html).toContain("<strong>text</strong>");
      if (fixture.id === "nested-list") expect(rendered.html).toContain("Alpha");
      const copied = await editor.host.evaluate(element => {
        const before = element.value;
        element.setSelectionRange(0, before.length);
        const clipboardData = new DataTransfer();
        if (element.mode !== "source") element._onLiveCopy({ clipboardData, preventDefault() {} });
        return { before, after: element.value, markdown: clipboardData.getData("text/markdown") };
      });
      expect(copied.after).toBe(copied.before);
      if (fixture.expectedMarkdown && mode === "live") expect(copied.markdown).toBe(fixture.expectedMarkdown);
      if (mode === "source" && fixture.expectedMarkdown) {
        await editor.source.press("ControlOrMeta+C");
        expect(await editor.value()).toBe(fixture.expectedMarkdown);
        expect(await editor.source.evaluate(textarea => textarea.value.slice(textarea.selectionStart, textarea.selectionEnd))).toBe(fixture.expectedMarkdown);
      }
      if (fixture.expectedMarkdown) {
        await editor.host.evaluate(element => element._undo());
        expect(await editor.value()).toBe("");
        await editor.host.evaluate(element => element._redo());
        expect(await editor.value()).toBe(fixture.expectedMarkdown);
      }
    });
  }
}

test("hostile HTML conversion stays inert with a fixed seed", async ({ editor, page }) => {
  const requests = [];
  page.on("request", request => {
    if (request.url().startsWith("https://clipboard.invalid")) requests.push(request.url());
  });
  const result = await page.evaluate(async ({ runs, initialSeed }) => {
    const { htmlToMarkdown, renderMarkdown } = await import("/dist/writemark-editor.js");
    window.clipboardExecuted = false;
    let seed = initialSeed;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const tags = ["script", "iframe", "object", "svg", "math", "template"];
    for (let index = 0; index < runs; index++) {
      const tag = tags[next() % tags.length];
      const text = `雪 café 😀 ${next()} | [label]`;
      const wrappers = ["div", "section", "blockquote", "strong", "em", "span"];
      let nested = `<${tag} onload="window.clipboardExecuted=true">bad</${tag}>`;
      for (let depth = next() % 7; depth > 0; depth--) {
        const wrapper = wrappers[next() % wrappers.length];
        nested = `<${wrapper}>${nested}</${wrapper}>`;
      }
      const protocols = ["javascript:", "data:text/html,", "vbscript:", "java&#x73;cript:"];
      const unsafe = protocols[next() % protocols.length];
      const cells = Array.from({ length: 1 + next() % 5 }, () => `<td>${next()} | [x] <br> \`x\`</td>`).join("");
      const rows = Array.from({ length: 1 + next() % 4 }, () => `<tr>${cells}</tr>`).join("");
      const html = `${nested}<table>${rows}</table><a href="${unsafe}window.clipboardExecuted=true">[x](y)</a><${tag} src="https://clipboard.invalid/${index}" onload="window.clipboardExecuted=true">bad</${tag}><p>${text}</p><a href="javascript:window.clipboardExecuted=true">unsafe</a><img src="data:image/svg+xml,bad" onerror="window.clipboardExecuted=true" alt="fallback">`;
      const markdown = htmlToMarkdown(html);
      if (markdown !== htmlToMarkdown(html)) return "unstable";
      const preview = renderMarkdown(markdown);
      if (/<script|<iframe|<object|<svg|onerror=|javascript:|data:image/i.test(preview)) return preview;
      if (!markdown.includes("雪 café 😀")) return "lost Unicode";
    }
    return window.clipboardExecuted;
  }, { runs: fuzzRuns, initialSeed: fuzzSeed });
  expect(result).toBe(false);
  expect(requests).toEqual([]);
});

test("Markdown MIME types take priority over HTML and TSV", async ({ editor }) => {
  for (const type of ["text/markdown", "text/x-markdown"]) {
    const source = "```\n  café\t😀  \n\n```";
    const value = await editor.host.evaluate((element, data) => {
      element.value = "";
      element.setSelectionRange(0, 0);
      const clipboardData = new DataTransfer();
      clipboardData.setData(data.type, data.source);
      clipboardData.setData("text/plain", "A\tB\nC\tD");
      clipboardData.setData("text/html", "<b>wrong</b>");
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: clipboardData });
      element.shadowRoot.querySelector(".live-editor").dispatchEvent(event);
      return element.value;
    }, { type, source });
    expect(value).toBe(source);
  }
});

test("authored edge cases keep links, table pipes, and code spaces", async ({ editor, page }) => {
  const output = await page.evaluate(async () => {
    const { htmlToMarkdown } = await import("/dist/writemark-editor.js");
    return {
      links: htmlToMarkdown('<p><a href="https://example.com/a_(b)">a]b</a><img src="javascript:bad" alt="x[y]"></p>'),
      table: htmlToMarkdown('<table><tr><th>A|B</th><th>C</th></tr><tr><td>雪<br>😀</td><td>café</td></tr></table>'),
      code: htmlToMarkdown('<pre>  a\t\n\n\n b  </pre>')
    };
  });
  expect(output.links).toBe("[a\\]b](https://example.com/a_%28b%29)x\\[y\\]");
  expect(output.table).toBe("| A\\|B | C |\n| --- | --- |\n| 雪 😀 | café |");
  expect(output.code).toBe("```\n  a\t\n\n\n b  \n```");
});


test("code placeholders cannot replace source text or lose nested prefixes", async ({ editor, page }) => {
  const output = await page.evaluate(async () => {
    const { htmlToMarkdown } = await import("/dist/writemark-editor.js");
    return {
      literal: htmlToMarkdown("<p>&#xE000;writemark-code-0&#xE001;</p><pre>  body  </pre>"),
      namespaced: htmlToMarkdown("<p>&#xE000;writemark-code-0-0&#xE001;</p><pre>body</pre>"),
      quote: htmlToMarkdown("<blockquote><pre>  a\n\n\nb  </pre></blockquote>"),
      list: htmlToMarkdown("<ul><li>item<pre>  a\n\nb  </pre></li></ul>")
    };
  });
  expect(output.literal).toBe("\uE000writemark\\-code\\-0\uE001\n\n```\n  body  \n```");
  expect(output.namespaced).toBe("\uE000writemark\\-code\\-0\\-0\uE001\n\n```\nbody\n```");
  expect(output.quote).toBe("> ```\n>   a\n> \n> \n> b  \n> ```");
  expect(output.list).toBe("- item\n\n  ```\n    a\n  \n  b  \n  ```");
});

test("table inline pipes stay within their cells", async ({ editor, page }) => {
  const result = await page.evaluate(async () => {
    const { htmlToMarkdown, renderMarkdown } = await import("/dist/writemark-editor.js");
    const markdown = htmlToMarkdown('<table><tr><th>Kind</th><th>Value</th></tr><tr><td>code</td><td><code>a|b</code></td></tr><tr><td>image</td><td><img src="https://example.com/x.png" alt="a|b"></td></tr><tr><td>link</td><td><a href="https://example.com/a|b">a|b</a></td></tr></table>');
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(markdown);
    return {
      markdown,
      columns: Array.from(template.content.querySelectorAll("tr")).map(row => row.children.length),
      code: template.content.querySelector("code")?.textContent,
      alt: template.content.querySelector("img")?.alt,
      href: template.content.querySelector("a")?.getAttribute("href")
    };
  });
  expect(result.columns).toEqual([2, 2, 2, 2]);
  expect(result.code).toBe("a|b");
  expect(result.alt).toBe("a|b");
  expect(result.href).toBe("https://example.com/a|b");
  expect(result.markdown).toContain("`a\\|b`");
});

test("table code blocks keep their text without internal markers", async ({ editor, page }) => {
  const result = await page.evaluate(async () => {
    const { htmlToMarkdown, renderMarkdown } = await import("/dist/writemark-editor.js");
    const markdown = htmlToMarkdown("<table><tr><th>Code</th></tr><tr><td><div><pre>a|b\n\nc</pre></div></td></tr></table>");
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(markdown);
    return { markdown, code: template.content.querySelector("code")?.textContent, columns: Array.from(template.content.querySelectorAll("tr")).map(row => row.children.length) };
  });
  expect(result.markdown).not.toContain("\uE000writemark-code-");
  expect(result.code).toBe("a|b c");
  expect(result.columns).toEqual([1, 1]);
});

test("converter accepts nullish runtime inputs and bounded deep wrappers", async ({ editor, page }) => {
  const result = await page.evaluate(async () => {
    const { htmlToMarkdown } = await import("/dist/writemark-editor.js");
    return {
      nullValue: htmlToMarkdown(null),
      undefinedValue: htmlToMarkdown(undefined),
      styled: htmlToMarkdown('<span style="font-weight:bold;font-style:italic">both</span>'),
      deep: htmlToMarkdown("<span>".repeat(1500) + "雪 😀<script>bad()</script>" + "</span>".repeat(1500)),
      listCode: htmlToMarkdown("<ul><li><pre>  a\n\nb  </pre></li></ul>")
    };
  });
  expect(result.nullValue).toBe("");
  expect(result.undefinedValue).toBe("");
  expect(result.styled).toBe("***both***");
  expect(result.deep).toBe("雪 😀");
  expect(result.listCode).toBe("- \n  ```\n    a\n  \n  b  \n  ```");
  expect(result.listCode).not.toContain("writemark-code");
});


test("inline marks and links retain edge spaces", async ({ editor, page }) => {
  const result = await page.evaluate(async () => {
    const { htmlToMarkdown, renderMarkdown } = await import("/dist/writemark-editor.js");
    const inputs = [
      '<p>A<strong> B </strong>C</p>',
      '<p>A<em> B </em>C</p>',
      '<p>A<span style="font-weight:bold;font-style:italic"> B </span>C</p>',
      '<p>A<a href="https://example.com"> B </a>C</p>',
      '<p>A</p><hr><p><del> B </del><s>C</s></p>'
    ];
    return inputs.map(input => {
      const markdown = htmlToMarkdown(input);
      const template = document.createElement("template");
      template.innerHTML = renderMarkdown(markdown);
      return { markdown, text: template.content.textContent, html: template.innerHTML };
    });
  });
  expect(result.map(value => value.markdown)).toEqual([
    "A **B** C", "A *B* C", "A ***B*** C", "A [B](https://example.com) C", "A\n\n---\n\n~~B~~ ~~C~~"
  ]);
  for (const value of result.slice(0, 4)) expect(value.text.trim()).toBe("A B C");
  expect(result[0].html).toContain("<strong>B</strong>");
  expect(result[1].html).toContain("<em>B</em>");
  expect(result[4].html).toContain("<hr");
  expect(result[4].html).toContain("<del>B</del>");
});


test("table code keeps literal backslashes and pipes", async ({ editor, page }) => {
  const result = await page.evaluate(async () => {
    const { htmlToMarkdown, renderMarkdown } = await import("/dist/writemark-editor.js");
    const input = "a\\|b \\ path";
    const markdown = htmlToMarkdown(`<table><tr><th>Code</th><th>Text</th></tr><tr><td><code>${input}</code></td><td><pre>${input}\n\nc</pre></td></tr></table>`);
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(markdown);
    return { markdown, input, code: Array.from(template.content.querySelectorAll("code")).map(code => code.textContent) };
  });
  expect(result.code).toEqual([result.input, `${result.input} c`]);
  expect(result.markdown).not.toContain("writemark-code");
});

for (const mode of ["source", "live"]) {
  test(`${mode} TSV paste keeps literal backslashes, pipes, and Markdown cell text`, async ({ editor }) => {
    const rows = [["Left", "Right"]];
    for (let count = 0; count <= 8; count++) rows.push([`a${"\\".repeat(count)}|b`, `right ${count}`]);
    rows.push(["**bold** _italic_ ~~strike~~ `code`", "[label](https://example.com) \\*literal\\* <tag> & text"]);
    await editor.reset({ attributes: { mode } });
    const result = await editor.host.evaluate((host, text) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: clipboardData });
      host.shadowRoot.querySelector(host.mode === "source" ? "textarea" : ".live-editor").dispatchEvent(event);
      const template = document.createElement("template");
      template.innerHTML = host.getHTML();
      return {
        prevented: event.defaultPrevented,
        rows: Array.from(template.content.querySelectorAll("tr"), row => Array.from(row.children, cell => cell.textContent)),
        text: host.getText(),
        formatting: template.content.querySelectorAll("strong,em,del,code,a").length,
        live: Array.from(host.shadowRoot.querySelectorAll(".md-cell"), cell => cell.innerText)
      };
    }, rows.map(row => row.join("\t")).join("\n"));
    expect(result.prevented).toBe(true);
    expect(result.rows).toEqual(rows);
    expect(result.text).toBe(rows.map(row => row.join("\t")).join("\n"));
    expect(result.formatting).toBe(0);
    if (mode === "live") expect(result.live).toEqual(rows.flat());
  });

  test(`${mode} HTML paste keeps a parent continuation after its nested list`, async ({ editor, page }) => {
    const cases = [
      {
        html: "<ul><li>Parent<ul><li>Child</li></ul>After</li></ul>",
        markdown: "- Parent\n  - Child\n\n  After",
        tail: "After", childToken: "Child"
      },
      {
        html: "<ol start='10'><li>Parent<ul><li><code>a|b</code></li></ul><p><strong>After</strong></p><p>Last</p></li></ol>",
        markdown: "10. Parent\n    - `a|b`\n\n    **After**\n\n    Last",
        tail: "AfterLast", childToken: "a|b"
      },
      {
        html: "<ul><li>Parent<ul><li>Child<ul><li>Grandchild</li></ul><p>Child tail</p></li></ul><p>Parent tail</p></li></ul>",
        markdown: "- Parent\n  - Child\n    - Grandchild\n\n    Child tail\n\n  Parent tail",
        tail: "Parent tail", childToken: "Child"
      }
    ];
    for (const fixture of cases) {
      const converted = await page.evaluate(async html => (await import("/dist/writemark-editor.js")).htmlToMarkdown(html), fixture.html);
      expect(converted).toBe(fixture.markdown);
      await editor.reset({ attributes: { mode } });
      const result = await editor.host.evaluate((host, html) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData("text/html", html);
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: clipboardData });
        host.shadowRoot.querySelector(host.mode === "source" ? "textarea" : ".live-editor").dispatchEvent(event);
        const template = document.createElement("template");
        template.innerHTML = host.getHTML();
        const parent = template.content.querySelector("li");
        const nested = parent.querySelector("ul,ol");
        let tail = "";
        for (let node = nested.nextSibling; node; node = node.nextSibling) tail += node.textContent;
        return { value: host.value, child: nested.textContent.trim(), tail: tail.replace(/\s+/g, "").trim(), text: host.getText(), live: host.shadowRoot.querySelector(".live-editor").innerText };
      }, fixture.html);
      expect(result.value).toBe(fixture.markdown);
      expect(result.tail).toBe(fixture.tail.replace(/\s+/g, ""));
      expect(result.child).toContain(fixture.childToken);
      expect(result.child).not.toContain("Parent tail");
      if (fixture.tail === "After") expect(result.child).toBe("Child");
      expect(result.text.indexOf(fixture.childToken)).toBeGreaterThanOrEqual(0);
      expect(result.text.indexOf(fixture.childToken)).toBeLessThan(result.text.lastIndexOf(fixture.tail === "After" ? "After" : fixture.tail === "Parent tail" ? "Parent tail" : "Last"));
      if (mode === "live") expect(result.live.indexOf(fixture.childToken)).toBeLessThan(result.live.lastIndexOf(fixture.tail === "Parent tail" ? "Parent tail" : "After"));
    }
  });
}

test("live keyboard edits keep escaped table cells and canonical caret offsets", async ({ editor, page }) => {
  const literal = "a\\|b **bold**";
  const other = "`literal` [label](https://example.com)";
  await editor.reset({ attributes: { mode: "live" } });
  await editor.host.evaluate((host, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: clipboardData });
    host.shadowRoot.querySelector(".live-editor").dispatchEvent(event);
  }, `Left\tRight\n${literal}\t${other}`);
  const before = await editor.value();
  const cells = editor.host.locator("tbody .md-cell");
  const unchanged = await cells.nth(1).evaluate(cell => {
    const host = cell.getRootNode().host;
    return host.value.slice(Number(cell.dataset.from), Number(cell.dataset.to));
  });
  await cells.first().click();
  await page.keyboard.press("End");
  await page.keyboard.type("X");
  expect(await cells.first().innerText()).toBe(literal + "X");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Backspace");
  const expected = "a|b **bold**X";
  expect(await cells.first().innerText()).toBe(expected);
  const result = await editor.host.evaluate(host => {
    const template = document.createElement("template");
    template.innerHTML = host.getHTML();
    const cells = host.shadowRoot.querySelectorAll("tbody .md-cell");
    return {
      preview: Array.from(template.content.querySelectorAll("tbody td"), cell => cell.textContent),
      text: host.getText(),
      start: host.selectionStart,
      end: host.selectionEnd,
      expectedCursor: Number(cells[0].dataset.from) + 1,
      otherSource: host.value.slice(Number(cells[1].dataset.from), Number(cells[1].dataset.to))
    };
  });
  expect(result.preview).toEqual([expected, other]);
  expect(result.text).toBe(`Left\tRight\n${expected}\t${other}`);
  expect(result.start).toBe(result.expectedCursor);
  expect(result.end).toBe(result.expectedCursor);
  expect(result.otherSource).toBe(unchanged);
  await editor.host.evaluate(host => host.exec("history.undo"));
  expect(await cells.first().innerText()).toBe(literal + "X");
  await editor.host.evaluate(host => host.exec("history.undo"));
  expect(await editor.value()).toBe(before);
});
