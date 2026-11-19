import assert from "node:assert/strict";
import { test } from "node:test";
import fc from "fast-check";
import { composeTextChanges, inferSourceTextChanges } from "../../src/core/text-edits.ts";
import { applyTextChanges } from "../../src/core/transactions.ts";

const text = fc.array(fc.constantFrom("a", "b", "😀", "雪", "\ud800", "\udfff", "\r", "\n"), { maxLength: 35 }).map(parts => parts.join(""));
const operation = fc.record({ offset: fc.nat(1000), removed: fc.nat(7), insert: text });
const batch = (value, operations) => operations.map(op => {
  const from = op.offset % (value.length + 1);
  return { from, to: Math.min(value.length, from + op.removed), insert: op.insert };
});
const tokens = value => value.split("").map((value, id) => ({ value, id }));
const applyTokens = (source, changes) => {
  const out = [...source];
  for (const change of [...changes].sort((a, b) => b.from - a.from)) {
    const from = Math.max(0, Math.min(out.length, change.from));
    const to = Math.max(from, Math.min(out.length, change.to));
    const inserted = change.insert.replace(/\r\n?/g, "\n").split("").map(value => ({ value, id: null }));
    out.splice(from, to - from, ...inserted);
  }
  return out;
};

test("composition retains the exact repeated-character deletion positions", () => {
  assert.deepEqual(composeTextChanges("aaaa", [{ from: 1, to: 2, insert: "" }], [{ from: 1, to: 2, insert: "" }]), [{ from: 1, to: 3, insert: "" }]);
  assert.deepEqual(composeTextChanges("aaaa", [{ from: 1, to: 1, insert: "aa" }], [{ from: 1, to: 3, insert: "" }]), []);
  assert.deepEqual(composeTextChanges("aaaa", [{ from: 1, to: 2, insert: "" }], [{ from: 1, to: 1, insert: "a" }]), [{ from: 1, to: 2, insert: "a" }]);
});

test("composition keeps UTF-16 source spans and inserted fragments distinct", () => {
  assert.deepEqual(composeTextChanges("A😀B😀C", [{ from: 1, to: 3, insert: "" }], [{ from: 2, to: 4, insert: "" }]), [{ from: 1, to: 3, insert: "" }, { from: 4, to: 6, insert: "" }]);
  assert.deepEqual(composeTextChanges("aba", [{ from: 1, to: 2, insert: "XY" }], [{ from: 2, to: 3, insert: "Z" }]), [{ from: 1, to: 2, insert: "XZ" }]);
});

test("composition reconstructs both batches and preserves original unit identities", () => {
  fc.assert(fc.property(text, fc.array(operation, { maxLength: 8 }), fc.array(operation, { maxLength: 8 }), (before, one, two) => {
    const first = batch(before, one);
    const middle = applyTextChanges(before, first);
    const second = batch(middle, two);
    const caller = JSON.stringify({ first, second });
    first.forEach(Object.freeze);
    second.forEach(Object.freeze);
    Object.freeze(first);
    Object.freeze(second);
    const composed = composeTextChanges(before, first, second);
    assert.equal(applyTextChanges(before, composed), applyTextChanges(middle, second));
    const reference = applyTokens(applyTokens(tokens(before), first), second);
    const actual = applyTokens(tokens(before), composed);
    assert.deepEqual(actual, reference);
    for (let index = 1; index < composed.length; index++) assert.ok(composed[index - 1].to <= composed[index].from);
    assert.equal(JSON.stringify({ first, second }), caller);
  }), { seed: 0x71ed17, numRuns: 2500 });
});


test("native target inference keeps repeated deletions and replacements at the actual selection", () => {
  const selection = (start, end = start) => ({ start, end, direction: "none" });
  assert.deepEqual(inferSourceTextChanges("aaaa", "aaa", selection(2), "deleteContentBackward", null, selection(1)), [{ from: 1, to: 2, insert: "" }]);
  assert.deepEqual(inferSourceTextChanges("aaaa", "aaa", selection(1), "deleteContentForward", null, selection(1)), [{ from: 1, to: 2, insert: "" }]);
  assert.deepEqual(inferSourceTextChanges("one one one", "one one", selection(8), "deleteWordBackward", null, selection(4)), [{ from: 4, to: 8, insert: "" }]);
  assert.deepEqual(inferSourceTextChanges("one one one", "one one", selection(4), "deleteWordForward", null, selection(4)), [{ from: 4, to: 8, insert: "" }]);
  assert.deepEqual(inferSourceTextChanges("A😀B😀C", "AB😀C", selection(3), "deleteContentBackward", null, selection(1)), [{ from: 1, to: 3, insert: "" }]);
  assert.deepEqual(inferSourceTextChanges("aaaa", "aXaa", selection(1, 2), "insertText", "X", selection(2)), [{ from: 1, to: 2, insert: "X" }]);
  assert.deepEqual(inferSourceTextChanges("aaxaa", "aa雪aa", selection(3), "insertCompositionText", "雪", selection(3)), [{ from: 2, to: 3, insert: "雪" }]);
  assert.equal(inferSourceTextChanges("abcd", "xycd", selection(4), "insertText", "x", selection(1)), null);
});

test("verified native insertion candidates reconstruct arbitrary UTF-16 selections", () => {
  fc.assert(fc.property(text, operation, (rawBefore, op) => {
    const before = rawBefore.replace(/\r\n?/g, "\n");
    const from = op.offset % (before.length + 1);
    const to = Math.min(before.length, from + op.removed);
    const insert = op.insert.replace(/\r\n?/g, "\n");
    const after = before.slice(0, from) + insert + before.slice(to);
    const changes = inferSourceTextChanges(before, after, { start: from, end: to }, "insertText", op.insert, { start: from + insert.length, end: from + insert.length });
    assert.notEqual(changes, null);
    assert.equal(applyTextChanges(before, changes), after);
    if (before !== after) assert.deepEqual(changes, [{ from, to, insert }]);
  }), { seed: 0x10ca71, numRuns: 1500 });
});
