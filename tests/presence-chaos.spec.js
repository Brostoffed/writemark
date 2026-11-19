import { expect, test } from "@playwright/test";

const seed = Number(process.env.WRITEMARK_PRESENCE_SEED ?? 0x71c5a09);
const steps = Number(process.env.WRITEMARK_PRESENCE_STEPS ?? 240);
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error("Use a uint32 presence seed.");
if (!Number.isSafeInteger(steps) || steps < 1 || steps > 10000) throw Error("Use 1 to 10000 presence steps.");

test("seeded presence operations preserve document and ordering invariants", async ({ page }, testInfo) => {
  await page.goto("/tests/fixtures/editor.html");
  const report = await page.locator("#editor").evaluate(async (editor, { seed, steps }) => {
    let state = seed >>> 0;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
    const choose = length => random() % length;
    const colors = ["#b45c42", "#5273a3", "#51836c", "#7c679a"];
    let text = "alpha 😀 beta\n\ngamma delta\n";
    editor.mode = "source";
    editor.value = text;
    const expected = new Map();
    const versions = new Map();
    const undo = [];
    const redo = [];
    const trace = [];
    let exactEndpointAssertions = 0;
    const fail = message => { throw new Error(`${message}\nseed=${seed}\n${JSON.stringify(trace.slice(-20))}`); };
    const check = condition => { if (!condition) fail("Presence chaos invariant failed"); };
    const snapshot = () => new Map(Array.from(expected, ([id, cursor]) => [id, { ...cursor }]));
    // This reference maps one replacement interval. It does not call editor helpers.
    const mapOne = (cursor, from, to, insertLength) => {
      const delta = insertLength - (to - from);
      const collapsed = cursor.anchor === cursor.head;
      const low = Math.min(cursor.anchor, cursor.head);
      const high = Math.max(cursor.anchor, cursor.head);
      const endpoint = (position, right) => {
        if (position < from) return position;
        if (position > to) return position + delta;
        if (position === to && to > from) return from + insertLength;
        return from + (right ? insertLength : 0);
      };
      const start = endpoint(low, collapsed);
      const end = endpoint(high, true);
      return { ...cursor, anchor: cursor.anchor > cursor.head ? end : start, head: cursor.anchor > cursor.head ? start : end };
    };
    const mapAll = (from, to, insertLength) => {
      for (const [id, cursor] of expected) expected.set(id, mapOne(cursor, from, to, insertLength));
    };
    const restoreHistory = (target, from, to, insertLength) => {
      for (const [id, cursor] of expected) {
        const saved = target.get(id);
        const sameAuthority = saved && saved.epoch === cursor.epoch && saved.sequence === cursor.sequence;
        expected.set(id, sameAuthority ? { ...cursor, anchor: saved.anchor, head: saved.head } : mapOne(cursor, from, to, insertLength));
      }
    };
    for (let step = 0; step < steps; step++) {
      const operation = choose(14);
      const beforeValue = editor.value;
      const beforeRevision = editor.revision;
      const id = `sample-${choose(12)}`;
      const tuple = versions.get(id) ?? { epoch: 1, sequence: 0 };
      trace.push({ step, operation, id, revision: beforeRevision });
      if (operation <= 2) {
        const anchor = choose(text.length + 1);
        const head = Math.min(text.length, anchor + choose(8));
        const cursor = { id, name: `Sample ${id} / ${step}`, color: colors[choose(colors.length)], anchor, head, epoch: tuple.epoch, sequence: tuple.sequence + 1, ttlMs: 0 };
        const result = editor.updateRemoteCursors({ cursors: [cursor], baseRevision: editor.revision, animate: false });
        check(result.ok);
        expected.set(id, { ...cursor, wireAnchor: anchor, wireHead: head });
        versions.set(id, { epoch: cursor.epoch, sequence: cursor.sequence });
      } else if (operation === 3 && expected.size) {
        const model = Array.from(expected.values())[choose(expected.size)];
        const result = editor.updateRemoteCursors({ cursors: [{ id: model.id, name: model.name, color: model.color, anchor: 0, head: 0, epoch: model.epoch, sequence: model.sequence - 1, ttlMs: 0 }] });
        check(!result.ok && result.reason === "stale-cursor");
      } else if (operation === 4 || operation === 11) {
        const from = operation === 11 ? 0 : choose(text.length + 1);
        const to = operation === 11 ? text.length : Math.min(text.length, from + choose(5));
        const insert = operation === 11 ? `New page ${step}. 雪 😀\n\nA second line.` : ["x", "雪", "😀", "\nnext\n"][choose(4)];
        const removed = text.slice(from, to);
        const beforePeers = snapshot();
        const previousText = text;
        const next = text.slice(0, from) + insert + text.slice(to);
        const result = editor.applyTransaction({ baseRevision: editor.revision, changes: [{ from, to, insert, expected: text.slice(from, to) }], origin: { kind: "external", id: "seeded-presence-check" } });
        check(result.ok);
        if (next !== text) {
          mapAll(from, to, insert.length);
          undo.push({ beforeText: previousText, afterText: next, beforePeers, afterPeers: snapshot(), from, removed, insert });
          if (undo.length > 300) undo.shift();
          redo.length = 0;
        }
        text = next;
      } else if (operation === 5 && undo.length) {
        const entry = undo.pop();
        entry.afterPeers = snapshot();
        redo.push(entry);
        text = entry.beforeText;
        restoreHistory(entry.beforePeers, entry.from, entry.from + entry.insert.length, entry.removed.length);
        check(editor.exec("history.undo"));
      } else if (operation === 6 && redo.length) {
        const entry = redo.pop();
        entry.beforePeers = snapshot();
        undo.push(entry);
        if (undo.length > 300) undo.shift();
        text = entry.afterText;
        restoreHistory(entry.afterPeers, entry.from, entry.from + entry.removed.length, entry.insert.length);
        check(editor.exec("history.redo"));
      } else if (operation === 7) {
        editor.mode = editor.mode === "source" ? "live" : "source";
        const surface = editor.shadowRoot.querySelector(editor.mode === "source" ? "textarea" : ".live-editor");
        surface.scrollTop = choose(1000);
      } else if (operation === 8) {
        const parent = editor.parentNode;
        const next = editor.nextSibling;
        editor.remove();
        const result = editor.updateRemoteCursors({ cursors: [] });
        check(!result.ok && result.reason === "not-connected");
        parent.insertBefore(editor, next);
      } else if (operation === 9) {
        const result = editor.updateRemoteCursors({ cursors: [], remove: [id] });
        check(result.ok);
        expected.delete(id);
      } else if (operation === 10 && expected.size) {
        const model = Array.from(expected.values())[choose(expected.size)];
        const result = editor.updateRemoteCursors({ cursors: [{ id: model.id, name: "Conflicting name", color: model.color, anchor: 0, head: 0, epoch: model.epoch, sequence: model.sequence, ttlMs: 0 }] });
        check(!result.ok && result.reason === "version-conflict");
      } else if ((operation === 12 || operation === 13) && expected.size) {
        const model = Array.from(expected.values())[choose(expected.size)];
        if (model.wireAnchor <= text.length && model.wireHead <= text.length) {
          const sequence = model.sequence + (operation === 13 ? 1 : 0);
          const cursor = { id: model.id, name: model.name, color: model.color, anchor: model.wireAnchor, head: model.wireHead, epoch: model.epoch, sequence, ttlMs: 0 };
          const result = editor.updateRemoteCursors({ cursors: [cursor] });
          check(result.ok);
          if (operation === 13) {
            expected.set(model.id, { ...model, anchor: model.wireAnchor, head: model.wireHead, sequence });
            versions.set(model.id, { epoch: model.epoch, sequence });
          }
        }
      }
      check(editor.value === text);
      check(editor.revision === beforeRevision + (beforeValue !== text ? 1 : 0));
      const actual = editor.getRemoteCursors();
      check(actual.length === expected.size && new Set(actual.map(cursor => cursor.id)).size === actual.length);
      for (const cursor of actual) {
        const model = expected.get(cursor.id);
        check(Boolean(model));
        check(cursor.name === model.name && cursor.color === model.color && cursor.epoch === model.epoch && cursor.sequence === model.sequence);
        check(Number.isSafeInteger(cursor.anchor) && Number.isSafeInteger(cursor.head) && cursor.anchor >= 0 && cursor.head >= 0 && cursor.anchor <= text.length && cursor.head <= text.length);
        exactEndpointAssertions++;
        if (cursor.anchor !== model.anchor || cursor.head !== model.head) fail(`Anchor drift for ${cursor.id}: expected ${model.anchor}/${model.head}, got ${cursor.anchor}/${cursor.head}`);
      }
      check(editor.shadowRoot.querySelectorAll(".remote-presence").length <= 1);
      check(editor.shadowRoot.querySelectorAll(".remote-presence-cursor").length <= 12);
      if (step % 16 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return { seed, steps: trace.length, exactEndpointAssertions, finalRevision: editor.revision, cursors: expected.size, textLength: text.length, trace };
  }, { seed, steps });
  expect(report.steps).toBe(steps);
  await testInfo.attach("presence-chaos-seed.json", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
});

const timing = { tag: "@cursor-timing" };

for (const mode of ["live", "source"]) {
  test(`64 cursor samples stay bounded during sustained ${mode} updates`, timing, async ({ page }, testInfo) => {
    await page.goto("/tests/fixtures/editor.html");
    const report = await page.locator("#editor").evaluate(async (editor, mode) => {
      editor.mode = mode;
      editor.style.setProperty("--md-editor-max-height", "420px");
      editor.value = Array.from({ length: 800 }, (_, index) => `Line ${index}: A long document keeps useful detail. Café 雪 😀.`).join("\n\n");
      const value = editor.value;
      const revision = editor.revision;
      const samples = [];
      const frameTimes = [];
      let previous = performance.now();
      let maxNodes = 0;
      let selectionRectPeak = 0;
      for (let frame = 0; frame < 120; frame++) {
        const cursors = Array.from({ length: 64 }, (_, index) => {
          const anchor = (index * 29 + frame * 3 + 37) % 900;
          return { id: `sample-${index}`, name: `Sample ${index}`, color: index % 2 ? "#5273a3" : "#b45c42", anchor, head: anchor + 4, epoch: 1, sequence: frame + 1, ttlMs: 0 };
        });
        const start = performance.now();
        const result = editor.updateRemoteCursors({ cursors, animate: false, showNames: false });
        if (!result.ok || result.count !== 64) throw Error(`64-cursor update failed: ${JSON.stringify(result)}`);
        samples.push(performance.now() - start);
        await new Promise(resolve => requestAnimationFrame(resolve));
        const now = performance.now();
        frameTimes.push(now - previous);
        previous = now;
        maxNodes = Math.max(maxNodes, editor.shadowRoot.querySelectorAll(".remote-presence *").length);
        selectionRectPeak = Math.max(selectionRectPeak, editor.shadowRoot.querySelectorAll(".remote-presence-selection").length);
      }
      const percentile = values => [...values].sort((a, b) => a - b)[Math.floor(values.length * .95)];
      return {
        mode,
        seed: 37,
        documentLength: value.length,
        documentLines: 800,
        cursorCount: 64,
        nonemptySelections: 64,
        selectionLength: 4,
        selectionRectPeak,
        frameTiming: "performance.now after requestAnimationFrame",
        warmupFrames: 5,
        frames: samples.length,
        updateP95: percentile(samples),
        frameP95: percentile(frameTimes.slice(5)),
        updateTimesMs: samples,
        frameIntervalsMs: frameTimes,
        maxNodes,
        valueUnchanged: value === editor.value,
        revisionUnchanged: revision === editor.revision,
        count: editor.getRemoteCursors().length
      };
    }, mode);
    await testInfo.attach(`presence-${mode}-timings.json`, { body: JSON.stringify(report, null, 2), contentType: "application/json" });
    expect(report.valueUnchanged).toBe(true);
    expect(report.revisionUnchanged).toBe(true);
    expect(report.count).toBe(64);
    expect(report.maxNodes).toBeLessThanOrEqual(600);
    expect(report.updateP95).toBeLessThan(50);
    expect(report.frameP95).toBeLessThan(250);
  });
}

for (const [mode, layout] of [["live", "paragraphs"], ["source", "paragraphs"], ["live", "wrapped paragraph"]]) {
  test(`64 overlapping long selections keep ${mode} updates within the viewport budget for ${layout}`, timing, async ({ page }, testInfo) => {
    await page.goto("/tests/fixtures/editor.html");
    const report = await page.locator("#editor").evaluate(async (editor, { mode, layout }) => {
      const wrapped = layout === "wrapped paragraph";
      const frames = 30;
      const warmupFrames = 5;
      const cursorCount = 64;
      const value = Array.from({ length: 1000 }, (_, line) => `Line ${line}: Safe text for local geometry tests. Café 雪 😀.`).join(wrapped ? " " : "\n\n");
      editor.style.setProperty("--md-editor-max-height", "420px");
      editor.mode = mode;
      editor.value = value;
      const revision = editor.revision;
      const surface = editor.shadowRoot.querySelector(mode === "live" ? ".live-editor" : "textarea");
      surface.scrollTop = 540;
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      await frame();
      const updateTimesMs = [];
      const frameIntervalsMs = [];
      let peakRects = 0;
      let peakRangeReads = 0;
      let peakRangeRects = 0;
      let previous = performance.now();
      const nativeRects = Range.prototype.getClientRects;
      for (let sequence = 1; sequence <= frames; sequence++) {
        const cursors = Array.from({ length: cursorCount }, (_, index) => {
          const anchor = index + sequence - 1;
          return { id: `sample-${index}`, name: `Sample ${index}`, color: "#456", anchor, head: value.length - anchor, epoch: 1, sequence, ttlMs: 0 };
        });
        let rangeReads = 0;
        let rangeRects = 0;
        Range.prototype.getClientRects = function () {
          const rectangles = nativeRects.call(this);
          rangeReads += 1;
          rangeRects += rectangles.length;
          return rectangles;
        };
        try {
          const start = performance.now();
          const result = editor.updateRemoteCursors({ cursors, animate: false });
          updateTimesMs.push(performance.now() - start);
          if (!result.ok || result.count !== cursorCount) throw Error(`Cursor update failed: ${JSON.stringify(result)}`);
        } finally {
          Range.prototype.getClientRects = nativeRects;
        }
        peakRangeReads = Math.max(peakRangeReads, rangeReads);
        peakRangeRects = Math.max(peakRangeRects, rangeRects);
        peakRects = Math.max(peakRects, editor.shadowRoot.querySelectorAll(".remote-presence-selection:not([hidden])").length);
        await frame();
        const now = performance.now();
        frameIntervalsMs.push(now - previous);
        previous = now;
      }
      const p95 = values => {
        const sorted = values.slice(warmupFrames).sort((a, b) => a - b);
        return sorted[Math.ceil(sorted.length * .95) - 1];
      };
      const valid = editor.value === value && editor.revision === revision;
      editor.setRemoteCursors([]);
      return {
        mode, layout, documentLength: value.length, cursorCount, frames, warmupFrames, peakRects, peakRangeReads, peakRangeRects,
        updateTimesMs, frameIntervalsMs, updateP95: p95(updateTimesMs), frameP95: p95(frameIntervalsMs), valid,
        cleared: !editor.shadowRoot.querySelector(".remote-presence")
      };
    }, { mode, layout });
    await testInfo.attach(`presence-long-${mode}-timings.json`, { body: JSON.stringify(report, null, 2), contentType: "application/json" });
    expect(report.valid).toBe(true);
    expect(report.cleared).toBe(true);
    expect(report.peakRects).toBeGreaterThanOrEqual(64);
    expect(report.peakRects).toBeLessThanOrEqual(64 * 64);
    expect(report.peakRangeReads).toBeLessThanOrEqual(112);
    expect(report.peakRangeRects).toBeLessThanOrEqual(256);
    expect(report.updateP95).toBeLessThan(80);
    expect(report.frameP95).toBeLessThan(250);
  });
}

test("repeated presence lifecycle preserves outside focus and bounded overlay nodes", timing, async ({ page }, testInfo) => {
  await page.goto("/tests/fixtures/editor.html");
  const report = await page.evaluate(async () => {
    const outside = document.createElement("input");
    outside.setAttribute("aria-label", "Outside focus check");
    document.body.append(outside);
    outside.focus();
    const times = [];
    for (let cycle = 0; cycle < 40; cycle++) {
      const start = performance.now();
      const editor = document.createElement("writemark-editor");
      editor.value = "Lifecycle sample text.\n\nA second line.";
      document.body.append(editor);
      const peers = Array.from({ length: 64 }, (_, index) => ({ id: `sample-${index}`, name: `Sample ${index}`, color: "#5273a3", anchor: index % editor.value.length, head: index % editor.value.length, ttlMs: 0 }));
      const result = editor.updateRemoteCursors({ cursors: peers, animate: false, showNames: false });
      if (!result.ok) throw Error(JSON.stringify(result));
      await new Promise(resolve => requestAnimationFrame(resolve));
      editor.remove();
      const rejected = editor.updateRemoteCursors({ cursors: [] });
      if (rejected.ok || rejected.reason !== "not-connected") throw Error("Disconnected update was not rejected");
      document.body.append(editor);
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (editor.shadowRoot.querySelectorAll(".remote-presence").length !== 1) throw Error("Reconnect created duplicate overlays");
      if (editor.getRemoteCursors().length !== 64) throw Error("Reconnect lost cursor samples");
      editor.remove();
      if (document.activeElement !== outside) throw Error("Presence lifecycle changed outside focus");
      times.push(performance.now() - start);
    }
    return { cycles: times.length, maxCycle: Math.max(...times), remainingEditors: document.querySelectorAll("writemark-editor").length, p95Cycle: [...times].sort((a, b) => a - b)[Math.floor(times.length * .95)] };
  });
  expect(report.cycles).toBe(40);
  expect(report.remainingEditors).toBe(1);
  expect(report.p95Cycle).toBeLessThan(500);
  await testInfo.attach("presence-lifecycle-timings.json", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
});
