import { test, expect } from "@playwright/test";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";

const script = buildSync({
  entryPoints: [fileURLToPath(new URL("../src/browser/presence-geometry.ts", import.meta.url))],
  bundle: true,
  format: "iife",
  globalName: "GeometryHarness",
  write: false
}).outputFiles[0].text;

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/presence-geometry.html");
  await page.addScriptTag({ content: script });
  await page.evaluate(() => {
    window.geometryMode = "source";
    const source = document.querySelector("#source");
    const live = document.querySelector("#live");
    window.geometry = new GeometryHarness.PresenceGeometry({
      host: document.querySelector("#host"),
      shell: document.querySelector("#shell"),
      source,
      live,
      getMode: () => window.geometryMode,
      getValue: () => {
        window.geometryReads = (window.geometryReads || 0) + 1;
        return window.geometryValue ?? (window.geometryMode === "live" ? live.textContent : source.value);
      },
      domPositionFromSource: offset => {
        window.geometryMapCalls = (window.geometryMapCalls || 0) + 1;
        (window.geometryOffsets ||= []).push(offset);
        const editable = Array.from(live.querySelectorAll("[data-editable]")).find(element => offset >= Number(element.dataset.from) && offset <= Number(element.dataset.to));
        return editable ? { node: editable.firstChild, offset: offset - Number(editable.dataset.from), editable } : null;
      }
    });
  });
});

for (const scenario of [
  { name: "wrapped text", value: "alpha beta gamma delta epsilon zeta eta theta", offset: 35 },
  { name: "tabs and padding", value: "alpha\tbeta\tgamma", offset: 11 },
  { name: "RTL text", value: "אבגדה וזחטי כלמנס", offset: 8, direction: "rtl" },
  { name: "scrolled text", value: Array.from({ length: 18 }, (_, index) => `line ${index}`).join("\n"), offset: 91, scrollTop: 220 }
]) {
  test(`source geometry matches native hit testing for ${scenario.name}`, async ({ page }) => {
    const result = await page.evaluate(scenario => {
      const source = document.querySelector("#source");
      source.value = scenario.value;
      if (scenario.direction) source.dir = scenario.direction;
      if (scenario.scrollTop) source.scrollTop = scenario.scrollTop;
      const measurement = window.geometry.measure(scenario.offset, scenario.offset);
      const shell = document.querySelector("#shell").getBoundingClientRect();
      return measurement ? { x: shell.left + measurement.caret.left + 0.1, y: shell.top + measurement.caret.top + measurement.caret.height / 2 } : null;
    }, scenario);
    expect(result).not.toBeNull();
    await page.mouse.click(result.x, result.y);
    expect(await page.locator("#source").evaluate(source => source.selectionStart)).toBe(scenario.offset);
  });
}

test("measurement preserves focus, selection, scroll, and source", async ({ page }) => {
  const result = await page.evaluate(() => {
    const source = document.querySelector("#source");
    source.value = "First line\nSecond line\nThird line";
    source.setSelectionRange(1, 4, "backward");
    document.querySelector("#other").focus();
    const before = { active: document.activeElement.id, start: source.selectionStart, end: source.selectionEnd, direction: source.selectionDirection, scroll: source.scrollTop, value: source.value, width: document.documentElement.scrollWidth };
    const measurement = window.geometry.measure(2, 20);
    const after = { active: document.activeElement.id, start: source.selectionStart, end: source.selectionEnd, direction: source.selectionDirection, scroll: source.scrollTop, value: source.value, width: document.documentElement.scrollWidth };
    window.geometry.disconnect();
    return { before, after, visible: Boolean(measurement?.selection.length), disconnected: window.geometry.measure(0, 0), mirrors: document.querySelectorAll('[aria-hidden="true"]').length };
  });
  expect(result.after).toEqual(result.before);
  expect(result.visible).toBe(true);
  expect(result.disconnected).toBeNull();
  expect(result.mirrors).toBe(0);
});

test("hides offscreen carets and clips visible ranges", async ({ page }) => {
  const result = await page.evaluate(() => {
    const source = document.querySelector("#source");
    source.value = Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n");
    const hidden = window.geometry.measure(source.value.length, source.value.length);
    const visible = window.geometry.measure(0, 20);
    return { hidden, visible };
  });
  expect(result.hidden).toBeNull();
  expect(result.visible).not.toBeNull();
  for (const rectangle of [result.visible.caret, ...result.visible.selection]) {
    expect(rectangle.left).toBeGreaterThanOrEqual(result.visible.viewport.left);
    expect(rectangle.top).toBeGreaterThanOrEqual(result.visible.viewport.top);
    expect(rectangle.left + rectangle.width).toBeLessThanOrEqual(result.visible.viewport.left + result.visible.viewport.width + 0.01);
    expect(rectangle.top + rectangle.height).toBeLessThanOrEqual(result.visible.viewport.top + result.visible.viewport.height + 0.01);
  }
});

test("live geometry uses ranges without changing the document selection", async ({ page }) => {
  const result = await page.evaluate(() => {
    window.geometryMode = "live";
    document.querySelector("#source").hidden = true;
    const live = document.querySelector("#live");
    live.hidden = false;
    const selection = window.getSelection();
    const before = { anchor: selection.anchorNode, anchorOffset: selection.anchorOffset, focus: selection.focusNode, focusOffset: selection.focusOffset };
    const measurement = window.geometry.measure(2, 9);
    const unchanged = selection.anchorNode === before.anchor && selection.anchorOffset === before.anchorOffset && selection.focusNode === before.focus && selection.focusOffset === before.focusOffset;
    const calls = window.geometryMapCalls;
    live.querySelector("[data-editable]").dataset.to = "8";
    const unmounted = window.geometry.measure(0, 12);
    return { measurement, unchanged, calls, callsAfter: window.geometryMapCalls, offsets: window.geometryOffsets, unmounted };
  });
  expect(result.measurement).not.toBeNull();
  expect(result.measurement.selection.length).toBeGreaterThan(0);
  expect(result.unchanged).toBe(true);
  expect(result.unmounted).not.toBeNull();
  expect(result.unmounted.caret).toBeNull();
  expect(result.unmounted.selection.length).toBeGreaterThan(0);
  expect(result.offsets).not.toContain(12);
});

test("source geometry measures empty and trailing newline carets", async ({ page }) => {
  const result = await page.evaluate(() => {
    const source = document.querySelector("#source");
    source.value = "";
    const empty = window.geometry.measure(0, 0);
    source.value = "one\n";
    const trailing = window.geometry.measure(4, 4);
    return { empty, trailing };
  });
  expect(result.empty).not.toBeNull();
  expect(result.trailing).not.toBeNull();
  expect(result.trailing.caret.top - result.empty.caret.top).toBeCloseTo(24, 0);
});

test("split uses source geometry and preview hides geometry", async ({ page }) => {
  const result = await page.evaluate(() => {
    document.querySelector("#source").value = "café 😀 text";
    window.geometryMode = "split";
    const split = window.geometry.measure(0, 7);
    window.geometryMode = "preview";
    const preview = window.geometry.measure(0, 0);
    return { split, preview };
  });
  expect(result.split).not.toBeNull();
  expect(result.split.selection.length).toBeGreaterThan(0);
  expect(result.preview).toBeNull();
});

test("single-line source geometry stays exact with reduced motion and a paused clock", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.locator("#source").evaluate(source => { source.value = "abcdefghij"; });
  await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
  await page.clock.pauseAt("2026-10-27T12:00:10Z");
  const result = await page.evaluate(() => {
    const start = window.geometry.measure(0, 0);
    const moved = window.geometry.measure(4, 4);
    const source = document.querySelector("#source");
    const shell = document.querySelector("#shell").getBoundingClientRect();
    const style = getComputedStyle(source);
    const nativeLeft = source.getBoundingClientRect().left - shell.left + source.clientLeft + Number.parseFloat(style.paddingLeft);
    return { start, moved, nativeLeft };
  });
  expect(result.start).not.toBeNull();
  expect(result.moved).not.toBeNull();
  expect(result.start.caret.left).toBeCloseTo(result.nativeLeft, 1);
  expect(result.moved.caret.left).toBeGreaterThan(result.start.caret.left + 20);
  expect(result.moved.caret.top).toBe(result.start.caret.top);
});

for (const mode of ["source", "split"]) {
  test(`${mode} keeps visible selection when the head is below the viewport`, async ({ page }) => {
    const result = await page.evaluate(mode => {
      window.geometryMode = mode;
      const source = document.querySelector("#source");
      source.value = Array.from({ length: 40 }, (_, index) => `row ${index}`).join("\n");
      const forward = window.geometry.measure(0, source.value.length);
      const reverse = window.geometry.measure(source.value.length, 0);
      return { forward, reverse };
    }, mode);
    expect(result.forward).not.toBeNull();
    expect(result.forward.caret).toBeNull();
    expect(result.forward.selection.length).toBeGreaterThan(0);
    expect(result.reverse.caret).not.toBeNull();
    expect(result.reverse.selection).toEqual(result.forward.selection);
  });
}

test("live keeps mounted selection fragments with either endpoint unmounted", async ({ page }) => {
  const result = await page.evaluate(() => {
    window.geometryMode = "live";
    window.geometryValue = "x".repeat(10) + "Live sample text" + "x".repeat(14);
    document.querySelector("#source").hidden = true;
    const live = document.querySelector("#live");
    live.hidden = false;
    const editable = live.querySelector("[data-editable]");
    editable.dataset.from = "10";
    editable.dataset.to = "26";
    const visibleHead = window.geometry.measure(0, 15);
    const visibleAnchor = window.geometry.measure(15, 35);
    const crossing = window.geometry.measure(0, 35);
    const absent = window.geometry.measure(35, 35);
    return { visibleHead, visibleAnchor, crossing, absent, offsets: window.geometryOffsets };
  });
  expect(result.visibleHead.caret).not.toBeNull();
  expect(result.visibleHead.selection.length).toBeGreaterThan(0);
  expect(result.visibleAnchor.caret).toBeNull();
  expect(result.visibleAnchor.selection.length).toBeGreaterThan(0);
  expect(result.crossing.caret).toBeNull();
  expect(result.crossing.selection.length).toBeGreaterThan(0);
  expect(result.absent).toBeNull();
  expect(result.offsets.every(offset => offset >= 10 && offset <= 26)).toBe(true);
});

test("batch shares source setup and returns results in input order", async ({ page }) => {
  const result = await page.evaluate(async () => {
    document.querySelector("#source").value = "abcdefghij";
    window.geometry.measure(0, 0);
    const mirror = document.querySelector('[aria-hidden="true"]');
    let styleChanges = 0;
    const observer = new MutationObserver(records => { styleChanges += records.filter(record => record.attributeName === "style").length; });
    observer.observe(mirror, { attributes: true });
    const beforeReads = window.geometryReads;
    const batch = window.geometry.measureBatch([{ anchor: 0, head: 4 }, { anchor: 0, head: 0 }, { anchor: -1, head: 0 }]);
    await Promise.resolve();
    observer.disconnect();
    return { batch, reads: window.geometryReads - beforeReads, styleChanges };
  });
  expect(result.reads).toBe(1);
  expect(result.styleChanges).toBe(0);
  expect(result.batch[0].caret.left).toBeGreaterThan(result.batch[1].caret.left);
  expect(result.batch[2]).toBeNull();
});

test("batch discovers mounted live editables once", async ({ page }) => {
  const result = await page.evaluate(() => {
    window.geometryMode = "live";
    document.querySelector("#source").hidden = true;
    const live = document.querySelector("#live");
    live.hidden = false;
    const nativeQuery = live.querySelectorAll.bind(live);
    let discoveries = 0;
    live.querySelectorAll = selector => { discoveries += 1; return nativeQuery(selector); };
    const batch = window.geometry.measureBatch([{ anchor: 2, head: 9 }, { anchor: 2, head: 9 }, { anchor: 2, head: 9 }]);
    live.querySelectorAll = nativeQuery;
    return { batch, discoveries, calls: window.geometryMapCalls };
  });
  // The two mapper calls also query the fixture. Geometry discovers once.
  expect(result.discoveries).toBe(3);
  expect(result.calls).toBe(2);
  expect(result.batch.every(item => item?.selection.length > 0)).toBe(true);
});

test("long wrapped source ranges match a full native range in the viewport", async ({ page }) => {
  const results = await page.evaluate(() => {
    const source = document.querySelector("#source");
    const shell = document.querySelector("#shell");
    const shellBounds = shell.getBoundingClientRect();
    const row = "alpha\tשלום 😀 café 雪 e\u0301 ";
    source.dir = "rtl";
    const reports = [];
    for (const separator of ["\n\n", ""]) {
      source.value = Array(800).fill(row).join(separator) + "\n";
      source.scrollTop = Math.round((source.scrollHeight - source.clientHeight) / 2);
      const end = source.value.length;
      const nativeRects = Range.prototype.getClientRects;
      let longestRange = 0;
      Range.prototype.getClientRects = function () {
        longestRange = Math.max(longestRange, this.endOffset - this.startOffset);
        return nativeRects.call(this);
      };
      let forward, reverse;
      try {
        [forward, reverse] = window.geometry.measureBatch([{ anchor: 0, head: end }, { anchor: end - 7, head: 7 }]);
      } finally {
        Range.prototype.getClientRects = nativeRects;
      }
      const mirror = document.querySelector('div[aria-hidden="true"]');
      const mirrorBounds = mirror.getBoundingClientRect();
      const surfaceBounds = source.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(mirror.firstChild);
      const sourceX = surfaceBounds.width / source.offsetWidth;
      const sourceY = surfaceBounds.height / source.offsetHeight;
      const mirrorX = mirrorBounds.width / mirror.offsetWidth;
      const mirrorY = mirrorBounds.height / mirror.offsetHeight;
      const shellX = shellBounds.width / shell.offsetWidth;
      const shellY = shellBounds.height / shell.offsetHeight;
      const left = surfaceBounds.left + source.clientLeft * sourceX;
      const top = surfaceBounds.top + source.clientTop * sourceY;
      const expected = Array.from(range.getClientRects()).flatMap(rect => {
        const x = left + ((rect.left - mirrorBounds.left) / mirrorX - source.scrollLeft) * sourceX;
        const y = top + ((rect.top - mirrorBounds.top) / mirrorY - source.scrollTop) * sourceY;
        const x0 = Math.max(left, x);
        const y0 = Math.max(top, y);
        const x1 = Math.min(left + source.clientWidth * sourceX, x + rect.width / mirrorX * sourceX);
        const y1 = Math.min(top + source.clientHeight * sourceY, y + rect.height / mirrorY * sourceY);
        return x1 > x0 && y1 > y0 ? [{
          left: (x0 - shellBounds.left) / shellX, top: (y0 - shellBounds.top) / shellY,
          width: (x1 - x0) / shellX, height: (y1 - y0) / shellY
        }] : [];
      });
      reports.push({ forward, reverse, expected, end, longestRange });
    }
    return reports;
  });
  for (const { forward, reverse, expected, end, longestRange } of results) {
    expect(expected.length).toBeGreaterThan(0);
    expect(forward.caret).toBeNull();
    expect(reverse.caret).toBeNull();
    expect(forward.selection).toEqual(reverse.selection);
    expect(forward.selection).toHaveLength(expected.length);
    for (const [index, rect] of expected.entries()) {
      for (const property of ["left", "top", "width", "height"]) {
        expect(forward.selection[index][property]).toBeCloseTo(rect[property], 2);
      }
    }
    expect(longestRange).toBeLessThan(end / 4);
  }
});

test("a long live paragraph keeps the same visible rectangles after clipping", async ({ page }) => {
  const result = await page.evaluate(() => {
    window.geometryMode = "live";
    document.querySelector("#source").hidden = true;
    const live = document.querySelector("#live");
    live.hidden = false;
    const editable = live.querySelector("[data-editable]");
    editable.textContent = "alpha beta café שלום 雪 😀 ".repeat(900);
    const length = editable.textContent.length;
    editable.dataset.to = String(length);
    live.scrollTop = 1000;
    const measured = window.geometry.measure(0, length);
    const viewport = measured.viewport;
    const shell = document.querySelector("#shell").getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(editable.firstChild);
    const expected = [];
    for (const rect of range.getClientRects()) {
      const left = Math.max(rect.left - shell.left, viewport.left);
      const top = Math.max(rect.top - shell.top, viewport.top);
      const right = Math.min(rect.right - shell.left, viewport.left + viewport.width);
      const bottom = Math.min(rect.bottom - shell.top, viewport.top + viewport.height);
      if (right > left && bottom > top) expected.push({ left, top, width: right - left, height: bottom - top });
    }
    return { measured, expected };
  });
  expect(result.measured.caret).toBeNull();
  expect(result.expected.length).toBeGreaterThan(0);
  expect(result.measured.selection).toEqual(result.expected);
});

test("parent scrolling clips selection and page scrolling preserves shell coordinates", async ({ page }) => {
  const result = await page.evaluate(() => {
    const host = document.querySelector("#host");
    const parent = document.createElement("div");
    parent.style.cssText = "height:90px;width:300px;overflow:auto;border:3px solid black;margin-top:500px";
    host.before(parent);
    parent.append(host);
    document.body.style.minHeight = "2000px";
    const source = document.querySelector("#source");
    source.value = "one\ntwo\nthree\nfour\nfive\nsix";
    window.scrollTo(0, 400);
    const before = window.geometry.measure(0, source.value.length);
    window.scrollTo(0, 420);
    const pageScrolled = window.geometry.measure(0, source.value.length);
    parent.scrollTop = 35;
    const parentScrolled = window.geometry.measure(0, source.value.length);
    return { before, pageScrolled, parentScrolled };
  });
  expect(result.before.caret).toBeNull();
  expect(result.before.selection.length).toBeGreaterThan(0);
  expect(result.pageScrolled).toEqual(result.before);
  expect(result.parentScrolled.selection.length).toBeGreaterThan(0);
  expect(result.parentScrolled.viewport.top).toBeGreaterThan(result.before.viewport.top);
  for (const rect of result.parentScrolled.selection) {
    expect(rect.top).toBeGreaterThanOrEqual(result.parentScrolled.viewport.top);
    expect(rect.top + rect.height).toBeLessThanOrEqual(result.parentScrolled.viewport.top + result.parentScrolled.viewport.height + 0.01);
  }
});

test("scaled RTL source geometry still matches native hit testing", async ({ page }) => {
  const position = await page.evaluate(() => {
    const shell = document.querySelector("#shell");
    shell.style.transformOrigin = "top left";
    shell.style.transform = "scale(1.4)";
    const source = document.querySelector("#source");
    source.value = "אבגדה וזחטי כלמנס";
    source.dir = "rtl";
    const result = window.geometry.measure(8, 8);
    const bounds = shell.getBoundingClientRect();
    return { x: bounds.left + (result.caret.left + 0.1) * 1.4, y: bounds.top + (result.caret.top + result.caret.height / 2) * 1.4 };
  });
  await page.mouse.click(position.x, position.y);
  expect(await page.locator("#source").evaluate(source => source.selectionStart)).toBe(8);
});
