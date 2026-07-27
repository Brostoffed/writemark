import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getLanAddresses,
  parseServerOptions,
  serverUrl,
  startupLines
} from '../scripts/dev-server.mjs';

test('server options keep loopback as the safe default', () => {
  assert.deepEqual(parseServerOptions([], {}), {
    host: '127.0.0.1',
    openPath: null,
    port: 5173
  });
});

test('server options accept explicit LAN host, port, and open path forms', () => {
  assert.deepEqual(parseServerOptions([
    '--host=0.0.0.0',
    '--port',
    '6000',
    '--open=tests/fixtures/editor.html'
  ], {}), {
    host: '0.0.0.0',
    openPath: '/tests/fixtures/editor.html',
    port: 6000
  });
});

test('--lan selects all IPv4 interfaces and explicit --host takes priority', () => {
  assert.equal(parseServerOptions(['--lan'], {}).host, '0.0.0.0');
  assert.equal(
    parseServerOptions(['--lan', '--host=127.0.0.1'], {}).host,
    '127.0.0.1'
  );
});

test('HOST and PORT environment options remain supported', () => {
  assert.deepEqual(parseServerOptions([], {
    HOST: '192.168.1.20',
    PORT: '8080'
  }), {
    host: '192.168.1.20',
    openPath: null,
    port: 8080
  });
});

test('bare --open uses the demo path', () => {
  assert.equal(
    parseServerOptions(['--open'], {}).openPath,
    '/demo/index.html'
  );
});

for (const invalidPort of ['', '0', '12.5', 'nope', '65536']) {
  test(`invalid port ${JSON.stringify(invalidPort)} is rejected`, () => {
    assert.throws(
      () => parseServerOptions([`--port=${invalidPort}`], {}),
      /Invalid port/
    );
  });
}

for (const invalidHost of ['', 'two words', 'host/path']) {
  test(`invalid host ${JSON.stringify(invalidHost)} is rejected`, () => {
    assert.throws(
      () => parseServerOptions([`--host=${invalidHost}`], {}),
      /Invalid host/
    );
  });
}

test('LAN address discovery keeps unique external IPv4 interfaces only', () => {
  assert.deepEqual(getLanAddresses({
    en1: [
      { address: 'fe80::1', family: 'IPv6', internal: false },
      { address: '192.168.1.30', family: 'IPv4', internal: false }
    ],
    en0: [
      { address: '10.0.0.5', family: 4, internal: false },
      { address: '127.0.0.1', family: 'IPv4', internal: true }
    ],
    vpn0: [
      { address: '10.0.0.5', family: 'IPv4', internal: false }
    ]
  }), [
    { address: '10.0.0.5', name: 'en0' },
    { address: '192.168.1.30', name: 'en1' }
  ]);
});

test('LAN startup output includes full local and iPhone-ready paths', () => {
  assert.deepEqual(startupLines({
    host: '0.0.0.0',
    lanAddresses: [{ address: '192.168.1.25', name: 'en0' }],
    openPath: '/demo/index.html',
    port: 5173,
    servedFrom: '/repo'
  }), [
    'Serving <writemark-editor> from /repo',
    'Listening: 0.0.0.0:5173',
    'Local:     http://127.0.0.1:5173/demo/index.html',
    'Network (en0): http://192.168.1.25:5173/demo/index.html',
    'Perf:      http://127.0.0.1:5173/perf/index.html',
    'Tests:     npm test',
    'Press Ctrl+C to stop.'
  ]);
});

test('loopback startup output explains how to enable LAN access', () => {
  const lines = startupLines({
    host: '127.0.0.1',
    port: 5173,
    servedFrom: '/repo'
  });

  assert.ok(lines.includes(
    'Network: disabled (restart with --lan or --host=0.0.0.0).'
  ));
  assert.ok(!lines.some(line => line.includes('192.168.')));
});

test('LAN startup output handles computers without an external IPv4 address', () => {
  const lines = startupLines({
    host: '0.0.0.0',
    lanAddresses: [],
    port: 5173,
    servedFrom: '/repo'
  });

  assert.ok(lines.includes(
    'Network: no external IPv4 address was detected.'
  ));
});

test('server URLs bracket IPv6 hosts and normalize paths', () => {
  assert.equal(
    serverUrl('::1', 5173, 'demo/index.html'),
    'http://[::1]:5173/demo/index.html'
  );
});
