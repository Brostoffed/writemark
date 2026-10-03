import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTextChanges, diffTextChange, makeSnapshot } from "../../src/core/transactions.js";
import { previousGraphemeOffset, nextGraphemeOffset } from "../../src/core/text.js";
import { UndoHistory } from "../../src/core/history.js";
import { parseBlocks } from "../../src/markdown/blocks.js";
import { parseTags } from "../../src/markdown/tags.js";
import { wrapCode, insertLink } from "../../src/actions/inline.js";

test("pure modules load without a browser or element registration", () => {
  assert.equal(typeof globalThis.HTMLElement, "undefined");
  assert.equal(parseBlocks("# Hello\n\ntext")[0].heading.content, "Hello");
  assert.equal(parseTags("#tag `#hidden`")[0].value, "tag");
});
test("transactions use the original UTF-16 offsets and normalize inserted newlines", () => {
  const before = "A😀B\nlast";
  assert.equal(applyTextChanges(before, [{ from: 1, to: 3, insert: "X" }, { from: 5, to: 9, insert: "next\r\nline" }]), "AXB\nnext\nline");
  const after = "A😀 changed\nlast";
  assert.equal(applyTextChanges(before, diffTextChange(before, after)), after);
});
test("grapheme movement keeps joined emoji and combining marks intact", () => {
  for (const cluster of ["👨‍👩‍👧‍👦", "e\u0301", "🇺🇸"]) {
    const text = "a" + cluster + "z";
    assert.equal(nextGraphemeOffset(text, 1), 1 + cluster.length);
    assert.equal(previousGraphemeOffset(text, 1 + cluster.length), 1);
  }
});
test("history coalesces typing and preserves redo snapshots and capacity", () => {
  let time = 0;
  const history = new UndoHistory(2, () => time);
  const empty = makeSnapshot("", 0, 0);
  const one = makeSnapshot("a", 1, 1);
  const two = makeSnapshot("ab", 2, 2);
  history.record(empty, one, "typing");
  time = 100;
  history.record(one, two, "typing", { coalesce: true });
  assert.equal(history.undoStack.length, 1);
  assert.deepEqual(history.undo(two), empty);
  assert.deepEqual(history.redo(empty), two);
  time = 1000;
  history.record(two, makeSnapshot("abc", 3, 3), "typing");
  history.record(makeSnapshot("abc", 3, 3), makeSnapshot("abcd", 4, 4), "format");
  assert.equal(history.undoStack.length, 2);
});
test("actions return safe source edits without DOM changes", () => {
  const context = { value: "a`b", selectionStart: 0, selectionEnd: 3, selectionDirection: "none" };
  const code = wrapCode(context);
  assert.equal(applyTextChanges(context.value, code.transaction.changes), "``a`b``");
  assert.equal(insertLink(context, { url: "bad\nurl" }).ok, false);
});
