import { expect, test } from "./support/editor-fixture.js";

test.describe("focus and accessible naming", () => {
  test("Clicking label focuses active live editor surface", async ({ editor }) => {
    await editor.host.locator(".label").click();
    await expect.poll(() => editor.liveHasFocus()).toBe(true);
  });

  test("Clicking label focuses source textarea in source mode", async ({ editor }) => {
    await editor.reset({ attributes: { mode: "source" } });
    await editor.host.locator(".label").click();
    await expect(editor.source).toBeFocused();
  });

  test("Clicking label focuses preview in preview mode", async ({ editor }) => {
    await editor.reset({
      attributes: { mode: "preview" },
      value: "# Preview"
    });
    await editor.host.locator(".label").click();
    await expect(editor.preview).toBeFocused();
  });

  test("Programmatic focus does not enter disabled editor", async ({ editor }) => {
    await editor.reset({ attributes: { disabled: true } });
    await editor.host.evaluate(element => element.focus());
    await expect(editor.live).not.toBeFocused();
    await expect(editor.live).toHaveAttribute("tabindex", "-1");
  });

  test("Removing dir clears stale direction from editing surfaces", async ({ editor }) => {
    await editor.host.evaluate(element => {
      element.setAttribute("dir", "rtl");
      element.removeAttribute("dir");
    });
    await expect(editor.live).not.toHaveAttribute("dir");
    await expect(editor.source).not.toHaveAttribute("dir");
  });

  test("Removing spellcheck restores default checking on editing surfaces", async ({ editor }) => {
    await editor.host.evaluate(element => {
      element.setAttribute("spellcheck", "false");
      element.removeAttribute("spellcheck");
    });
    await expect(editor.live).toHaveAttribute("spellcheck", "true");
    await expect(editor.source).toHaveAttribute("spellcheck", "true");
  });

  test("Focused editor transfers focus across source live and preview modes", async ({ editor }) => {
    await editor.host.evaluate(element => element.focus());
    await expect.poll(() => editor.liveHasFocus()).toBe(true);

    await editor.host.evaluate(element => {
      element.mode = "source";
    });
    await expect(editor.source).toBeFocused();

    await editor.host.evaluate(element => {
      element.mode = "preview";
    });
    await expect(editor.preview).toBeFocused();

    await editor.host.evaluate(element => {
      element.mode = "live";
    });
    await expect.poll(() => editor.liveHasFocus()).toBe(true);
  });

  test("Mode change does not steal focus when editor was blurred", async ({ editor, page }) => {
    await page.locator("#before-editor").focus();
    await editor.host.evaluate(element => {
      element.mode = "source";
    });
    await expect(page.locator("#before-editor")).toBeFocused();
  });

  test("Preview surface follows component accessible naming", async ({ editor, page }) => {
    await editor.reset({
      attributes: { mode: "preview", label: "Body" },
      value: "Preview"
    });
    await expect(editor.preview).toHaveAttribute("aria-label", "Body preview");

    await editor.host.evaluate(element => {
      element.setAttribute("aria-label", "Notes");
    });
    await expect(editor.preview).toHaveAttribute("aria-label", "Notes preview");

    await page.evaluate(() => {
      const external = document.createElement("span");
      external.id = "external-preview-label";
      external.textContent = "External notes";
      document.body.append(external);
      const element = document.querySelector("#editor");
      element.removeAttribute("aria-label");
      element.setAttribute("aria-labelledby", external.id);
    });
    await expect(editor.preview).toHaveAttribute(
      "aria-labelledby",
      "external-preview-label"
    );
    await expect(editor.preview).not.toHaveAttribute("aria-label");
  });
});

test.describe("readonly and disabled state", () => {
  test("Readonly state reaches rendered lines and task checkbox", async ({ editor }) => {
    await editor.reset({
      attributes: { readonly: true },
      value: "- [ ] task"
    });
    await expect(editor.host.locator("[data-editable]"))
      .toHaveAttribute("contenteditable", "false");
    await expect(editor.host.locator("[data-task-checkbox]")).toBeDisabled();
    await expect(editor.live).toHaveAttribute("aria-readonly", "true");
  });

  test("Disabled state reaches rendered lines checkbox and tab order", async ({ editor }) => {
    await editor.reset({
      attributes: { disabled: true },
      value: "- [ ] task"
    });
    await expect(editor.host.locator("[data-editable]"))
      .toHaveAttribute("contenteditable", "false");
    await expect(editor.host.locator("[data-task-checkbox]")).toBeDisabled();
    await expect(editor.live).toHaveAttribute("tabindex", "-1");
  });

  test("Clearing disabled state restores rendered editability", async ({ editor }) => {
    await editor.reset({
      attributes: { disabled: true },
      value: "- [ ] task"
    });
    await editor.host.evaluate(element => {
      element.disabled = false;
    });
    await expect(editor.host.locator("[data-editable]"))
      .toHaveAttribute("contenteditable", "true");
    await expect(editor.host.locator("[data-task-checkbox]")).toBeEnabled();
  });

  test("Readonly state closes open completion popup and ARIA state", async ({ editor, page }) => {
    await editor.host.evaluate(element => element.focus());
    await page.keyboard.type("/");
    await expect(editor.completion).toBeVisible();
    await editor.host.evaluate(element => {
      element.readonly = true;
    });
    await expect(editor.completion).toBeHidden();
    await expect(editor.live).toHaveAttribute("aria-expanded", "false");
  });

  test("All-disabled completion list has no active descendant", async ({ editor }) => {
    await editor.host.evaluate(element => {
      element._openCompletion("state-audit", { from: 0, to: 0 }, [
        { id: "one", kind: "audit", label: "One", disabled: true },
        { id: "two", kind: "audit", label: "Two", disabled: true }
      ]);
    });
    await expect(editor.host.locator('[role="option"][aria-disabled="true"]'))
      .toHaveCount(2);
    await expect(editor.live).not.toHaveAttribute("aria-activedescendant");
  });

  test("Readonly state cancels pending asynchronous completion", async ({ editor }) => {
    const state = await editor.host.evaluate(async element => {
      element.registerCompletionProvider({
        id: "delayed-audit",
        priority: 999,
        match: () => ({ from: 0, to: 0 }),
        getItems: () => new Promise(resolve => {
          setTimeout(() => resolve([
            { id: "late", kind: "audit", label: "Late" }
          ]), 20);
        }),
        apply: () => ({ ok: false })
      });
      element._maybeUpdateCompletions();
      element.readonly = true;
      await new Promise(resolve => setTimeout(resolve, 35));
      return {
        open: element._completion.open,
        popupHidden: element.shadowRoot
          .querySelector(".completion-popup").hidden
      };
    });
    expect(state).toEqual({ open: false, popupHidden: true });
  });

  test("Readonly blocks undo while editable undo and redo still work", async ({ editor, page }) => {
    await editor.reset({ value: "a" });
    await editor.setSelection(1);
    await editor.host.evaluate(element => element.insertMarkdown("b"));
    await editor.host.evaluate(element => {
      element.readonly = true;
    });
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("ab");

    await editor.host.evaluate(element => {
      element.readonly = false;
      element.focus();
    });
    await page.keyboard.press("ControlOrMeta+z");
    expect(await editor.value()).toBe("a");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await editor.value()).toBe("ab");
  });
});

test.describe("value defaults and constraints", () => {
  test("Value attribute updates reset default without replacing dirty value", async ({ editor }) => {
    await editor.reset({
      attributes: { value: "initial" },
      value: "initial"
    });
    const result = await editor.host.evaluate(element => {
      element.value = "changed";
      element.setAttribute("value", "new default");
      const beforeReset = {
        defaultValue: element.defaultValue,
        value: element.value
      };
      element.reset();
      return {
        beforeReset,
        defaultValue: element.defaultValue,
        value: element.value
      };
    });
    expect(result).toEqual({
      beforeReset: { defaultValue: "new default", value: "changed" },
      defaultValue: "new default",
      value: "new default"
    });
  });

  test("Value attribute updates current value while editor is pristine", async ({ editor }) => {
    await editor.reset({
      attributes: { value: "initial" },
      value: "initial"
    });
    await editor.host.evaluate(element => {
      element.setAttribute("value", "next");
    });
    expect(await editor.value()).toBe("next");
    expect(await editor.host.evaluate(element => element.defaultValue)).toBe("next");
  });

  test("Length constraints ignore invalid values and apply valid integers", async ({ editor }) => {
    await editor.reset({ value: "abcd" });

    for (const invalidValue of ["-1", "abc", "2.5", "999999999999999999999"]) {
      await editor.host.evaluate((element, value) => {
        element.setAttribute("maxlength", value);
      }, invalidValue);
      await expect(editor.source).not.toHaveAttribute("maxlength");
      expect(await editor.host.evaluate(element => element.validity.valid)).toBe(true);
    }

    await editor.host.evaluate(element => element.setAttribute("maxlength", "3"));
    expect(await editor.source.evaluate(element => element.maxLength)).toBe(3);
    expect(await editor.host.evaluate(element => element.validity.tooLong)).toBe(true);

    await editor.host.evaluate(element => {
      element.removeAttribute("maxlength");
      element.setAttribute("minlength", "5");
    });
    expect(await editor.source.evaluate(element => element.minLength)).toBe(5);
    expect(await editor.host.evaluate(element => element.validity.tooShort)).toBe(true);

    await editor.host.evaluate(element => element.setAttribute("minlength", "-1"));
    await expect(editor.source).not.toHaveAttribute("minlength");
    expect(await editor.host.evaluate(element => element.validity.valid)).toBe(true);
  });
});

test.describe("form-associated behavior", () => {
  test("FormData tracks current value and excludes disabled editor", async ({ editor }) => {
    await editor.reset({ value: "current" });
    expect(await pageFormValue(editor)).toBe("current");
    await editor.host.evaluate(element => {
      element.disabled = true;
    });
    expect(await pageFormValue(editor)).toBeNull();
  });

  test("Native form reset restores editor default value and clean state", async ({ editor, page }) => {
    await editor.reset({
      attributes: { value: "initial" },
      value: "initial"
    });
    await editor.setValue("changed");
    await page.locator("#reset-form").click();
    expect(await editor.value()).toBe("initial");
    expect(await editor.host.evaluate(element => element.dirty)).toBe(false);
  });

  test("Editor validity participates in native form validation", async ({ editor }) => {
    await editor.reset({ attributes: { required: true } });
    const validity = await editor.host.evaluate(element => ({
      editor: element.checkValidity(),
      form: document.querySelector("#editor-form").checkValidity(),
      valueMissing: element.validity.valueMissing
    }));
    expect(validity).toEqual({
      editor: false,
      form: false,
      valueMissing: true
    });
  });

  test("Fieldset disabled state does not become a permanent editor attribute", async ({ editor, page }) => {
    const state = await page.evaluate(async () => {
      const form = document.querySelector("#editor-form");
      const element = document.querySelector("#editor");
      const fieldset = document.createElement("fieldset");
      form.insertBefore(fieldset, element);
      fieldset.append(element);
      fieldset.disabled = true;
      await new Promise(requestAnimationFrame);
      const whileDisabled = {
        disabled: element.disabled,
        hasAttribute: element.hasAttribute("disabled")
      };
      fieldset.disabled = false;
      await new Promise(requestAnimationFrame);
      return {
        after: {
          disabled: element.disabled,
          hasAttribute: element.hasAttribute("disabled")
        },
        whileDisabled
      };
    });
    expect(state).toEqual({
      whileDisabled: { disabled: true, hasAttribute: false },
      after: { disabled: false, hasAttribute: false }
    });
  });

  test("Explicit disabled attribute survives fieldset state changes", async ({ editor, page }) => {
    const state = await page.evaluate(async () => {
      const form = document.querySelector("#editor-form");
      const element = document.querySelector("#editor");
      element.disabled = true;
      const fieldset = document.createElement("fieldset");
      form.insertBefore(fieldset, element);
      fieldset.append(element);
      fieldset.disabled = true;
      fieldset.disabled = false;
      await new Promise(requestAnimationFrame);
      return {
        disabled: element.disabled,
        hasAttribute: element.hasAttribute("disabled")
      };
    });
    expect(state).toEqual({ disabled: true, hasAttribute: true });
  });

  test("required validation message is hidden until reported", async ({ editor }) => {
    await editor.reset({ attributes: { required: true } });
    await expect(editor.host.locator(".validation")).toHaveText("");
    await editor.host.evaluate(element => element.reportValidity());
    await expect(editor.host.locator(".validation")).not.toHaveText("");
  });
});

async function pageFormValue(editor) {
  return editor.host.evaluate(() =>
    new FormData(document.querySelector("#editor-form")).get("body")
  );
}
