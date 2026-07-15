# Releasing Writemark

Writemark is published to the public npm registry as `writemark-editor`. The
version in `package.json`, the heading in `CHANGELOG.md`, the Git tag, the
GitHub Release, and the npm version should all match.

## One-time first publish

The first publish establishes ownership of the unscoped npm package. Do this
once from a trusted local machine:

1. Create or sign in to an npm account and enable two-factor authentication.
2. Use a current supported Node.js/npm combination (Node.js 24 is also used by
   the release workflow).
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
   npm run check
   npm pack --dry-run
   npm publish --access public
   ```

6. On npmjs.com, open the new `writemark-editor` package settings and add a
   GitHub Actions trusted publisher with these exact values:

   - Organization or user: `Brostoffed`
   - Repository: `writemark`
   - Workflow filename: `publish.yml`
   - Allowed action: `npm publish`

The workflow uses short-lived OpenID Connect credentials, so no npm token or
GitHub repository secret is required. npm generates provenance automatically.

7. In GitHub, create and publish the first Release from `main` with the tag
   `v1.2.2`. The workflow will verify the release and exit successfully because
   `writemark-editor@1.2.2` was already published manually.

## Publish a version after the first one

1. Choose the next semantic version:

   - Patch (`1.2.2` to `1.2.3`) for a backward-compatible fix.
   - Minor (`1.2.2` to `1.3.0`) for a backward-compatible feature.
   - Major (`1.2.2` to `2.0.0`) for a breaking change.

2. Update `CHANGELOG.md`, then bump `package.json` without creating a tag yet:

   ```sh
   npm version patch --no-git-tag-version
   npm run check
   npm pack --dry-run
   ```

   Substitute `minor`, `major`, or an exact version when appropriate.

3. Commit and push the release changes to `main`.
4. In GitHub, create a new Release whose tag is exactly `v` plus the package
   version, such as `v1.2.3`, and publish it from `main`.

Publishing the GitHub Release runs `.github/workflows/publish.yml`. The workflow
checks that the Git tag matches `package.json`, reruns the repository checks,
and publishes that version to npm. It exits successfully without republishing
when the same version is already present, which also makes the first GitHub
Release safe to create after the one-time manual npm publish.

## Verification

After the workflow finishes, verify both public pages:

- `https://www.npmjs.com/package/writemark-editor`
- `https://github.com/Brostoffed/writemark/releases`

Installing without a version should then resolve to the newly published
`latest` version:

```sh
npm view writemark-editor version
```
