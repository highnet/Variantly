import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { createProxy } from '../src/proxy.mjs';

const INJECT = '<script src="/__variantly/frame.js"></script>';

/** @param {http.RequestListener} handler */
const upstream = async (handler) => {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { server, url: `http://127.0.0.1:${address.port}` };
};

test('injects after <head>, strips framing headers, drops content-length', async (t) => {
  const page = '<!doctype html><html><head><title>x</title></head></html>';
  const up = await upstream((req, res) => {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-length': String(Buffer.byteLength(page)),
      'x-frame-options': 'DENY',
      'content-security-policy': "frame-ancestors 'none'",
    });
    res.end(page);
  });
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  const res = await fetch(`http://127.0.0.1:${proxy.port}/`);
  const body = await res.text();
  assert.equal(res.headers.get('x-frame-options'), null);
  assert.equal(res.headers.get('content-security-policy'), null);
  assert.equal(body, `<!doctype html><html><head>${INJECT}<title>x</title></head></html>`);
});

test('finds <head attr> split across streamed chunks', async (t) => {
  const up = await upstream((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<!doctype html><html><he');
    setTimeout(() => {
      res.write('ad lang="en">');
      setTimeout(() => res.end('<body>streamed</body></html>'), 20);
    }, 20);
  });
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  const body = await (await fetch(`http://127.0.0.1:${proxy.port}/`)).text();
  assert.equal(body, `<!doctype html><html><head lang="en">${INJECT}<body>streamed</body></html>`);
});

test('leaves HTML fragments (htmx partials) and non-HTML untouched', async (t) => {
  const up = await upstream((req, res) => {
    if (req.url === '/partial') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<li>row</li>');
    } else {
      res.writeHead(200, { 'content-type': 'text/css' });
      res.end('body{color:red}');
    }
  });
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  assert.equal(await (await fetch(`http://127.0.0.1:${proxy.port}/partial`)).text(), '<li>row</li>');
  assert.equal(await (await fetch(`http://127.0.0.1:${proxy.port}/app.css`)).text(), 'body{color:red}');
});

test('rewrites loopback redirects to relative paths and forwards Host', async (t) => {
  let seenHost = '';
  const up = await upstream((req, res) => {
    seenHost = req.headers.host ?? '';
    res.writeHead(302, { location: `http://127.0.0.1:${req.socket.localPort}/login?next=%2F` });
    res.end();
  });
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  const res = await fetch(`http://127.0.0.1:${proxy.port}/`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/login?next=%2F');
  // Loopback upstreams see `localhost`: Next.js 16 rejects HMR from any other origin.
  assert.equal(seenHost, `localhost:${new URL(up.url).port}`);
});

test('asks upstream for identity encoding', async (t) => {
  let encoding = '';
  const up = await upstream((req, res) => {
    encoding = String(req.headers['accept-encoding']);
    res.end('ok');
  });
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  await (await fetch(`http://127.0.0.1:${proxy.port}/`, { headers: { 'accept-encoding': 'gzip, br' } })).text();
  assert.equal(encoding, 'identity');
});

test('passes websocket upgrades through (HMR)', async (t) => {
  const up = await upstream((req, res) => res.end());
  up.server.on('upgrade', (req, socket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    socket.on('data', (d) => socket.write(d)); // echo
  });
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  const echoed = await new Promise((resolve, reject) => {
    const sock = net.connect(proxy.port, '127.0.0.1', () => {
      sock.write('GET /hmr HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    });
    let buf = '';
    sock.on('data', (d) => {
      buf += d;
      if (buf.includes('\r\n\r\n') && !buf.includes('ping')) sock.write('ping');
      if (buf.includes('ping')) {
        sock.destroy();
        resolve(buf);
      }
    });
    sock.on('error', reject);
  });
  assert.match(String(echoed), /101 Switching Protocols[\s\S]*ping/);
});

test('serves a waiting page when upstream is down', async (t) => {
  const proxy = await createProxy({ target: 'http://127.0.0.1:9', inject: INJECT });
  t.after(() => proxy.close());
  const res = await fetch(`http://127.0.0.1:${proxy.port}/`);
  assert.equal(res.status, 502);
  assert.match(await res.text(), /Waiting for the dev server/);
});

test('local handler answers variantly paths without upstream', async (t) => {
  const proxy = await createProxy({
    target: 'http://127.0.0.1:9',
    inject: INJECT,
    local: (req, res) => {
      if (!req.url?.startsWith('/__variantly/')) return false;
      res.end('frame');
      return true;
    },
  });
  t.after(() => proxy.close());
  assert.equal(await (await fetch(`http://127.0.0.1:${proxy.port}/__variantly/frame.js`)).text(), 'frame');
});

test('makes absolute URLs to the dev server relative, even split across chunks', async (t) => {
  /** @type {string} */
  let page = '';
  const up = await upstream((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    const cut = Number(new URL(req.url ?? '/', 'http://x').searchParams.get('cut'));
    // Flush the two halves separately so the URL straddles a chunk edge.
    res.write(page.slice(0, cut));
    setTimeout(() => res.end(page.slice(cut)), 5);
  });
  const port = new URL(up.url).port;
  page =
    `<!doctype html><html><head><link rel="stylesheet" href="http://127.0.0.1:${port}/static/css/main.css"></head>` +
    `<body><a href="http://localhost:${port}">home</a><a href="http://127.0.0.1:${port}0/x">other port</a>` +
    `<img src="//[::1]:${port}/logo.png"></body></html>`;
  const want =
    `<!doctype html><html><head>${INJECT}<link rel="stylesheet" href="/static/css/main.css"></head>` +
    `<body><a href="/">home</a><a href="http://127.0.0.1:${port}0/x">other port</a>` +
    `<img src="/logo.png"></body></html>`;
  const proxy = await createProxy({ target: up.url, inject: INJECT });
  t.after(async () => {
    await proxy.close();
    up.server.close();
  });
  for (let cut = 1; cut < page.length; cut += 1) {
    const body = await (await fetch(`http://127.0.0.1:${proxy.port}/?cut=${cut}`)).text();
    assert.equal(body, want, `split at ${cut}`);
  }
});
