# Browser tests

Playwright is the repository's only browser test runner. It owns discovery,
browser lifecycle, fixture isolation, assertions, retries, reporting, traces,
screenshots, and video. There is no page-hosted runner, wrapper spec, shared
serial iterator, or browser-side pass/fail protocol.

The Chromium and Firefox projects each register independent cases.
The suite includes the 230 checks from the previous suite, input and composition
contracts, and tag completion coverage. Security checks cover hostile inputs,
generated invariants, and CommonMark differences. WebKit also includes tests
that require desktop Safari behavior.

The named regressions across editing, parser, clipboard, actions, rendering,
input, and performance specs cover the 15 [issues from 1.7.0](../docs/known-issues.md).

Before the browser projects, `npm test` checks strict TypeScript and the source type policy.
The source check first verifies the exact Node.js version in `.node-version`.
It also runs the Node-based
`version-policy.test.mjs` checks. They prevent a release from retaining notes
under `Unreleased` or drifting across package metadata, the lockfile,
changelog, API reference, and demo.

`release-change.test.mjs` checks the comparison with the last reachable release tag.
It covers committed, staged, unstaged, and untracked editor changes.
It rejects a fix that keeps the old version, even when all version files still match.
It also checks package contracts, missing history, and reuse of an unpublished release candidate.

## Run the suite

```sh
npm test
```

This verifies generated files and documentation, starts the repository server,
and runs every direct Playwright spec in every project supported on the current
host. The Linux CI gate always runs Chromium, Firefox, and WebKit, plus
`input-contract.spec.js` in an iPhone 13 Mobile Safari context. Local macOS 14
and older runs omit the WebKit projects because Playwright no longer provides a
current build for those hosts.

List the discovered cases without running them:

```sh
npx playwright test --project=chromium --list
```

Use a single browser while iterating:

```sh
npm run test:browser:chromium
```

Use headed Chromium when visual or focus behavior needs inspection:

```sh
npm run test:browser:headed
```

Run the dedicated security suite in Chromium:

```sh
npm run test:fuzz
```

Run more generated Shift+Enter cases in both local browsers:

```sh
SHIFT_ENTER_FUZZ_RUNS=200 npx playwright test tests/shift-enter.spec.js --grep generated --project=chromium --project=firefox --workers=2
```

Set `SHIFT_ENTER_FUZZ_SEED` and `SHIFT_ENTER_FUZZ_PATH` to replay a failed case.

The normal run checks 200 generated cases for each property. Increase the
budget without changing the suite:

```sh
WRITEMARK_FUZZ_RUNS=5000 npm run test:fuzz
```

The clipboard corpus also accepts `WRITEMARK_FUZZ_RUNS` for its hostile HTML property.
Run its deep budget with the Markdown properties:

```sh
WRITEMARK_FUZZ_RUNS=5000 npx playwright test tests/security.spec.js tests/clipboard-corpus.spec.js --project=chromium
WRITEMARK_TRANSACTION_FUZZ_RUNS=5000 npm run test:unit
```

Failures report a seed and shrink path. Replay the exact counterexample with
the reported values:

```sh
WRITEMARK_FUZZ_SEED=6212113 WRITEMARK_FUZZ_PATH="2:1:0" npm run test:fuzz
```

The weekly `Markdown fuzz` workflow uses a rotating seed and records it in the log.
It runs 5,000 cases per Markdown and hostile clipboard property by default.
It also runs 5,000 cursor operations, 500 history cases per mode, and 200 Shift+Enter cases per property.
The workflow runs the native input and navigation tests in Chromium.

Cursor chaos checks use an independent endpoint model and print a replay seed on failure.
The standard run checks 240 operations per browser.
Use the deeper budget with the pinned runtime:

```sh
WRITEMARK_PRESENCE_STEPS=10000 WRITEMARK_PRESENCE_SEED=119298569 npx playwright test tests/presence-chaos.spec.js --grep='seeded presence operations'
WRITEMARK_INVERSE_RUNS=500 WRITEMARK_INVERSE_SEED=27898999 npx playwright test tests/presence-history.spec.js --grep='generated inverse batches'
WRITEMARK_TRANSACTION_FUZZ_RUNS=10000 node --test tests/unit/transactions.test.mjs
```

The cursor workload records update cost and frame intervals separately.
The short workload uses 64 selections of four characters in an 800-line document.
The long workload uses 64 overlapping selections across 1,000 paragraphs or one wrapped paragraph.
The long workload also limits the number of geometry reads and rectangles.
The lifecycle check repeats 40 connection and removal cycles.
`npm test` runs timing checks with one worker after the other browser tests finish.
Use the timing tag to run those checks on their own.

```sh
npm run test:browser -- --grep @cursor-timing --workers=1
```

These browser checks do not establish physical-device performance or shared document convergence.

Failed runs retain an HTML report, trace, screenshot, and video under
`output/playwright/`. Open the HTML report with:

```sh
npx playwright show-report output/playwright/report/browser
npx playwright show-report output/playwright/report/timing
```

## Main demo flows

`demo.spec.js` covers the examples in the [main demo](../demo/index.html).
The 1.9.0 examples expose these public workflows:

- Enhance a native textarea and check its form value and reset behavior.
- Apply a checked external edit and report a stale request without changing the document.
- Open cursor samples through the main demo link.

`cursor-demo.spec.js` checks the dedicated [cursor demo](../demo/cursors/index.html).
It covers manual placement, names, colors, source positions, stale updates, and the keyboard name control.
The demo has no shared room or transport.
These tests do not prove shared document convergence or fresh clipboard capture from external applications.
See the [known issues](../docs/known-issues.md) for evidence limits.

## Suite structure

- `distribution.spec.js` verifies copied-file offline use, entry parity, repeated loads, and public declaration property names.
- `build.test.mjs` verifies repeatable output and rejects stale files, stale source, declarations, and stylesheet resources.
- `unit/runtime.test.mjs` rejects a Node.js runtime that differs from the pinned version.
- `unit/` tests pure modules and the generated-commit job without a browser or GitHub writes.
- `types/` contains package consumer examples for valid and invalid TypeScript use.

The normal fixture loads `writemark-editor.global.min.js`.
Set `WRITEMARK_TEST_BUILD=module` or `WRITEMARK_TEST_BUILD=readable` to test another output.
The CI loading checks test both outputs.

- `actions.spec.js` verifies the reusable action fixtures as isolated,
  data-driven Playwright tests.
- `clipboard.spec.js` verifies Markdown-aware paste and copy behavior.
- `clipboard-corpus.spec.js` checks upstream inputs, native Calc payloads, paste in both modes, history, MIME priority, and hostile HTML.
- `textarea-enhancement.spec.js` checks native forms, fallback recovery, defaults, focus, selection, and enhancement lifecycle.
- `transactions.spec.js` checks external edit validation, revisions, edit origins, cancellation, reentrancy, history, and native input.
- `enhancement-transactions.spec.js` checks generated external edits, native form callbacks, and history through enhanced textareas.
- `presence.spec.js` checks cursor display, motion, reduced motion, validation, history mapping, cleanup, and focus.
- `presence-geometry.spec.js` checks cursor geometry against native text hit tests, wrapping, RTL, scroll, and mounted content.
- `presence-history.spec.js` checks deleted anchors, exact transaction ranges, later peer moves, and native undo coalescing.
- `input-native-mapping.spec.js` checks repeated-text native edits, UTF-16 replacement, and verified cumulative composition ranges.
- `presence-chaos.spec.js` checks seeded cursor sequences, 64-cursor workloads, and repeated cursor lifecycle operations.
- `cursor-demo.spec.js` checks the real cursor controls, keyboard selection, editing, mode changes, and narrow layouts.
- `component.spec.js` verifies registration, rendering, modes, public APIs,
  sanitization, and instance isolation.
- `state-and-forms.spec.js` verifies focus, accessible naming, readonly and
  disabled state, value defaults, constraints, validity, and form association.
- `editing.spec.js` drives live and source editing through real keyboard and
  selection input.
- `shift-enter.spec.js` checks default and smart Shift+Enter behavior across
  modes, lists, quotes, tables, code fences, disabled states, undo, and live
  input events. It also compares generated smart Shift+Enter cases with Enter.
- `input-contract.spec.js` verifies browser `beforeinput`/`input` reconciliation,
  target ranges, replacement and deletion variants, grapheme-safe fallback
  editing, iOS-style Backspace and cross-block target ranges,
  software-keyboard paragraph events, debug diagnostics, cancellation and no-op
  behavior, history/event integrity, readonly and disabled rollback, and
  synthetic IME lifecycle, state-transition, completion, and action-gating
  contracts.
- `completion.spec.js` verifies slash, code-language, and host-provided
  completion flows and ARIA state.
- `tags.spec.js` verifies tag parsing, rendering, events, completion, and activation.
- `tags-toggle.spec.js` verifies the default, runtime switch, request cancellation,
  source preservation, composition, and renderer options.
- `tags-integration.spec.js` verifies modes, element names, forms, state, providers,
  completion failures, undo, isolation, and activation.
- `tags-fuzz.spec.js` verifies generated syntax, parser ranges, renderer safety,
  completion filtering, deduplication, and result bounds.
- `markdown.spec.js` verifies parser behavior, code fences, headings, links,
  tables, and task source preservation.
- `navigation.spec.js` verifies keyboard and pointer selection, line movement,
  tables, tasks, and terminal rendered blocks.
- `performance.spec.js` verifies debounce, deferred preview rendering,
  incremental rendering, and large-document virtualization.
- `rendering.spec.js` verifies live/preview DOM structure, modes, empty state,
  styling hooks, and Markdown rendering semantics.
- `security.spec.js` verifies a named hostile-input corpus, sanitizer and parser
  invariants over generated Markdown, and semantic agreement with a pinned
  CommonMark reference renderer over the supported unambiguous subset.
- `tables.spec.js` verifies source-backed cell editing, navigation, structural
  actions, escaping, alignment, generated rows, and undo.
- `demo.spec.js` checks the main demo controls, output, forms, and 1.9.0 API examples.
- `version-policy.test.mjs` verifies that release metadata stays synchronized
  and that completed notes do not remain under `Unreleased`.
- `fixtures/markdown-security-corpus.js` owns reviewed hostile inputs, safe
  protocol controls, and fixed CommonMark differential cases.
- `fixtures/editor.html` is the minimal integration page used by the direct
  component specs.
- `support/editor-fixture.js` provides setup, source selection, event capture,
  and automatic page/console error checks.

Every test receives a fresh fixture page. Do not share a browser page, editor
instance, mutable iterator, or pass/fail result protocol across tests. Keep
runner-side expectations in the behavior-owning spec; use data-driven cases
only when the setup and assertion shape are genuinely repetitive.

Keep security cases in `security.spec.js` or its corpus fixture rather than
mixing them into feature examples. A parser or sanitizer regression should be
captured as a named corpus case when it is security-sensitive, as a fixed
differential case when CommonMark semantics are involved, and as a property
when the invariant applies to broad classes of input.
