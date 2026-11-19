# API reference

This page is the lookup reference for Writemark 1.9.0. The default `live` mode
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
| `writemark-editor/writemark-editor.global.min.js` | Minified standalone browser script with embedded styles. |
| `writemark-editor/md-live-editor.js` | Legacy compatibility module. |

The preferred element is `<writemark-editor>`. `<md-live-editor>` is a legacy
alias backed by `MdLiveEditorElement`.

The package includes generated TypeScript declarations for every public entry.
See [Distribution](distribution.md#typescript) for typed module and global examples.

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
| `tags-enabled` | Boolean / absent | Enable tag rendering, indexing, completion, and activation. Tags are off by default. |
| `shift-enter-behavior` | `soft-break`, `smart-enter` / `soft-break` | Choose whether Shift+Enter inserts a Markdown hard break or uses the same structure-aware action as Enter. Invalid values use `soft-break`. |
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
| `tagsEnabled` | `boolean` | Reflects `tags-enabled`. Defaults to `false`. Assigning a tag provider does not enable tags. |
| `shiftEnterBehavior` | String enum | `soft-break` or `smart-enter`; reflects `shift-enter-behavior`. Defaults to `soft-break`. |
| `tabBehavior` | String enum | `accessibility-first` or `editor-first`; reflects `tab-behavior`. |
| `indentString` | String | A tab, two spaces, or four spaces. Setting a tab reflects `indent-string="tab"`. |
| `debug` | `number` | Nonnegative diagnostic level reflected to `debug`; defaults to `0`. |
| `debugLog` | `boolean` | Reflects the optional `debug-log` console mirror. |
| `disabled` | `boolean` | True for an explicit attribute or disabled form/fieldset state. |
| `readonly` | `boolean` | Reflects `readonly`. |
| `required` | `boolean` | Reflects `required`. |
| `dirty` | `boolean`, read-only | Whether current Markdown differs from `defaultValue`. |
| `revision` | `number`, read-only | Monotonic count of actual canonical Markdown changes in this editor. |
| `tagProvider` | Object or `null` | Optional host tag catalog. The object requires `getItems`. Set `allowCreate` to offer catalog additions. |
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

### Remote cursor display

`setRemoteCursors(cursors, options?)` replaces the cursor batch in a connected editor.
It returns `false` when validation fails or the editor has no connected controls.
`getRemoteCursors()` returns copies of the current cursor data.
`updateRemoteCursors(update)` merges cursor changes and returns a structured result.

```js
editor.setRemoteCursors([
  { id: 'alex', name: 'Alex', color: '#4765a9', anchor: 20, head: 35 },
  { id: 'river', name: 'River', color: '#b64325', anchor: 62, head: 62 }
], { baseRevision: editor.revision });

editor.setRemoteCursors([]);
```

Use incremental updates when separate connections supply cursor changes:

```js
const result = editor.updateRemoteCursors({
  cursors: [{
    id: 'alex', name: 'Alex', color: '#4765a9', anchor: 20, head: 35,
    epoch: 1, sequence: 8, ttlMs: 30000
  }],
  remove: ['departed-peer'],
  baseRevision: editor.revision,
  showNames: true
});

if (!result.ok) console.log(result.reason, result.id);
```

The update object requires `cursors` and accepts `remove`, `replace`, `baseRevision`, `animate`, and `showNames`.
The default operation merges cursors by ID.
Use `replace: true` for a complete replacement.
An ID cannot appear in both `cursors` and `remove`.
Successful updates return `{ ok: true, count }`.
Rejected updates return `{ ok: false, reason, id? }`.
Rejection reasons are `invalid-update`, `invalid-cursor`, `duplicate-id`, `invalid-remove`, `capacity-exceeded`, and `stale-revision`.
They also include `stale-cursor`, `version-conflict`, `reentrant-change`, and `not-connected`.
The boolean replacement setter remains available for existing callers.

Each `RemoteCursor` has an `id`, `name`, `color`, `anchor`, and `head`.
The optional `active` flag defaults to `true`.
The optional `epoch` and `sequence` fields must appear together.
Both fields require nonnegative safe integers.
The optional `ttlMs` controls expiry after the last accepted update.
The default expiry is 30000 milliseconds.
Use `ttlMs: 0` for manual samples that must not expire.
The maximum expiry is 300000 milliseconds.
Offsets use UTF-16 units in the current canonical Markdown.
The caret follows `head`.
Different endpoints show a selection range.
The editor shows visible selection fragments when the caret is outside the viewport.
Undo preserves cursor positions at boundaries between adjacent replacements.
The API accepts `#RGB` and `#RRGGBB` colors.
Names use text content and cannot insert HTML.

A batch can contain up to 64 cursors with unique, nonempty IDs.
IDs can contain up to 128 UTF-16 units.
Names can contain up to 80 UTF-16 units.
IDs and names cannot contain ASCII control characters.
Invalid batches leave the previous cursor data intact.
The optional `baseRevision` rejects stale positions.
Set `animate: false` to place all cursors without travel.
Set `showNames: true` to retain names for host keyboard controls.
The name policy persists until an update changes it.

Versioned cursors compare `epoch` first, then `sequence`.
An older tuple cannot replace a newer tuple.
An equal tuple accepts identical content as a heartbeat.
A heartbeat refreshes expiry without moving locally mapped endpoints or reviving a faded name.
Different content with an equal tuple returns `version-conflict`.
A newer tuple applies its supplied endpoints, even when an earlier local edit moved the current endpoints.
An unversioned update cannot replace a versioned cursor.
For unversioned cursors, updates apply their supplied endpoints.
The controller retains at most 256 removed version records for five minutes.
The host must reject messages older than that bounded retention window.
Version fields and names do not prove identity.

Presence does not change Markdown, revision, history, form values, focus, or the local selection.
Canonical edits map cursor endpoints through the changed source ranges.
Local undo restores deleted endpoints for peers that did not submit a later authoritative position.
Undo does not restore removed peers or overwrite their current names and colors.
Whole document writes use a bounded diff to preserve unchanged spans between separate edits.
Large unrelated writes can use one replacement range when the diff reaches its work limit.
Text alone cannot identify the intended insertion point among repeated identical characters.
Use `applyTransaction()` when exact change ranges are available.
Adapters should refresh positions from their shared document model.
The host owns transport, user identity, and connection state.

The display supports `live`, `source`, and `split` modes.
Split mode displays cursors in its source pane.
Preview mode hides cursor markers.
Offscreen carets hide independently from visible selection fragments.
Live selections clip to mounted content without rendering virtual content or moving the local view.
Each cursor displays up to 256 selection rectangles.
Short moves on the same visual row ease for 90 milliseconds.
Line changes, large jumps, scroll, and layout changes move directly.
Labels fade after 1.6 seconds without a cursor change.
Duplicate batches do not extend that delay.
Four placement lanes limit label collisions.
Hovering near a caret reveals its name and gives it collision priority.
A separate screen-reader roster contains all supplied names without live movement announcements.
Reduced motion disables cursor travel and label fades.
An empty cursor list releases measurement mirrors, observers, listeners, and timers.
Editor disconnection also releases those resources.

See the [cursor demo](../demo/cursors/index.html) and [motion design](advanced.md#remote-cursor-motion).

### External transactions

`applyTransaction(request)` returns a `TransactionResult`.
It applies a validated batch as one undo step.
It does not rebase stale edits.
It preserves focus when another control owns focus.

```js
const result = editor.applyTransaction({
  baseRevision: editor.revision,
  changes: [{ from: 0, to: 5, expected: 'Draft', insert: 'Final' }],
  origin: { kind: 'external', id: 'proofreader' }
});

if (!result.ok) console.log(result.reason, result.revision);
```

| Request field | Contract |
|---|---|
| `baseRevision` | Required nonnegative safe integer. It must equal the current editor revision. |
| `changes` | Required array of source edits. All ranges refer to the original canonical Markdown. |
| `from`, `to` | Integer UTF-16 offsets with `0 <= from <= to <= value.length`. |
| `insert` | Required string. Writemark normalizes inserted line endings to LF. |
| `expected` | Optional exact source text for the replaced range. |
| `selectionAfter` | Optional valid source selection in the resulting Markdown. Otherwise Writemark maps the current selection. |
| `origin` | Optional `{ kind, id? }` metadata. The default kind is `external`. |

The validator rejects overlaps and ambiguous insertion boundaries.
Adjacent nonempty replacements are valid.
Two insertions at one offset are invalid.
An insertion that shares a replacement boundary is also invalid.
The validator copies caller data and never clamps external ranges.
For form fields, keep edits on Unicode code point boundaries.
Native `FormData` replaces lone surrogates with U+FFFD.

Success includes `ok`, `changed`, `beforeRevision`, `revision`, `origin`, and `selection`.
Failure includes `ok: false`, `reason`, `beforeRevision`, `revision`, and `origin`.

Failure reasons are `invalid-request`, `stale-revision`, `invalid-change`, `overlapping-changes`, `expected-mismatch`, and `invalid-selection`.
State failures are `disabled`, `readonly`, and `composition-active`.
Cancellation returns `change-canceled`.
A document change during validation or `md-before-change` returns `reentrant-change`.

An accepted text no-op preserves revision and history.
It also preserves selection unless the request includes `selectionAfter`.
Mapped noncollapsed selections keep replacement text between their start and end boundaries.
A mapped collapsed caret moves after inserted text.
Revisions advance on actual changes from native input, composition, actions, API writes, undo, redo, and reset.
Native composition and reconciliation can make several canonical changes during one user operation.
Revisions identify editor state, not a file identity or a user action count.

Edit origin kinds are `user`, `paste`, `action`, `completion`, `external`, and `api`.
The optional `id` names the action, provider, or external tool.
Host origin metadata does not authenticate a caller.
Stale requests return before the validator reads caller origin metadata.

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
| `getTags()` | `object[]` | Return derived tags with `value`, normalized `key`, `count`, and source `ranges`. Return `[]` while tags are off. |

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

Built-in providers are `slash` at priority 100, `tags` at priority 80, and
`code-language` at priority 60.

## Events

All public events bubble and are composed. Only `md-before-change` is
cancelable.

Edit events also include `origin`, `beforeRevision`, and `revision`.
These fields apply to `md-before-change`, `md-input`, `md-change`, `md-action`, `md-completion-accept`, `md-paste`, and `md-cut`.
For `md-before-change`, both revision fields identify the document before the proposed edit.
`md-value-sync` supplies synchronous value synchronization, including silent changes.

| Event | `event.detail` |
|---|---|
| `md-value-sync` | `{ value, defaultValue, revision }`. Runs before normal value change events. |
| `md-before-change` | `{ transaction, before, nextValue, selectionAfter, source }`; cancel to block the mutation. |
| `md-input` | `{ value, source, inputType }`; emitted after canonical value changes. |
| `md-change` | `{ value }`; emitted by `commit()` and source textarea change. |
| `md-selection-change` | `{ selectionStart, selectionEnd, selectionDirection }`. |
| `md-action` | `{ actionId, source, before, after }`, with optional action transaction arguments. |
| `md-completion-open` | `{ providerId, match, items }`. |
| `md-completion-close` | `{ providerId, match }`. |
| `md-completion-accept` | `{ providerId, item, before, after }`. |
| `md-tags-change` | `{ current, added, removed, source, inputType }`. `current` matches `getTags()`. `added` and `removed` contain tag value strings. A switch change uses `source: "attribute"`. |
| `md-tag-activate` | `{ tag, key, surface }`. Surface is `live` or `preview`. |
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
| `--md-editor-tag-bg` | Mixed highlight tag background. |
| `--md-editor-tag-fg` | Mixed highlight tag text. |
| `--md-editor-tag-border` | Mixed highlight tag border. |
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
| `tag` | A rendered tag in live mode or preview. |
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
  parseTags,
  parseListItem,
  parseHeading,
  parseBlockquote,
  htmlToMarkdown,
  tsvToMarkdownTable,
  enhanceTextarea,
  enhanceTextareas
} from 'writemark-editor';
```

| Export | Purpose |
|---|---|
| `WritemarkEditorElement` | Preferred custom-element class. |
| `MdLiveEditorElement` | Legacy alias class. |
| `renderMarkdown(markdown, options?)` | Render a Markdown document to safe HTML. |
| `renderInlineMarkdown(source, options?)` | Render supported inline Markdown to safe HTML. |
| `parseBlocks(markdown, options?)` | Parse source-backed block metadata. |
| `parseTags(markdown, options?)` | Derive unique tags, counts, and source ranges. |
| `parseListItem(line, options?)` | Parse one supported list item. |
| `parseHeading(line)` | Parse one ATX heading line. |
| `parseBlockquote(line)` | Parse one blockquote line. |
| `htmlToMarkdown(html)` | Convert supported clipboard-style HTML to Markdown. |
| `tsvToMarkdownTable(text)` | Convert tab-separated rows to a Markdown table. Return `null` when the text has no table. |
| `enhanceTextarea(textarea)` | Return a `TextareaEnhancement` with `editor`, `textarea`, and `destroy()`. Throws if safe initialization fails. |
| `enhanceTextareas(root?)` | Enhance opted-in textareas within a root. Default root is `document`. Individual failures preserve native fallbacks. |

See [textarea enhancement](getting-started.md#enhance-an-existing-textarea) for form, lifecycle, and synchronization rules.

The rendering helpers leave tags as plain text by default. Pass
`{ tagsEnabled: true }` to render tag labels. The explicit `parseTags()` helper
always analyzes its input, independent of an editor's switch.

Parser return objects are useful for inspection and tests, but host editing
commands should use actions rather than mutating parser metadata or shadow-DOM
nodes.

With the classic global build, the same exports are available under:

```js
globalThis.WritemarkEditor
```
