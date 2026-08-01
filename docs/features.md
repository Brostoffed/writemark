# Features and editing

This guide describes how Writemark behaves while a person edits. Start with
[Getting started](getting-started.md) if the component is not yet running in the
host page. API details are collected separately in the
[API reference](api-reference.md).

## The source-backed editing model

Writemark keeps one canonical Markdown string. Every rendered live block maps
back to a range in that string:

- Headings and inline marks are decorated while their Markdown remains in
  `editor.value`.
- Task markers, table delimiter rows, code fences, and terminal block anchors
  can be hidden from the primary live surface without being discarded.
- Caret and selection APIs always report source offsets.
- Switching between live and source modes preserves the value and source-backed
  selection.
- Undo and redo operate on canonical transactions, including structural table
  and list edits.

This model is why a host should read `editor.value`, not text from the shadow
DOM.

## Mobile editing support

Live mode is experimental and unsupported on mobile browsers. Native selection,
selection handles, software-keyboard boundary edits, autocorrect, and IME
composition have not completed production validation on iOS, iPadOS, Android,
or other mobile environments.

Use `mode="source"` for production mobile editing. Source mode uses the native
textarea editing surface while preserving the same canonical Markdown value.
The host application owns this choice; Writemark does not automatically switch
modes from touch capability or user-agent detection.

## Markdown support

Writemark provides a practical CommonMark-inspired Markdown subset with
optional GFM-style features. The `commonmark` and `gfm` flavor names select
feature profiles; they do not claim complete conformance with either
specification. The default `markdown-flavor="gfm"` supports the editing and
rendering features below.

| Structure | Examples and notes |
|---|---|
| Paragraphs and soft wraps | Consecutive nonblank source lines render as a paragraph in preview output. |
| ATX headings | `#` through `######`, including optional space-delimited closing hashes. |
| Setext headings | Text followed by `===` or `---`. |
| Emphasis | Asterisk and underscore emphasis and strong emphasis, including nested combinations. |
| Strikethrough | `~~text~~` in GFM mode. |
| Inline code | Backtick code spans, including matching multi-backtick delimiters. |
| Links and images | Inline and reference-style destinations, optional titles, nested parentheses, angle-bracket destinations, balanced link labels, and same-document heading fragments. |
| Escapes | Backslash-escaped Markdown punctuation remains literal. |
| Blockquotes | Lines beginning with `>`, including nested blockquotes. |
| Lists | Unordered, ordered, nested, continued, and GFM task list items. |
| Fenced code | Backtick or tilde fences with optional language info. |
| Tables | GFM tables, escaped pipes, and column alignment delimiters. |
| Horizontal rules | Valid asterisk, hyphen, and underscore thematic breaks. |
| Hard breaks | Two trailing spaces or a trailing backslash followed by a newline. |

Representative supported source includes:

~~~~markdown
**a** ***b*** **c**

- Parent item
  continuation line
  - Nested child
    child continuation

> Parent quote
>
> > Nested quote

[Read the guide][guide]

Hard break with a backslash\
next line

[guide]: getting-started.md "Getting started"
~~~~

The two-space hard-break form behaves the same way; its first line ends with
two U+0020 space characters instead of a backslash. These examples are also
available in the
[public live demo](https://brostoffed.github.io/writemark/demo/), where changing
the Markdown flavor control re-renders the same canonical source.

Set `markdown-flavor="commonmark"` when GFM extensions should stay plain:

```html
<writemark-editor markdown-flavor="commonmark"></writemark-editor>
```

In CommonMark mode, GFM tables, task checkboxes, and strikethrough are not
rendered as those structures. Their source text is still preserved. Both modes
use Writemark's dependency-free subset parser.

Raw HTML is intentionally not executed. See
[Security and rendered output](advanced.md#security-and-rendered-output).

Headings receive predictable lowercase IDs derived from their text. A fragment
link such as `[Jump to details](#details)` scrolls to `## Details` inside the
same live editor or preview. Repeated heading names use `-1`, `-2`, and later
suffixes in document order.

## Slash commands and completions

Type `/` at the start of an otherwise empty line to open the built-in command
menu. Continue typing to filter by label, alias, or keyword.

The menu includes:

- Paragraph and heading levels 1 through 6.
- Bullet, numbered, and task lists.
- Blockquote, code block, horizontal rule, and table insertion.
- Bold, italic, inline code, strikethrough, link, and image insertion.
- Task completion toggling where applicable.

Completion keyboard behavior:

| Key | Behavior |
|---|---|
| ArrowDown / ArrowUp | Move to the next / previous enabled item, wrapping at the ends and scrolling the active option into view. |
| Home / End | Move to the first / last enabled item. |
| PageDown / PageUp | Move by several items. |
| Enter or Tab | Accept the active item. |
| Escape | Close the popup. |

Disabled completion items are skipped and exposed with disabled ARIA state.

The completion menu stays inside the visual viewport. It opens below the caret
when space permits and moves above the caret when the lower space is too small.
The menu updates after viewport size changes and page or editor scrolling.

Typing a fence and partial language, such as `` ```py ``, opens language
completion. Aliases such as `py`, `js`, `ts`, `yml`, and `md` rank their full
language names.

## Keyboard and caret movement

### General editing

| Key | Live-mode behavior |
|---|---|
| ArrowLeft / ArrowRight | Move through visible text and cross source-backed row and cell boundaries. |
| ArrowUp / ArrowDown | Preserve the logical text column while moving between rendered rows where possible. |
| Home / End | Move to the start / end of the current visible row or table cell. |
| Shift plus movement | Extend or shrink the source-backed selection from its original anchor. |
| Backspace at a line start | Join with the previous logical Markdown line. |
| Delete at a line end | Join with the next logical Markdown line. |
| Enter | Run structure-aware paragraph behavior. |
| Shift+Enter | Insert a Markdown hard break, except where a structure defines an exit action. |
| `Mod+Z` / `Mod+Shift+Z` | Undo / redo. |

Left and right collapse a nonempty multi-row selection to its start or end
before continuing. Up, down, home, end, and their Shift variants use rendered
rows while storing canonical source offsets.

Source mode uses the browser textarea for ordinary movement. Writemark still
handles its actions, undo history, completion menu, and canonical value updates.

### Markdown block shortcuts

At the beginning of a line, type a marker and then Space:

| Typed marker | Result |
|---|---|
| `#` through `######` | Heading level 1 through 6. |
| `-`, `*`, or `+` | Bullet list item. |
| `1.` | Ordered list item. |
| `>` | Blockquote. |
| `[]` or `[ ]` | Unchecked task list item. |

The action inserts or normalizes the source marker rather than applying an
opaque rich-text style.

### Lists and blockquotes

| Key | Behavior |
|---|---|
| Enter in a nonempty bullet item | Create the next bullet item. |
| Enter in a nonempty ordered item | Create the next item with an incremented number. |
| Enter after a completed task | Create a new unchecked task. |
| Enter in an empty list item | Remove the marker and exit the list. |
| Enter in a nonempty blockquote | Continue the quote marker. |
| Enter in an empty blockquote | Exit the quote. |
| Tab / Shift+Tab in a list | Indent / outdent using `indent-string`. |
| Backspace at the visible content start | Remove the structural marker before deleting text. |

Outside a structural context, Tab follows `tab-behavior`. The default
`accessibility-first` setting lets Tab move focus out of the component.
`editor-first` inserts the configured indentation string instead:

```html
<writemark-editor
  tab-behavior="editor-first"
  indent-string="4-spaces"
></writemark-editor>
```

Supported indentation settings are `tab`, `2-spaces`, and `4-spaces`.

### Task items

In live mode a task renders as one checkbox and editable task text. The hidden
`- [ ]` or `- [x]` marker remains in the Markdown value and is not duplicated as
visible text.

- Click or press Space on the checkbox to toggle the canonical marker.
- The checkbox has a task-specific accessible name based on its text.
- Home and Shift+Home stop at visible task text rather than selecting hidden
  marker characters.
- Left and right move between adjacent task text rows without trapping the
  caret in hidden markers.
- Task controls become noninteractive when the editor is readonly or disabled.

### Tables

Insert a table with `/table` or:

```js
editor.exec('block.table', { rows: 2, cols: 3 });
```

The action creates canonical Markdown including the delimiter row. `rows` is
clamped to 1 through 20 and `cols` to 2 through 12.

Live mode renders the table as an editable grid:

| Key | Behavior |
|---|---|
| ArrowLeft / ArrowRight at a cell boundary | Move to the adjacent cell. |
| ArrowUp / ArrowDown | Move to the same column in the previous / next rendered row. |
| Home / End | Move to the start / end of the current cell. |
| Tab | Select the next cell's content. |
| Shift+Tab | Select the previous cell; from the first cell, exit before the table. |
| Enter in a body cell | Insert a row below the current row and enter its first cell. |
| Tab from the final nonempty row | Add a row and enter it. |
| Tab from a terminal empty row | Exit after the table without adding source. |
| Escape or Shift+Enter | Exit after the table. |
| ArrowDown from the terminal row | Exit after the table without changing Markdown. |
| Backspace in an empty body row | Remove that row when the structural deletion applies. |

Pipes typed into a cell are escaped in canonical Markdown. Alignment markers in
the delimiter row are reflected in both live and preview rendering.

Host UI can call `table.insertRowAfter`, `table.insertColumnAfter`,
`table.deleteRow`, and `table.deleteColumn`. These operations target the table
position containing the current source selection.

### Code blocks

Type a backtick or tilde fence and press Enter to create a matching closing
fence and place the caret inside:

````md
```python

```
````

In live mode the opening and closing markers remain canonical but are hidden
from editable code content. The compact header displays the language. Code
lines disable spellcheck.

Change the language without rebuilding the block:

```js
editor.exec('code.setLanguage', { language: 'typescript' });
```

When a code block is the final document item, ArrowDown can move to a virtual
position below it without altering Markdown. Press Enter or type there to create
a real following line. This prevents the caret from becoming trapped at the end
of the document.

### Horizontal rules and setext headings

A standalone `---` is a horizontal rule, but Markdown gives the same characters
a different meaning directly under text:

```md
This is a level-two heading
---
```

To create a divider after a paragraph, separate it as its own block:

```md
Paragraph above.

---

Paragraph below.
```

Live mode shows a clean full-width divider and hides the marker text. Setext
underline markers are likewise represented by the heading rather than exposed
as a separate editable row.

At the end of the document, horizontal rules and setext headings expose a
source-backed position after the rendered block. ArrowDown can enter that
position without mutating Markdown; Enter or typing creates following source.
This gives terminal blocks the same predictable exit path as code blocks and
tables.

## Inline formatting and shortcuts

| Shortcut | Action |
|---|---|
| `Mod+B` | `inline.bold` |
| `Mod+I` | `inline.italic` |
| `Mod+E` | `inline.code` |
| `Mod+K` | `inline.link` |
| `Mod+Shift+X` | `inline.strikethrough` |
| `Mod+Alt+1` through `Mod+Alt+6` | Heading level 1 through 6. |

With a selection, inline actions wrap selected source. Without a selection,
they insert matching markers and place the caret between them.

```js
editor.exec('inline.link', { url: 'https://example.com' });
editor.exec('inline.image', {
  alt: 'Architecture diagram',
  src: '/images/architecture.png'
});
```

## Selection and deletion

All public selection values are offsets into the Markdown string:

```js
editor.setSelectionRange(0, 8, 'forward');
console.log(editor.getSelectionMarkdown());
```

In live mode, repeated `Mod+A` expands contextually:

1. Select the current source-backed cell or block.
2. Expand to a row, table, or heading section where applicable.
3. Select the complete Markdown document.

Backspace or Delete removes the canonical selected range, including hidden
table delimiters and fences contained by an expanded selection. A mouse drag can
also select across rendered lines, horizontal rules, tables, and other blocks.

## Clipboard and paste

Live copy and cut are generated from source, not serialized from
`contenteditable` DOM.

Copy writes:

- Canonical Markdown to `text/plain`, `text/markdown`, and `text/x-markdown`.
- Sanitized rendered output to `text/html`.
- Complete Markdown delimiters when the visible selection exactly covers a
  formatted label, such as `**bold**`, `` `code` ``, or `[site](url)`.

Paste behavior is ordered by the most useful source:

1. Explicit Markdown clipboard data is preserved.
2. Tab-separated rows become a Markdown table.
3. Rich HTML is converted to basic Markdown when plain text is not already
   Markdown-like.
4. Ordinary plain text is inserted as text.
5. A URL pasted over selected text wraps that text as a link.

Block-shaped paste is separated from surrounding inline text when needed.
`md-paste` reports the inserted Markdown and detected kind.

Pasted or dropped files emit `md-file-paste` or `md-file-drop`. Writemark does
not upload them. See [Host-controlled file handling](advanced.md#host-controlled-file-handling).

## Find and replace

Find and replace operate on canonical Markdown, not only visible text:

```js
const match = editor.find('draft', {
  caseSensitive: false,
  wrap: true,
  from: editor.selectionEnd
});

const replacedOne = editor.replace('draft', 'final');
const replacedAll = editor.replaceAll('TODO', 'Done', {
  caseSensitive: true
});
```

`find()` returns `{ start, end, text }` or `null` and selects the match.
`replace()` and `replaceAll()` return the number of replacements.

## Accessibility and state

- Supply `label`, `aria-label`, or `aria-labelledby` so the active surface has
  an accessible name.
- The label focuses the surface appropriate to live, source, or preview mode.
- `readonly` preserves focus and selection while preventing edits.
- `disabled` removes the component from editing and form submission.
- Completion uses listbox semantics, active-descendant state, and disabled item
  state.
- Actions announce structural changes through an internal live status region.
- Validation updates `aria-invalid` and exposes a visible error after validity
  is reported or the user edits.
- `dir` and `spellcheck` propagate to active editing surfaces. Code lines always
  disable spellcheck.
- The default `accessibility-first` Tab policy preserves normal page focus
  navigation except inside structures where Tab has an explicit table or list
  function.

The Linux Playwright gate runs desktop Chromium, Firefox, and WebKit and covers
keyboard, focus, labels, read-only and disabled state, selection mapping, and
completion ARIA state. Local runs execute every project supported on the host;
macOS 14 and older omit the unavailable WebKit project. These tests do not
certify mobile live mode. Production certification should still include manual
screen-reader, IME, high-contrast, and target-device testing.

## Next step

Continue to [Advanced integration](advanced.md) to connect application controls,
custom commands, completion sources, validation rules, file uploads, and
production checks.
