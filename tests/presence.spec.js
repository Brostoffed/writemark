import { test, expect } from "./support/editor-fixture.js";

const cursor = (head, extra = {}) => ({ id: "one", name: "Alex", color: "#b64325", anchor: head, head, ...extra });

for (const mode of ["source", "live", "split"]) {
  test(`${mode} displays supplied cursors without changing the local editor`, async ({ editor, page }) => {
    await editor.reset({ value: "Alpha beta\n\nSecond line", attributes: { mode } });
    const result = await editor.host.evaluate(host => {
      const other = document.createElement("button");
      other.textContent = "Other control";
      document.body.prepend(other);
      other.focus();
      const before = { value: host.value, revision: host.revision, dirty: host.dirty, start: host.selectionStart, end: host.selectionEnd, scroll: window.scrollY };
      const accepted = host.setRemoteCursors([
        { id: "a", name: "Alex", color: "#b64325", anchor: 2, head: 6 },
        { id: "b", name: "River", color: "#4765a9", anchor: 15, head: 15 }
      ], { baseRevision: host.revision });
      return { accepted, before, after: { value: host.value, revision: host.revision, dirty: host.dirty, start: host.selectionStart, end: host.selectionEnd, scroll: window.scrollY }, focused: document.activeElement === other, cursors: host.getRemoteCursors() };
    });
    expect(result.accepted).toBe(true);
    expect(result.after).toEqual(result.before);
    expect(result.focused).toBe(true);
    expect(result.cursors.map(item => item.name)).toEqual(["Alex", "River"]);
    await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(2);
    await expect(editor.host.locator(".remote-presence-selection:visible")).not.toHaveCount(0);
    await expect(editor.host.locator(".remote-presence")).toHaveAttribute("aria-hidden", "true");
    expect(await editor.host.locator(".remote-presence").evaluate(node => getComputedStyle(node).pointerEvents)).toBe("none");
  });
}

test("presence validation stays atomic for hostile payloads and stale revisions", async ({ editor }) => {
  await editor.reset({ value: "A😀 beta" });
  const result = await editor.host.evaluate(host => {
    const valid = { id: "a", name: '<img src=x onerror="window.compromised=true">', color: "#fff", anchor: 1, head: 3 };
    host.setRemoteCursors([valid]);
    const before = host.getRemoteCursors();
    const invalid = [null, {}, [null], [{ ...valid, color: "red; background:url(x)" }], [{ ...valid, head: 99 }], [{ ...valid, anchor: 1.5 }], [valid, valid], Array.from({ length: 65 }, (_, id) => ({ ...valid, id: String(id) }))];
    const rejected = invalid.every(input => !host.setRemoteCursors(input) && JSON.stringify(host.getRemoteCursors()) === JSON.stringify(before));
    const stale = host.setRemoteCursors([], { baseRevision: host.revision + 1 });
    const snapshot = host.getRemoteCursors();
    snapshot[0].name = "Mutated caller copy";
    return { rejected, stale, retained: host.getRemoteCursors(), injected: Boolean(window.compromised), images: host.shadowRoot.querySelectorAll(".remote-presence img").length, label: host.shadowRoot.querySelector(".remote-presence-name").textContent, foreground: host.shadowRoot.querySelector(".remote-presence-cursor").style.getPropertyValue("--remote-label-fg") };
  });
  expect(result.rejected).toBe(true);
  expect(result.stale).toBe(false);
  expect(result.retained[0].name).toBe(result.label);
  expect(result.injected).toBe(false);
  expect(result.images).toBe(0);
  expect(result.foreground).toBe("#000000");
});

test("a reentrant cursor getter cannot replace newer presence", async ({ editor }) => {
  await editor.reset({ value: "abcdef" });
  const result = await editor.host.evaluate(host => {
    const newer = { id: "newer", name: "Newer", color: "#26725b", anchor: 3, head: 3 };
    const outer = { get id() { host.setRemoteCursors([newer]); return "older"; }, name: "Older", color: "#000", anchor: 0, head: 0 };
    return { accepted: host.setRemoteCursors([outer]), cursors: host.getRemoteCursors() };
  });
  expect(result.accepted).toBe(false);
  expect(result.cursors.map(item => item.id)).toEqual(["newer"]);
});

test("canonical edits map directed presence through history", async ({ editor }) => {
  await editor.reset({ value: "abcDEFghi", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    host.setRemoteCursors([{ id: "a", name: "Alex", color: "#4765a9", anchor: 6, head: 3 }]);
    const before = host.revision;
    const accepted = host.applyTransaction({ baseRevision: before, changes: [{ from: 0, to: 0, insert: "++" }] });
    const after = host.getRemoteCursors();
    host.exec("history.undo");
    const undo = host.getRemoteCursors();
    host.exec("history.redo");
    return { accepted, after, undo, redo: host.getRemoteCursors(), revision: host.revision, before };
  });
  expect(result.accepted.ok).toBe(true);
  expect(result.after[0]).toMatchObject({ anchor: 8, head: 5 });
  expect(result.undo[0]).toMatchObject({ anchor: 6, head: 3 });
  expect(result.redo[0]).toMatchObject({ anchor: 8, head: 5 });
  expect(result.revision).toBe(result.before + 3);
});

test("short moves ease without overshoot and line changes move directly", async ({ editor, page }) => {
  await editor.reset({ value: "abcdefghij\nsecond line", attributes: { mode: "source" } });
  await editor.host.evaluate(host => host.setRemoteCursors([{ id: "one", name: "Alex", color: "#b64325", anchor: 0, head: 0 }]));
  await editor.settle();
  await expect.poll(() => editor.host.evaluate(host => host._presenceController.layoutFrame)).toBe(null);
  await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
  await page.clock.pauseAt("2026-10-27T12:00:10Z");
  const read = () => editor.host.locator(".remote-presence-cursor").evaluate(node => {
    const matrix = new DOMMatrix(getComputedStyle(node).transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
  const initial = await read();
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(4));
  const immediate = await read();
  await page.clock.runFor(32);
  const midway = await read();
  await page.clock.runFor(96);
  const end = await read();
  expect(immediate.x).toBeCloseTo(initial.x, 2);
  expect(midway.x).toBeGreaterThan(initial.x);
  expect(midway.x).toBeLessThanOrEqual(end.x);
  expect(end.y).toBe(initial.y);
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(12));
  const line = await read();
  expect(line.y).toBeGreaterThan(end.y);
  await page.clock.runFor(120);
  expect(await read()).toEqual(line);
});

test("reduced motion disables cursor travel and repeated updates do not revive labels", async ({ editor, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
  await page.clock.pauseAt("2026-10-27T12:00:10Z");
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(0));
  await page.clock.runFor(32);
  const start = await editor.host.locator(".remote-presence-cursor").evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m41);
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(4));
  const moved = await editor.host.locator(".remote-presence-cursor").evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m41);
  expect(moved).toBeGreaterThan(start);
  expect(await editor.host.locator(".remote-presence-cursor").evaluate(node => getComputedStyle(node).transitionProperty)).toBe("none");
  await page.clock.runFor(1700);
  const label = editor.host.locator(".remote-presence-name");
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("0");
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(4));
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("0");
  expect(await label.evaluate(node => getComputedStyle(node).transitionProperty)).toBe("none");
});

test("new crowded labels never flash above their collision limit", async ({ editor }) => {
  await editor.reset({ value: "First line\n\nThird line\n\nFifth line", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    host.setRemoteCursors(Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: `Cursor ${index}`, color: "#4765a9", anchor: 15, head: 15 })));
    const labels = Array.from(host.shadowRoot.querySelectorAll(".remote-presence-name"));
    return { total: labels.length, shown: labels.filter(node => getComputedStyle(node).visibility !== "hidden").length };
  });
  expect(result.total).toBe(20);
  expect(result.shown).toBeGreaterThan(0);
  expect(result.shown).toBeLessThanOrEqual(4);
});

test("crowded labels stay bounded without hiding their carets", async ({ editor, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await editor.reset({ value: "First line\n\nThird line\n\nFifth line", attributes: { mode: "source" } });
  await editor.host.evaluate(host => host.setRemoteCursors(Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: `Cursor ${index}`, color: "#4765a9", anchor: 15, head: 15 }))));
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(20);
  const result = await editor.host.evaluate(host => {
    const shell = host.shadowRoot.querySelector(".editor-shell").getBoundingClientRect();
    const labels = Array.from(host.shadowRoot.querySelectorAll(".remote-presence-name")).filter(node => getComputedStyle(node).opacity === "1").map(node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    return { labels, bounded: labels.every(rect => rect.left >= shell.left - 1 && rect.right <= shell.right + 1 && rect.top >= shell.top - 1 && rect.bottom <= shell.bottom + 1) };
  });
  expect(result.labels.length).toBeGreaterThan(0);
  expect(result.labels.length).toBeLessThanOrEqual(4);
  expect(result.bounded).toBe(true);
  for (let i = 0; i < result.labels.length; i++) for (let j = i + 1; j < result.labels.length; j++) {
    const a = result.labels[i]; const b = result.labels[j];
    expect(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top).toBe(false);
  }
});

test("presence hides in preview and cleans mirrors across reconnect", async ({ editor, page }) => {
  await editor.reset({ value: "Alpha beta", attributes: { mode: "source" } });
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(3));
  await expect(page.locator('body > [inert][aria-hidden="true"]')).toHaveCount(1);
  await editor.host.evaluate(host => { host.mode = "preview"; });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(0);
  await editor.host.evaluate(host => { host.mode = "source"; });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(1);
  const result = await editor.host.evaluate(host => {
    const parent = host.parentNode;
    host.remove();
    const mirrors = document.querySelectorAll('body > [inert][aria-hidden="true"]').length;
    parent.append(host);
    return { mirrors, cursors: host.getRemoteCursors().length };
  });
  expect(result).toEqual({ mirrors: 0, cursors: 1 });
  await expect(page.locator('body > [inert][aria-hidden="true"]')).toHaveCount(1);
  await editor.host.evaluate(host => host.setRemoteCursors([]));
  await expect(editor.host.locator(".remote-presence-cursor")).toHaveCount(0);
});

test("external transactions preserve focus in another live editor", async ({ editor, page }) => {
  await editor.reset({ value: "Alpha beta" });
  const result = await editor.host.evaluate(host => {
    const other = document.createElement("input");
    document.body.prepend(other);
    other.focus();
    const accepted = host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 0, to: 0, insert: "New " }], selectionAfter: { start: 4, end: 4 } });
    const textFocus = document.activeElement === other;
    const noop = host.applyTransaction({ baseRevision: host.revision, changes: [], selectionAfter: { start: 5, end: 5 } });
    return { accepted, noop, textFocus, noopFocus: document.activeElement === other, value: host.value, selection: host.selectionStart };
  });
  expect(result.accepted.ok).toBe(true);
  expect(result.noop).toMatchObject({ ok: true, changed: false });
  expect(result.textFocus && result.noopFocus).toBe(true);
  expect(result.value).toBe("New Alpha beta");
  expect(result.selection).toBe(5);
});

async function pausePresenceClock(page) {
  await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
  await page.clock.pauseAt("2026-10-27T12:00:10Z");
}

test("incremental cursor updates report ordering and atomic patch failures", async ({ editor }) => {
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const a = { id: "a", name: "Alex", color: "#4765a9", anchor: 2, head: 4, epoch: 1, sequence: 2, ttlMs: 0 };
    const b = { ...a, id: "b", name: "River", anchor: 6, head: 6 };
    const first = host.updateRemoteCursors({ cursors: [a] });
    const merged = host.updateRemoteCursors({ cursors: [b] });
    const ids = host.getRemoteCursors().map(peer => peer.id);
    const stale = host.updateRemoteCursors({ cursors: [{ ...a, sequence: 1 }] });
    const conflict = host.updateRemoteCursors({ cursors: [{ ...a, name: "Wrong" }] });
    const ambiguous = host.updateRemoteCursors({ cursors: [a], remove: [a.id] });
    const removed = host.updateRemoteCursors({ cursors: [], remove: [a.id] });
    const delayed = host.updateRemoteCursors({ cursors: [a] });
    const returned = host.updateRemoteCursors({ cursors: [{ ...a, sequence: 3 }] });
    return { first, merged, ids, stale, conflict, ambiguous, removed, delayed, returned, names: host.getRemoteCursors().map(peer => peer.name) };
  });
  expect(result.first).toEqual({ ok: true, count: 1 });
  expect(result.merged).toEqual({ ok: true, count: 2 });
  expect(result.ids).toEqual(["a", "b"]);
  expect(result.stale).toEqual({ ok: false, reason: "stale-cursor", id: "a" });
  expect(result.conflict).toEqual({ ok: false, reason: "version-conflict", id: "a" });
  expect(result.ambiguous).toEqual({ ok: false, reason: "invalid-update", id: "a" });
  expect(result.removed).toEqual({ ok: true, count: 1 });
  expect(result.delayed).toEqual({ ok: false, reason: "stale-cursor", id: "a" });
  expect(result.returned).toEqual({ ok: true, count: 2 });
  expect(result.names).toEqual(["River", "Alex"]);
});

test("cursor TTL heartbeats extend presence without reviving expired labels", async ({ editor, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  await pausePresenceClock(page);
  const peer = cursor(3, { epoch: 1, sequence: 1, ttlMs: 2000 });
  await editor.host.evaluate((host, data) => host.updateRemoteCursors({ cursors: [data] }), peer);
  await page.clock.runFor(1700);
  expect(await editor.host.locator(".remote-presence-name").evaluate(node => getComputedStyle(node).opacity)).toBe("0");
  await editor.host.evaluate((host, data) => host.updateRemoteCursors({ cursors: [data] }), peer);
  await page.clock.runFor(1700);
  expect(await editor.host.evaluate(host => host.getRemoteCursors().length)).toBe(1);
  expect(await editor.host.locator(".remote-presence-name").evaluate(node => getComputedStyle(node).opacity)).toBe("0");
  await page.clock.runFor(301);
  expect(await editor.host.evaluate(host => host.getRemoteCursors())).toEqual([]);
  expect(await editor.host.locator(".remote-presence").count()).toBe(0);
  expect(await page.locator('body > [inert][aria-hidden="true"]').count()).toBe(0);
  const rejected = await editor.host.evaluate((host, data) => host.updateRemoteCursors({ cursors: [data] }), peer);
  expect(rejected).toEqual({ ok: false, reason: "stale-cursor", id: peer.id });
  const accepted = await editor.host.evaluate((host, data) => host.updateRemoteCursors({ cursors: [data] }), { ...peer, sequence: 2 });
  expect(accepted).toEqual({ ok: true, count: 1 });
});

test("cursor names have a screen-reader roster and support hover and explicit reveal", async ({ editor, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  await pausePresenceClock(page);
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(3, { name: "Alex <literal>", ttlMs: 0 }));
  const roster = editor.host.getByRole("list", { name: "Remote cursors" });
  await expect(roster).toHaveText("Alex <literal>");
  expect(await roster.evaluate(node => Boolean(node.closest('[aria-hidden="true"]')))).toBe(false);
  expect(await roster.locator("img").count()).toBe(0);
  await page.clock.runFor(1700);
  const label = editor.host.locator(".remote-presence-name");
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("0");
  const bounds = await editor.host.locator(".remote-presence-caret").boundingBox();
  await page.mouse.move(bounds.x + 1, bounds.y + bounds.height / 2);
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await page.mouse.move(0, 0);
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("0");
  await editor.host.evaluate(host => host.updateRemoteCursors({ cursors: [], showNames: true }));
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await editor.host.evaluate(host => host.updateRemoteCursors({ cursors: [], showNames: false }));
  expect(await label.evaluate(node => getComputedStyle(node).opacity)).toBe("0");
});

test("empty presence releases resources and accepts a later valid batch", async ({ editor, page }) => {
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(2, { ttlMs: 0 }));
  await expect(page.locator('body > [inert][aria-hidden="true"]')).toHaveCount(1);
  const result = await editor.host.evaluate(host => {
    host.setRemoteCursors([]);
    const controller = host._presenceController;
    return { overlay: host.shadowRoot.querySelectorAll(".remote-presence").length, roster: host.shadowRoot.querySelectorAll(".remote-presence-roster").length, resize: controller.resizeObserver, mutation: controller.mutationObserver, frame: controller.frame, layout: controller.layoutFrame, fade: controller.fadeTimer, expiry: controller.expiryTimer, listeners: controller.cleanups.length };
  });
  expect(result).toEqual({ overlay: 0, roster: 0, resize: null, mutation: null, frame: null, layout: null, fade: null, expiry: null, listeners: 0 });
  await expect(page.locator('body > [inert][aria-hidden="true"]')).toHaveCount(0);
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(4, { ttlMs: 0 }));
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(1);
  await expect(page.locator('body > [inert][aria-hidden="true"]')).toHaveCount(1);
});

test("partial ranges retain visible selection when their head leaves the viewport", async ({ editor, page }) => {
  const value = Array.from({ length: 80 }, (_, index) => `Line ${index} words`).join("\n");
  await editor.reset({ value, attributes: { mode: "source" } });
  await editor.host.evaluate(host => {
    const source = host.shadowRoot.querySelector("textarea");
    source.style.height = "160px";
    source.style.minHeight = "0";
    source.style.maxHeight = "160px";
    source.scrollTop = 0;
    host.setRemoteCursors([{ id: "range", name: "Range", color: "#4765a9", anchor: 0, head: host.value.length, ttlMs: 0 }]);
  });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(0);
  await expect(editor.host.locator(".remote-presence-selection:visible")).not.toHaveCount(0);
  const reused = await editor.host.evaluate(host => {
    const before = host.shadowRoot.querySelector(".remote-presence-selection");
    host._presenceController.refresh(false);
    return before === host.shadowRoot.querySelector(".remote-presence-selection");
  });
  expect(reused).toBe(true);
});

test("document and ancestor scrolling invalidate clipped presence", async ({ editor, page }) => {
  await editor.reset({ value: "Alpha beta", attributes: { mode: "source" } });
  await editor.host.evaluate(host => {
    document.body.style.minHeight = "2400px";
    host.style.marginTop = "400px";
    window.scrollTo(0, 350);
    host.setRemoteCursors([{ id: "a", name: "Alex", color: "#4765a9", anchor: 2, head: 2, ttlMs: 0 }]);
  });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await editor.host.evaluate(host => {
    host.style.marginTop = "0";
    const ancestor = document.createElement("div");
    ancestor.id = "presence-scroll-ancestor";
    Object.assign(ancestor.style, { height: "160px", overflow: "auto" });
    host.before(ancestor);
    ancestor.append(host);
    const spacer = document.createElement("div");
    spacer.style.height = "1200px";
    ancestor.append(spacer);
  });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(1);
  await page.locator("#presence-scroll-ancestor").evaluate(node => { node.scrollTop = 600; });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(0);
});

test("an ancestor transform refreshes cursor visibility without a scroll or resize", async ({ editor }) => {
  await editor.reset({ value: "Sample cursor", attributes: { mode: "source" } });
  const before = await editor.host.evaluate(async (host, data) => {
    const wrapper = document.createElement("div");
    wrapper.style.transform = "translateY(1600px)";
    host.before(wrapper);
    wrapper.append(host);
    host.setRemoteCursors([data]);
    for (let frame = 0; frame < 5; frame++) await new Promise(resolve => requestAnimationFrame(resolve));
    return { scroll: window.scrollY, height: host.getBoundingClientRect().height, revision: host.revision };
  }, cursor(8, { anchor: 3, ttlMs: 0 }));
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(0);
  await editor.host.evaluate(host => { host.parentElement.style.transform = "translateY(0)"; });
  await expect(editor.host.locator(".remote-presence-caret:visible")).toHaveCount(1);
  await expect(editor.host.locator(".remote-presence-selection:visible")).toHaveCount(1);
  const after = await editor.host.evaluate(host => ({ scroll: window.scrollY, height: host.getBoundingClientRect().height, revision: host.revision }));
  expect(after).toEqual(before);
});

test("equal-version heartbeats retain mapped endpoints after a shortening edit", async ({ editor, page }) => {
  await editor.reset({ value: "0123456789", attributes: { mode: "source" } });
  await pausePresenceClock(page);
  const peer = cursor(9, { anchor: 8, epoch: 1, sequence: 1, ttlMs: 1000 });
  await editor.host.evaluate((host, data) => {
    host.updateRemoteCursors({ cursors: [data] });
    host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 0, to: 8, insert: "" }] });
  }, peer);
  await page.clock.runFor(800);
  const result = await editor.host.evaluate((host, data) => {
    const accepted = host.updateRemoteCursors({ cursors: [data] });
    const newer = host.updateRemoteCursors({ cursors: [{ ...data, sequence: 2 }] });
    return { accepted, newer, cursors: host.getRemoteCursors(), value: host.value };
  }, peer);
  expect(result.accepted).toEqual({ ok: true, count: 1 });
  expect(result.newer).toEqual({ ok: false, reason: "invalid-cursor", id: peer.id });
  expect(result.value).toBe("89");
  expect(result.cursors[0]).toMatchObject({ anchor: 0, head: 1 });
  await page.clock.runFor(800);
  expect(await editor.host.evaluate(host => host.getRemoteCursors().length)).toBe(1);
});

test("a remote move ends hover reveal beneath a stationary pointer", async ({ editor, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data]), cursor(1, { ttlMs: 0 }));
  await editor.settle();
  await expect.poll(() => editor.host.evaluate(host => host._presenceController.layoutFrame)).toBe(null);
  await pausePresenceClock(page);
  await page.clock.runFor(1700);
  const caret = await editor.host.locator(".remote-presence-caret").boundingBox();
  await page.mouse.move(caret.x + 1, caret.y + caret.height / 2);
  const label = editor.host.locator(".remote-presence-name");
  await expect.poll(() => label.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await editor.host.evaluate((host, data) => host.setRemoteCursors([data], { animate: false }), cursor(8, { ttlMs: 0 }));
  const moved = await editor.host.locator(".remote-presence-caret").boundingBox();
  expect(moved.x).toBeGreaterThan(caret.x + 20);
  await page.clock.runFor(1700);
  expect(await editor.host.locator(".remote-presence-name").evaluate(node => getComputedStyle(node).opacity)).toBe("0");
});

test("update-time expiration releases a collision lane immediately", async ({ editor, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  await pausePresenceClock(page);
  const survivor = cursor(2, { id: "b", ttlMs: 0 });
  await editor.host.evaluate((host, data) => host.updateRemoteCursors({ cursors: [{ ...data, id: "a", ttlMs: 50 }, data], showNames: true }), survivor);
  await page.clock.runFor(50);
  const result = await editor.host.evaluate((host, data) => {
    const label = host._presenceController.entries.get(data.id).label;
    const before = getComputedStyle(label).visibility;
    const accepted = host.updateRemoteCursors({ cursors: [data] });
    return { before, accepted, after: getComputedStyle(label).visibility };
  }, survivor);
  expect(result.before).toBe("hidden");
  expect(result.accepted).toEqual({ ok: true, count: 1 });
  expect(result.after).toBe("visible");
});

test("unversioned full replacement applies supplied offsets after local edits", async ({ editor }) => {
  await editor.reset({ value: "abcdefghij", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const peer = { id: "one", name: "Alex", color: "#4765a9", anchor: 3, head: 3, ttlMs: 0 };
    host.setRemoteCursors([peer]);
    host.applyTransaction({ baseRevision: host.revision, changes: [{ from: 0, to: 0, insert: "++" }] });
    const mapped = host.getRemoteCursors()[0];
    const accepted = host.setRemoteCursors([peer]);
    return { mapped, accepted, replaced: host.getRemoteCursors()[0] };
  });
  expect(result.mapped).toMatchObject({ anchor: 5, head: 5 });
  expect(result.accepted).toBe(true);
  expect(result.replaced).toMatchObject({ anchor: 3, head: 3 });
});
