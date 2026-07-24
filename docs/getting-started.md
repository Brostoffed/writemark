# Getting started

This guide covers the shortest path from an empty page to a working Writemark
editor. Continue to [Features and editing](features.md) when the basic value and
form flow is in place.

## 1. Load the component

### From the npm package

Install the package in an application that uses a JavaScript bundler:

```sh
npm install writemark-editor
```

Importing the package registers `<writemark-editor>`:

```js
import 'writemark-editor';
```

### From an ES module file

Load the generated module directly when the page is served over HTTP:

```html
<script type="module" src="/dist/writemark-editor.js"></script>
```

### From a classic script

The global build works in a direct-open HTML page and registers the same custom
element:

```html
<script src="./dist/writemark-editor.global.js"></script>
```

The legacy `<md-live-editor>` name remains available through
`dist/md-live-editor.js`, but new integrations should use
`<writemark-editor>`.

## 2. Add an editor

```html
<writemark-editor
  id="body-editor"
  name="body"
  label="Body"
  placeholder="Type / for commands"
></writemark-editor>
```

The default and primary mode is `live`: Markdown renders inline in the editable
surface, so a separate preview is not required. A visible `label` gives the
editor an accessible name and moves focus into the active editing surface when
clicked.

Wait until the component module has loaded before querying its API:

```js
await customElements.whenDefined('writemark-editor');

const editor = document.querySelector('#body-editor');
editor.value = '# First draft\n\nStart writing here.';
editor.focus();
```

For multiline initial content, assigning `value` in JavaScript is clearer than
putting newlines in an HTML attribute.

## 3. Read and update Markdown

```js
const markdown = editor.value;

editor.value = '## Replaced from the host';
editor.insertMarkdown('\n\n**Inserted** at the current selection.');

console.log(editor.getMarkdown());
console.log(editor.getHTML());
console.log(editor.getText());
```

The important distinction is:

| API | Result |
|---|---|
| `value`, `getMarkdown()` | Canonical raw Markdown. |
| `getHTML()` | Escaped and sanitized rendered HTML. |
| `getText()`, `getPlainText()` | Plain text extracted from the Markdown structure. |

Listen for edits with `md-input`:

```js
editor.addEventListener('md-input', event => {
  console.log(event.detail.value);
  console.log(event.detail.source);
});
```

Use `md-change` for an explicit commit boundary:

```js
saveButton.addEventListener('click', () => {
  editor.commit();
});

editor.addEventListener('md-change', event => {
  saveDraft(event.detail.value);
});
```

`commit()` also makes the current value the clean/reset value. Check
`editor.dirty` or listen for `md-dirty-change` when the host needs an unsaved
changes indicator.

## 4. Choose a mode

```html
<writemark-editor mode="live"></writemark-editor>
<writemark-editor mode="source"></writemark-editor>
<writemark-editor mode="split"></writemark-editor>
<writemark-editor mode="preview"></writemark-editor>
```

| Mode | Primary use |
|---|---|
| `live` | Edit rendered Markdown inline. This is the default. |
| `source` | Edit the complete raw Markdown in a textarea. |
| `split` | Edit source beside a rendered preview. |
| `preview` | Display a focusable, read-only rendered view. |

Modes can change without replacing the element or its value:

```js
editor.mode = 'source';
editor.mode = 'live';
```

Keep `live` for the inline-first workflow. When a second rendered view is useful,
the optional `preview` setting can add one to an editing mode:

```html
<writemark-editor mode="live" preview="below"></writemark-editor>
```

Supported preview placements are `none`, `below`, `side`, and `inline-split`.

## 5. Submit Markdown in a form

Writemark is a form-associated custom element. Its `name` and raw Markdown value
participate in `FormData` and normal browser submission.

```html
<form id="article-form">
  <writemark-editor
    name="body"
    label="Article body"
    required
    minlength="20"
    maxlength="20000"
  ></writemark-editor>

  <button type="submit">Publish</button>
  <button type="reset">Reset</button>
</form>
```

```js
const form = document.querySelector('#article-form');

form.addEventListener('submit', event => {
  event.preventDefault();

  const data = new FormData(form);
  console.log(data.get('body')); // raw Markdown
});
```

`required`, `minlength`, `maxlength`, `disabled`, form reset, disabled
`fieldset` state, `checkValidity()`, `reportValidity()`, and
`setCustomValidity()` are supported.

## 6. Learn the essential editing commands

| Command | Result |
|---|---|
| Type `/` at the start of a line | Open the command menu. |
| Type `#`, `-`, `1.`, `>`, or `[]`, then Space | Apply a Markdown block shortcut. |
| `Mod+B` / `Mod+I` | Toggle bold / italic around the selection. |
| `Mod+E` / `Mod+K` | Insert inline code / a link. |
| Enter in a list | Continue the list, or exit an empty item. |
| Tab / Shift+Tab in a list | Indent / outdent the item. |
| Enter after a code fence opener | Create the closing fence and enter the block. |
| Tab and arrow keys in a table | Move between source-backed cells. |
| Escape or Shift+Enter in a table | Move to a line after the table. |
| `Mod+A` repeatedly in live mode | Expand selection from the local structure to the document. |

The complete movement and structure behavior is in
[Features and editing](features.md#keyboard-and-caret-movement).

## 7. Apply basic styling

Set CSS variables on the host element. The editor uses shadow DOM, so ordinary
descendant selectors do not reach its internals.

```css
writemark-editor {
  --md-editor-font: Inter, system-ui, sans-serif;
  --md-editor-font-size: 14px;
  --md-editor-min-height: 240px;
  --md-editor-max-height: 640px;
}
```

A compact fixed-height editor can use the lower values exposed by the demo:

```css
writemark-editor.compact {
  --md-editor-font-size: 10px;
  --md-editor-min-height: 100px;
  --md-editor-max-height: 100px;
}
```

When `max-height` is lower than `min-height`, CSS minimum sizing wins. Lower
both variables when the editor needs to render at 100px tall. Overflow scrolls
inside the editing surface.

Use parts for targeted styling:

```css
writemark-editor::part(label) {
  font-weight: 700;
}

writemark-editor::part(live-editor) {
  border-width: 2px;
}
```

See [Advanced integration](advanced.md#styling-and-layout) and the
[API reference](api-reference.md#css-custom-properties) for all styling hooks.

## Next step

Continue with [Features and editing](features.md) to learn how each Markdown
structure behaves in live mode and how keyboard, selection, and clipboard
operations map back to source.
