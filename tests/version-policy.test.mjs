import assert from 'node:assert/strict';
import test from 'node:test';

import { validateVersionPolicy } from '../scripts/check-version.mjs';

function alignedRelease(overrides = {}) {
  return {
    apiReference: '# API reference\n\nWritemark 1.4.0 is release ready.\n',
    changelog: '# Changelog\n\n## Unreleased\n\n## 1.4.0 - 2026-07-25\n\n- Shipped.\n',
    demo: '<title>&lt;writemark-editor&gt; v1.4.0 Live Inline Demo</title>',
    packageJson: { version: '1.4.0' },
    packageLock: {
      version: '1.4.0',
      packages: { '': { version: '1.4.0' } }
    },
    source: '/* <writemark-editor> v1.4.0 live inline Markdown editor. */',
    ...overrides
  };
}

test('accepts aligned release metadata with an empty Unreleased section', () => {
  assert.deepEqual(validateVersionPolicy(alignedRelease()), []);
});

test('rejects release notes left under Unreleased', () => {
  const failures = validateVersionPolicy(alignedRelease({
    changelog: '# Changelog\n\n## Unreleased\n\n- Forgotten release note.\n\n## 1.4.0 - 2026-07-25\n'
  }));

  assert.match(failures.join('\n'), /stranded under Unreleased/);
});

test('rejects a newest changelog release that does not match the package', () => {
  const failures = validateVersionPolicy(alignedRelease({
    changelog: '# Changelog\n\n## Unreleased\n\n## 1.3.1 - 2026-07-24\n\n- Previous release.\n'
  }));

  assert.match(failures.join('\n'), /latest release 1\.3\.1 does not match package\.json 1\.4\.0/);
});

test('rejects package-lock versions that do not match the package', () => {
  const failures = validateVersionPolicy(alignedRelease({
    packageLock: {
      version: '1.3.1',
      packages: { '': { version: '1.3.1' } }
    }
  }));

  assert.equal(failures.filter(failure => failure.includes('package-lock.json')).length, 2);
});

test('rejects stale documentation and demo versions', () => {
  const failures = validateVersionPolicy(alignedRelease({
    apiReference: 'Writemark 1.3.1',
    demo: 'v1.3.1 Live Inline Demo'
  }));

  assert.match(failures.join('\n'), /api-reference\.md/);
  assert.match(failures.join('\n'), /demo\/index\.html/);
});

test('rejects a stale canonical source banner', () => {
  const failures = validateVersionPolicy(alignedRelease({
    source: '/* <writemark-editor> v1.3.1 live inline Markdown editor. */'
  }));

  assert.match(failures.join('\n'), /src\/writemark-editor\.js/);
});
