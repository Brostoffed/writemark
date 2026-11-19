import assert from "node:assert/strict";
import { test } from "node:test";
import fc from "fast-check";
import { DocumentState } from "../../src/core/state.ts";
import { validateTransactionRequest, mapTransactionSelection, diffTextChanges, applyTextChanges, invertTextChanges } from "../../src/core/transactions.ts";

const fuzzRuns = Number(process.env.WRITEMARK_TRANSACTION_FUZZ_RUNS || 1000);
if (!Number.isSafeInteger(fuzzRuns) || fuzzRuns < 1) throw new Error("WRITEMARK_TRANSACTION_FUZZ_RUNS must be a positive integer.");

const validate = (changes, rest = {}) => validateTransactionRequest("A😀BCD", { baseRevision: 1, changes, ...rest });
test("revisions count actual changes and never repeat after restored text", () => {
  const state = new DocumentState();
  state.value = "a";
  state.value = "a";
  assert.equal(state.revision, 1);
  state.value = "";
  state.value = "a";
  assert.equal(state.revision, 3);
});
test("external changes reject invalid shapes without coercion or clamping", () => {
  for (const offset of [undefined, null, "1", NaN, Infinity, -1, 0.5, 99]) {
    assert.equal(validate([{ from: offset, to: 2, insert: "x" }]).ok, false);
    assert.equal(validate([{ from: 0, to: offset, insert: "x" }]).ok, false);
  }
  for (const request of [null, false, [], {}, { baseRevision: 0 }, { baseRevision: 0, changes: null }]) {
    assert.equal(validateTransactionRequest("", request).ok, false);
  }
  for (const change of [null, {}, { from: 3, to: 2, insert: "x" }, { from: 0, to: 1, insert: 2 }]) {
    assert.equal(validate([change]).ok, false);
  }
  const throwing = Object.defineProperty({}, "baseRevision", { get() { throw Error("hostile"); } });
  assert.equal(validateTransactionRequest("", throwing).ok, false);
  assert.equal(validate([], { origin: { kind: { toString: () => "user" } } }).ok, false);
});
test("external changes reject ambiguity and expected text mismatches", () => {
  for (const changes of [
    [{ from: 1, to: 3, insert: "" }, { from: 2, to: 4, insert: "" }],
    [{ from: 1, to: 1, insert: "a" }, { from: 1, to: 1, insert: "b" }],
    [{ from: 1, to: 3, insert: "a" }, { from: 3, to: 3, insert: "b" }]
  ]) assert.equal(validate(changes).reason, "overlapping-changes");
  assert.equal(validate([{ from: 1, to: 3, insert: "X", expected: "wrong" }]).reason, "expected-mismatch");
  assert.equal(validate([{ from: 1, to: 3, insert: "X", expected: "😀" }]).value, "AXBCD");
});
test("external selection uses post-edit UTF-16 offsets", () => {
  for (const selectionAfter of [{ start: -1, end: 0 }, { start: 2, end: 1 }, { start: 0, end: 20 }, { start: 0.5, end: 2 }, { start: 0, end: 1, direction: "bad" }]) {
    assert.equal(validate([], { selectionAfter }).reason, "invalid-selection");
  }
  assert.deepEqual(mapTransactionSelection({ start: 4, end: 6 }, [{ from: 1, to: 3, insert: "X" }]), { start: 3, end: 5, direction: "none" });
});
test("batch edits match an independent UTF-16 reference and preserve caller inputs", () => {
  fc.assert(fc.property(fc.array(fc.constantFrom("A", "😀", "\ud800", "\udfff", "\r", "\n", "é"), { maxLength: 40 }), fc.array(fc.string({ maxLength: 8 }), { maxLength: 12 }), (parts, inserts) => {
    const value = parts.join("").replace(/\r\n?/g, "\n");
    const changes = inserts.slice(0, value.length).map((insert, i) => Object.freeze({ from: i, to: i + 1, insert, expected: value.slice(i, i + 1) })).reverse();
    const request = Object.freeze({ baseRevision: 0, changes: Object.freeze(changes) });
    const before = JSON.stringify(request);
    const result = validateTransactionRequest(value, request);
    assert.equal(result.ok, true);
    let reference = "";
    for (let i = 0; i < value.length; i += 1) reference += i < changes.length ? inserts[i].replace(/\r\n?/g, "\n") : value[i];
    assert.equal(result.value, reference);
    assert.equal(JSON.stringify(request), before);
  }), { seed: 0x715ac7, numRuns: fuzzRuns });
});

test("validation reads each untrusted field once", () => {
  const reads = new Map();
  const fields = (prefix, values) => Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value]));
  const once = (prefix, values) => {
    const target = fields(prefix, values);
    return new Proxy(target, { get(object, key) {
      const name = `${prefix}.${String(key)}`;
      reads.set(name, (reads.get(name) ?? 0) + 1);
      if (reads.get(name) > 1) throw Error(`Repeated read: ${name}`);
      return object[key];
    } });
  };
  const request = once("request", {
    baseRevision: 0,
    changes: [once("change", { from: 1, to: 3, insert: "X", expected: "😀" })],
    origin: once("origin", { kind: "external", id: "tool" }),
    selectionAfter: once("selection", { start: 2, end: 2, direction: "none" })
  });
  const result = validateTransactionRequest("A😀B", request);
  assert.equal(result.ok, true);
  assert.equal(result.value, "AXB");
  assert.deepEqual(result.request.origin, { kind: "external", id: "tool" });
  assert.equal([...reads.values()].every(count => count === 1), true);
});

test("selection mapping keeps replacement text selected with endpoint affinity", () => {
  fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 30 }), fc.string({ maxLength: 30 }), (removed, insert) => {
    const change = [{ from: 2, to: 2 + removed.length, insert }];
    for (const direction of ["forward", "backward"]) {
      assert.deepEqual(mapTransactionSelection({ start: 2, end: 2 + removed.length, direction }, change), { start: 2, end: 2 + insert.length, direction });
    }
    assert.deepEqual(mapTransactionSelection({ start: 2, end: 2 }, change), { start: 2 + insert.length, end: 2 + insert.length, direction: "none" });
    const later = 3 + removed.length;
    assert.equal(mapTransactionSelection({ start: later, end: later }, change).start, 3 + insert.length);
  }), { seed: 0xaff171, numRuns: fuzzRuns });
});

test("stale revisions precede source-dependent validation", () => {
  const request = { baseRevision: 1, changes: [{ from: 4, to: 8, insert: "X", expected: "old!" }], selectionAfter: { start: 9, end: 9 } };
  assert.equal(validateTransactionRequest("a", request, 2).reason, "stale-revision");
  assert.equal(validateTransactionRequest("abcdNEW!", request, 2).reason, "stale-revision");
  let reads = 0;
  const snapshot = { get baseRevision() { reads += 1; return 1; }, changes: [] };
  assert.equal(validateTransactionRequest("", snapshot, 2).reason, "stale-revision");
  assert.equal(reads, 1);
});

test("bounded document diff preserves unchanged spans between separate edits", () => {
  const before = "red\nkeep this exact line\nblue";
  const after = "green\nkeep this exact line\ngold";
  const changes = diffTextChanges(before, after);
  assert.equal(applyTextChanges(before, changes), after);
  const offset = before.indexOf("exact");
  const selection = mapTransactionSelection({ start: offset, end: offset }, changes);
  assert.equal(selection.start, after.indexOf("exact"));
  assert.ok(changes.every(change => change.to <= before.indexOf("keep") || change.from >= before.indexOf("blue")));
});

test("bounded document diffs reconstruct arbitrary UTF-16 strings", () => {
  const text = fc.array(fc.constantFrom("a", "b", "c", "😀", "\ud800", "\udfff", "\n", "\r", "é"), { maxLength: 100 }).map(parts => parts.join(""));
  fc.assert(fc.property(text, text, (before, after) => {
    const normalized = after.replace(/\r\n?/g, "\n");
    const changes = diffTextChanges(before, after);
    assert.equal(applyTextChanges(before.replace(/\r\n?/g, "\n"), changes), normalized);
    for (let index = 1; index < changes.length; index += 1) assert.ok(changes[index - 1].to < changes[index].from);
  }), { seed: 0x51a9de, numRuns: fuzzRuns });
});

test("document diff keeps a bounded fallback for large unrelated inputs", () => {
  const before = "a".repeat(30000);
  const after = "b".repeat(30000);
  const changes = diffTextChanges(before, after);
  assert.equal(changes.length, 1);
  assert.equal(applyTextChanges(before, changes), after);
});

test("inverse changes reconstruct the exact original UTF-16 source", () => {
  fc.assert(fc.property(fc.string({ maxLength: 80 }), fc.array(fc.string({ maxLength: 10 }), { maxLength: 10 }), (before, inserts) => {
    before = before.replace(/\r\n?/g, "\n");
    const changes = inserts.slice(0, before.length).map((insert, index) => ({ from: index, to: index + 1, insert: insert.replace(/\r\n?/g, "\n") }));
    const after = applyTextChanges(before, changes);
    assert.equal(applyTextChanges(after, invertTextChanges(before, changes)), before);
  }), { seed: 0x91bac, numRuns: fuzzRuns });
});

test("inverse adjacent replacements merge collapsed insertion boundaries", () => {
  const before = "  ";
  const changes = [{ from: 0, to: 1, insert: "" }, { from: 1, to: 2, insert: "!" }];
  const after = applyTextChanges(before, changes);
  assert.equal(after, "!");
  assert.equal(applyTextChanges(after, invertTextChanges(before, changes)), before);
});

test("external batches ignore caller iterators and capture their indexed length once", () => {
  const changes = [{ from: 0, to: 1, insert: "X" }];
  changes[Symbol.iterator] = function* () { throw new Error("Caller iterator must not run"); };
  const valid = validateTransactionRequest("abc", { baseRevision: 0, changes }, 0);
  assert.equal(valid.ok, true);
  assert.equal(valid.value, "Xbc");
  const growing = [{ get from() { growing.push({ from: 0, to: 2, insert: "bad" }); return 0; }, to: 1, insert: "X" }];
  const result = validateTransactionRequest("abc", { baseRevision: 0, changes: growing }, 0);
  assert.equal(result.ok, true);
  assert.equal(result.value, "Xbc");
  assert.equal(result.changes.length, 1);
  const proxy = new Proxy([], { get(target, key) { return key === "length" ? Number.NaN : Reflect.get(target, key); } });
  assert.equal(validateTransactionRequest("abc", { baseRevision: 0, changes: proxy }, 0).reason, "invalid-request");
  const arrayRequest = Object.assign([], { baseRevision: 0, changes: [] });
  assert.equal(validateTransactionRequest("abc", arrayRequest, 0).reason, "invalid-request");
});

test("inverse adjacent replacements retain their distinct cursor seam", () => {
  const changes = [{ from: 0, to: 1, insert: "X" }, { from: 1, to: 2, insert: "Y" }];
  const inverse = invertTextChanges("ab", changes);
  assert.deepEqual(inverse, [{ from: 0, to: 1, insert: "a" }, { from: 1, to: 2, insert: "b" }]);
  assert.deepEqual(mapTransactionSelection({ start: 1, end: 1 }, inverse), { start: 1, end: 1, direction: "none" });
  assert.equal(applyTextChanges("XY", inverse), "ab");
});

test("inverse merges only collapsed boundaries and retains separated deletions", () => {
  assert.deepEqual(invertTextChanges("ab", [{ from: 0, to: 1, insert: "" }, { from: 1, to: 2, insert: "" }]), [{ from: 0, to: 0, insert: "ab" }]);
  assert.deepEqual(invertTextChanges("ab", [{ from: 0, to: 1, insert: "X" }, { from: 1, to: 2, insert: "" }]), [{ from: 0, to: 1, insert: "ab" }]);
  assert.deepEqual(invertTextChanges("ab", [{ from: 0, to: 1, insert: "" }, { from: 1, to: 2, insert: "Y" }]), [{ from: 0, to: 1, insert: "ab" }]);
  assert.deepEqual(invertTextChanges("a_b", [{ from: 0, to: 1, insert: "" }, { from: 2, to: 3, insert: "" }]), [{ from: 0, to: 0, insert: "a" }, { from: 1, to: 1, insert: "b" }]);
  assert.deepEqual(invertTextChanges("abc", [{ from: 0, to: 1, insert: "X" }, { from: 1, to: 2, insert: "" }, { from: 2, to: 3, insert: "Y" }]), [{ from: 0, to: 1, insert: "ab" }, { from: 1, to: 2, insert: "c" }]);
});

test("inverse batches normalize inserted line endings without mutating callers", () => {
  const changes = Object.freeze([Object.freeze({ from: 1, to: 2, insert: "X\r\nY" })]);
  const inverse = invertTextChanges("abc", changes);
  assert.deepEqual(inverse, [{ from: 1, to: 4, insert: "b" }]);
  assert.equal(applyTextChanges(applyTextChanges("abc", changes), inverse), "abc");
  assert.equal(changes[0].insert, "X\r\nY");
});

test("inverse reconstruction covers arbitrary validated UTF-16 batches and empty inserts", () => {
  const units = fc.array(fc.constantFrom("a", "b", "雪", "😀", "\ud800", "\udfff", "\r", "\n"), { maxLength: 35 }).map(parts => parts.join(""));
  const edits = fc.array(fc.record({ offset: fc.nat(500), removed: fc.nat(6), insert: units }), { maxLength: 7 });
  fc.assert(fc.property(units, edits, (rawBefore, operations) => {
    const before = rawBefore.replace(/\r\n?/g, "\n");
    const changes = operations.map(operation => {
      const from = operation.offset % (before.length + 1);
      return { from, to: Math.min(before.length, from + operation.removed), insert: operation.insert };
    });
    const checked = validateTransactionRequest(before, { baseRevision: 0, changes }, 0);
    fc.pre(checked.ok);
    const caller = JSON.stringify(checked.changes);
    const inverse = invertTextChanges(before, checked.changes);
    assert.equal(applyTextChanges(checked.value, inverse), before);
    assert.equal(JSON.stringify(checked.changes), caller);
    for (let index = 1; index < inverse.length; index++) {
      const previous = inverse[index - 1];
      const current = inverse[index];
      assert.ok(previous.to <= current.from);
      if (previous.to === current.from) assert.ok(previous.from < previous.to && current.from < current.to);
    }
  }), { seed: 0x1a9b477, numRuns: fuzzRuns });
});
