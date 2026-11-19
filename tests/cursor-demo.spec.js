import { expect, test } from "@playwright/test";

async function openDemo(page) {
  await page.goto("/demo/cursors/");
  await expect(page.locator("html")).toHaveAttribute("data-cursor-demo-ready", "true");
  return page.locator("#cursor-editor");
}

const cursors = editor => editor.evaluate(host => host.getRemoteCursors());
const markdown = editor => editor.evaluate(host => host.value);

test("cursor demo uses one real editor and clearly labeled samples", async ({ page }) => {
  const editor = await openDemo(page);
  await expect(page.locator("writemark-editor")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Cursor samples" })).toBeVisible();
  await expect(page.getByText("These markers are examples. They do not connect to other people.")).toBeVisible();
  await expect(editor).toHaveAttribute("mode", "live");
  const state = await editor.evaluate(host => ({ value: host.value, cursors: host.getRemoteCursors(), revision: host.revision }));
  expect(state.cursors.map(cursor => cursor.name)).toEqual(["Cursor 1", "Cursor 2"]);
  expect(state.cursors.every(cursor => cursor.anchor >= 0 && cursor.head <= state.value.length)).toBe(true);
  expect(state.cursors[1].anchor).toBeLessThan(state.cursors[1].head);
  await expect(page.getByLabel("Move with my selection")).not.toBeChecked();
});

test("names, colors, and marker controls leave the document and revision unchanged", async ({ page }) => {
  const editor = await openDemo(page);
  const before = await editor.evaluate(host => ({ value: host.value, revision: host.revision }));
  await page.getByRole("textbox", { name: "Cursor name", exact: true }).fill("Maya <script>");
  await page.getByLabel("Cursor color", { exact: true }).fill("#735c9b");
  await expect(page.getByRole("button", { name: "Choose Maya <script>", exact: true })).toBeVisible();
  expect((await cursors(editor))[0]).toMatchObject({ name: "Maya <script>", color: "#735c9b" });
  await editor.evaluate(host => host.setSelectionRange(14, 24, "forward"));
  await page.getByRole("button", { name: "Place at selection" }).click();
  expect((await cursors(editor))[0]).toMatchObject({ anchor: 14, head: 24 });
  const after = await editor.evaluate(host => ({ value: host.value, revision: host.revision }));
  expect(after).toEqual(before);
  await expect(page.locator("#cursor-list script")).toHaveCount(0);
});

test("tracking moves only the selected sample from actual keyboard selection", async ({ page }) => {
  const editor = await openDemo(page);
  const before = await cursors(editor);
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await page.getByLabel("Move with my selection").check();
  await editor.evaluate(host => { host.focus(); host.setSelectionRange(0, 0); });
  const source = editor.locator("textarea");
  await source.press("ArrowRight");
  await source.press("Shift+ArrowRight");
  await source.press("Shift+ArrowRight");
  await expect.poll(() => editor.evaluate(host => {
    const cursor = host.getRemoteCursors()[0];
    return [cursor.anchor, cursor.head, host.selectionStart, host.selectionEnd];
  })).toEqual([1, 3, 1, 3]);
  expect((await cursors(editor))[1]).toEqual(before[1]);
  await page.getByLabel("Move with my selection").uncheck();
  const held = await cursors(editor);
  await editor.evaluate(host => { host.focus(); host.setSelectionRange(20, 20); });
  await source.press("ArrowRight");
  expect(await cursors(editor)).toEqual(held);
});

test("add, remove, and explicit source positions use the public display API", async ({ page }) => {
  const editor = await openDemo(page);
  await editor.evaluate(host => host.setSelectionRange(10, 18, "backward"));
  await page.getByRole("button", { name: "Add cursor here" }).click();
  expect((await cursors(editor))[2]).toMatchObject({ name: "Cursor 3", anchor: 18, head: 10 });
  await expect(page.getByRole("button", { name: "Choose Cursor 3", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByText("Source positions", { exact: true }).click();
  await page.getByLabel("Anchor", { exact: true }).fill("5");
  await page.getByLabel("Head", { exact: true }).fill("16");
  await page.getByRole("button", { name: "Set positions" }).click();
  expect((await cursors(editor))[2]).toMatchObject({ anchor: 5, head: 16 });
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  expect(await cursors(editor)).toHaveLength(2);
});

test("real source edits, undo, and view changes keep the demo usable", async ({ page }) => {
  const editor = await openDemo(page);
  const before = await markdown(editor);
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await editor.evaluate(host => { host.focus(); host.setSelectionRange(0, 0); });
  await page.keyboard.type("A note. ");
  await expect.poll(() => markdown(editor)).toBe("A note. " + before);
  const state = await editor.evaluate(host => ({ value: host.value, cursors: host.getRemoteCursors() }));
  expect(state.cursors.every(cursor => cursor.anchor <= state.value.length && cursor.head <= state.value.length)).toBe(true);
  await page.getByRole("textbox", { name: "Cursor name", exact: true }).fill("Review");
  await editor.evaluate(host => host.focus());
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => markdown(editor)).toBe(before);
  expect((await cursors(editor))[0].name).toBe("Review");
  await page.getByRole("button", { name: "Live", exact: true }).click();
  await expect(editor).toHaveAttribute("mode", "live");
  expect(await markdown(editor)).toBe(before);
});

test("the narrow layout keeps controls and the document inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const editor = await openDemo(page);
  await expect(editor).toBeVisible();
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, document: document.querySelector(".document-card").getBoundingClientRect().toJSON(), panel: document.querySelector(".cursor-panel").getBoundingClientRect().toJSON() }));
  expect(layout.scroll).toBeLessThanOrEqual(layout.width);
  expect(layout.panel.top).toBeGreaterThan(layout.document.bottom);
  await page.getByRole("button", { name: "Add cursor here" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Add cursor here" }).click();
  expect(await cursors(editor)).toHaveLength(3);
});

test("the names policy uses a keyboard control and keeps full names in the roster", async ({ page }) => {
  const editor = await openDemo(page);
  const fullName = "A full cursor name that stays available in the sample list";
  await page.getByRole("textbox", { name: "Cursor name", exact: true }).fill(fullName);
  const names = page.getByLabel("Keep cursor names visible");
  await expect(names).toBeChecked();
  const before = await editor.evaluate(host => ({ value: host.value, revision: host.revision, cursors: host.getRemoteCursors() }));
  await names.focus();
  await page.keyboard.press("Space");
  await expect(names).not.toBeChecked();
  await expect(page.getByRole("button", { name: `Choose ${fullName}`, exact: true })).toBeVisible();
  const roster = await page.locator(".cursor-choice strong").first().evaluate(node => ({ text: node.textContent, clipped: node.scrollWidth > node.clientWidth }));
  expect(roster).toEqual({ text: fullName, clipped: false });
  await page.keyboard.press("Space");
  await expect(names).toBeChecked();
  const after = await editor.evaluate(host => ({ value: host.value, revision: host.revision, cursors: host.getRemoteCursors() }));
  expect(after).toEqual(before);
});

test("the ordering control sends a real stale sample update without moving the cursor", async ({ page }) => {
  const editor = await openDemo(page);
  const before = await cursors(editor);
  expect(before.every(cursor => cursor.ttlMs === 0 && cursor.epoch === 1 && cursor.sequence >= 1)).toBe(true);
  await page.getByText("Source positions", { exact: true }).click();
  await page.getByRole("button", { name: "Try an older update" }).click();
  await expect(page.locator("#demo-status")).toHaveText("Older update ignored. The cursor did not move.");
  expect(await cursors(editor)).toEqual(before);
});

test("the cursor demo links to a measured long-selection workload", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("link", { name: "Measure 64 cursors" }).click();
  await page.getByLabel("Document paragraphs").fill("100");
  await page.getByLabel("Update frames").fill("30");
  await page.getByLabel("Selection length").selectOption("long");
  await page.getByLabel("Editor view").selectOption("source");
  await page.getByRole("button", { name: "Run 64-cursor workload" }).click();
  await expect(page.getByRole("status")).toHaveText("The benchmark finished. Review the measured results below.");
  const report = JSON.parse(await page.locator("#result").textContent());
  expect(report.configuration).toMatchObject({ lines: 100, frames: 30, mode: "source", selection: "long" });
  expect(report.documentUnchanged).toBe(true);
  expect(report.revisionUnchanged).toBe(true);
  expect(report.finalCursorCount).toBe(64);
  expect(report.peakSelectionRects).toBeGreaterThanOrEqual(64);
  expect(report.updateTimesMs).toHaveLength(30);
  expect(report.frameIntervalsMs).toHaveLength(30);
  await expect(page.getByRole("button", { name: "Save result JSON" })).toBeEnabled();
});
