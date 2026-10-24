import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertNodeRuntime } from '../../scripts/check-runtime.mjs';

function runtimeFixture(t, pin = '24.19.0') {
  const directory = mkdtempSync(join(tmpdir(), 'writemark-runtime-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, '.node-version'), pin + '\n');
  return directory;
}

test('accepts the exact pinned Node runtime', t => {
  const directory = runtimeFixture(t);
  assert.equal(assertNodeRuntime({ directory, actualVersion: '24.19.0' }), '24.19.0');
});

test('rejects a different Node major or patch before a build', t => {
  const directory = runtimeFixture(t);
  for (const actualVersion of ['22.23.1', '24.18.0', '24.19.1']) {
    assert.throws(() => assertNodeRuntime({ directory, actualVersion }),
      /Node.js 24\.19\.0 is required by \.node-version\. Current runtime:/);
  }
});

test('rejects an incomplete or invalid runtime pin', t => {
  for (const pin of ['24', '24.19', 'latest']) {
    const directory = runtimeFixture(t, pin);
    assert.throws(() => assertNodeRuntime({ directory, actualVersion: '24.19.0' }),
      /complete Node.js version/);
  }
});
