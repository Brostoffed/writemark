# API reference

This page is the lookup reference for Writemark 1.5.0. The default `live` mode
is the primary inline editing surface; `source`, `split`, and `preview` are
explicit alternate modes. For a guided setup, start with
[Getting started](getting-started.md). For custom actions and providers, see
[Advanced integration](advanced.md).

Live mode is experimental and unsupported on mobile browsers. Production
integrations on iOS, iPadOS, Android, and other mobile or software-keyboard
environments should explicitly set `mode="source"`.

## Package entry points

| Import | Purpose |
|---|---|
| `writemark-editor` | Main ES module; registers both custom elements and exports helpers. |
| `writemark-editor/writemark-editor.js` | Explicit main ES module path. |
| `writemark-editor/writemark-editor.global.js` | Classic browser script. Exposes `globalThis.WritemarkEditor`. |
| `writemark-editor/md-live-editor.js` | Legacy compatibility module. |

The preferred element is `<writemark-editor>`. `<md-live-editor>` is a legacy
alias backed by `MdLiveEditorElement`.

## Attributes

| Attribute | Values / default | Behavior |
|---|---|---|
| `name` | String / empty | Form field name. |
| `value` | Markdown / empty | Initial and reset value. See [value semantics](#value-and-reset-semantics). |
| `label` | String / empty | Visible label and accessible name source. |
| `placeholder` | String / `Write markdown...` | Empty editor prompt. It is not inserted into Markdown. |
| `mode` | `live`, `source`, `split`, `preview` / `live` | Active editing or viewing surface. Invalid values fall back to `live`. |
| `preview` | `none`, `below`, `side`, `inline-split` / `none` | Optional rendered preview placement. Invalid values fall back to `none`. |
| `markdown-flavor` | `gfm`, `commonmark` / `gfm` | Subset feature profile. `commonmark` disables supported GFM-only structures; neither value claims full specification conformance. |
| `tab-behavior` | `accessibility-first`, `editor-first` / `accessibility-first` | Whether ordinary Tab moves focus or inserts indentation outside structural contexts. |
| `indent-string` | `tab`, `2`, `2-spaces`, `4`, `4-spaces` / two spaces | Indentation used by list and editor actions. |
| `debug` | Nonnegative integer / `0` | Diagnostic level. `0` emits nothing, `1` emits input decisions, and `2` also emits selection/focus details through `md-debug`. |
| `debug-log` | Boolean | Mirror enabled `md-debug` payloads to `console.debug`. Events remain the primary diagnostic channel. |
| `required` | Boolean | Requires non-whitespace Markdown. |
| `disabled` | Boolean | Disables interaction and omits the field from form submission. |
| `readonly` | Boolean | Keeps content focusable/readable but prevents mutation. |
| `spellcheck` | `true`, `false` / `true` | Spellcheck for prose surfaces. Fenced code always disables it. |
| `minlength` | Nonnegative integer | Minimum nonempty Markdown length for validity. Invalid values are ignored. |
| `maxlength` | Nonnegative integer | Maximum Markdown length for validity. Invalid values are ignored. |
| `aria-label` | String | Accessible name propagated to editing surfaces; preview receives a derived preview name. |
| `aria-labelledby` | Element ID list | Accessible naming relationship propagated to editing and preview surfaces. |
| `dir` | `ltr`, `rtl`, `auto` | Text direction propagated to editing surfaces. |
| `render-debounce-ms` | Number 0 through 1000 / `100` | Preview render debounce. Values are clamped. |

Boolean attributes follow HTML rules: their presence means true, regardless of
their text value.

## Properties

| Property | Type | Notes |
|---|---|---|
| `value` | `string` | Canonical Markdown. Setting it normalizes line endings and emits `md-input` if changed. It does not reflect to the `value` attribute. |
| `defaultValue` | `string` | Clean/reset Markdown target. Setting it updates the `value` attribute. |
| `name` | `string` | Reflects `name`. |
| `label` | `string` | Reflects `label`. |
| `placeholder` | `string` | Reflects `placeholder`. |
| `mode` | String enum | One of `live`, `source`, `split`, or `preview`; reflects `mode`. |
| `preview` | String enum | One of `none`, `below`, `side`, or `inline-split`; reflects `preview`. |
| `markdownFlavor` | String enum | `gfm` or `commonmark`; reflects `markdown-flavor`. |
| `tabBehavior` | String enum | `accessibility-first` or `editor-first`; reflects `tab-behavior`. |
| `indentString` | String | A tab, two spaces, or four spaces. Setting a tab reflects `indent-string="tab"`. |
| `debug` | `number` | Nonnegative diagnostic level reflected to `debug`; defaults to `0`. |
| `debugLog` | `boolean` | Reflects the optional `debug-log` console mirror. |
| `disabled` | `boolean` | True for an explicit attribute or disabled form/fieldset state. |
| `readonly` | `boolean` | Reflects `readonly`. |
| `required` | `boolean` | Reflects `required`. |
| `dirty` | `boolean`, read-only | Whether current Markdown differs from `defaultValue`. |
| `selectionStart` | `number` | Start offset in canonical Markdown. May be set directly. |
| `selectionEnd` | `number` | End offset in canonical Markdown. May be set directly. |
| `validationMessage` | `string`, read-only | Current native/custom validation message. |
| `validity` | `ValidityState`-like, read-only | Includes `valid`, `valueMissing`, `tooShort`, `tooLong`, and `customError`. |
| `willValidate` | `boolean`, read-only | Whether the element participates in constraint validation. |

### Value and reset semantics

- On first connection, the `value` attribute becomes both `value` and
  `defaultValue`.
- Changing the `value` attribute changes the reset target.
- While pristine, an attribute change also updates current Markdown.
- While dirty, an attribute change preserves current Markdown and changes only
  the reset target.
- Setting the `value` property changes current Markdown but does not change the
  reset target.
- `commit()` makes the current value clean and sets it as the reset target.
- `reset()` or native form reset restores `defaultValue`.

## Methods

### Focus and selection

| Method | Return | Behavior |
|---|---|---|
| `focus(options?)` | `void` | Focus the active live, source, or preview surface. Does nothing while disabled. |
| `blur()` | `void` | Blur the active internal surface. |
| `select()` | `void` | Select the complete Markdown value. |
| `setSelectionRange(start, end, direction?)` | `void` | Clamp and set canonical source selection. Direction defaults to `none`. |
| `getSelectionMarkdown()` | `string` | Return Markdown in the current source range. |

### Value and output

| Method | Return | Behavior |
|---|---|---|
| `getMarkdown()` | `string` | Return canonical Markdown. |
| `setMarkdown(markdown)` | `void` | Set canonical Markdown through the `value` property. |
| `insertMarkdown(markdown)` | `boolean` | Run `editor.insertText` at the current selection. |
| `getHTML()` | `string` | Render canonical Markdown with the built-in safe renderer. |
| `getText()` | `string` | Extract structural plain text. |
| `getPlainText()` | `string` | Alias of `getText()`. |

### Actions and structure

| Method | Return | Behavior |
|---|---|---|
| `exec(actionId, args?)` | `boolean` | Run and apply an action. |
| `canExec(actionId, args?)` | `boolean` | Check state, `when`, readonly, and disabled applicability. |
| `registerAction(action)` | `void` | Register or replace an action. Throws for a missing string `id` or `run` function. |
| `unregisterAction(actionId)` | `void` | Remove an action by ID. |
| `getCurrentBlock()` | Object or `null` | Return the parsed block at the caret. |
| `getSelectedBlocks()` | `object[]` | Return parsed blocks intersecting the source selection. |
| `getActiveMarks()` | `string[]` | Return active block/inline action IDs for host UI. |

### Completion

| Method | Return | Behavior |
|---|---|---|
| `registerCompletionProvider(provider)` | `void` | Register or replace a provider. Requires string `id` and `match`, `getItems`, and `apply` functions. |
| `unregisterCompletionProvider(providerId)` | `void` | Remove a provider and close it if currently active. |

### Find and replace

| Method | Return | Behavior |
|---|---|---|
| `find(query, options?)` | Match object or `null` | Find and select the next source match. |
| `replace(query, replacement, options?)` | `number` | Replace the matching selection or next match; returns 0 or 1. |
| `replaceAll(query, replacement, options?)` | `number` | Replace all nonoverlapping source matches. |

Find options:

| Option | Type / default | Meaning |
|---|---|---|
| `caseSensitive` | `boolean` / `false` | Match case exactly. |
| `from` | `number` / current selection end | Starting source offset for `find` and next-match replacement. |
| `wrap` | `boolean` / `true` | Search again from source offset 0 after reaching the end. |

### Commit, reset, and validity

| Method | Return | Behavior |
|---|---|---|
| `commit()` | `void` | Set current Markdown as clean/default and emit `md-change`. |
| `reset()` | `void` | Restore `defaultValue`, move selection to 0, and clear dirty state. |
| `checkValidity()` | `boolean` | Run constraint validation without requesting visible reporting. |
| `reportValidity()` | `boolean` | Run and expose validation. |
| `setCustomValidity(message)` | `void` | Set or clear a custom error. Empty string clears it. |

## Built-in actions

### Editor and history

| Action ID | Arguments | Purpose |
|---|---|---|
| `editor.insertText` | `{ text }` | Replace the current selection with normalized text. |
| `editor.replaceSelection` | `{ text }` | Replace the current selection with normalized text. |
| `editor.insertParagraph` | None | Insert `\n`. |
| `editor.insertSoftBreak` | None | Insert two spaces plus `\n`. |
| `editor.smartEnter` | None | Structure-aware Enter. |
| `editor.smartTab` | None | Structure-aware indent or editor indentation. |
| `editor.smartOutdent` | None | Structure-aware outdent. |
| `editor.smartBackspace` | None | Marker removal, line join, selection deletion, or ordinary backspace fallback. |
| `editor.smartDelete` | None | Line join, selection deletion, or ordinary delete fallback. |
| `editor.markdownShortcut` | None | Apply line-start Markdown shortcut before Space. |
| `editor.deleteSelection` | None | Delete current canonical selection. |
| `editor.selectAllExpand` | None | Expand live source-backed selection. |
| `history.undo` | None | Undo the last canonical transaction. |
| `history.redo` | None | Redo the last undone transaction. |

### Blocks and insertion

| Action ID | Arguments | Purpose |
|---|---|---|
| `block.paragraph` | None | Convert current line/block to a paragraph. |
| `block.heading.1` through `block.heading.6` | None | Toggle a heading level. |
| `block.bulletList` | None | Toggle an unordered list marker. |
| `block.orderedList` | None | Toggle an ordered list marker. |
| `block.taskList` | None | Toggle a task list marker. |
| `block.taskDone` | None | Toggle current task completion. |
| `block.blockquote` | None | Toggle a blockquote marker. |
| `block.codeFence` | `{ language? }` | Wrap selection or insert a fenced block. |
| `block.horizontalRule` | None | Insert a horizontal rule block. |
| `block.table` | `{ rows?, cols? }` | Insert a table; rows clamp 1-20, columns 2-12. |

### Tables and code

| Action ID | Arguments | Purpose |
|---|---|---|
| `table.insertRowAfter` | None | Insert a body row below the selected table position. |
| `table.insertColumnAfter` | None | Insert a column after the selected column. |
| `table.deleteRow` | None | Delete the selected body row. |
| `table.deleteColumn` | None | Delete the selected column; the only remaining column cannot be deleted. |
| `code.setLanguage` | `{ language }` | Replace the current fence info string while preserving fence style. |

### Inline

| Action ID | Arguments | Purpose |
|---|---|---|
| `inline.bold` | None | Wrap/toggle `**`. |
| `inline.italic` | None | Wrap/toggle `*`. |
| `inline.code` | None | Wrap/toggle a code span. |
| `inline.strikethrough` | None | Wrap/toggle `~~`. |
| `inline.link` | `{ url? }` | Wrap selected label or insert an empty link. |
| `inline.image` | `{ alt?, src? }` | Insert an image. |

### View and completion

| Action ID | Arguments | Purpose |
|---|---|---|
| `view.live` | None | Set `mode="live"`. |
| `view.source` | None | Set `mode="source"`. |
| `completion.close` | None | Close the active popup. |
| `completion.next` | None | Activate the next enabled item and keep it visible. |
| `completion.previous` | None | Activate the previous enabled item and keep it visible. |
| `completion.first` | None | Activate the first enabled item and keep it visible. |
| `completion.last` | None | Activate the last enabled item and keep it visible. |
| `completion.accept` | None | Apply the active completion. |

## Custom action contract

An action object supports:

| Field | Required | Meaning |
|---|---|---|
| `id` | Yes | Unique action string. |
| `run(context, args)` | Yes | Returns an action result. |
| `label` | No | Human-readable command name. |
| `description` | No | Longer command description. |
| `group` | No | Command category; defaults to `Custom`. |
| `aliases` | No | Alternate slash-query strings; defaults to `[]`. |
| `keywords` | No | Additional slash-query strings; defaults to `[]`. |
| `visibleInSlash` | No | Include in built-in slash results; defaults to false. |
| `when(context, args)` | No | Applicability predicate. |
| `structural` | No | Set false only for composition-safe operations. |
| `readonlySafe` | No | Allow while readonly. |
| `viewSafe` | No | Allow in disabled/view state. |

A mutating success result has this shape:

```js
{
  ok: true,
  transaction: {
    changes: [{ from, to, insert }],
    selectionBefore: { start, end, direction },
    selectionAfter: { start, end, direction },
    undoGroup: 'group-id'
  },
  announcement: 'Optional status text.'
}
```

Changes use offsets in the pre-transaction Markdown and must not overlap.
Writemark supplies the action ID, source, and timestamp before applying the
transaction.

A successful nonmutating result can be `{ ok: true, announcement? }`. A failed
result can be `{ ok: false, reason, message? }`.

## Completion provider contract

| Field | Required | Meaning |
|---|---|---|
| `id` | Yes | Unique provider string. |
| `match(context)` | Yes | Return match metadata or `null`. |
| `getItems(match, context, signal)` | Yes | Return items or a promise. |
| `apply(item, match, context)` | Yes | Return an action-style result. |
| `priority` | No | Higher providers are matched first; defaults to 0. |
| `triggers` | No | Provider trigger metadata; defaults to `[]`. |

Completion items require truthy `id` and `label`. Supported display/state fields
are `detail`, `description`, `kind`, and `disabled`.

Built-in providers are `slash` at priority 100 and `code-language` at priority
60.

## Events

All public events bubble and are composed. Only `md-before-change` is
cancelable.

| Event | `event.detail` |
|---|---|
| `md-before-change` | `{ transaction, before, nextValue, selectionAfter, source }`; cancel to block the mutation. |
| `md-input` | `{ value, source, inputType }`; emitted after canonical value changes. |
| `md-change` | `{ value }`; emitted by `commit()` and source textarea change. |
| `md-selection-change` | `{ selectionStart, selectionEnd, selectionDirection }`. |
| `md-action` | `{ actionId, source, before, after }`, with optional action transaction arguments. |
| `md-completion-open` | `{ providerId, match, items }`. |
| `md-completion-close` | `{ providerId, match }`. |
| `md-completion-accept` | `{ providerId, item, before, after }`. |
| `md-render` | `{ html }`; preview output was generated. |
| `md-file-paste` | `{ files, insertionPoint, insertMarkdown }`. |
| `md-file-drop` | `{ files, insertionPoint, insertMarkdown }`. |
| `md-copy` | `{ markdown, start, end }`. |
| `md-cut` | `{ markdown, start, end }`. |
| `md-paste` | `{ markdown, kind }`. |
| `md-dirty-change` | `{ dirty }`. |
| `md-debug` | Serializable diagnostic payload containing `sequence`, `timestamp`, `level`, `phase`, `mode`, `valueLength`, `selection`, and phase-specific metadata. Emitted only when `debug` is high enough. |
| `md-error` | `{ phase, error, recoverable, ...context }`. |

Snapshots in event payloads have the shape:

```js
{
  value: 'canonical Markdown',
  selection: { start, end, direction }
}
```

Common input/action `source` values include `api`, `user`, `keyboard`, `paste`,
`pointer`, `undo`, `redo`, `attribute`, and `init` depending on the path.

### Debug diagnostics

Debugging is event-first so a host can display, store, upload, or otherwise
retrieve diagnostics from a device without relying on a connected browser
console:

```js
editor.debug = 2;

editor.addEventListener('md-debug', event => {
  diagnosticBuffer.push(event.detail);
});
```

Level `1` reports live `beforeinput`/`input` decisions and source-backed
deletions. Level `2` adds selection changes, focus requirements, and requested
versus restored source ranges. Selection diagnostics can also include
`selectionReadStrategy` (`direct` or `composed-range`) and
`selectionVerification` (`read-back` or `write-only`) so Safari selection
behavior can be distinguished from ordinary document selection. Payloads
include offsets and lengths but not the Markdown body. Set
`editor.debugLog = true` or add `debug-log` only when the same payload should
also be sent to `console.debug`. The component does not retain a diagnostic
history; the host owns storage and transport.

## Form behavior

`WritemarkEditorElement.formAssociated` is true and uses `ElementInternals` when
available.

- The submitted value is raw Markdown under `name`.
- Disabled editors are omitted from form data.
- `required` treats whitespace-only Markdown as empty.
- `minlength` applies only to nonempty values; `maxlength` applies to all values.
- Invalid, negative, noninteger, or excessively large length constraints are
  ignored.
- Native form reset calls `reset()`.
- Disabled `fieldset` state is tracked separately from the explicit `disabled`
  attribute.
- Browser form-state restoration writes a restored string to `value`.

## Styling reference

### CSS custom properties

| Property | Default |
|---|---|
| `--md-editor-font` | System UI font stack. |
| `--md-editor-mono-font` | System monospace font stack. |
| `--md-editor-font-size` | `15px` |
| `--md-editor-line-height` | `1.55` |
| `--md-editor-bg` | `Canvas` |
| `--md-editor-fg` | `CanvasText` |
| `--md-editor-muted` | Mixed muted canvas text. |
| `--md-editor-token` | Mixed Markdown-token color. |
| `--md-editor-border` | Mixed canvas border. |
| `--md-editor-border-focus` | `Highlight` |
| `--md-editor-radius` | `10px` |
| `--md-editor-padding` | `14px` |
| `--md-editor-min-height` | `220px` |
| `--md-editor-max-height` | `none` |
| `--md-editor-focus-ring` | Three-pixel mixed highlight ring. |
| `--md-editor-active-line-ring` | `none` |
| `--md-editor-active-line-bg` | `transparent` |
| `--md-editor-active-cell-ring` | Active line ring. |
| `--md-editor-active-cell-bg` | Active line background. |
| `--md-editor-popup-bg` | `Canvas` |
| `--md-editor-popup-fg` | `CanvasText` |
| `--md-editor-popup-border` | Mixed canvas border. |
| `--md-editor-popup-shadow` | `0 12px 30px rgb(0 0 0 / 0.16)` |
| `--md-editor-preview-bg` | Mixed canvas background. |
| `--md-editor-preview-fg` | `CanvasText` |
| `--md-editor-code-bg` | Mixed canvas code background. |
| `--md-editor-code-header-bg` | Mixed canvas header background. |
| `--md-editor-code-accent` | Mixed canvas code accent. |
| `--md-editor-danger` | `#b00020` |
| `--md-editor-transition-duration` | `140ms` |
| `--md-editor-transition-ease` | `cubic-bezier(.2,.8,.2,1)` |

### CSS parts

| Part | Target |
|---|---|
| `container` | Complete labeled component layout. |
| `label` | Visible editor label. |
| `editor` | Editor shell around active surfaces and completion. |
| `live-editor` | Live editing surface. |
| `textarea` | Source textarea. |
| `preview` | Rendered preview surface. |
| `completion-popup` | Completion listbox. |
| `completion-item` | Every completion option. |
| `completion-item-active` | Currently active completion option. |
| `line` | Rendered editable line and terminal anchor. |
| `checkbox` | Task checkbox. |
| `code-block` | Complete rendered fenced block. |
| `code-header` | Code language header. |
| `code-lines` | Code-line container. |
| `code-line` | Individual editable code line. |
| `table` | Rendered table element. |
| `table-cell` | Editable table cell. |
| `error` | Validation message region. |
| `status` | Screen-reader action status region. |

## Module exports

```js
import {
  WritemarkEditorElement,
  MdLiveEditorElement,
  renderMarkdown,
  renderInlineMarkdown,
  parseBlocks,
  parseListItem,
  parseHeading,
  parseBlockquote,
  htmlToMarkdown,
  tsvToMarkdownTable
} from 'writemark-editor';
```

| Export | Purpose |
|---|---|
| `WritemarkEditorElement` | Preferred custom-element class. |
| `MdLiveEditorElement` | Legacy alias class. |
| `renderMarkdown(markdown, options?)` | Render a Markdown document to safe HTML. |
| `renderInlineMarkdown(source, options?)` | Render supported inline Markdown to safe HTML. |
| `parseBlocks(markdown, options?)` | Parse source-backed block metadata. |
| `parseListItem(line, options?)` | Parse one supported list item. |
| `parseHeading(line)` | Parse one ATX heading line. |
| `parseBlockquote(line)` | Parse one blockquote line. |
| `htmlToMarkdown(html)` | Convert supported clipboard-style HTML to Markdown. |
| `tsvToMarkdownTable(text)` | Convert tab-separated rows to a Markdown table. |

Parser return objects are useful for inspection and tests, but host editing
commands should use actions rather than mutating parser metadata or shadow-DOM
nodes.

With the classic global build, the same exports are available under:

```js
globalThis.WritemarkEditor
```
