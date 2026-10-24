---
name: writemark-change-completion
description: Complete Writemark editor fixes, features, build changes, and release preparation. Check changelog entries, versions, bundles, tests, and release status before reporting completion. Skip read-only reviews and text-only edits.
---

# Complete a Writemark change

Use this skill before editor changes and before the final response.
Use the repository root for commands.
Read [RELEASING.md](../../../RELEASING.md) for the release process.

## Inspect the change

1. Read the user request and applicable repository instructions.
2. Inspect the working tree.
3. Identify existing changes that belong to other work.
4. Reproduce the reported behavior when possible.
5. Record each reported symptom that you cannot reproduce.
6. Add a regression test when it can detect the reported failure.

Keep the editor source in strict TypeScript.
Keep the generated browser files independent of runtime dependencies.
Keep unrelated changes intact.

Before build or test commands, run `npm run check:runtime`.
Use the exact Node.js version in `.node-version`.
A green check under another runtime does not verify the pinned CI runtime.

## Complete the release metadata

1. Run `npm run check:release-change` to inspect the release baseline.
2. Compare the current package version with the last reachable release tag.
3. For editor or package changes, select a version newer than the release baseline.
4. Use a patch version for compatible fixes.
5. Use a minor version for compatible features.
6. Use a major version for incompatible public changes.
7. If the current unpublished version already covers this change, keep that version.
8. Add accurate notes under that version in `CHANGELOG.md`.
9. If needed, move release notes from `Unreleased` to the dated version section.
10. Update `package.json` and `package-lock.json`.
11. Update the source banner, API reference, and demo version.
12. Update affected guides and `docs/known-issues.md`.
13. Run `npm run build`.
14. Run `npm run check`.

Use `npm version <version> --no-git-tag-version --ignore-scripts` to update package versions.
Use the user date for release notes.
Do not add another version bump for each task in the same unpublished release.
If release tags are missing, get the history or select an explicit comparison ref.
Do not disable the check or create a tag to make it pass.

The automatic check compares committed, staged, unstaged, and untracked changes with the release baseline.
It covers editor source, generated files, build inputs, and public package fields.
It requires a newer version when those files change.
The metadata check also requires matching version files and a nonempty changelog entry.

## Verify the final files

1. Run the focused checks during edits.
2. After editor changes, run `npm test` before release preparation is complete.
3. Run `npm pack --dry-run --ignore-scripts` after `npm run check` passes.
4. Inspect the package file list and version.
5. Inspect the final diff for unrelated edits.

If only instructions, release checks, or text change, run the relevant tests and `npm run check`.
Do not repeat browser tests when the editor files have not changed.

Treat each browser result as evidence for that browser only.
Check the hosted Linux and macOS WebKit jobs before calling a release ready.
Keep device checks separate from browser emulation.
Record unavailable checks and unconfirmed symptoms.

## Report completion

Report the change, version, changelog status, test results, and remaining work.
State whether the changes have a commit, pull request, tag, or published package.
Distinguish a local fix, a local release candidate, and a verified public release.
Do not describe local tests as proof of publication.

Use existing user authorization for local edits and checks.
Create a pull request or publish only when the user requests it.
Do not ask again when the user already authorized the action.

## Trigger examples

- "Fix spaces in table cells." Complete the fix, release metadata, and relevant tests.
- "Change log? Version? Anything else?" Inspect and complete the local release metadata.
- "Prepare a release." Check all release surfaces and report pending publication steps.
- "Explain this function." Answer without release edits.
- "Correct a spelling error in a guide." Make the text edit without a version bump.

## Source

The location follows [official OpenAI documentation](https://learn.chatgpt.com/docs/build-skills).
