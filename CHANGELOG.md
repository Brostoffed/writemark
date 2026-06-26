# Changelog

## 1.2.2

- Removed the built-in global formatting toolbar and mobile toolbar from the component UI.
- Removed embedded code-block Copy/Language buttons and table row/column buttons from live-rendered blocks.
- Kept all formatting, table, code, history, mode, and editing capabilities available through slash commands, Markdown shortcuts, keyboard shortcuts, and `editor.exec(...)`.
- Reduced per-instance DOM, event listeners, CSS, and UI surface area for cleaner multi-instance pages.
- Updated tests, README, demo, generated browser build, and package version.

## 1.2.1

- Reworked live-mode paste so plain Markdown, multiline Markdown, copied Markdown MIME data, pasted HTML, and tab-separated spreadsheet data are all inserted through the canonical Markdown transaction path instead of relying on browser contenteditable paste.
- Live-mode copy/cut now expands exact inline selections to include Markdown formatting delimiters, so selecting the visible bold/link/code text copies valid Markdown such as `**bold**`, `[label](url)`, or `` `code` ``.
- Added `text/x-markdown` clipboard output alongside `text/markdown`, `text/plain`, and rendered `text/html`.
- Added `md-copy`, `md-cut`, and `md-paste` events for clipboard observability.
- Added contextual paste separation so block Markdown pasted into the middle of a non-empty line does not merge into surrounding text.
- Added subtle transition variables and smoother focus/completion state transitions while preserving reduced-motion behavior.

## 1.2.0

- Added common editor refinement pass.
- Added Markdown shortcut transforms on Space for headings, bullets, ordered lists, blockquotes, and task brackets.
- Added Delete-at-end-of-line behavior to join with the next logical Markdown line.
- Added active toolbar state for headings, lists, blockquotes, code blocks, tables, and inline marks.
- Added Undo and Redo toolbar buttons.
- Added cancelable `md-before-change` event before source mutations.
- Added public helpers: `getMarkdown()`, `setMarkdown()`, `getPlainText()`, `getSelectionMarkdown()`, `insertMarkdown()`, `canExec()`, `getCurrentBlock()`, `getSelectedBlocks()`, `getActiveMarks()`, `find()`, `replace()`, and `replaceAll()`.
- Added code-block Copy and Language controls.
- Added lightweight table controls for inserting/deleting rows and columns.
- Added table actions: `table.insertRowAfter`, `table.insertColumnAfter`, `table.deleteRow`, and `table.deleteColumn`.
- Added `code.setLanguage` action.
- Added Markdown-backed HTML clipboard copy for live selections.
- Added tab-separated paste to Markdown table conversion.
- Added basic HTML-to-Markdown paste conversion when plain text is unavailable.
- Expanded browser tests for keyboard semantics, Markdown shortcuts, toolbar state, find/replace, code actions, and table controls.

## 1.1.6

- Fixed Backspace at the start of a live editable line so it joins with the previous logical Markdown line and places the caret at the join point.
- Added action and browser tests for line-start Backspace join behavior.

## 1.1.5

- Refined live code fence rendering. Opening and closing backtick fence markers no longer appear inside the rendered editable code block.
- A bare unfinished fence line such as ` ``` ` remains a normal editable line until Enter turns it into a complete fenced block.
- Code blocks now render with a small non-editable header showing the language or `code`.
- Source mode still preserves and exposes the canonical backtick fences.

## 1.1.4

- Fixed live horizontal rule rendering so `---` renders as a clean divider without leaking raw marker text such as `--` beside the rule.
- Preserved raw horizontal-rule Markdown in source mode and in the canonical submitted value.
- Updated standalone build and tests.


## 1.1.3

- Removed the blue active-line/table-cell inset outline by default in live mode.
- Added first-class CSS custom properties for active block styling: `--md-editor-active-line-ring`, `--md-editor-active-line-bg`, `--md-editor-active-cell-ring`, and `--md-editor-active-cell-bg`.
- Updated demo, standalone file, README, and tests to document the active focus styling controls.

## 1.1.2

- Fixed live-mode expanded selections so Delete and Backspace remove the selected canonical Markdown range.
- Added `editor.deleteSelection`; `editor.smartDelete` and `editor.smartBackspace` now delete non-collapsed selections.
- Preserved programmatic/full-document selections across rendered-DOM selection round trips, including tables with hidden delimiter/source characters.
- Added live-mode copy/cut handling so copied expanded selections use Markdown source text.
- Expanded browser tests for select-all/delete behavior.

## 1.1.1

- Fixed live table cell navigation so Tab no longer clamps at the final cell.
- Added table escape behavior: Shift+Enter or Escape exits to a blank line after the table; Shift+Tab from the first cell exits before the table.
- Changed Enter inside a live table cell to insert a row below the current row instead of corrupting the current Markdown row at the caret.
- Added progressive live-mode Cmd/Ctrl+A selection expansion: cell/block, row/table/section, then full document.
- Improved source-offset-to-DOM mapping around table boundaries and hidden delimiter/source characters.

## 1.1.0

- Replaced the textarea-primary experience with a live inline markdown editing surface.
- Added `mode="live" | "source" | "split" | "preview"`; live mode is the default.
- Headings, inline bold/italic/code/strike, blockquotes, lists, task checkboxes, code fences, and tables now render inside the editor itself.
- Kept markdown source as the canonical `value` and form submission value.
- Added source mode fallback and split mode.
- Fixed triple-backtick language Enter behavior: typing ` ```python ` then Enter creates a closed fenced code block with the cursor inside.
- Improved code-language completion ranking and aliases such as `py` -> `python`.
- Renamed toolbar actions to distinguish Inline Code from Code Block.
- Added H1, H2, and H3 toolbar buttons.
- Improved table skeleton: header, delimiter row, and body cells are generated; live mode renders a table grid while preserving delimiter source.
- Anchored completion popups near the caret or active editable block.
- Expanded browser test harness for live rendering and code fence behavior.

## 1.0.1

- Added standalone file-open-safe demo and dependency-free local server.
- Documented localhost requirement for ES module demos.

## 1.0.0

- Initial dependency-free markdown editor web component with source textarea, separate preview, slash commands, smart editing actions, form integration, and browser tests.
