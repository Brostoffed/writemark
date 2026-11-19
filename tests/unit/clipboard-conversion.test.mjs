import assert from "node:assert/strict";
import { test } from "node:test";
import { tsvToMarkdownTable } from "../../src/browser/clipboard.ts";
import { parseBlocks } from "../../src/markdown/blocks.ts";
import { tableCellDisplayMap, editTableCellDisplay } from "../../src/markdown/tables.ts";
import { decorateInline } from "../../src/render/inline.ts";
import { tableRowSourceParts, tableCellTexts } from "../../src/actions/tables.ts";
import { parseTableLineRanges } from "../../src/markdown/tables.ts";
import { renderMarkdown } from "../../src/render/html.ts";

const escapeText = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

test("TSV cells keep backslash runs and literal Markdown through table rendering", () => {
  const cells = Array.from({ length: 9 }, (_, length) => `left${"\\".repeat(length)}|right`);
  cells.push("**bold** _italic_ ~~strike~~ `code` [label](https://example.com)", "\\*literal\\* and <tag> & text", "slashes\\\\\\ and pipes||");
  for (const cell of cells) {
    const markdown = tsvToMarkdownTable(`Left\tRight\n${cell}\tend`);
    const table = parseBlocks(markdown).find(block => block.type === "table");
    assert.ok(table);
    assert.equal(table.header.cells.length, 2);
    assert.equal(table.rows.length, 1);
    assert.equal(table.rows[0].cells.length, 2);
    const html = renderMarkdown(markdown);
    assert.ok(html.includes(`<td>${escapeText(cell)}</td><td>end</td>`), JSON.stringify({ cell, markdown, html }));
    assert.doesNotMatch(html, /<(?:strong|em|del|code|a)(?:\s|>)/);
  }
});

test("list rendering keeps parent continuations after their nested children", () => {
  const cases = [
    ["- Parent\n  - Child\n\n  After", "<p>Parent</p>\n<ul><li>Child</li></ul>\n<p>After</p>"],
    ["1. Parent\n   - Child\n\n   **After**\n\n   - Next child\n\n   Last", "<p>Parent</p>\n<ul><li>Child</li></ul>\n<p><strong>After</strong></p>\n<ul><li>Next child</li></ul>\n<p>Last</p>"],
    ["- Parent\n  - Child\n    - Grandchild\n\n    Child tail\n\n  Parent tail", "<p>Child</p>\n<ul><li>Grandchild</li></ul>\n<p>Child tail</p>"]
  ];
  for (const [markdown, ordered] of cases) assert.ok(renderMarkdown(markdown).includes(ordered), renderMarkdown(markdown));
  assert.equal(renderMarkdown("- Parent\n  - Child"), "<ul><li>Parent\n<ul><li>Child</li></ul>\n</li></ul>");
});


test("live table display maps both escape layers without changing ordinary inline tokens", () => {
  const literals = Array.from({ length: 9 }, (_, count) => `a${"\\".repeat(count)}|b`);
  literals.push("**bold** _italic_ ~~strike~~ `code` [label](https://example.com)", "雪😀\\*literal\\*");
  for (const literal of literals) {
    const markdown = tsvToMarkdownTable(`A\tB\n${literal}\tother`);
    const table = parseBlocks(markdown).find(block => block.type === "table");
    const raw = table.rows[0].cells[0].text;
    const map = tableCellDisplayMap(raw);
    assert.equal(map.text, literal);
    assert.equal(map.sourceOffsets.length, literal.length + 1);
    assert.equal(map.sourceOffsets[0], 0);
    assert.equal(map.sourceOffsets.at(-1), raw.length);
    const inline = tableCellTexts(table.rows[0], 2)[0];
    assert.equal(decorateInline(inline, { hideEscapes: true }), escapeText(literal));
    for (let offset = 0; offset <= literal.length; offset++) {
      const next = literal.slice(0, offset) + "X" + literal.slice(offset);
      const edited = editTableCellDisplay(raw, next, offset + 1);
      assert.equal(tableCellDisplayMap(edited.text).text, next);
      assert.equal(edited.cursor, tableCellDisplayMap(edited.text).sourceOffsets[offset + 1]);
    }
  }
  assert.match(decorateInline("\\*literal\\*"), /class="md-token"/);
  assert.equal(tableCellDisplayMap("`a\\\\\\|b`").text, "`a\\|b`");
});

test("table serializers retain escaped pipes, backslashes, code, and cell whitespace", () => {
  for (const content of ["left|right", "left\\|right", "left\\\\|right", "`a\\|b`", "\\*literal\\*", " page  ", "   "]) {
    const serialized = tableRowSourceParts([content, "other"]);
    const cells = parseTableLineRanges(serialized.text, 0, true);
    assert.equal(cells.length, 2);
    assert.deepEqual(tableCellTexts({ text: serialized.text, start: 0, cells }, 2), [content, "other"]);
    const repeated = tableRowSourceParts(tableCellTexts({ text: serialized.text, start: 0, cells }, 2));
    assert.equal(repeated.text, serialized.text);
  }
});
