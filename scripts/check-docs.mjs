import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ignoredDirectories = new Set(['.git', 'node_modules']);
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

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed (${markdownFiles.length} files).`);
}
