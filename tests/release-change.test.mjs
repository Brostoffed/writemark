import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReleaseChange, validateReleaseChange } from '../scripts/check-release-change.mjs';

function repository(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'writemark-release-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (path, value) => {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), value);
  };
  const commit = () => {
    git('add', '.');
    git('-c', 'user.name=Release Test', '-c', 'user.email=release@example.invalid',
      '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture');
  };
  git('init', '-q');
  write('package.json', JSON.stringify({ version: '1.8.0' }));
  write('CHANGELOG.md', '## 1.8.0 - 2026-10-02\n\n- Original release.\n');
  write('src/editor.ts', 'export const text = "old";\n');
  commit();
  git('tag', 'v1.8.0');
  return { cwd, git, write, commit };
}

test('rejects source changes even when all version files could still agree on the old version', t => {
  const repo = repository(t);
  repo.write('src/editor.ts', 'export const text = "fixed";\n');
  assert.match(checkReleaseChange(repo).failures.join('\n'), /version newer than 1\.8\.0/);
});

test('checks committed, staged, and untracked source changes without editing the repository', t => {
  const repo = repository(t);
  repo.write('src/editor.ts', 'export const text = "committed fix";\n');
  repo.commit();
  assert.equal(checkReleaseChange(repo).failures.length, 1);
  repo.write('src/editor.ts', 'export const text = "staged fix";\n');
  repo.git('add', '.');
  repo.write('src/new.ts', 'export const added = true;\n');
  const before = repo.git('status', '--porcelain');
  assert.equal(checkReleaseChange(repo).failures.length, 1);
  assert.equal(repo.git('status', '--porcelain'), before);
  assert.equal(readFileSync(join(repo.cwd, 'src/new.ts'), 'utf8'), 'export const added = true;\n');
});

test('rejects an untracked source file even when tracked source did not change', t => {
  const repo = repository(t);
  repo.write('src/new.ts', 'export const added = true;\n');
  assert.match(checkReleaseChange(repo).failures.join('\n'), /version newer/);
});

test('rejects a new version without a changelog update', t => {
  const repo = repository(t);
  repo.write('package.json', JSON.stringify({ version: '1.8.1' }));
  assert.match(checkReleaseChange(repo).failures.join('\n'), /CHANGELOG\.md entry/);
});

test('accepts a fix with a newer version and release notes', t => {
  const repo = repository(t);
  repo.write('src/editor.ts', 'export const text = "fixed";\n');
  repo.write('package.json', JSON.stringify({ version: '1.8.1' }));
  repo.write('CHANGELOG.md', '## 1.8.1 - 2026-10-23\n\n- Fixed the editor.\n');
  assert.deepEqual(checkReleaseChange(repo).failures, []);
  repo.commit();
  repo.write('src/editor.ts', 'export const text = "another fix in the same candidate";\n');
  assert.deepEqual(checkReleaseChange(repo).failures, []);
});

test('uses the new release tag after publication and rejects another fix under that version', t => {
  const repo = repository(t);
  repo.write('package.json', JSON.stringify({ version: '1.8.1' }));
  repo.write('CHANGELOG.md', '## 1.8.1 - 2026-10-23\n\n- Fixed the editor.\n');
  repo.commit();
  repo.git('tag', 'v1.8.1');
  assert.deepEqual(checkReleaseChange(repo).failures, []);
  repo.write('src/editor.ts', 'export const text = "later fix";\n');
  const result = checkReleaseChange(repo);
  assert.equal(result.base, 'v1.8.1');
  assert.match(result.failures.join('\n'), /version newer than 1\.8\.1/);
});

test('allows documentation and development checks without a package version change', t => {
  const repo = repository(t);
  repo.write('README.md', 'Updated instructions.\n');
  repo.write('scripts/check-example.mjs', 'console.log("check");\n');
  repo.write('package.json', JSON.stringify({ version: '1.8.0', scripts: { check: 'node scripts/check-example.mjs' } }));
  repo.write('dist/manifest.json', '{"tools":{"node":"24"}}\n');
  assert.deepEqual(checkReleaseChange(repo).failures, []);
});

for (const path of ['src/component/styles.css', 'dist/editor.js', 'dist/editor.d.ts', 'scripts/build.mjs', 'tsconfig.json']) {
  test(`requires release metadata for ${path}`, t => {
    const repo = repository(t);
    repo.write(path, 'changed\n');
    assert.match(checkReleaseChange(repo).failures.join('\n'), /version newer/);
  });
}

test('requires release metadata for runtime dependencies and public package fields', () => {
  for (const fields of [{ dependencies: { runtime: '1.0.0' } }, { exports: './new.js' }, { engines: { node: '>=24' } }]) {
    const failures = validateReleaseChange({
      baselinePackage: { version: '1.8.0' }, packageJson: { version: '1.8.0', ...fields }, changedPaths: ['package.json']
    });
    assert.match(failures.join('\n'), /version newer/);
  }
});

test('compares versions numerically and rejects a version rollback', () => {
  assert.deepEqual(validateReleaseChange({
    baselinePackage: { version: '1.9.9' }, packageJson: { version: '1.10.0' }, changedPaths: ['src/editor.ts', 'CHANGELOG.md']
  }), []);
  assert.match(validateReleaseChange({
    baselinePackage: { version: '2.0.0' }, packageJson: { version: '1.10.0' }, changedPaths: ['src/editor.ts', 'CHANGELOG.md']
  }).join('\n'), /newer than 2\.0\.0/);
});

test('fails when release history is missing and supports an explicit baseline', t => {
  const repo = repository(t);
  repo.git('tag', '-d', 'v1.8.0');
  assert.throws(() => checkReleaseChange(repo), /No release tag/);
  assert.deepEqual(checkReleaseChange({ cwd: repo.cwd, base: 'HEAD' }).failures, []);
});

test('checks the repository root when the caller starts in a subdirectory', t => {
  const repo = repository(t);
  repo.write('src/new.ts', 'export const added = true;\n');
  assert.match(checkReleaseChange({ cwd: join(repo.cwd, 'src') }).failures.join('\n'), /version newer/);
});

test('the command fails for a missed version and rejects unknown options', t => {
  const repo = repository(t);
  repo.write('src/editor.ts', 'export const text = "fixed";\n');
  const script = fileURLToPath(new URL('../scripts/check-release-change.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script], { cwd: repo.cwd, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /version newer/);
  const invalid = spawnSync(process.execPath, [script, '--skip'], { cwd: repo.cwd, encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Usage:/);
});
