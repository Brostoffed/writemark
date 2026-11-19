import { test, expect } from "@playwright/test";

test("generated external edits keep the enhanced form and history consistent", async ({ page }) => {
  await page.goto("/tests/fixtures/textarea-enhancement.html");
  const result = await page.evaluate(() => {
    const textarea = document.querySelector("#body");
    const { editor } = WritemarkEditor.enhanceTextarea(textarea);
    editor.mode = "source";
    editor.value = "A😀 café\n\n- [ ] Item";
    let seed = 0x19e71a;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    const inserts = ["雪", "😀", "**mark**", "\r\n", "[link](https://example.com)", "e\u0301", ""];
    const verify = (expected, index, phase) => {
      const values = new FormData(textarea.form).getAll("body");
      if (editor.value !== expected || textarea.value !== expected || values.length !== 1 || values[0] !== expected) {
        throw new Error(JSON.stringify({ seed: "0x19e71a", index, phase, expected, editor: editor.value, textarea: textarea.value, values }));
      }
    };
    for (let index = 0; index < 128; index++) {
      const before = editor.value;
      const revision = editor.revision;
      const boundaries = [0];
      for (const character of before) boundaries.push(boundaries.at(-1) + character.length);
      const start = random() % boundaries.length;
      const from = boundaries[start];
      const to = boundaries[Math.min(boundaries.length - 1, start + random() % 5)];
      const insert = inserts[random() % inserts.length];
      const expected = before.slice(0, from) + insert.replace(/\r\n?/g, "\n") + before.slice(to);
      const request = { baseRevision: revision, changes: [{ from, to, insert, expected: before.slice(from, to) }], origin: { kind: "external", id: `generated-${index}` } };
      const accepted = editor.applyTransaction(request);
      if (!accepted.ok || accepted.changed !== (before !== expected)) throw new Error(`Rejected case ${index}: ${JSON.stringify(accepted)}`);
      verify(expected, index, "accepted");
      if (before === expected) {
        if (editor.revision !== revision) throw new Error(`No-op changed revision at ${index}`);
        continue;
      }
      const stale = editor.applyTransaction(request);
      if (stale.ok || stale.reason !== "stale-revision") throw new Error(`Incorrect stale result at ${index}: ${JSON.stringify(stale)}`);
      editor.exec("history.undo");
      verify(before, index, "undo");
      editor.exec("history.redo");
      verify(expected, index, "redo");
      if (editor.revision !== revision + 3) throw new Error(`Incorrect revision at ${index}`);
    }
    return { cases: 128, values: new FormData(textarea.form).getAll("body").length };
  });
  expect(result).toEqual({ cases: 128, values: 1 });
});

test("UTF-16 source and native form values follow browser surrogate rules", async ({ page }) => {
  await page.goto("/tests/fixtures/textarea-enhancement.html");
  const result = await page.evaluate(() => {
    const textarea = document.querySelector("#body");
    const { editor } = WritemarkEditor.enhanceTextarea(textarea);
    editor.value = "A😀B";
    const applied = editor.applyTransaction({ baseRevision: editor.revision, changes: [{ from: 2, to: 3, insert: "" }] });
    return { applied, source: editor.value, native: textarea.value, submitted: new FormData(textarea.form).get("body") };
  });
  expect(result.applied).toMatchObject({ ok: true, changed: true });
  expect(result.source).toBe("A\ud83dB");
  expect(result.native).toBe(result.source);
  expect(result.submitted).toBe("A\ufffdB");
});

test("a native form input listener can apply a newer transaction without losing text", async ({ page }) => {
  await page.goto("/tests/fixtures/textarea-enhancement.html");
  await page.evaluate(() => {
    const textarea = document.querySelector("#body");
    const { editor } = WritemarkEditor.enhanceTextarea(textarea);
    editor.mode = "source";
    textarea.addEventListener("input", () => {
      const value = editor.value;
      editor.applyTransaction({
        baseRevision: editor.revision,
        changes: [{ from: 0, to: value.length, expected: value, insert: `Reviewed: ${value}` }],
        origin: { kind: "external", id: "native-form-listener" }
      });
    }, { once: true });
  });
  await page.locator("#body + writemark-editor").locator("textarea").fill("New draft");
  expect(await page.evaluate(() => {
    const textarea = document.querySelector("#body");
    return { editor: WritemarkEditor.enhanceTextarea(textarea).editor.value, native: textarea.value, submitted: new FormData(textarea.form).getAll("body") };
  })).toEqual({ editor: "Reviewed: New draft", native: "Reviewed: New draft", submitted: ["Reviewed: New draft"] });
});

test("native range replacement invalidates stale transactions and preserves single submission", async ({ page }) => {
  await page.goto("/tests/fixtures/textarea-enhancement.html");
  const result = await page.evaluate(() => {
    const textarea = document.querySelector("#body");
    const { editor } = WritemarkEditor.enhanceTextarea(textarea);
    textarea.value = "A😀 café";
    const beforeRevision = editor.revision;
    textarea.setRangeText("雪", 1, 3, "select");
    const stale = editor.applyTransaction({ baseRevision: beforeRevision, changes: [{ from: 0, to: 1, insert: "Wrong" }] });
    const current = editor.applyTransaction({ baseRevision: editor.revision, changes: [{ from: 0, to: 1, insert: "New" }] });
    return { stale, current, value: editor.value, native: textarea.value, values: new FormData(textarea.form).getAll("body"), revision: editor.revision, beforeRevision };
  });
  expect(result.stale).toMatchObject({ ok: false, reason: "stale-revision" });
  expect(result.current).toMatchObject({ ok: true, changed: true });
  expect(result.value).toBe("New雪 café");
  expect(result.native).toBe(result.value);
  expect(result.values).toEqual([result.value]);
  expect(result.revision).toBe(result.beforeRevision + 2);
});

test("native range replacement maps peers at the exact repeated-text range", async ({ page }) => {
  await page.goto("/tests/fixtures/textarea-enhancement.html");
  const result = await page.evaluate(() => {
    const textarea = document.querySelector("#body");
    const { editor } = WritemarkEditor.enhanceTextarea(textarea);
    textarea.value = "aaaa";
    editor.setRemoteCursors([{ id: "peer", name: "Peer", color: "#4765a9", anchor: 2, head: 2 }]);
    textarea.setRangeText("", 1, 2, "preserve");
    const deleted = { value: editor.value, cursor: editor.getRemoteCursors()[0].head };
    textarea.value = "aaaa";
    editor.setRemoteCursors([{ id: "fresh", name: "Fresh", color: "#4765a9", anchor: 2, head: 2 }]);
    textarea.setSelectionRange(1, 2);
    textarea.setRangeText("\r\n");
    const newline = { value: editor.value, native: textarea.value, cursor: editor.getRemoteCursors()[0].head };
    return { deleted, newline };
  });
  expect(result.deleted).toEqual({ value: "aaa", cursor: 1 });
  expect(result.newline).toEqual({ value: "a\naa", native: "a\naa", cursor: 2 });
});
