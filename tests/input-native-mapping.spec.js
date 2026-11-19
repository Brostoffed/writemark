import { expect, test } from "./support/editor-fixture.js";

const peer = (id, anchor, head = anchor) => ({ id, name: `Sample ${id}`, color: "#5273a3", anchor, head, ttlMs: 0 });

test("coalesced native repeated deletions map a later peer through the actual deleted span", async ({ editor, page }) => {
  await editor.reset({ value: "aaaa", attributes: { mode: "source" } });
  await editor.setSelection(2);
  await page.keyboard.press("Backspace");
  await expect.poll(() => editor.value()).toBe("aaa");
  await editor.setSelection(2);
  await page.keyboard.press("Backspace");
  await expect.poll(() => editor.value()).toBe("aa");
  await editor.host.evaluate((host, cursor) => {
    host.updateRemoteCursors({ cursors: [cursor] });
  }, peer("later", 1));
  await editor.host.evaluate(host => host.exec("history.undo"));
  await expect.poll(() => editor.value()).toBe("aaaa");
  const cursor = await editor.host.evaluate(host => host.getRemoteCursors()[0]);
  expect(cursor).toMatchObject({ anchor: 3, head: 3 });
});

for (const key of ["Backspace", "Delete"]) {
  test(`native ${key} maps existing peers at the selected repeated unit`, async ({ editor, page }) => {
    await editor.reset({ value: "aaaa", attributes: { mode: "source" } });
    await editor.host.evaluate((host, cursor) => host.updateRemoteCursors({ cursors: [cursor] }), peer("existing", 2));
    await editor.setSelection(key === "Backspace" ? 2 : 1);
    await page.keyboard.press(key);
    await expect.poll(() => editor.value()).toBe("aaa");
    expect(await editor.host.evaluate(host => host.getRemoteCursors()[0])).toMatchObject({ anchor: 1, head: 1 });
    await editor.host.evaluate(host => host.exec("history.undo"));
    await expect.poll(() => editor.value()).toBe("aaaa");
    expect(await editor.host.evaluate(host => host.getRemoteCursors()[0])).toMatchObject({ anchor: 2, head: 2 });
  });
}

test("native Unicode selection replacement preserves the source target in history", async ({ editor, page }) => {
  await editor.reset({ value: "A😀A😀A", attributes: { mode: "source" } });
  await editor.setSelection(1, 3);
  await page.keyboard.type("雪");
  await expect.poll(() => editor.value()).toBe("A雪A😀A");
  await editor.host.evaluate((host, cursor) => host.updateRemoteCursors({ cursors: [cursor] }), peer("later", 2));
  await editor.host.evaluate(host => host.exec("history.undo"));
  await expect.poll(() => editor.value()).toBe("A😀A😀A");
  expect(await editor.host.evaluate(host => host.getRemoteCursors()[0])).toMatchObject({ anchor: 3, head: 3 });
});

test("source composition keeps verified cumulative insertion positions", async ({ editor }) => {
  await editor.reset({ value: "aaaa", attributes: { mode: "source" } });
  const result = await editor.host.evaluate(host => {
    const source = host.shadowRoot.querySelector("textarea");
    host.setSelectionRange(1, 1);
    source.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    for (const [data, value, caret] of [["x", "axaaa", 2], ["雪", "a雪aaa", 2]]) {
      source.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertCompositionText", data, isComposing: true, bubbles: true }));
      source.value = value;
      source.setSelectionRange(caret, caret);
      source.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data, isComposing: true, bubbles: true }));
    }
    source.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "雪" }));
    host.updateRemoteCursors({ cursors: [{ id: "composition-peer", name: "Sample", color: "#5273a3", anchor: 2, head: 2, ttlMs: 0 }] });
    const composed = host.value;
    host.exec("history.undo");
    return { composed, value: host.value, cursor: host.getRemoteCursors()[0] };
  });
  expect(result.composed).toBe("a雪aaa");
  expect(result.value).toBe("aaaa");
  expect(result.cursor).toMatchObject({ anchor: 1, head: 1 });
});
