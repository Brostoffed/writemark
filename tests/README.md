# Browser tests

Playwright is the repository's only browser test runner. It owns discovery,
browser lifecycle, fixture isolation, assertions, retries, reporting, traces,
screenshots, and video. There is no page-hosted runner, wrapper spec, shared
serial iterator, or browser-side pass/fail protocol.

The current desktop suite registers 411 independent cases per browser project,
including every one of the 230 checks migrated from the previous suite and a
dedicated input/composition contract plus security coverage for hostile inputs,
generated invariants, and CommonMark differential behavior.

Before the browser projects, `npm test` also runs the Node-based
`version-policy.test.mjs` checks. They prevent a release from retaining notes
under `Unreleased` or drifting across package metadata, the lockfile,
changelog, API reference, and demo.

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

The normal run checks 200 generated cases for each property. Increase the
budget without changing the suite:

```sh
WRITEMARK_FUZZ_RUNS=5000 npm run test:fuzz
```

Failures report a seed and shrink path. Replay the exact counterexample with
the reported values:

```sh
WRITEMARK_FUZZ_SEED=6212113 WRITEMARK_FUZZ_PATH="2:1:0" npm run test:fuzz
```

The scheduled `Markdown fuzz` GitHub Actions workflow runs 5,000 cases per
property with a rotating seed. Its seed is printed in the workflow log so every
failure remains reproducible.

Failed runs retain an HTML report, trace, screenshot, and video under
`output/playwright/`. Open the HTML report with:

```sh
npx playwright show-report output/playwright/report
```

## Suite structure

- `actions.spec.js` verifies the reusable action fixtures as isolated,
  data-driven Playwright tests.
- `clipboard.spec.js` verifies Markdown-aware paste and copy behavior.
- `component.spec.js` verifies registration, rendering, modes, public APIs,
  sanitization, and instance isolation.
- `state-and-forms.spec.js` verifies focus, accessible naming, readonly and
  disabled state, value defaults, constraints, validity, and form association.
- `editing.spec.js` drives live and source editing through real keyboard and
  selection input.
- `input-contract.spec.js` verifies browser `beforeinput`/`input` reconciliation,
  target ranges, replacement and deletion variants, grapheme-safe fallback
  editing, iOS-style Backspace and cross-block target ranges,
  software-keyboard paragraph events, debug diagnostics, cancellation and no-op
  behavior, history/event integrity, readonly and disabled rollback, and
  synthetic IME lifecycle, state-transition, completion, and action-gating
  contracts.
- `completion.spec.js` verifies slash, code-language, and host-provided
  completion flows and ARIA state.
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
- `demo.spec.js` verifies the published demo controls, output, and form loop.
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
