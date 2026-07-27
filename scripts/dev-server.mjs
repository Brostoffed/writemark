#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = fileURLToPath(import.meta.url);
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));

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

function optionValue(argv, name) {
  const inlinePrefix = `--${name}=`;
  const inline = argv.find(arg => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);

  const index = argv.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  return value && !value.startsWith('--') ? value : '';
}

function normalizeUrlPath(pathname) {
  const value = pathname || 'demo/index.html';
  return value.startsWith('/') ? value : `/${value}`;
}

function validateHost(value) {
  const host = String(value || '').trim();
  if (!host || /[\s/?#]/.test(host)) {
    throw new Error(`Invalid host "${value ?? ''}". Use a hostname or IP address.`);
  }
  return host;
}

function validatePort(value) {
  const raw = String(value);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid port "${raw}". Use an integer from 1 to 65535.`);
  }
  const parsed = Number(raw);
  if (parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port "${raw}". Use an integer from 1 to 65535.`);
  }
  return parsed;
}

export function parseServerOptions(
  argv = process.argv.slice(2),
  env = process.env
) {
  const args = new Set(argv);
  const hostOption = optionValue(argv, 'host');
  const portOption = optionValue(argv, 'port');
  const openOption = optionValue(argv, 'open');
  const host = validateHost(
    hostOption !== undefined
      ? hostOption
      : args.has('--lan')
        ? '0.0.0.0'
        : env.HOST || '127.0.0.1'
  );
  const port = validatePort(
    portOption !== undefined ? portOption : env.PORT || 5173
  );
  const openPath = openOption
    ? normalizeUrlPath(openOption)
    : args.has('--open')
      ? '/demo/index.html'
      : null;

  return { host, openPath, port };
}

export function getLanAddresses(interfaces = networkInterfaces()) {
  const seen = new Set();
  const addresses = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      const isIpv4 = entry.family === 'IPv4' || entry.family === 4;
      if (!isIpv4 || entry.internal || seen.has(entry.address)) continue;
      seen.add(entry.address);
      addresses.push({ address: entry.address, name });
    }
  }

  return addresses.sort((left, right) =>
    left.name.localeCompare(right.name)
    || left.address.localeCompare(right.address, undefined, { numeric: true })
  );
}

function hostForUrl(host) {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

export function serverUrl(host, port, pathname = '/demo/index.html') {
  return `http://${hostForUrl(host)}:${port}${normalizeUrlPath(pathname)}`;
}

function isWildcardHost(host) {
  return host === '0.0.0.0' || host === '::' || host === '[::]';
}

function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === 'localhost'
    || host === '::1' || host === '[::1]';
}

export function startupLines({
  host,
  lanAddresses = [],
  openPath,
  port,
  servedFrom = root
}) {
  const entryPath = normalizeUrlPath(openPath || '/demo/index.html');
  const wildcard = isWildcardHost(host);
  const browserHost = wildcard ? '127.0.0.1' : host;
  const lines = [
    `Serving <writemark-editor> from ${servedFrom}`,
    `Listening: ${host}:${port}`,
    `Local:     ${serverUrl(browserHost, port, entryPath)}`
  ];

  if (wildcard) {
    if (lanAddresses.length) {
      for (const { address, name } of lanAddresses) {
        lines.push(`Network (${name}): ${serverUrl(address, port, entryPath)}`);
      }
    } else {
      lines.push('Network: no external IPv4 address was detected.');
    }
  } else if (isLoopbackHost(host)) {
    lines.push('Network: disabled (restart with --lan or --host=0.0.0.0).');
  } else {
    lines.push(`Network:   ${serverUrl(host, port, entryPath)}`);
  }

  lines.push(`Perf:      ${serverUrl(browserHost, port, '/perf/index.html')}`);
  lines.push('Tests:     npm test');
  lines.push('Press Ctrl+C to stop.');
  return lines;
}

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

function createStaticServer() {
  return createServer(async (req, res) => {
    try {
      const requested = safePathFromUrl(req.url || '/');
      const file = requested ? await resolveFile(requested) : null;

      if (!file) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const body = await readFile(file);
      const type = mime.get(extname(file).toLowerCase())
        || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(body);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        `500 Internal Server Error\n\n${
          error instanceof Error ? error.stack : String(error)
        }`
      );
    }
  });
}

function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin'
    ? 'open'
    : platform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

export function startServer(argv = process.argv.slice(2), env = process.env) {
  let options;
  try {
    options = parseServerOptions(argv, env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return null;
  }

  const server = createStaticServer();
  server.listen(options.port, options.host, () => {
    for (const line of startupLines({
      ...options,
      lanAddresses: getLanAddresses()
    })) {
      console.log(line);
    }

    if (options.openPath) {
      const browserHost = isWildcardHost(options.host)
        ? '127.0.0.1'
        : options.host;
      openBrowser(serverUrl(browserHost, options.port, options.openPath));
    }
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  startServer();
}
