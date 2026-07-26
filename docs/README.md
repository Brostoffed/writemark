# Writemark documentation

Writemark is a source-backed, live inline Markdown editor delivered as the
`<writemark-editor>` web component. Inline/live editing is the default and
primary surface; raw source and separate previews are explicit alternate
workflows. These guides progress from a first editor to custom application
integrations.

## Choose a level

| Level | Start here when you need to... | Guide |
|---|---|---|
| Basic | Put an editor on a page, set its initial Markdown, and read or submit the value. | [Getting started](getting-started.md) |
| Intermediate | Understand editing behavior, supported Markdown, shortcuts, tables, code blocks, selection, and paste. | [Features and editing](features.md) |
| Advanced | Connect host UI, define custom actions and completions, handle files, validate input, and prepare a production integration. | [Advanced integration](advanced.md) |
| Reference | Look up the exact public surface without working through a tutorial. | [API reference](api-reference.md) |

The main [README](../README.md) remains the compact project overview. The
[public live demo](https://brostoffed.github.io/writemark/demo/) exposes the
editor's modes, sizing, typography, and state controls; its
[source](../demo/index.html) can also be opened directly from a local checkout.
The [Playwright suite](../tests/README.md) verifies the component across its
public workflows and isolated browser behavior cases.

## Core concepts

### Markdown is canonical

`editor.value` is always raw Markdown. `live` mode renders structure inside the
editing surface, but formatting markers, code fences, table delimiters, and task
markers remain in the canonical source. Form submission, undo, selection
offsets, actions, clipboard handling, and events all operate on that source.

### Live rendering is still editing

`live` mode is not a separate preview. Headings, tasks, tables, code blocks, and
inline formatting are editable rendered views over source ranges. Use `source`
mode when direct access to every Markdown marker is preferable.

### Mobile uses source mode

Live mode is experimental and unsupported on mobile browsers. Production
integrations on iOS, iPadOS, Android, and other mobile or software-keyboard
environments should explicitly use `mode="source"`. Writemark does not infer or
change the mode from touch capability.

### The host owns application policy

Writemark has no built-in toolbar, uploader, storage client, or network calls.
The host application can use actions and events to add those workflows without
giving up canonical Markdown.

### Source offsets are stable API coordinates

`selectionStart`, `selectionEnd`, transaction changes, event ranges, and block
metadata use offsets into `editor.value`. Do not interpret them as DOM offsets
inside the shadow root.

## Suggested paths

For a plain HTML form, read [Getting started](getting-started.md), then the form
and accessibility sections in [Features and editing](features.md).

For a custom application editor, read all three levels, then keep the
[API reference](api-reference.md) nearby while implementing host controls.

For debugging editor behavior, add or isolate a focused Playwright case,
inspect the source-backed value and selection with a trace, then run the
verification commands in
[Advanced integration](advanced.md#testing-and-release-checks).

## Keyboard notation

`Mod` means Command on macOS and Ctrl on Windows and Linux. `Shift+Key` means
hold Shift while pressing the named key. Platform-native word and document
movement can vary by browser and operating system; the feature guide calls out
the source-backed behavior Writemark handles directly.
