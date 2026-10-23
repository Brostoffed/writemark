import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const stableVersion = /^\d+\.\d+\.\d+$/;
const runtimePackageFields = [
  'main', 'module', 'types', 'exports', 'files', 'sideEffects', 'type',
  'dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta', 'engines'
];

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

function packageContract(pkg) {
  return JSON.stringify(canonical({
    ...Object.fromEntries(runtimePackageFields.map(key => [key, pkg[key] ?? null])),
    build: pkg.scripts?.build ?? null
  }));
}

export function isReleaseRelevantPath(path) {
  return path.startsWith('src/')
    || (path.startsWith('dist/') && path !== 'dist/manifest.json')
    || path === 'scripts/build.mjs'
    || /^tsconfig(?:\.[^/]+)?\.json$/.test(path)
    || path === '.node-version';
}

export function validateReleaseChange({ baselinePackage, packageJson, changedPaths }) {
  const failures = [];
  const version = packageJson.version;
  const baselineVersion = baselinePackage.version;
  if (!stableVersion.test(version) || !stableVersion.test(baselineVersion)) {
    return ['The current version and the baseline version must use major.minor.patch.'];
  }
  const runtimeChanged = changedPaths.some(isReleaseRelevantPath)
    || packageContract(packageJson) !== packageContract(baselinePackage);
  const difference = compareVersions(version, baselineVersion);
  if (difference < 0 || (runtimeChanged && difference === 0)) {
    failures.push(`Editor or package changes need a version newer than ${baselineVersion}. Update package.json and all version files.`);
  }
  if (difference > 0 && !changedPaths.includes('CHANGELOG.md')) {
    failures.push(`Version ${version} needs a CHANGELOG.md entry that differs from the baseline.`);
  }
  return failures;
}

export function checkReleaseChange({ cwd = process.cwd(), base = null } = {}) {
  const git = args => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  const root = git(['rev-parse', '--show-toplevel']).trim();
  cwd = root;
  if (!base) {
    const tags = git(['tag', '--merged', 'HEAD', '--list', 'v[0-9]*'])
      .trim().split('\n')
      .filter(tag => /^v\d+\.\d+\.\d+$/.test(tag))
      .sort((a, b) => compareVersions(a.slice(1), b.slice(1)));
    base = tags.at(-1);
    if (!base) {
      throw new Error('No release tag is available. Fetch the release tags or pass --base <ref>. Do not skip the release check.');
    }
  }
  const commit = git(['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
  const baselinePackage = JSON.parse(git(['show', `${commit}:package.json`]));
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const tracked = git(['diff', '--name-only', '-z', commit, '--']);
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']);
  const changedPaths = [...new Set((tracked + untracked).split('\0').filter(Boolean))];
  return {
    base,
    baselineVersion: baselinePackage.version,
    failures: validateReleaseChange({ baselinePackage, packageJson, changedPaths })
  };
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--base' || !args[1])) {
      throw new Error('Usage: node scripts/check-release-change.mjs [--base <ref>]');
    }
    const result = checkReleaseChange({ base: args[1] ?? null });
    if (result.failures.length) {
      console.error(result.failures.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`Release change check passed against ${result.base} (${result.baselineVersion}).`);
    }
  } catch (error) {
    console.error(`Release change check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
