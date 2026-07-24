import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ignoredDirectories = new Set(['.git', '.playwright-cli', 'node_modules', 'output']);
const markdownFiles = [];

function collectMarkdown(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) collectMarkdown(join(directory, entry.name));
      continue;
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      markdownFiles.push(join(directory, entry.name));
    }
  }
}

function headingSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseMarkdown(file) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const prose = [];
  const headings = new Set();
  let fence = null;

  lines.forEach((line, index) => {
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      const token = marker[1];
      if (!fence) {
        fence = { char: token[0], length: token.length, line: index + 1 };
      } else if (
        token[0] === fence.char
        && token.length >= fence.length
        && marker[2].trim() === ''
      ) {
        fence = null;
      }
      return;
    }

    if (fence) return;
    prose.push({ line, number: index + 1 });

    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) headings.add(headingSlug(heading[1]));
  });

  return { prose, headings, unclosedFence: fence };
}

collectMarkdown(root);

const parsed = new Map(markdownFiles.map(file => [file, parseMarkdown(file)]));
const failures = [];

for (const [file, document] of parsed) {
  const displayFile = relative(root, file);
  if (document.unclosedFence) {
    failures.push(`${displayFile}:${document.unclosedFence.line} has an unclosed code fence`);
  }

  for (const { line, number } of document.prose) {
    const withoutInlineCode = line.replace(/`+[^`]*`+/g, '');
    const links = withoutInlineCode.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g);

    for (const link of links) {
      const rawTarget = link[1].trim().replace(/^<|>$/g, '');
      if (!rawTarget || /^(?:[a-z]+:|\/\/)/i.test(rawTarget)) continue;

      const [pathPart, anchor = ''] = rawTarget.split('#', 2);
      const targetFile = pathPart ? resolve(dirname(file), decodeURIComponent(pathPart)) : file;

      if (!existsSync(targetFile)) {
        failures.push(`${displayFile}:${number} links to missing ${rawTarget}`);
        continue;
      }

      if (anchor && statSync(targetFile).isFile() && extname(targetFile).toLowerCase() === '.md') {
        const targetDocument = parsed.get(targetFile) ?? parseMarkdown(targetFile);
        if (!targetDocument.headings.has(decodeURIComponent(anchor).toLowerCase())) {
          failures.push(`${displayFile}:${number} links to missing heading ${rawTarget}`);
        }
      }
    }
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const apiReference = readFileSync(join(root, 'docs/api-reference.md'), 'utf8');
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const demo = readFileSync(join(root, 'demo/index.html'), 'utf8');
const source = readFileSync(join(root, 'src/writemark-editor.js'), 'utf8');
const testGuide = readFileSync(join(root, 'tests/README.md'), 'utf8');

if (!apiReference.includes(`Writemark ${packageJson.version}`)) {
  failures.push(`docs/api-reference.md does not identify package version ${packageJson.version}`);
}
if (!changelog.includes(`## ${packageJson.version}`)) {
  failures.push(`CHANGELOG.md does not contain a ${packageJson.version} release heading`);
}
if (!demo.includes(`v${packageJson.version} Live Inline Demo`)) {
  failures.push(`demo/index.html does not identify package version ${packageJson.version}`);
}
if (packageJson.scripts?.['test:browser'] !== 'playwright test') {
  failures.push('package.json test:browser must invoke Playwright directly');
}
if (existsSync(join(root, 'tests/browser.html'))) {
  failures.push('tests/browser.html is retired; browser coverage belongs in Playwright specs');
}

const retiredDocumentationTerms = [
  'tests/browser.html',
  'browser.spec.js',
  'regressions.spec.js',
  'browser-regressions.js',
  'runFixture(',
  'parseFixtureMarkedValue',
  'serializeMarkedValue'
];

for (const file of markdownFiles) {
  if (relative(root, file) === 'CHANGELOG.md') continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const term of retiredDocumentationTerms) {
      if (line.includes(term)) {
        failures.push(`${relative(root, file)}:${index + 1} uses retired test term ${term}`);
      }
    }
  });
}

const exportStatements = [...source.matchAll(/^export\s*\{([^}]+)\};\s*$/gm)];
const publicExports = exportStatements.at(-1)?.[1]
  .split(',')
  .map(name => name.trim())
  .filter(Boolean) ?? [];

if (!publicExports.length) {
  failures.push('src/writemark-editor.js has no discoverable public export statement');
} else {
  for (const name of publicExports) {
    if (!apiReference.includes(name)) {
      failures.push(`docs/api-reference.md does not document public export ${name}`);
    }
  }
}

const specFiles = readdirSync(join(root, 'tests'))
  .filter(name => name.endsWith('.spec.js'))
  .sort();
const documentedSpecs = new Set(
  [...testGuide.matchAll(/`([^`/]+\.spec\.js)`/g)].map(match => match[1])
);

for (const specFile of specFiles) {
  if (!documentedSpecs.has(specFile)) {
    failures.push(`tests/README.md does not document ${specFile}`);
  }
}
for (const documentedSpec of documentedSpecs) {
  if (!specFiles.includes(documentedSpec)) {
    failures.push(`tests/README.md documents missing spec ${documentedSpec}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed (${markdownFiles.length} files).`);
}
