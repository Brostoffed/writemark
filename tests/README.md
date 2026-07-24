# Browser tests

Playwright is the repository's only browser test runner. It owns discovery,
browser lifecycle, fixture isolation, assertions, retries, reporting, traces,
screenshots, and video. There is no page-hosted runner, wrapper spec, shared
serial iterator, or browser-side pass/fail protocol.

The current suite registers 261 independent cases per browser project,
including every one of the 230 checks migrated from the previous suite.

## Run the suite

```sh
npm test
```

This verifies generated files and documentation, starts the repository server,
and runs every direct Playwright spec in every project supported on the current
host. The Linux CI gate always runs Chromium, Firefox, and WebKit. Local macOS
14 and older runs omit only WebKit because Playwright no longer provides a
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
- `tables.spec.js` verifies source-backed cell editing, navigation, structural
  actions, escaping, alignment, generated rows, and undo.
- `demo.spec.js` verifies the published demo controls, output, and form loop.
- `fixtures/editor.html` is the minimal integration page used by the direct
  component specs.
- `support/editor-fixture.js` provides setup, source selection, event capture,
  and automatic page/console error checks.

Every test receives a fresh fixture page. Do not share a browser page, editor
instance, mutable iterator, or pass/fail result protocol across tests. Keep
runner-side expectations in the behavior-owning spec; use data-driven cases
only when the setup and assertion shape are genuinely repetitive.
