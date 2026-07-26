# Releasing Writemark

Writemark is published to the public npm registry as `writemark-editor`. The
version in `package.json`, the heading in `CHANGELOG.md`, the Git tag, the
GitHub Release, and the npm version should all match.

## One-time first publish

The first publish establishes ownership of the unscoped npm package. Do this
once from a trusted local machine:

1. Create or sign in to an npm account and enable two-factor authentication.
2. Use Node.js 24 and its bundled npm version, matching the release workflow.
   Confirm both executables before continuing:

   ```sh
   node --version
   npm --version
   ```
3. From the repository root, authenticate and verify the account:

   ```sh
   npm login
   npm whoami
   ```

4. Commit the release-ready files, push that commit to `main`, and confirm the
   working tree is clean. The public source should exist before the package is
   published.
5. Verify the exact package contents, then publish the current version:

   ```sh
   npm test
   npm pack --dry-run
   npm publish --access public
   ```

   `npm test` checks generated artifacts and documentation, then runs every
   Playwright project supported on the host, including the standard seeded
   security properties. Before publishing, confirm the GitHub Test workflow
   passed its Chromium, Firefox, and WebKit gate on Linux. For a security-heavy
   parser or renderer release, also run the deep budget:

   ```sh
   WRITEMARK_FUZZ_RUNS=5000 npm run test:fuzz
   ```

6. On npmjs.com, open the new `writemark-editor` package settings and add a
   GitHub Actions trusted publisher with these exact values:

   - Organization or user: `Brostoffed`
   - Repository: `writemark`
   - Workflow filename: `publish.yml`
   - Allowed action: `npm publish`

The workflow uses short-lived OpenID Connect credentials, so no npm token or
GitHub repository secret is required. npm generates provenance automatically.

7. In GitHub, create and publish the first Release from `main` with a tag that
   is exactly `v` plus the package version. The workflow will verify the release
   and exit successfully when that version was already published manually.

## Publish a version after the first one

1. Choose the next semantic version:

   - Patch (`1.3.1` to `1.3.2`) for a backward-compatible fix.
   - Minor (`1.3.1` to `1.4.0`) for a backward-compatible feature.
   - Major (`1.3.1` to `2.0.0`) for a breaking change.

2. Update `CHANGELOG.md`, then bump `package.json` without creating a tag yet:

   ```sh
   npm version patch --no-git-tag-version
   npm test
   npm pack --dry-run
   ```

   Substitute `minor`, `major`, or an exact version when appropriate.

3. Commit and push the release changes to `main`.
4. In GitHub, create a new Release whose tag is exactly `v` plus the package
   version, such as `v1.3.2`, and publish it from `main`.

Publishing the GitHub Release runs `.github/workflows/publish.yml`. The workflow
installs Chromium, Firefox, and WebKit, runs the complete Playwright and
repository checks, verifies that the Git tag matches `package.json`, and
publishes that version to npm. It exits successfully without republishing when
the same version is already present, which also makes the first GitHub Release
safe to create after the one-time manual npm publish.

The weekly `Markdown fuzz` workflow adds a rotating-seed, 5,000-case-per-property
security run between releases. Its logged seed and any reported shrink path can
be supplied through `WRITEMARK_FUZZ_SEED` and `WRITEMARK_FUZZ_PATH` to reproduce
a failure locally.

## Published demo

The public demo is hosted by GitHub Pages at
`https://brostoffed.github.io/writemark/demo/`. It uses the committed
`demo/index.html` and `dist/writemark-editor.global.js` files, so it does not
need a separate application server or production build.

Configure the repository once:

1. Open **Settings**, then **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/(root)` folder, then save.
4. Wait for the `pages-build-deployment` workflow to finish.

After setup, every push to `main` republishes the selected source. Before
sharing a new demo version, confirm that the Test workflow passed and open the
public URL in a private browser window. Check that the editor loads, changing
modes works, and the browser console has no errors.

## Verification

After the workflow finishes, verify the public package, release, and demo
pages:

- `https://www.npmjs.com/package/writemark-editor`
- `https://github.com/Brostoffed/writemark/releases`
- `https://brostoffed.github.io/writemark/demo/`

Installing without a version should then resolve to the newly published
`latest` version:

```sh
npm view writemark-editor version
```
