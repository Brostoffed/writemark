import { test, expect } from "./support/editor-fixture.js";

for (const mode of ["source", "live"]) {
  test(`${mode} undo restores deleted cursor anchors without restoring peer metadata`, async ({ editor }) => {
    await editor.reset({ value: "abcDEFghi", attributes: { mode } });
    const result = await editor.host.evaluate(host => {
      host.setRemoteCursors([
        { id: "caret", name: "Alex", color: "#4765a9", anchor: 4, head: 4, ttlMs: 0 },
        { id: "range", name: "River", color: "#b64325", anchor: 6, head: 3, ttlMs: 0 },
      ]);
      host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 3, to: 6, insert: "", expected: "DEF" }] });
      const deleted = host.getRemoteCursors();
      host.updateRemoteCursors({ cursors: [{ ...deleted[0], name: "Renamed" }] });
      host.exec("history.undo");
      const restored = host.getRemoteCursors();
      host.exec("history.redo");
      return { deleted, restored, redone: host.getRemoteCursors(), value: host.value };
    });
    expect(result.deleted.map(({ anchor, head }) => [anchor, head])).toEqual([[3, 3], [3, 3]]);
    expect(result.restored.map(({ anchor, head }) => [anchor, head])).toEqual([[4, 4], [6, 3]]);
    expect(result.restored[0].name).toBe("Renamed");
    expect(result.redone.map(({ anchor, head }) => [anchor, head])).toEqual([[3, 3], [3, 3]]);
    expect(result.value).toBe("abcghi");
  });
}

test("undo preserves later authoritative moves and never revives removed peers", async ({ editor }) => {
  await editor.reset({ value: "abcDEFghi", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const cursor = (id, offset, sequence = 1) => ({ id, name: id, color: "#4765a9", anchor: offset, head: offset, epoch: 1, sequence, ttlMs: 0 });
    host.setRemoteCursors([cursor("moved", 4), cursor("removed", 5)]);
    host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 3, to: 6, insert: "" }] });
    host.updateRemoteCursors({ cursors: [cursor("moved", 1, 2), cursor("new", 4)], remove: ["removed"] });
    host.exec("history.undo");
    return host.getRemoteCursors();
  });
  expect(result.map(({ id, head }) => [id, head])).toEqual([["moved", 1], ["new", 7]]);
  expect(result[0].sequence).toBe(2);
});

test("undo keeps exact known insertion positions in repeated text", async ({ editor }) => {
  await editor.reset({ value: "aaaa", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    host.setRemoteCursors([{ id: "peer", name: "Alex", color: "#4765a9", anchor: 2, head: 2, ttlMs: 0 }]);
    host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 0, to: 0, insert: "a" }] });
    const after = host.getRemoteCursors()[0].head;
    host.exec("history.undo");
    const undo = host.getRemoteCursors()[0].head;
    host.exec("history.redo");
    return { after, undo, redo: host.getRemoteCursors()[0].head };
  });
  expect(result).toEqual({ after: 3, undo: 2, redo: 3 });
});

test("coalesced native deletions restore cursor anchors across undo and redo", async ({ editor }) => {
  await editor.reset({ value: "abcDEFghi", attributes: { mode: "source" } });
  await editor.host.evaluate(host => host.setRemoteCursors([{ id: "peer", name: "Alex", color: "#4765a9", anchor: 4, head: 4, ttlMs: 0 }]));
  await editor.setSelection(6, 6);
  await editor.source.press("Backspace");
  await editor.source.press("Backspace");
  await editor.source.press("Backspace");
  expect(await editor.value()).toBe("abcghi");
  await editor.host.evaluate(host => host.exec("history.undo"));
  expect(await editor.value()).toBe("abcDEFghi");
  expect(await editor.host.evaluate(host => host.getRemoteCursors()[0].head)).toBe(4);
  await editor.host.evaluate(host => host.exec("history.redo"));
  expect(await editor.host.evaluate(host => host.getRemoteCursors()[0].head)).toBe(3);
});

test("whole document writes preserve cursors inside unchanged middle spans", async ({ editor }) => {
  const before = "red\nkeep this exact line\nblue";
  const after = "green\nkeep this exact line\ngold";
  await editor.reset({ value: before, attributes: { mode: "source" } });
  const result = await editor.host.evaluate((host, { before, after }) => {
    const start = before.indexOf("exact");
    host.setRemoteCursors([{ id: "peer", name: "Alex", color: "#4765a9", anchor: start, head: start + 5, ttlMs: 0 }]);
    host.value = after;
    const cursor = host.getRemoteCursors()[0];
    return host.value.slice(cursor.anchor, cursor.head);
  }, { before, after });
  expect(result).toBe("exact");
});

for (const mode of ["source", "live"]) {
  test(`${mode} undo keeps a later cursor at the seam between adjacent replacements`, async ({ editor }) => {
    await editor.reset({ value: "ab", attributes: { mode } });
    const result = await editor.host.evaluate(host => {
      const changed = host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 0, to: 1, insert: "X" }, { from: 1, to: 2, insert: "Y" }] });
      const presence = host.updateRemoteCursors({ cursors: [{ id: "later", name: "Sample", color: "#5273a3", anchor: 1, head: 1, ttlMs: 0 }] });
      host.exec("history.undo");
      const undo = { value: host.value, cursor: host.getRemoteCursors()[0] };
      host.exec("history.redo");
      return { changed, presence, undo, redo: { value: host.value, cursor: host.getRemoteCursors()[0] } };
    });
    expect(result.changed.ok).toBe(true);
    expect(result.presence.ok).toBe(true);
    expect(result.undo.value).toBe("ab");
    expect(result.undo.cursor).toMatchObject({ anchor: 1, head: 1 });
    expect(result.redo.value).toBe("XY");
    expect(result.redo.cursor).toMatchObject({ anchor: 1, head: 1 });
  });

  test(`${mode} generated inverse batches keep adjacent seams and separate unchanged gaps`, async ({ editor }, testInfo) => {
    const seed = Number(process.env.WRITEMARK_INVERSE_SEED ?? 0x1a9b477);
    const runs = Number(process.env.WRITEMARK_INVERSE_RUNS ?? 80);
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error("Use a uint32 inverse seed.");
    if (!Number.isSafeInteger(runs) || runs < 1 || runs > 5000) throw Error("Use 1 to 5000 inverse cases.");
    await editor.reset({ attributes: { mode } });
    const report = await editor.host.evaluate(async (host, { seed, runs }) => {
      let state = seed >>> 0;
      const random = size => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % size; };
      const oldUnits = ["a", "雪", "😀", "\ud800", "\udfff"];
      const newUnits = ["X", "é", "🌿", "\ud800", "\udfff", "\n"];
      const word = units => Array.from({ length: 1 + random(3) }, () => units[random(units.length)]).join("");
      let seams = 0;
      let gaps = 0;
      let checkedPositions = 0;
      for (let index = 0; index < runs; index++) {
        let before = "p";
        let after = "p";
        const changes = [];
        const spans = [];
        const count = 2 + random(3);
        for (let cell = 0; cell < count; cell++) {
          const removed = word(oldUnits);
          const inserted = (cell === 0 ? "X" : "") + word(newUnits);
          const oldFrom = before.length;
          const newFrom = after.length;
          before += removed;
          after += inserted;
          changes.push({ from: oldFrom, to: before.length, insert: inserted });
          spans.push({ oldFrom, oldTo: before.length, newFrom, newTo: after.length });
          if (cell + 1 < count) {
            const gap = (index + cell) % 2 ? " · " : "";
            before += gap;
            after += gap;
            if (gap) gaps++; else seams++;
          }
        }
        before += "q";
        after += "q";
        // The oracle uses original and resulting segment boundaries, not inverse changes.
        const expected = Array.from({ length: after.length + 1 }, (_, position) => {
          for (const span of spans) {
            if (position < span.newFrom) return span.oldFrom - (span.newFrom - position);
            if (position <= span.newTo) return span.oldTo;
          }
          return before.length - (after.length - position);
        });
        host.setRemoteCursors([]);
        host.value = before;
        const request = host.applyTransaction({ baseRevision: host.revision, changes: index % 2 ? [...changes].reverse() : changes });
        if (!request.ok || host.value !== after) throw Error(`Generated forward edit failed: ${JSON.stringify({ seed, index, before, after, changes, request })}`);
        const peers = expected.map((_offset, position) => ({ id: `later-${index}-${position}`, name: `Sample ${position}`, color: "#5273a3", anchor: position, head: position, ttlMs: 0 }));
        const submitted = host.updateRemoteCursors({ cursors: peers });
        if (!submitted.ok) throw Error(`Generated presence failed: ${JSON.stringify(submitted)}`);
        host.exec("history.undo");
        const undone = host.getRemoteCursors();
        if (host.value !== before || undone.length !== peers.length || undone.some((cursor, position) => cursor.anchor !== expected[position] || cursor.head !== expected[position])) {
          throw Error(`Generated inverse mapping failed: ${JSON.stringify({ seed, index, before, after, changes, expected, actual: undone.map(cursor => [cursor.anchor, cursor.head]) })}`);
        }
        host.exec("history.redo");
        const redone = host.getRemoteCursors();
        if (host.value !== after || redone.length !== peers.length || redone.some((cursor, position) => cursor.anchor !== position || cursor.head !== position)) throw Error(`Generated redo failed at seed ${seed}, case ${index}`);
        checkedPositions += expected.length;
        if (index % 8 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
      }
      return { seed, runs, seams, gaps, checkedPositions };
    }, { seed, runs });
    expect(report.runs).toBe(runs);
    expect(report.seams + report.gaps).toBeGreaterThanOrEqual(runs);
    await testInfo.attach(`inverse-${mode}-seed.json`, { body: JSON.stringify(report, null, 2), contentType: "application/json" });
  });
}
