import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function validateVersionPolicy({
  apiReference,
  changelog,
  demo,
  packageJson,
  packageLock
}) {
  const failures = [];
  const version = packageJson.version;

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    failures.push(`package.json has unsupported release version ${version}`);
  }
  if (packageLock.version !== version) {
    failures.push(`package-lock.json version ${packageLock.version} does not match package.json ${version}`);
  }
  if (packageLock.packages?.['']?.version !== version) {
    failures.push(`package-lock.json root package version ${packageLock.packages?.['']?.version} does not match package.json ${version}`);
  }

  const headings = [...changelog.matchAll(/^##\s+(.+?)\s*$/gm)];
  const unreleasedIndex = headings.findIndex(match => match[1] === 'Unreleased');
  if (unreleasedIndex === -1) {
    failures.push('CHANGELOG.md does not contain an Unreleased section');
  } else {
    const unreleased = headings[unreleasedIndex];
    const nextHeading = headings[unreleasedIndex + 1];
    const bodyStart = unreleased.index + unreleased[0].length;
    const bodyEnd = nextHeading?.index ?? changelog.length;
    if (changelog.slice(bodyStart, bodyEnd).trim()) {
      failures.push('CHANGELOG.md has release notes stranded under Unreleased; finalize a version before checks can pass');
    }
  }

  const releases = headings
    .map(match => {
      const release = /^(\d+\.\d+\.\d+)\s+-\s+(\d{4}-\d{2}-\d{2})$/.exec(match[1]);
      return release ? { date: release[2], version: release[1] } : null;
    })
    .filter(Boolean);
  const latestRelease = releases[0];
  if (!latestRelease) {
    failures.push('CHANGELOG.md does not contain a dated release heading');
  } else if (latestRelease.version !== version) {
    failures.push(`CHANGELOG.md latest release ${latestRelease.version} does not match package.json ${version}`);
  }

  if (!apiReference.includes(`Writemark ${version}`)) {
    failures.push(`docs/api-reference.md does not identify package version ${version}`);
  }
  if (!demo.includes(`v${version} Live Inline Demo`)) {
    failures.push(`demo/index.html does not identify package version ${version}`);
  }

  return failures;
}

function readVersionFiles() {
  return {
    apiReference: readFileSync(resolve(root, 'docs/api-reference.md'), 'utf8'),
    changelog: readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'),
    demo: readFileSync(resolve(root, 'demo/index.html'), 'utf8'),
    packageJson: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')),
    packageLock: JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'))
  };
}

if (resolve(process.argv[1] ?? '') === scriptPath) {
  const failures = validateVersionPolicy(readVersionFiles());
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Version policy check passed.');
  }
}
