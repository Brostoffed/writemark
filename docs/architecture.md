# Source architecture

Writemark has one public entry and one canonical Markdown value per editor.
Internal modules do not create separate packages or public entry paths.

| Area | Responsibility |
|---|---|
| `src/writemark-editor.js` | Public exports and JSDoc signatures. |
| `src/types.js` | Public configuration, action, provider, and event type contracts. |
| `src/config.js` | Defaults and supported configuration names. |
| `src/security.js` | HTML escaping and URL policy. |
| `src/core/` | Text offsets, document state, transactions, and history. |
| `src/markdown/` | Block, inline, table, reference, and tag syntax. |
| `src/render/` | HTML output, live DOM updates, render caches, and viewport state. |
| `src/browser/` | Input, composition, DOM selection, source mapping, clipboard conversion, and completion requests. |
| `src/actions/` | Source edits and built-in action registration. |
| `src/component/` | Public element API, lifecycle, forms, events, registration, template, and styles. |

## State

`DocumentState` owns the Markdown value, reset value, source selection, and dirty flag.
`UndoHistory` owns history records and returns snapshots for the component to apply.
Parser results, tags, DOM nodes, and viewport measurements are derived data.
They do not become another document value.

The component retains the existing change and event order.
Transactions pass through its cancelable `md-before-change` event before the value changes.
The component then updates history, derived data, forms, validity, and host events.
Native input and composition keep their existing reconciliation paths.

## Offsets and transactions

Source positions use UTF-16 code units, which are JavaScript string offsets.
Grapheme movement chooses cursor boundaries within that coordinate system.
Transaction ranges refer to the same document before the change.
Host actions must supply nonoverlapping ranges.
The transaction helper applies edits from the highest source position to the lowest.
The helper keeps the existing range-clamping behavior.
The resulting selection refers to the document after the change.

DOM selection and source selection can have different positions.
`SelectionController` owns source mapping, browser selection, fallback selection, pointer state, and selection restoration.
It preserves the existing boundary choices for hidden markers, table cells, and virtual content.

## Controllers

Each editor creates its own input, selection, rendering, and completion controllers.
Each controller owns the state for its responsibility.
Controllers receive explicit callbacks and accessors.
They do not receive the element as an unrestricted controller argument.
The callback objects remain frozen after construction.

`InputController` keeps beforeinput, input, and composition logic together.
`LiveRenderer` owns parser caches, incremental DOM updates, preview timers, and viewport state.
`CompletionController` owns providers, request cancellation, stale-result checks, and completion state.
The component supplies transaction, event, and presentation callbacks.

The element retains delegating methods for existing internal test hooks.
These methods route calls to the controller that owns the operation.
They do not define another implementation.

Actions calculate source edits from their context.
The action registration module receives callbacks for history, selection, view changes, and completion commands.
The component applies each action result through its existing change path.

Pure text, parser, history, and action modules load without `HTMLElement`, `window`, or `document`.
Clipboard HTML conversion stays in the browser area because it uses DOM parsing.

## Distribution

The build combines the internal modules and embeds the stylesheet.
No internal module path becomes a required browser download.
The registration module reuses existing registered constructors when another entry loads.
See [Distribution](distribution.md) for build checks, declarations, and automatic commits.
