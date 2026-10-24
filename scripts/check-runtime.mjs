import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function assertNodeRuntime({ directory = root, actualVersion = process.versions.node } = {}) {
  const expectedVersion = readFileSync(resolve(directory, '.node-version'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
    throw new Error('.node-version must contain a complete Node.js version.');
  }
  if (actualVersion !== expectedVersion) {
    throw new Error(
      `Node.js ${expectedVersion} is required by .node-version. Current runtime: ${actualVersion}.\n`
      + 'Use the pinned runtime before npm run build or npm run check.'
    );
  }
  return expectedVersion;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Node.js runtime verified (${assertNodeRuntime()}).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
