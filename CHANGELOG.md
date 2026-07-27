# Changelog

## Unreleased

## 1.5.1 - 2026-07-27

- Fixed repeated typing in desktop Safari by applying trusted text insertion to
  canonical source transactions, preventing stale native carets from reversing
  characters or inserting into the wrong rendered row, table cell, or fence.
- Fixed macOS Command+Arrow line-boundary handling when Safari contracts run on
  a non-macOS CI host.
- Preserved canonical IME caret offsets across decorated inline Markdown and
  escaped table-cell content.
- Hardened the Playwright mobile-WebKit contract for opaque native selection
  endpoints while keeping desktop Safari and iOS behavior independently tested.

## 1.5.0 - 2026-07-27

- Added opt-in, event-first device diagnostics through the `debug` property and
  attribute, the composed `md-debug` event, and the optional `debug-log` console
  mirror. The demo can buffer, copy, and clear a versioned diagnostic package,
  including from an iOS Safari page served over the local network.
- Added LAN development commands that bind to `0.0.0.0` and print the computer's
  reachable IP address and requested demo path for testing from phones and other
  devices on the same network.
- Reworked experimental live mode around one document editing host so native
  Select All and drag selection can span empty lines, rendered blocks, tables,
  and code instead of stopping at the current editable fragment.
- Hardened iOS and software-keyboard editing across Backspace, selection and
  caret preservation, canonical Markdown clipboard handling, formatting, and
  structural input transitions.
- Fixed live Markdown transitions for headings, lists, tasks, blockquotes,
  Setext headings, GFM tables, thematic breaks after smart-dash replacement,
  and fenced code blocks entered through real browser input events.
- Fixed code-language completion so accepting a language creates a closing
  fence on a new line without swallowing the Markdown that follows it.
- Fixed desktop Safari caret and keyboard navigation by reading composed shadow
  selections when available and deferring to native `beforeinput` target ranges
  when Safari does not expose a readable selection.
- Expanded the Playwright input, composition, selection, clipboard, structural
  editing, and physical-key coverage to 465 independently reported cases per
  desktop browser project.

## 1.4.1 - 2026-07-26

- Classified live mode as experimental and unsupported on mobile browsers
  pending native-selection, software-keyboard, autocorrect, and IME validation.
- Recommended `mode="source"` for production use on iOS, iPadOS, Android, and
  other mobile or software-keyboard environments.
- Added the canonical source banner to the release-version policy check so
  generated package banners cannot silently retain an older version.

## 1.4.0 - 2026-07-25

- Fixed nested emphasis in both live decoration and preview/export rendering,
  including adjacent and triple delimiter runs.
- Added nested lists, list continuation lines, nested blockquotes,
  reference-style links, and both CommonMark hard-break forms to preview and
  exported HTML.
- Rendered nested blockquote depth with matching rails and indentation in the
  live editing surface.
- Changed Return at the end of a heading to create the immediately following
  line instead of skipping an extra blank line.
- Expanded fixed CommonMark differential and cross-surface browser coverage for
  the corrected structures.
- Clarified that `commonmark` and `gfm` select dependency-free subset feature
  profiles rather than claiming complete specification conformance.

## 1.3.1 - 2026-07-24

- Expanded the suite to 317 directly reported cases per browser project,
  organized across 13 behavior-owned spec files.
- Added a reviewed hostile-Markdown corpus, seeded and shrinkable sanitizer and
  parser property tests, and semantic differential tests against a pinned
  CommonMark reference renderer.
- Added a weekly rotating-seed fuzz workflow that runs 5,000 generated cases per
  property while retaining the seed and shrink path needed for exact replay.
- Fixed CommonMark loose-list rendering so same-type list items separated by one
  blank line remain one list and wrap item contents in paragraphs.

## 1.3.0 - 2026-07-24

- Replaced the wrapper-only browser check with independent Playwright specs for
  the component contract, live/source editing, completion UI, tables, forms,
  multiple instances, safe rendering, and the published demo. Migrated all 230
  original browser checks into individually reported Playwright cases and
  removed the in-page `tests/browser.html` harness.
- Reorganized the migrated coverage into isolated behavior-owned specs; removed
  the shared serial regression iterator, source-name parsing, and browser-side
  pass/fail protocol.
- Expanded the final suite to 261 directly reported cases per browser project,
  organized across 12 behavior-owned spec files.
- Removed the obsolete browser-harness-only `runFixture()` method and
  caret-notation parser exports from the shipped component API.
- Added Chromium, Firefox, and WebKit projects, retained failure traces,
  screenshots, videos, and HTML reports, and added a cross-browser GitHub
  Actions test gate before release publishing.
- Fixed selected table-cell replacement so typed pipe characters remain escaped
  in canonical Markdown instead of splitting the rendered row.
- Fixed task-checkbox pointer changes so they emit the same `md-action` event as
  other action paths.
- Fixed code-language completion so it opens during real fence typing and stays
  closed after an exact language is accepted, allowing Enter to create the
  fenced block.
- Fixed code-language completion so a closing fence cannot reopen the language
  menu and consume Enter after the caret exits a completed code block.
- Fixed keyboard navigation in scrollable completion popovers so the active
  option remains visible, including when Up or Down wraps between the first and
  last item.
- Fixed Space on focused task checkboxes in Firefox so it toggles the task and
  preserves checkbox focus instead of inserting text into the live editor.
- Added a WebKit-safe shadow-DOM editing fallback for focus, selection,
  keyboard navigation, live typing, empty-editor recovery, terminal block
  anchors, and table-cell serialization.
- Made completion acceptance rematch the current query before applying an item,
  preventing a stale asynchronous popup update from leaving query text behind.
- Anchored native validity reporting to the visible editing surface and kept
  browser tests free of expected network-error noise.
- Reworked all current documentation, demo copy, test guidance, and release
  guidance around the inline/live-first product model and the direct Playwright
  architecture; added drift checks for versions, public exports, retired test
  terminology, and undocumented spec files.

## 1.2.2

- Removed the built-in global formatting toolbar and mobile toolbar from the component UI.
- Removed embedded code-block Copy/Language buttons and table row/column buttons from live-rendered blocks.
- Kept all formatting, table, code, history, mode, and editing capabilities available through slash commands, Markdown shortcuts, keyboard shortcuts, and `editor.exec(...)`.
- Reduced per-instance DOM, event listeners, CSS, and UI surface area for cleaner multi-instance pages.
- Organized the repository into `src/`, `dist/`, `demo/`, `tests/`, `perf/`, and `scripts/`.
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
