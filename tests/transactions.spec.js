import { expect, test } from "./support/editor-fixture.js";

test("external batches use UTF-16 offsets and one undo record", async ({ editor }) => {
  await editor.reset({ value: "A😀BCD", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    host.setSelectionRange(4, 6, "backward");
    const beforeRevision = host.revision;
    const events = [];
    host.addEventListener("md-input", event => events.push(event.detail), { once: true });
    const request = Object.freeze({ baseRevision: beforeRevision, changes: Object.freeze([
      Object.freeze({ from: 4, to: 5, insert: "YZ", expected: "C" }),
      Object.freeze({ from: 1, to: 3, insert: "X", expected: "😀" })
    ]), origin: Object.freeze({ kind: "external", id: "agent-1" }) });
    const accepted = host.applyTransaction(request);
    const edited = host.value;
    const selection = [host.selectionStart, host.selectionEnd, host._selection.direction];
    host.exec("history.undo");
    const undo = { value: host.value, revision: host.revision };
    host.exec("history.redo");
    return { accepted, edited, selection, undo, redo: { value: host.value, revision: host.revision }, beforeRevision, events };
  });
  expect(result.edited).toBe("AXBYZD");
  expect(result.selection).toEqual([3, 6, "backward"]);
  expect(result.accepted).toMatchObject({ ok: true, changed: true, revision: result.beforeRevision + 1 });
  expect(result.undo).toEqual({ value: "A😀BCD", revision: result.beforeRevision + 2 });
  expect(result.redo).toEqual({ value: result.edited, revision: result.beforeRevision + 3 });
  expect(result.events[0]).toMatchObject({ origin: { kind: "external", id: "agent-1" }, beforeRevision: result.beforeRevision, revision: result.beforeRevision + 1 });
});

test("stale, invalid, ambiguous, and mismatched batches remain atomic", async ({ editor }) => {
  await editor.reset({ value: "abcd" });
  const result = await editor.host.evaluate(host => {
    const revision = host.revision;
    const invalid = [
      null, {}, { baseRevision: revision, changes: null },
      { baseRevision: revision - 1, changes: [] },
      ...[undefined, null, "0", NaN, Infinity, -1, 0.5, 9].map(from => ({ baseRevision: revision, changes: [{ from, to: 1, insert: "X" }] })),
      { baseRevision: revision, changes: [{ from: 0, to: 1, insert: "X" }, { from: 2, to: 3, insert: "Y", expected: "wrong" }] },
      { baseRevision: revision, changes: [{ from: 1, to: 1, insert: "X" }, { from: 1, to: 1, insert: "Y" }] },
      { baseRevision: revision, changes: [], selectionAfter: { start: 2, end: 1 } },
      Object.defineProperty({}, "baseRevision", { get() { throw Error("hostile"); } })
    ];
    return { rejected: invalid.map(request => host.applyTransaction(request).ok), value: host.value, revision: host.revision, before: revision };
  });
  expect(result.rejected.every(ok => !ok)).toBe(true);
  expect(result.value).toBe("abcd");
  expect(result.revision).toBe(result.before);
});

test("no-op batches preserve revision, history, redo, and event counts", async ({ editor }) => {
  await editor.reset({ value: "abc" });
  const result = await editor.host.evaluate(host => {
    host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 1, to: 2, insert: "B" }] });
    host.exec("history.undo");
    const before = host.revision;
    let count = 0;
    host.addEventListener("md-input", () => count++);
    const accepted = host.applyTransaction({ baseRevision: before, changes: [{ from: 0, to: 3, insert: "abc" }] });
    const counts = { count, undo: host._undoStack.length, redo: host._redoStack.length };
    host.exec("history.redo");
    return { accepted, before, counts, value: host.value };
  });
  expect(result.accepted).toMatchObject({ ok: true, changed: false, revision: result.before });
  expect(result.counts).toMatchObject({ count: 0, redo: 1 });
  expect(result.value).toBe("aBc");
});

test("cancellation and reentrant changes reject external edits", async ({ editor }) => {
  await editor.reset({ value: "abc" });
  const result = await editor.host.evaluate(host => {
    const request = () => ({ baseRevision: host.revision, changes: [{ from: 0, to: 1, insert: "X" }] });
    const revision = host.revision;
    host.addEventListener("md-before-change", event => event.preventDefault(), { once: true });
    const canceled = host.applyTransaction(request());
    host.addEventListener("md-before-change", () => { host.value = "inner"; }, { once: true });
    const reentrant = host.applyTransaction(request());
    return { canceled, reentrant, revision, value: host.value };
  });
  expect(result.canceled).toMatchObject({ ok: false, reason: "change-canceled", revision: result.revision });
  expect(result.reentrant).toMatchObject({ ok: false, reason: "reentrant-change", revision: result.revision + 1 });
  expect(result.value).toBe("inner");
});

test("event listeners cannot change a validated batch", async ({ editor }) => {
  await editor.reset({ value: "abc", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const request = { baseRevision: host.revision, changes: [{ from: 0, to: 1, insert: "X" }], selectionAfter: { start: 1, end: 1 } };
    host.addEventListener("md-before-change", event => {
      request.changes[0].insert = "caller mutation";
      event.detail.selectionAfter.start = 3;
      try { event.detail.transaction.changes[0].insert = "event mutation"; } catch {}
    }, { once: true });
    const accepted = host.applyTransaction(request);
    return { accepted, value: host.value, start: host.selectionStart };
  });
  expect(result.value).toBe("Xbc");
  expect(result.start).toBe(1);
  expect(result.accepted.ok).toBe(true);
});

test("external batches reject disabled, readonly, and active composition", async ({ editor }) => {
  await editor.reset({ value: "abc", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const apply = () => host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 0, to: 1, insert: "X" }] });
    host.disabled = true;
    const disabled = apply();
    host.disabled = false;
    host.readonly = true;
    const readonly = apply();
    host.readonly = false;
    host.shadowRoot.querySelector("textarea").dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    const composition = apply();
    host.shadowRoot.querySelector("textarea").dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    return { disabled, readonly, composition, value: host.value };
  });
  expect(result.disabled.reason).toBe("disabled");
  expect(result.readonly.reason).toBe("readonly");
  expect(result.composition.reason).toBe("composition-active");
  expect(result.value).toBe("abc");
});

for (const mode of ["source", "live"]) {
  test(`native ${mode} input invalidates async edits and reset advances revision`, async ({ editor, page }) => {
    await editor.reset({ value: "abc", attributes: { mode } });
    const revision = await editor.host.evaluate(host => host.revision);
    await editor.setSelection(3);
    await page.keyboard.type("z");
    await expect.poll(() => editor.value()).toBe("abcz");
    const result = await editor.host.evaluate((host, baseRevision) => {
      const typedRevision = host.revision;
      const stale = host.applyTransaction({ baseRevision, changes: [{ from: 0, to: 1, insert: "X" }] });
      host.reset();
      return { typedRevision, stale, resetRevision: host.revision, value: host.value };
    }, revision);
    expect(result.typedRevision).toBeGreaterThan(revision);
    expect(result.stale.reason).toBe("stale-revision");
    expect(result.resetRevision).toBeGreaterThan(result.typedRevision);
    expect(result.value).toBe("abc");
  });
}

test("before-change state guards run after event listeners", async ({ editor }) => {
  await editor.reset({ value: "abc", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const results = [];
    for (const state of ["disabled", "readonly", "composition-active"]) {
      const before = host.revision;
      host.addEventListener("md-before-change", () => {
        if (state === "composition-active") host.shadowRoot.querySelector("textarea").dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
        else host[state] = true;
      }, { once: true });
      const rejected = host.applyTransaction({ baseRevision: before, changes: [{ from: 0, to: 1, insert: "X" }] });
      results.push({ rejected, before });
      host.disabled = false;
      host.readonly = false;
      host.shadowRoot.querySelector("textarea").dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    }
    return { results, value: host.value };
  });
  expect(result.results.map(item => item.rejected.reason)).toEqual(["disabled", "readonly", "composition-active"]);
  expect(result.results.every(item => item.before === item.rejected.revision)).toBe(true);
  expect(result.value).toBe("abc");
});

test("request getters and sync listeners cannot overwrite newer text", async ({ editor }) => {
  await editor.reset({ value: "abc" });
  const result = await editor.host.evaluate(host => {
    const before = host.revision;
    const rejected = host.applyTransaction({ get baseRevision() { host.value = "getter"; return before; }, changes: [{ from: 0, to: 1, insert: "X" }] });
    const events = [];
    host.addEventListener("md-input", event => events.push(event.detail));
    host.addEventListener("md-value-sync", () => { host.value = "newer"; }, { once: true });
    host.value = "outer";
    return { rejected, events, value: host.value, revision: host.revision, before };
  });
  expect(result.rejected.reason).toBe("reentrant-change");
  expect(result.value).toBe("newer");
  expect(result.events.map(event => event.value)).toEqual(["newer"]);
  expect(result.events[0].revision).toBe(result.revision);
});

test("origins remain coherent across actions, paste, and history", async ({ editor }) => {
  await editor.reset({ value: "abc", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const events = [];
    for (const name of ["md-before-change", "md-input", "md-action", "md-paste"]) host.addEventListener(name, event => {
      const detail = event.detail;
      events.push({ name, origin: detail.origin, beforeRevision: detail.beforeRevision, revision: detail.revision });
      try { detail.origin.kind = "external"; } catch {}
    });
    host.setSelectionRange(0, 3);
    host.exec("inline.bold");
    const source = host.shadowRoot.querySelector("textarea");
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "Z");
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", { value: transfer });
    source.dispatchEvent(paste);
    host.exec("history.undo");
    host.exec("history.redo");
    return events;
  });
  expect(result.filter(event => event.name === "md-input").map(event => event.origin.kind)).toEqual(["action", "paste", "action", "action"]);
  expect(result.filter(event => event.name === "md-input").slice(-2).map(event => event.origin.id)).toEqual(["history.undo", "history.redo"]);
  expect(result.find(event => event.name === "md-paste").origin.kind).toBe("paste");
  for (const event of result.filter(event => event.name === "md-input")) expect(event.revision).toBe(event.beforeRevision + 1);
});

test("default changes, commit, restore, and form reset keep revisions and sync values", async ({ editor }) => {
  await editor.reset({ value: "abc" });
  const result = await editor.host.evaluate(host => {
    const events = [];
    host.addEventListener("md-value-sync", event => events.push(event.detail));
    const before = host.revision;
    host.value = "changed";
    host.defaultValue = "default";
    const afterDefault = host.revision;
    host.commit();
    host.formStateRestoreCallback("restored");
    const afterRestore = host.revision;
    host.formResetCallback();
    return { events, before, afterDefault, afterRestore, revision: host.revision, value: host.value };
  });
  expect(result.afterDefault).toBe(result.before + 1);
  expect(result.afterRestore).toBe(result.before + 2);
  expect(result.revision).toBe(result.before + 3);
  expect(result.value).toBe("changed");
  expect(result.events.map(event => event.defaultValue)).toContain("default");
  expect(result.events.some(event => event.value === "changed" && event.defaultValue === "changed")).toBe(true);
});

test("completion events identify the provider and stop after cancellation", async ({ editor, page }) => {
  await editor.reset({ attributes: { mode: "source" } });
  await editor.host.evaluate(host => {
    host.registerCompletionProvider({
      id: "transaction-origin", priority: 1000, triggers: ["@"],
      match(ctx) { return ctx.currentLine.text.endsWith("@") ? { from: ctx.selectionStart - 1, to: ctx.selectionStart, query: "" } : null; },
      getItems() { return [{ id: "one", label: "One", kind: "test" }]; },
      apply(_item, match) { return { ok: true, transaction: { changes: [{ from: match.from, to: match.to, insert: "done" }] } }; }
    });
    host._transactionEvents = [];
    for (const name of ["md-before-change", "md-input", "md-completion-accept"]) host.addEventListener(name, event => host._transactionEvents.push({ name, ...event.detail }));
    host.focus();
  });
  await page.keyboard.type("@");
  await expect(editor.completion).toBeVisible();
  await page.keyboard.press("Enter");
  await expect.poll(() => editor.value()).toBe("done");
  const events = await editor.host.evaluate(host => host._transactionEvents.map(({ name, origin, beforeRevision, revision }) => ({ name, origin, beforeRevision, revision })));
  const completion = events.filter(event => event.origin.kind === "completion");
  expect(completion.map(event => event.name)).toEqual(["md-before-change", "md-input", "md-completion-accept"]);
  expect(completion.every(event => event.origin.id === "transaction-origin")).toBe(true);
  expect(completion[1].beforeRevision).toBe(completion[0].revision);
  expect(completion[1].revision).toBe(completion[0].revision + 1);

  await editor.setValue("");
  await editor.host.evaluate(host => {
    host._transactionEvents.length = 0;
    host.addEventListener("md-before-change", event => event.preventDefault(), { once: true });
    host.focus();
  });
  await page.keyboard.type("@");
  await expect(editor.completion).toBeVisible();
  await page.keyboard.press("Enter");
  expect(await editor.value()).toBe("@");
  expect(await editor.host.evaluate(host => host._transactionEvents.filter(event => event.name === "md-completion-accept").length)).toBe(0);
});

test("commit keeps a nested sync edit and omits stale commit events", async ({ editor }) => {
  await editor.reset({ value: "base" });
  const result = await editor.host.evaluate(host => {
    host.value = "outer";
    const events = [];
    host.addEventListener("md-change", event => events.push({ name: "change", value: event.detail.value }));
    host.addEventListener("md-dirty-change", event => events.push({ name: "dirty", dirty: event.detail.dirty }));
    host.addEventListener("md-value-sync", () => { host.value = "nested"; }, { once: true });
    host.commit();
    return { value: host.value, defaultValue: host.defaultValue, dirty: host.dirty, events };
  });
  expect(result).toEqual({ value: "nested", defaultValue: "outer", dirty: true, events: [{ name: "dirty", dirty: true }] });
});

test("reset keeps a nested input edit and its dirty state", async ({ editor }) => {
  await editor.reset({ value: "base" });
  const result = await editor.host.evaluate(host => {
    host.value = "outer";
    const events = [];
    host.addEventListener("md-dirty-change", event => events.push(event.detail.dirty));
    host.addEventListener("md-input", () => { host.value = "nested"; }, { once: true });
    host.reset();
    return { value: host.value, defaultValue: host.defaultValue, dirty: host.dirty, events };
  });
  expect(result.value).toBe("nested");
  expect(result.defaultValue).toBe("base");
  expect(result.dirty).toBe(true);
  expect(result.events.at(-1)).toBe(true);
});

test("stale revisions take precedence over old expected text and offsets", async ({ editor }) => {
  await editor.reset({ value: "original" });
  const result = await editor.host.evaluate(host => {
    const request = { baseRevision: host.revision, changes: [{ from: 4, to: 8, insert: "X", expected: "inal" }] };
    host.applyTransaction(request);
    const mismatch = host.applyTransaction(request);
    host.value = "a";
    const range = host.applyTransaction(request);
    const before = host.revision;
    const reentrant = host.applyTransaction({ baseRevision: before, get changes() { host.value = "getter"; return [{ from: -1, to: 0, insert: "X" }]; } });
    return { mismatch, range, reentrant, value: host.value };
  });
  expect(result.mismatch.reason).toBe("stale-revision");
  expect(result.range.reason).toBe("stale-revision");
  expect(result.reentrant.reason).toBe("reentrant-change");
  expect(result.value).toBe("getter");
});

test("cut, native source change, and commit report their effective origins", async ({ editor }) => {
  await editor.reset({ value: "abc" });
  const result = await editor.host.evaluate(host => {
    const events = [];
    host.addEventListener("md-cut", event => events.push({ name: "cut", ...event.detail }));
    host.addEventListener("md-change", event => events.push({ name: "change", ...event.detail }));
    host.setSelectionRange(0, 3);
    const before = host.revision;
    const transfer = new DataTransfer();
    const cut = new Event("cut", { bubbles: true, cancelable: true });
    Object.defineProperty(cut, "clipboardData", { value: transfer });
    host.shadowRoot.querySelector(".live-editor").dispatchEvent(cut);
    host.mode = "source";
    host.shadowRoot.querySelector("textarea").dispatchEvent(new Event("change", { bubbles: true }));
    host.commit();
    return { events, before, value: host.value };
  });
  expect(result.value).toBe("");
  expect(result.events[0]).toMatchObject({ name: "cut", origin: { kind: "user", id: "clipboard.cut" }, start: 0, end: 3, beforeRevision: result.before, revision: result.before + 1 });
  expect(result.events[1]).toMatchObject({ name: "change", origin: { kind: "user" }, beforeRevision: result.before + 1, revision: result.before + 1 });
  expect(result.events[2]).toMatchObject({ name: "change", origin: { kind: "api" }, beforeRevision: result.before + 1, revision: result.before + 1 });
});

test("no-op results report the current native source selection without focus", async ({ editor, page }) => {
  await editor.reset({ value: "abcd", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    host.setSelectionRange(0, 0);
    host.blur();
    const source = host.shadowRoot.querySelector("textarea");
    source.setSelectionRange(2, 3, "backward");
    const beforeFocus = document.activeElement?.tagName;
    const revision = host.revision;
    const result = host.applyTransaction({ baseRevision: revision, changes: [] });
    return { result, revision, start: source.selectionStart, end: source.selectionEnd, direction: source.selectionDirection, beforeFocus, afterFocus: document.activeElement?.tagName };
  });
  expect(result.result).toMatchObject({ ok: true, changed: false, revision: result.revision, selection: { start: 2, end: 3, direction: "backward" } });
  expect([result.start, result.end, result.direction]).toEqual([2, 3, "backward"]);
  expect(result.afterFocus).toBe(result.beforeFocus);
});

for (const eventName of ["md-input", "md-completion-close"]) {
  test(`completion keeps a nested ${eventName} edit without stale acceptance`, async ({ editor, page }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.evaluate((host, eventName) => {
      host.registerCompletionProvider({
        id: "nested-audit", priority: 1000, triggers: ["@"],
        match(ctx) { return ctx.currentLine.text.endsWith("@") ? { from: ctx.selectionStart - 1, to: ctx.selectionStart, query: "" } : null; },
        getItems() { return [{ id: "one", label: "One", kind: "test" }]; },
        apply(_item, match) { return { ok: true, transaction: { changes: [{ from: match.from, to: match.to, insert: "completed" }] } }; }
      });
      host._acceptanceCount = 0;
      host.addEventListener("md-completion-accept", () => host._acceptanceCount++);
      const nestedEdit = event => {
        if (eventName === "md-input" && event.detail.origin.kind !== "completion") return;
        host.removeEventListener(eventName, nestedEdit);
        host.value = "nested";
      };
      host.addEventListener(eventName, nestedEdit);
      host.focus();
    }, eventName);
    await page.keyboard.type("@");
    await expect(editor.completion).toBeVisible();
    await page.keyboard.press("Enter");
    expect(await editor.value()).toBe("nested");
    expect(await editor.host.evaluate(host => host._acceptanceCount)).toBe(0);
  });
}
