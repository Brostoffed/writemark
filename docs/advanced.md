# Advanced integration

This guide covers application-level integration after the basic editor and
editing model are understood. Exact signatures and identifiers are in the
[API reference](api-reference.md).

## Integration lifecycle

Importing the module registers the custom element. Wait for its definition when
application code can run before the module finishes loading:

```js
import 'writemark-editor';

await customElements.whenDefined('writemark-editor');

const editor = document.querySelector('writemark-editor');
editor.value = initialMarkdown;
editor.commit();
```

`commit()` marks the loaded value clean and establishes it as the next reset
target. It also emits `md-change`; attach persistence listeners after initial
loading when that event should not trigger a save.

When a framework owns the component:

- Set properties on the DOM element for runtime values. HTML attributes are
  most useful for initial declarative configuration.
- Treat `md-input` as the edit stream and `md-change` as a commit signal.
- Avoid rewriting `editor.value` on every input unless external state actually
  changed. The editor already owns the active selection and undo transaction.
- Remove host event listeners and unregister host actions/providers when the
  surrounding view is destroyed.
- Keep Markdown, not shadow-DOM HTML, in application state.

## Host controls and toolbars

Writemark deliberately does not render a toolbar. A host toolbar can invoke the
same actions as keyboard and slash commands:

```html
<div id="formatting" role="toolbar" aria-label="Formatting">
  <button type="button" data-action="inline.bold" aria-label="Bold">B</button>
  <button type="button" data-action="inline.italic" aria-label="Italic">I</button>
  <button type="button" data-action="block.heading.2">Heading 2</button>
</div>

<writemark-editor id="editor" label="Body"></writemark-editor>
```

```js
const editor = document.querySelector('#editor');
const toolbar = document.querySelector('#formatting');

toolbar.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  editor.exec(button.dataset.action);
  editor.focus();
});

function syncToolbar() {
  const active = new Set(editor.getActiveMarks());

  for (const button of toolbar.querySelectorAll('[data-action]')) {
    const actionId = button.dataset.action;
    button.disabled = !editor.canExec(actionId);
    button.setAttribute('aria-pressed', String(active.has(actionId)));
  }
}

editor.addEventListener('md-selection-change', syncToolbar);
editor.addEventListener('md-input', syncToolbar);
syncToolbar();
```

Use proper toggle-button semantics only for actions that represent an active
state. Insert commands such as `block.table` should remain ordinary buttons.

## Built-in action composition

Actions preserve undo, selection mapping, cancelable change events, dirty state,
and accessibility announcements. Prefer `exec()` to manually rewriting source
for an editor command:

```js
editor.exec('block.table', { rows: 3, cols: 4 });
editor.exec('block.codeFence', { language: 'sql' });
editor.exec('inline.image', {
  alt: 'Query plan',
  src: '/assets/query-plan.png'
});
```

`exec()` returns `true` when the action succeeds and `false` when it is unknown,
blocked by state, or not applicable. `canExec()` checks availability without
running it.

## Custom actions

A custom action receives a source-backed context and optional arguments. Return
an action result containing one or more nonoverlapping source changes and the
selection that should be restored after those changes.

```js
editor.registerAction({
  id: 'insert.note',
  label: 'Note callout',
  description: 'Insert a quoted note',
  group: 'Insert',
  aliases: ['note', 'callout'],
  keywords: ['aside'],
  visibleInSlash: true,
  when: context => context.mode === 'idle',
  run(context, args = {}) {
    const selected = context.value.slice(
      context.selectionStart,
      context.selectionEnd
    );
    const body = selected || args.text || 'Note';
    const inserted = `> **Note:** ${body}`;
    const cursor = context.selectionStart + inserted.length;

    return {
      ok: true,
      transaction: {
        changes: [{
          from: context.selectionStart,
          to: context.selectionEnd,
          insert: inserted
        }],
        selectionBefore: {
          start: context.selectionStart,
          end: context.selectionEnd,
          direction: context.selectionDirection
        },
        selectionAfter: {
          start: cursor,
          end: cursor,
          direction: 'none'
        },
        undoGroup: 'insert.note'
      },
      announcement: 'Note inserted.'
    };
  }
});

editor.exec('insert.note', { text: 'Review this section.' });
```

Useful context fields include:

- `value`, `selectionStart`, `selectionEnd`, and `selectionDirection`.
- `currentLine`, `selectedLines`, and the classified `block` at the caret.
- `inline.insideInlineCode`.
- `mode`, which reports interaction state such as `idle`, `readonly`,
  `disabled`, `composing-ime`, or an open completion.
- `config`, containing the public mode, preview, flavor, tab, indentation, and
  state settings.
- `host`, the editor element.

Set `structural: false` only when an action is safe to run during IME
composition. Set `readonlySafe` or `viewSafe` only for actions that do not mutate
content. An action registered with an existing ID replaces that action until it
is unregistered or registered again.

```js
editor.unregisterAction('insert.note');
```

Custom action transaction objects are an advanced contract. Test selection
restoration, undo/redo, cancellation, readonly behavior, and source/live parity
for every custom mutation.

## Custom completion providers

A provider controls four stages:

1. `match(context)` identifies a source range and query or returns `null`.
2. `getItems(match, context, signal)` returns items or a promise of items.
3. Writemark renders and navigates enabled items.
4. `apply(item, match, context)` returns an action-style result.

This example inserts a Markdown link after an `@` query:

```js
const people = [
  { id: 'ada', label: 'Ada Lovelace' },
  { id: 'grace', label: 'Grace Hopper' }
];

editor.registerCompletionProvider({
  id: 'people',
  priority: 50,
  triggers: ['@'],

  match(context) {
    const caretInLine = context.selectionStart - context.currentLine.start;
    const before = context.currentLine.text.slice(0, caretInLine);
    const found = /@([\w-]*)$/.exec(before);

    if (!found || context.selectionStart !== context.selectionEnd) return null;

    return {
      from: context.selectionStart - found[0].length,
      to: context.selectionStart,
      query: found[1]
    };
  },

  getItems(match, context, signal) {
    if (signal.aborted) return [];

    const query = match.query.toLowerCase();
    return people
      .filter(person => person.label.toLowerCase().includes(query))
      .map(person => ({
        id: person.id,
        label: person.label,
        detail: 'person',
        kind: 'mention'
      }));
  },

  apply(item, match, context) {
    const inserted = `[${item.label}](/people/${item.id})`;
    const cursor = match.from + inserted.length;

    return {
      ok: true,
      transaction: {
        changes: [{ from: match.from, to: match.to, insert: inserted }],
        selectionBefore: {
          start: context.selectionStart,
          end: context.selectionEnd,
          direction: context.selectionDirection
        },
        selectionAfter: {
          start: cursor,
          end: cursor,
          direction: 'none'
        },
        undoGroup: 'people-completion'
      },
      announcement: `${item.label} inserted.`
    };
  }
});
```

Completion items require `id` and `label`. They may also provide `detail`,
`description`, `kind`, and `disabled`. Duplicate `kind` plus `id` combinations
are removed. Disabled items remain visible but cannot become active.

Use the supplied `AbortSignal` for remote lookup:

```js
async function getItems(match, context, signal) {
  const response = await fetch(
    `/api/search?q=${encodeURIComponent(match.query)}`,
    { signal }
  );
  return response.json();
}
```

Writemark aborts stale requests when the query or provider changes. Provider
errors emit `md-error` with `phase: 'completion'`.

```js
editor.unregisterCompletionProvider('people');
```

## Change policy and transactions

`md-before-change` is cancelable. Use it to enforce a synchronous application
policy before a canonical transaction is applied:

```js
editor.addEventListener('md-before-change', event => {
  const { nextValue } = event.detail;

  if (nextValue.includes('SECRET_TOKEN')) {
    event.preventDefault();
  }
});
```

The detail includes the proposed `transaction`, the `before` snapshot,
`nextValue`, proposed `selectionAfter`, and input `source`. Cancellation leaves
the value and selection unchanged and announces that the change was blocked.

Do not perform asynchronous validation inside `md-before-change`; event
cancellation must happen before the listener returns. Use ordinary input state
plus a later save or form validation step for asynchronous rules.

## Event-driven persistence

A practical draft flow separates frequent local updates from durable commits:

```js
let draftTimer;

editor.addEventListener('md-input', event => {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    cacheDraft(event.detail.value);
  }, 500);
});

editor.addEventListener('md-change', event => {
  persistRevision(event.detail.value);
});

editor.addEventListener('md-error', event => {
  reportEditorError(event.detail.phase, event.detail.error);
});
```

The events bubble and cross the shadow boundary, so an application can listen
on the editor or on an ancestor that manages several editors.

## Host-controlled file handling

Writemark never uploads files. Paste and drop events provide the files, the
source insertion point captured at the time of the event, and a callback that
inserts host-produced Markdown.

```js
async function handleFiles(event) {
  const { files, insertionPoint, insertMarkdown } = event.detail;
  const file = files[0];
  if (!file) return;

  const uploaded = await uploadFile(file);

  editor.setSelectionRange(insertionPoint, insertionPoint);
  insertMarkdown(`![${file.name}](${uploaded.url})`);
}

editor.addEventListener('md-file-paste', handleFiles);
editor.addEventListener('md-file-drop', handleFiles);
```

An upload can finish after the document has changed. A production host should
decide whether to restore the original insertion point, use a temporary
placeholder that can be replaced later, or ask the user where to insert the
result. Validate file type, size, upload authorization, and returned URLs in the
host.

## Form validation and reset behavior

Use native constraints where they match the application:

```html
<writemark-editor
  name="summary"
  label="Summary"
  required
  minlength="40"
  maxlength="5000"
></writemark-editor>
```

Use custom validity for a source-aware rule:

```js
editor.addEventListener('md-input', () => {
  const hasHeading = /^#{1,6}\s+/m.test(editor.value);
  editor.setCustomValidity(hasHeading ? '' : 'Add at least one heading.');
});

form.addEventListener('submit', event => {
  if (!editor.reportValidity()) event.preventDefault();
});
```

`defaultValue` is the reset target. A `value` attribute change updates that
target; it updates the current value only while the editor is pristine. This
prevents a late attribute update from silently replacing unsaved input.

`commit()` sets the current Markdown as the new clean/reset value. `reset()` and
native form reset restore it. A disabled editor is omitted from `FormData`.

## Styling and layout

Theme the host with CSS custom properties and target stable internals through
CSS parts:

```css
writemark-editor.article-body {
  --md-editor-font: Inter, system-ui, sans-serif;
  --md-editor-mono-font: "JetBrains Mono", monospace;
  --md-editor-font-size: 14px;
  --md-editor-line-height: 1.6;
  --md-editor-min-height: 320px;
  --md-editor-max-height: 70vh;
  --md-editor-border-focus: #0969da;
  --md-editor-radius: 6px;
}

writemark-editor.article-body::part(code-header) {
  font-weight: 650;
}
```

The editor scrolls internally when content exceeds `--md-editor-max-height`.
Keep `--md-editor-min-height` at or below that value. The demo controls accept a
base font size down to 10px and a max height down to 100px; a 100px rendered
editor also needs its minimum height lowered to 100px or less.

Split and side-preview layouts use two columns above 720px and stack below that
width. Reduced-motion preferences collapse editor transition durations.

Avoid selecting undocumented shadow-DOM class names. Variables and parts are
the supported styling surface; see the complete lists in the
[API reference](api-reference.md#styling-reference).

## Security and rendered output

The built-in renderer applies these policies:

- User text is escaped.
- Raw HTML is not executed.
- `javascript:`, `vbscript:`, `file:`, and unsafe `data:` URLs are blocked.
- `http:`, `https:`, `mailto:`, `tel:`, relative, and fragment URLs are allowed.
- File events never initiate a network call.
- `getHTML()` uses the same safe renderer as the preview.

These controls protect the component's own output. A server must still validate
stored Markdown and apply its own rendering and sanitization policy wherever
content is displayed outside Writemark. Treat custom action, completion, upload,
and link data as untrusted input.

## Performance and large documents

- Preview rendering is debounced by 100ms by default. Override it with
  `render-debounce-ms="250"`; values are clamped between 0 and 1000ms.
- Hidden previews are marked dirty and rendered when they become visible rather
  than on every edit.
- Local live edits patch affected blocks where possible.
- Oversized live documents automatically render a virtual block window.
- Completion requests are abortable and stale results are discarded.

For application performance, debounce persistence and expensive host analysis,
cancel remote work, and avoid reading `getHTML()` on every keystroke unless it
is actually needed.

## Testing and release checks

Run source/build verification:

```sh
npm run check
```

Serve the project and open the browser harness:

```sh
npm run serve
```

```text
http://127.0.0.1:5173/tests/browser.html
```

The harness covers action fixtures, rendering, movement, terminal blocks,
selection, tables, tasks, clipboard conversion, forms, validation, completion,
focus, state changes, incremental rendering, and large-document virtualization.

Open the performance harness at:

```text
http://127.0.0.1:5173/perf/index.html
```

Before publishing an integration, also test:

- Supported desktop and mobile browsers.
- Keyboard-only operation through the complete surrounding form.
- Target screen readers and high-contrast settings.
- IME composition and mobile virtual keyboards.
- Paste from the actual office, browser, and editor products users rely on.
- Upload failures, latency, stale insertion points, and unsafe filenames/URLs.
- Server-side Markdown rendering and sanitization.

Build generated distribution files from the canonical source with:

```sh
npm run build
```

Do not edit files in `dist/` directly.
