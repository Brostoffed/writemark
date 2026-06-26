# Writemark

`<writemark-editor>` is a dependency-free live inline Markdown editor web component.

The default experience is **inline/live editing**: headings, inline formatting, lists, task checkboxes, code fences, and tables render inside the editor itself while the component preserves raw Markdown as the canonical `value` and form submission value. There is no built-in formatting toolbar; formatting is driven by Markdown shortcuts, slash commands, keyboard shortcuts, and the public action API.

## Run locally

Open `demo/index.html` directly in a browser, or serve it locally:

```sh
cd writemark-editor-v1
npm start
```

Then open:

```text
http://127.0.0.1:5173/demo/index.html
```

No npm install is required. The dev server uses Node's built-in HTTP module and is only needed for module-based test and performance pages.

## Repo layout

```text
src/      Canonical editor source.
dist/     Generated package/browser files.
demo/     Direct-open browser demo.
tests/    Browser test harness.
perf/     Performance harness.
scripts/  Build and local server utilities.
```

## Basic usage

For direct browser usage without a module server:

```html
<script src="./dist/writemark-editor.global.js"></script>

<writemark-editor
  name="body"
  label="Body"
  mode="live"
  placeholder="Type / for commands"
></writemark-editor>
```

For ESM/npm usage:

```html
<script type="module" src="./dist/writemark-editor.js"></script>

<writemark-editor
  name="body"
  label="Body"
  mode="live"
  placeholder="Type / for commands"
></writemark-editor>
```

`dist/` is generated from `src/writemark-editor.js` with `npm run build`; do not edit generated files directly.

Compatibility: `md-live-editor.js` and `<md-live-editor>` are still registered as legacy aliases for existing demos or consumers.

## Modes

```html
<writemark-editor mode="live"></writemark-editor>
<writemark-editor mode="source"></writemark-editor>
<writemark-editor mode="split"></writemark-editor>
<writemark-editor mode="preview"></writemark-editor>
```

| Mode | Behavior |
|---|---|
| `live` | Default. Rendered inline editor. Markdown remains canonical. |
| `source` | Raw Markdown textarea fallback. |
| `split` | Source textarea plus rendered preview. |
| `preview` | Read-only rendered preview. |

The old separate-preview workflow is still available through `mode="split"` or `preview="below"`, but it is no longer the default product behavior.

Code fences are refined in Live mode: the opening and closing backtick markers remain in canonical Markdown source, but they do not appear inside the rendered editable code block. Use Source mode to edit the fence markers directly.

## Key behavior

| Input | Behavior |
|---|---|
| Enter in nonempty list item | Creates next item at same level. |
| Enter in empty list item | Exits the list. |
| Tab in list item | Indents the item. |
| Shift+Tab in list item | Outdents the item. |
| Enter after ```` ```python ```` | Creates a closed code fence and places cursor inside. |
| `/` at line start | Opens slash command menu. |
| ` ```py ` | Opens code-language completion; `py` ranks Python. |
| Enter in table cell | Inserts a row below the current row and moves into the first new cell. |
| Shift+Enter or Escape in table cell | Exits the table to a blank line after it. |
| Tab in table cell | Moves to the next cell; from the last nonempty row, creates a new row. |
| Shift+Tab from first table cell | Exits before the table. |
| Cmd/Ctrl+A in live mode | Expands selection progressively: cell/block → row/table/section → document. |
| Delete/Backspace after expanded selection | Deletes the selected canonical Markdown range, including full-document selections. |
| Backspace at start of line | Joins the current logical Markdown line with the previous line and places the caret at the join point. |
| Delete at end of line | Joins with the next logical Markdown line. |
| `#`, `-`, `1.`, `>`, or `[ ]` then Space | Applies Markdown shortcut behavior. |
| Pasted tab-separated data | Converts to a Markdown table. |
| Pasted HTML without plain text | Converts basic HTML to Markdown. |

## Tables

`/table` or `editor.exec('block.table')` inserts a valid Markdown table:

```md
| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Cell 1 | Cell 2 | Cell 3 |
```

In live mode, the table is rendered as an editable grid. The delimiter row is preserved in the Markdown source but hidden from the primary grid UI. Enter creates a row below the current row. Shift+Enter or Escape exits the table to a blank line after it. Tab moves across cells; when it reaches the last nonempty row, it creates a new row, and from an empty terminal row it exits the table.

Table row/column mutation is exposed through actions, not rendered buttons: `table.insertRowAfter`, `table.insertColumnAfter`, `table.deleteRow`, and `table.deleteColumn`.

## Code blocks

Code blocks render without leaking fence markers into the editable code content. The compact header shows the language label only. Use slash commands, Markdown syntax, or `editor.exec('code.setLanguage', { language: 'python' })` to change the canonical opening fence.


## Clipboard and paste behavior

Live mode now routes copy, cut, and paste through the canonical Markdown source instead of trusting browser `contenteditable` mutations.

Copy/cut behavior:

- Copies selected source-backed Markdown to `text/plain`, `text/markdown`, and `text/x-markdown`.
- Also writes sanitized rendered HTML to `text/html` for rich destinations.
- Exact inline selections expand to include Markdown formatting delimiters. Selecting the visible `bold` text inside `**bold**` copies `**bold**`; selecting a link label copies `[label](url)`.
- Full-document and expanded selections preserve hidden Markdown source such as table delimiter rows and code fences.

Paste behavior:

- Prefers explicit Markdown clipboard data when available.
- Preserves pasted Markdown as Markdown and renders it immediately in live mode.
- Converts tab-separated spreadsheet data to a Markdown table.
- Converts rich HTML to Markdown when the paste source does not already provide Markdown-like plain text.
- Emits `md-paste` after canonical Markdown insertion.
- File paste/drop still emits host-controlled file events; the component does not upload files.

## Public API

```js
const editor = document.querySelector('writemark-editor');

editor.value = '# Hello';
editor.mode = 'live';
editor.exec('block.heading.2');

console.log(editor.value);         // Markdown
console.log(editor.getMarkdown()); // Markdown
console.log(editor.getHTML());     // Sanitized rendered HTML
console.log(editor.getText());     // Plain text
console.log(editor.getPlainText());
```

### Properties

| Property | Type |
|---|---|
| `value` | `string` raw Markdown |
| `defaultValue` | `string` reset value |
| `mode` | `"live" | "source" | "split" | "preview"` |
| `preview` | `"none" | "below" | "side" | "inline-split"` |
| `tabBehavior` | `"accessibility-first" | "editor-first"` |
| `indentString` | `"\t" | "  " | "    "` |
| `selectionStart` / `selectionEnd` | source offsets |
| `dirty` | boolean |

### Methods

| Method | Description |
|---|---|
| `focus()` | Focus the active editor surface. |
| `select()` | Select the full Markdown value. |
| `exec('editor.selectAllExpand')` | Expand source-backed live selection progressively. |
| `exec('editor.deleteSelection')` | Delete the current source-backed selection. |
| `setSelectionRange(start, end, direction?)` | Set source-backed selection. |
| `exec(actionId, args?)` | Execute an action. |
| `registerAction(action)` | Add custom action. |
| `registerCompletionProvider(provider)` | Add custom completion provider. |
| `getMarkdown()` / `setMarkdown(markdown)` | Read or write raw Markdown. |
| `insertMarkdown(markdown)` | Insert Markdown at the current source-backed selection. |
| `getSelectionMarkdown()` | Return selected source Markdown. |
| `getHTML()` | Return sanitized rendered HTML. |
| `getText()` / `getPlainText()` | Return plain text. |
| `getCurrentBlock()` / `getSelectedBlocks()` | Inspect parsed source-backed blocks. |
| `getActiveMarks()` | Return active formatting/action IDs for custom host UI. |
| `canExec(actionId, args?)` | Check whether an action is currently available. |
| `find(query, options?)` | Find and select source text. |
| `replace(query, replacement, options?)` | Replace the current/next match. |
| `replaceAll(query, replacement, options?)` | Replace all matches. |
| `commit()` | Mark current value as clean and emit `md-change`. |
| `reset()` | Restore default value. |

## Built-in actions

Examples:

```js
editor.exec('block.heading.1');
editor.exec('block.table', { rows: 1, cols: 3 });
editor.exec('block.codeFence', { language: 'python' });
editor.exec('inline.bold');
editor.exec('inline.link', { url: 'https://example.com' });
```

Important action IDs:

- `editor.smartEnter`
- `editor.smartTab`
- `editor.smartOutdent`
- `editor.smartBackspace`
- `editor.smartDelete`
- `editor.markdownShortcut`
- `editor.deleteSelection`
- `editor.selectAllExpand`
- `block.heading.1` through `block.heading.6`
- `block.bulletList`
- `block.orderedList`
- `block.taskList`
- `block.blockquote`
- `block.codeFence`
- `block.table`
- `table.insertRowAfter`
- `table.insertColumnAfter`
- `table.deleteRow`
- `table.deleteColumn`
- `code.setLanguage`
- `inline.bold`
- `inline.italic`
- `inline.code`
- `inline.link`
- `inline.image`
- `view.live`
- `view.source`

## Events

| Event | Description |
|---|---|
| `md-before-change` | Cancelable event fired before a transaction mutates the canonical Markdown. |
| `md-input` | Value changed. |
| `md-change` | Committed value change. |
| `md-selection-change` | Source-backed selection changed. |
| `md-action` | Action executed. |
| `md-completion-open` | Completion popup opened. |
| `md-completion-close` | Completion popup closed. |
| `md-completion-accept` | Completion accepted. |
| `md-render` | Preview/rendered HTML generated. |
| `md-file-paste` | File pasted. Host decides upload/insertion. |
| `md-file-drop` | File dropped. Host decides upload/insertion. |
| `md-copy` | Live-mode copy wrote Markdown clipboard data. |
| `md-cut` | Live-mode cut wrote Markdown clipboard data and removed the canonical range. |
| `md-paste` | Clipboard content was inserted through the canonical Markdown path. |
| `md-dirty-change` | Dirty state changed. |
| `md-error` | Recoverable editor error. |

## Form usage

```html
<form>
  <writemark-editor name="body" label="Body" required></writemark-editor>
  <button>Submit</button>
</form>
```

The submitted value is raw Markdown.


### Horizontal rules

Horizontal rules now render as a clean divider in live mode. The raw Markdown marker stays in the canonical source value and is visible in `mode="source"`, but live mode no longer leaks `---`, `--`, or `_ _ _` text next to the divider.

## Styling

The component exposes CSS parts and variables.

```css
writemark-editor::part(live-editor) {
  min-height: 400px;
}

writemark-editor {
  --md-editor-font: Inter, system-ui, sans-serif;
  --md-editor-mono-font: "JetBrains Mono", monospace;
  --md-editor-min-height: 360px;
}
```

The active line/table-cell blue inset outline is disabled by default. To keep it removed, no CSS override is required. To add a subtle non-blue active block affordance:

```css
writemark-editor {
  --md-editor-active-line-bg: color-mix(in srgb, CanvasText 4%, transparent);
  --md-editor-active-cell-bg: color-mix(in srgb, CanvasText 4%, transparent);
}
```

To re-enable an outline explicitly:

```css
writemark-editor {
  --md-editor-active-line-ring: inset 0 0 0 2px color-mix(in srgb, Highlight 35%, transparent);
  --md-editor-active-cell-ring: var(--md-editor-active-line-ring);
}
```

Common parts:

- `container`
- `label`
- `editor`
- `live-editor`
- `textarea`
- `preview`
- `completion-popup`
- `completion-item`
- `completion-item-active`
- `table`
- `table-cell`
- `code-block`
- `checkbox`
- `status`
- `error`

Common focus/active styling variables:

- `--md-editor-focus-ring`: outer editor focus ring.
- `--md-editor-border-focus`: outer editor focused border color.
- `--md-editor-active-line-ring`: focused live block ring. Defaults to `none`.
- `--md-editor-active-line-bg`: focused live block background. Defaults to `transparent`.
- `--md-editor-active-cell-ring`: focused table-cell ring. Defaults to `--md-editor-active-line-ring`.
- `--md-editor-active-cell-bg`, `--md-editor-transition-duration`, `--md-editor-transition-ease`: focused table-cell background. Defaults to `--md-editor-active-line-bg`.

## Security

The renderer is safe by construction for built-in Markdown output:

- Raw HTML is not executed.
- User text is escaped.
- Dangerous URL schemes such as `javascript:` are blocked.
- File paste/drop emits events; the component does not upload anything.
- No network calls are made by default.

Still validate and sanitize server-side when storing or rendering user-generated content outside this component.

## Tests

```sh
npm run check
npm run serve
```

Then open:

```text
http://127.0.0.1:5173/tests/browser.html
```

The test harness verifies action fixtures and live-rendered structure.

## Current engineering caveats

This version implements source-backed live inline editing without third-party dependencies. It is suitable for evaluating the intended product behavior, but production certification still requires cross-browser manual QA, screen-reader verification, IME testing, mobile virtual-keyboard testing, and an independent security review.
