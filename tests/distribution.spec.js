import { test, expect } from "@playwright/test";
import { mkdtemp, copyFile, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const artifact of ["writemark-editor.global.min.js", "writemark-editor.global.js"]) {
    test(`${artifact} works as the only copied file with the network unavailable`, async ({ page, context, browserName }) => {
    const directory = await mkdtemp(join(tmpdir(), "writemark-offline-"));
    try {
      await copyFile(resolve(root, "dist", artifact), join(directory, artifact));
      await writeFile(join(directory, "index.html"), `<!doctype html><html lang="en"><head>
        <meta charset="utf-8"><link rel="icon" href="data:,"><title>Offline editor</title></head><body>
        <form><writemark-editor id="first" name="body" label="Body"></writemark-editor>
        <md-live-editor id="second" name="other" label="Other" value="second"></md-live-editor>
        <label for="enhanced">Enhanced</label><textarea id="enhanced" name="enhanced" data-writemark data-writemark-mode="source">draft</textarea></form>
        <script src="./${artifact}"></script></body></html>`);
      expect((await readdir(directory)).sort()).toEqual(["index.html", artifact].sort());
      const errors = [];
      const unexpectedRequests = [];
      const allowed = new Set([pathToFileURL(join(directory, "index.html")).href, pathToFileURL(join(directory, artifact)).href]);
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => { if (!allowed.has(request.url())) unexpectedRequests.push(request.url()); });
      // WebKit offline emulation also blocks local file navigation.
      if (browserName !== "webkit") await context.setOffline(true);
      await page.route(/^https?:/, route => route.abort());
      await page.goto(pathToFileURL(join(directory, "index.html")).href);
      const editor = page.locator("#first");
      await expect(editor.locator(".live-editor")).toBeVisible();
      await editor.evaluate(element => { element.mode = "source"; });
      await editor.locator("textarea").fill("hello");
      await expect.poll(() => editor.evaluate(element => element.value)).toBe("hello");
      expect(await editor.evaluate(element => { element.setSelectionRange(0, 5); return element.exec("inline.bold"); })).toBe(true);
      await expect.poll(() => editor.evaluate(element => element.value)).toBe("**hello**");
      await editor.evaluate(element => element.exec("history.undo"));
      await expect.poll(() => editor.evaluate(element => element.value)).toBe("hello");
      await editor.evaluate(element => element.exec("history.redo"));
      await expect.poll(() => editor.evaluate(element => element.value)).toBe("**hello**");
      for (const mode of ["preview", "split", "source", "live"]) {
        await editor.evaluate((element, mode) => { element.mode = mode; }, mode);
        await expect(editor).toHaveAttribute("mode", mode);
      }
      await editor.evaluate(element => { element.value = "hello"; element.setSelectionRange(5, 5); element.focus(); });
      await page.keyboard.type("!");
      await expect.poll(() => editor.evaluate(element => element.value)).toBe("hello!");
      expect(await editor.evaluate(element => element.setRemoteCursors([{ id: "peer", name: "Alex", color: "#4765a9", anchor: 1, head: 3 }], { baseRevision: element.revision }))).toBe(true);
      await expect(editor.locator(".remote-presence-caret:visible")).toHaveCount(1);
      expect(await editor.evaluate(element => element.getRemoteCursors()[0].name)).toBe("Alex");
      expect(await page.evaluate(() => [...new FormData(document.querySelector("form"))])).toEqual([["body", "hello!"], ["other", "second"], ["enhanced", "draft"]]);
      expect(await page.locator("#second").evaluate(element => element.value)).toBe("second");
      const enhancement = await page.evaluate(() => {
        const textarea = document.querySelector("#enhanced");
        const handle = WritemarkEditor.enhanceTextarea(textarea);
        const revision = handle.editor.revision;
        const request = { baseRevision: revision, changes: [{ from: 0, to: 5, expected: "draft", insert: "final" }], origin: { kind: "external", id: "offline-tool" } };
        const accepted = handle.editor.applyTransaction(request);
        const stale = handle.editor.applyTransaction(request);
        return { accepted, stale, value: textarea.value, values: new FormData(textarea.form).getAll("enhanced") };
      });
      expect(enhancement.accepted).toMatchObject({ ok: true, changed: true, origin: { kind: "external", id: "offline-tool" } });
      expect(enhancement.stale).toMatchObject({ ok: false, reason: "stale-revision" });
      expect(enhancement.value).toBe("final");
      expect(enhancement.values).toEqual(["final"]);
      expect(await page.evaluate(async file => {
        const previous = globalThis.WritemarkEditor;
        const script = document.createElement("script");
        script.src = file;
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
        return previous.WritemarkEditorElement === globalThis.WritemarkEditor.WritemarkEditorElement
          && previous.MdLiveEditorElement === globalThis.WritemarkEditor.MdLiveEditorElement
          && customElements.get("writemark-editor") === globalThis.WritemarkEditor.WritemarkEditorElement;
      }, `./${artifact}`)).toBe(true);
      expect(errors).toEqual([]);
      expect(unexpectedRequests).toEqual([]);
    } finally {
      await context.setOffline(false);
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("an opted-in textarea works when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const directory = await mkdtemp(join(tmpdir(), "writemark-native-fallback-"));
  try {
    await copyFile(resolve(root, "dist/writemark-editor.global.min.js"), join(directory, "writemark.js"));
    await writeFile(join(directory, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Native fallback</title></head><body>
      <form><label for="body">Body</label><textarea id="body" name="body" data-writemark required>draft</textarea><button>Save</button></form>
      <script src="./writemark.js"></script></body></html>`);
    await page.goto(pathToFileURL(join(directory, "index.html")).href);
    await expect(page.getByLabel("Body")).toBeVisible();
    await page.getByLabel("Body").fill("Native edit");
    await expect(page.getByLabel("Body")).toHaveValue("Native edit");
    await expect(page.locator("writemark-editor")).toHaveCount(0);
  } finally {
    await context.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("a blocked script keeps the native textarea usable", async ({ page }) => {
  await page.route("**/blocked-editor", route => route.fulfill({
    contentType: "text/html",
    headers: { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'" },
    body: `<!doctype html><html lang="en"><head><title>Blocked editor</title></head><body>
      <form><label for="fallback">Body</label><textarea id="fallback" name="body" data-writemark>draft</textarea><button>Save</button></form>
      <script src="/dist/writemark-editor.global.min.js"></script></body></html>`
  }));
  await page.goto("/blocked-editor");
  await expect(page.getByLabel("Body")).toBeVisible();
  await page.getByLabel("Body").fill("Fallback edit");
  expect(await page.evaluate(() => [...new FormData(document.querySelector("form"))])).toEqual([["body", "Fallback edit"]]);
  await expect(page.locator("writemark-editor")).toHaveCount(0);
});

test("textarea enhancement supports an explicit CSP without remote resources", async ({ page }) => {
  const unexpected = [];
  page.on("request", request => {
    if (!new URL(request.url()).pathname.match(/^\/(?:csp-editor|dist\/writemark-editor\.global\.min\.js)$/)) unexpected.push(request.url());
  });
  await page.route("**/csp-editor", route => route.fulfill({
    contentType: "text/html",
    headers: { "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src data:; form-action 'self'" },
    body: `<!doctype html><html lang="en"><head><title>CSP editor</title></head><body>
      <form><label for="csp-body">Body</label><textarea id="csp-body" name="body" data-writemark data-writemark-mode="source">draft</textarea></form>
      <script src="/dist/writemark-editor.global.min.js"></script></body></html>`
  }));
  await page.goto("/csp-editor");
  const editor = page.locator("writemark-editor");
  await expect(editor.locator("textarea")).toBeVisible();
  await editor.locator("textarea").fill("CSP edit");
  expect(await page.evaluate(() => [...new FormData(document.querySelector("form"))])).toEqual([["body", "CSP edit"]]);
  expect(unexpected).toEqual([]);
});

test("module, readable, minified, and legacy entry points have the same API", async ({ page }) => {
  await page.goto("/tests/fixtures/editor.html");
  expect(await page.evaluate(async () => {
    const module = await import("/dist/writemark-editor.js");
    const legacy = await import("/dist/md-live-editor.js");
    const minified = globalThis.WritemarkEditor;
    const script = document.createElement("script");
    script.src = "/dist/writemark-editor.global.js";
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
    const readable = globalThis.WritemarkEditor;
    const input = "# Hello\n\n**text** #tag";
    return [module, legacy, readable].every(api =>
      JSON.stringify(Object.keys(api).sort()) === JSON.stringify(Object.keys(minified).sort())
      && api.WritemarkEditorElement === minified.WritemarkEditorElement
      && api.MdLiveEditorElement === minified.MdLiveEditorElement
      && api.renderMarkdown(input) === minified.renderMarkdown(input)
      && JSON.stringify(api.parseTags(input)) === JSON.stringify(minified.parseTags(input)));
  })).toBe(true);
});

test("the declaration property names exist on the runtime editor", async ({ page }) => {
  const declarations = await readFile(resolve(root, "dist/types.d.ts"), "utf8");
  const source = ts.createSourceFile("types.d.ts", declarations, ts.ScriptTarget.ES2022, true);
  const api = source.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === "EditorAPI");
  const names = api.type.members.map(member => member.name.text);
  await page.goto("/tests/fixtures/editor.html");
  expect(await page.locator("#editor").evaluate((editor, names) => names.filter(name => !(name in editor)), names)).toEqual([]);
});
