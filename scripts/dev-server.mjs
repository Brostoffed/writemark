#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = new Set(process.argv.slice(2));
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const openArg = process.argv.find(arg => arg.startsWith('--open='));
const port = Number(portArg?.split('=')[1] || process.env.PORT || 5173);
const openPath = openArg?.split('=')[1] || (args.has('--open') ? 'demo/index.html' : null);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
]);

function safePathFromUrl(url) {
  const parsed = new URL(url, 'http://localhost');
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/demo/index.html';
  const candidate = normalize(join(root, pathname));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

async function resolveFile(pathname) {
  try {
    const info = await stat(pathname);
    if (info.isDirectory()) {
      const indexFile = join(pathname, 'index.html');
      if (existsSync(indexFile)) return indexFile;
    }
    if (info.isFile()) return pathname;
  } catch {
    return null;
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const requested = safePathFromUrl(req.url || '/');
    const file = requested ? await resolveFile(requested) : null;

    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const body = await readFile(file);
    const type = mime.get(extname(file).toLowerCase()) || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`500 Internal Server Error\n\n${error instanceof Error ? error.stack : String(error)}`);
  }
});

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

server.listen(port, '127.0.0.1', () => {
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Serving <writemark-editor> from ${root}`);
  console.log(`Demo:  ${baseUrl}/demo/index.html`);
  console.log(`Tests: ${baseUrl}/tests/browser.html`);
  console.log(`Perf:  ${baseUrl}/perf/index.html`);
  console.log('Press Ctrl+C to stop.');
  if (openPath) {
    const normalized = openPath.startsWith('/') ? openPath : `/${openPath}`;
    openBrowser(`${baseUrl}${normalized}`);
  }
});
