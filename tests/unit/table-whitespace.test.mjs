import assert from "node:assert/strict";
import { test } from "node:test";
import { tableCellTexts, tableRowSourceParts } from "../../src/actions/tables.ts";
import { parseTableLineRanges } from "../../src/markdown/tables.ts";
import { renderMarkdown } from "../../src/render/html.ts";

test("live table cells retain spaces through repeated edits and source offsets", () => {
  for (const value of ["page ", "page   ", " page", "  page  ", " ", "   ", "", "left|right  "]) {
    const serialized = tableRowSourceParts([value, "other"]);
    const cells = parseTableLineRanges(serialized.text, 100, true);
    assert.equal(cells[0].from, 100 + serialized.offsets[0].from);
    assert.equal(cells[0].to, 100 + serialized.offsets[0].to);
    const line = { start: 100, text: serialized.text, cells };
    const contents = tableCellTexts(line, 2);
    assert.deepEqual(contents, [value, "other"]);
    contents[1] = "changed";
    const edited = tableRowSourceParts(contents);
    assert.equal(parseTableLineRanges(edited.text, 100, true)[0].text, cells[0].text);
  }
});

test("live table cells support rows without outer pipes or padding", () => {
  assert.deepEqual(parseTableLineRanges("page|other", 100, true), [
    { text: "page", from: 100, to: 104 },
    { text: "other", from: 105, to: 110 }
  ]);
});

test("preview table cells still remove all boundary spaces", () => {
  const table = "| A | B |\n| --- | --- |\n";
  assert.equal(
    renderMarkdown(table + "|   page    |    |"),
    renderMarkdown(table + "| page |  |")
  );
  assert.equal(parseTableLineRanges("|   page    |    |", 0)[0].text, "page");
});
