// @ts-check
/*
 * The preview proxy. Every variant (and the original) gets one of these on
 * its own port, in front of its dev server. It does three things and is
 * otherwise invisible:
 *
 *  1. Injects variantly's frame script into HTML responses, as they stream,
 *     so the picker can sync scroll and navigation across the two panes of
 *     the comparison. The user's source is never touched.
 *  2. Removes the headers that stop a page from being framed
 *     (X-Frame-Options, CSP frame-ancestors). Django and Rails send these by
 *     default in development.
 *  3. Passes websocket upgrades straight through, so HMR keeps working.
 *
 * Bodies are never decompressed: the proxy asks upstream for identity
 * encoding instead, which every dev server honours.
 */
import http from 'node:http';
import net from 'node:net';

const HEAD_OPEN = /<head(\s[^>]*)?>/i;
const SCAN_LIMIT = 256 * 1024;

const STRIP_RESPONSE = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
]);

/**
 * @typedef {object} ProxyOptions
 * @property {string} target         e.g. http://127.0.0.1:3001
 * @property {string} inject         markup inserted right after <head>
 * @property {number} [port]         0 = pick a free one
 * @property {(req: http.IncomingMessage, res: http.ServerResponse) => boolean} [local]
 *           answers variantly's own paths (/__variantly/*) without upstream
 */

/**
 * @param {ProxyOptions} opts
 * @returns {Promise<{ port: number, server: http.Server, setTarget: (t: string) => void, close: () => Promise<void> }>}
 */
export const createProxy = (opts) => {
  let target = new URL(opts.target);
  /** @type {Set<net.Socket>} */
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    if (opts.local?.(req, res)) return;
    const headers = { ...req.headers };
    headers.host = target.host;
    headers['accept-encoding'] = 'identity';
    if (headers.origin) headers.origin = target.origin;
    if (typeof headers.referer === 'string') headers.referer = rewriteToTarget(headers.referer, target);
    // Ask for the full page, never a 304 we would have nothing to inject into.
    delete headers['if-none-match'];
    delete headers['if-modified-since'];

    const upstream = http.request(
      {
        host: bare(target.hostname),
        port: target.port,
        method: req.method,
        path: req.url,
        headers,
      },
      (up) => {
        /** @type {http.OutgoingHttpHeaders} */
        const out = {};
        for (const [key, value] of Object.entries(up.headers)) {
          if (STRIP_RESPONSE.has(key) || value === undefined) continue;
          out[key] = value;
        }
        if (typeof out.location === 'string') out.location = relativeLocation(out.location, target);
        const type = String(up.headers['content-type'] ?? '');
        const isHtml = type.includes('text/html') && req.method !== 'HEAD';
        if (!isHtml) {
          res.writeHead(up.statusCode ?? 502, up.statusMessage, out);
          up.pipe(res);
          return;
        }
        delete out['content-length'];
        delete out.etag;
        out['cache-control'] = 'no-store';
        res.writeHead(up.statusCode ?? 200, up.statusMessage, out);
        pipeWithInjection(up, res, opts.inject);
      },
    );
    upstream.on('error', (err) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.writeHead(502, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(unavailablePage(target.href, err.message, opts.inject));
    });
    req.pipe(upstream);
  });

  // Websockets (HMR): replay the upgrade request upstream and splice sockets.
  server.on('upgrade', (req, client, head) => {
    const up = net.connect(Number(target.port), bare(target.hostname), () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const name = req.rawHeaders[i];
        let value = req.rawHeaders[i + 1];
        if (name.toLowerCase() === 'host') value = target.host;
        if (name.toLowerCase() === 'origin') value = target.origin;
        lines.push(`${name}: ${value}`);
      }
      up.write(lines.join('\r\n') + '\r\n\r\n');
      if (head?.length) up.write(head);
      up.pipe(client);
      client.pipe(up);
    });
    const done = () => {
      up.destroy();
      client.destroy();
    };
    up.on('error', done);
    client.on('error', done);
    up.on('close', done);
    client.on('close', done);
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? 0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        port,
        server,
        setTarget: (t) => {
          target = new URL(t);
        },
        close: () =>
          new Promise((r) => {
            for (const s of sockets) s.destroy();
            server.close(() => r());
          }),
      });
    });
  });
};

/**
 * Stream an HTML body through, inserting `inject` right after the opening
 * <head> tag. Only the first SCAN_LIMIT bytes are held back while looking
 * for it; streamed SSR (React, Svelte, Nuxt) keeps streaming after that.
 * @param {http.IncomingMessage} up
 * @param {http.ServerResponse} res
 * @param {string} inject
 */
const pipeWithInjection = (up, res, inject) => {
  let pending = '';
  let done = false;
  up.setEncoding('utf8');
  up.on('data', (/** @type {string} */ chunk) => {
    if (done) {
      res.write(chunk);
      return;
    }
    pending += chunk;
    const match = HEAD_OPEN.exec(pending);
    if (match) {
      const at = match.index + match[0].length;
      res.write(pending.slice(0, at) + inject + pending.slice(at));
      pending = '';
      done = true;
    } else if (pending.length > SCAN_LIMIT) {
      res.write(inject + pending);
      pending = '';
      done = true;
    }
  });
  up.on('end', () => {
    if (!done) {
      // A fragment or a page without <head>: htmx partials must not get a
      // second copy of the script, so only whole documents are injected.
      res.end(/<html|<body|<!doctype/i.test(pending) ? inject + pending : pending);
    } else res.end();
  });
  up.on('error', () => res.destroy());
};

/**
 * @param {string} location
 * @param {URL} target
 */
const relativeLocation = (location, target) => {
  try {
    const url = new URL(location, target);
    const loopback = /^(localhost|127\.0\.0\.1|\[::1\])$/;
    if (loopback.test(url.hostname) && url.port === target.port) return url.pathname + url.search + url.hash;
  } catch {}
  return location;
};

/**
 * @param {string} referer
 * @param {URL} target
 */
const rewriteToTarget = (referer, target) => {
  try {
    const url = new URL(referer);
    return target.origin + url.pathname + url.search;
  } catch {
    return referer;
  }
};

/**
 * @param {string} target
 * @param {string} reason
 * @param {string} inject
 */
const unavailablePage = (target, reason, inject) => `<!doctype html><html><head>${inject}<meta charset="utf-8"><title>Starting…</title>
<meta http-equiv="refresh" content="2">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px/1.5 ui-sans-serif,system-ui,sans-serif;background:#f4f1ea;color:#1d1b17}
p{max-width:36ch;text-align:center}code{font-size:13px;opacity:.7}</style></head>
<body><p>Waiting for the dev server at <code>${escapeHtml(target)}</code>.<br><code>${escapeHtml(reason)}</code></p></body></html>`;

/** URL.hostname keeps IPv6 brackets; sockets want them gone. @param {string} h */
const bare = (h) => h.replace(/^\[|\]$/g, '');

/** @param {string} s */
export const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
