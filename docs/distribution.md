# Distribution

The primary download is `writemark-editor.global.min.js`.
Copy this file beside your HTML page.
The browser needs no other editor file.
The file includes the editor, parser, actions, styles, and element registration.

```html
<writemark-editor name="body" label="Body"></writemark-editor>
<script src="./writemark-editor.global.min.js"></script>
```

The standalone file works through `file://` and HTTP in the supported browsers.
Content can request its own resources, such as remote images.
The editor itself requires no network access.
The existing browser support limits still apply.
See [Known issues](known-issues.md).

## Files

| File | Purpose |
|---|---|
| `writemark-editor.global.min.js` | Standalone production file. |
| `writemark-editor.global.js` | Standalone readable file for diagnosis. |
| `writemark-editor.js` | Bundled ES module with the public exports. |
| `md-live-editor.js` | Legacy ES module alias. It imports the main module. |
| `*.d.ts` | Optional TypeScript declaration files. The browser does not load them. |
| `types.d.ts` | Shared public type definitions. |
| `manifest.json` | Source hashes, output hashes, output sizes, version, and build tool versions. |

## Source and build

Edit files in `src/`.
The build generates every file in `dist/`.
The repository commits these files so a repository download also contains usable output.

```sh
npm ci
npm run build
npm run check
```

Use the Node version in `.node-version`.
The lockfile pins the build tools.
The build excludes timestamps and machine paths from its output.

The build bundles only source files from `src/`.
It rejects unresolved imports, extra output files, and external stylesheet resources.
It embeds the stylesheet as text.
It preserves the MIT license in each main JavaScript output.
The build preserves names and does not change property names.
Its `es2022` target controls syntax.
Browser tests establish behavior in each supported browser.

```sh
npm run check:build
```

This command rebuilds in memory and compares every generated file byte for byte.
It rejects missing, stale, and unexpected files without changing them.
It also checks declarations and the manifest.
The package check uses this command before publication.
Publication does not silently replace the tested files with a new build.

## Automatic commits

For a pull request from this repository, contributors can commit only source changes.
The `Generate distribution` workflow builds those changes with read access.
It uploads the generated files as an artifact.

The `Commit distribution` workflow uses code from the default branch.
It treats the artifact as data.
It checks the file list, file types, sizes, and hashes.
It commits only files under `dist/` to the current pull request branch.
It rejects a source change during its run.
It never forces a branch update or writes to the pull request base branch.

The commit job uses the built-in GitHub token.
It explicitly dispatches the `Test` workflow after its commit.
That workflow checks the final commit with read access.
This dispatch avoids reliance on workflow events from token-authored pushes.
The process requires no App credentials or personal token secret.

If the files already match, the commit job makes no commit.
This prevents repeated generation commits.

Fork pull requests receive build and verification checks.
The commit job does not write to a fork.
For automatic commits, copy the contribution to a maintainer-owned branch.

These workflows need to exist on the default branch before automatic commits can start.
The first change must include locally generated `dist/` files.
The build check still verifies those files before that change merges.

## Required GitHub settings

Require pull requests for `main`.
Require the `test`, `webkit-macos`, and both `distribution-loading` checks.
Require the pull request branch to include the latest `main` changes.
Apply these rules to administrators too.
Disable force pushes and branch deletion.
Select GitHub Actions as the required check source.

A local commit can contain a manual distribution edit.
The required build check rejects that edit if its bytes differ from the build output.
The rule verifies file contents instead of the commit author name.

## TypeScript

The build generates public declarations from the JSDoc contract in `src/`.
The source remains JavaScript.
The package export map supplies declarations for each public entry path.
The declaration files cover custom element lookup, configuration, actions, completion providers, and event details.

```ts
import { WritemarkEditorElement, type CompletionProvider } from 'writemark-editor';

const editor = document.createElement('writemark-editor');
editor.mode = 'source';
editor.addEventListener('md-input', event => {
  console.log(event.detail.value);
});
```

For a classic script integration, import its declarations in your TypeScript project:

```ts
import type {} from 'writemark-editor/writemark-editor.global.min.js';

const editor = new WritemarkEditor.WritemarkEditorElement();
```

The package tests compile valid and invalid examples with NodeNext and Bundler module resolution.
They test the packed package, including the legacy entry and both global entries.
Browser tests also compare declaration property names with the runtime editor.

## Verification

The normal browser suite uses the minified standalone file.
Additional checks cover the readable file and ES module.
Copied-file tests use an empty temporary directory with only the JavaScript file and a test HTML page.
They disable network access and check editing, formatting, history, modes, forms, multiple instances, and repeated script loads.

The release workflow publishes the tested package.
It also attaches the tested minified file and manifest to the release.
The demo uses the same committed minified file.
