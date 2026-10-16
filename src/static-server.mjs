#!/usr/bin/env node
// @ts-check
/*
 * The dev server for plain HTML projects: serves the current directory on the
 * port given as the first argument. Directory URLs resolve to index.html, and
 * a missing extension tries `.html`, so `/about` finds `about.html`.
 */
import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = /** @type {Record<string, string>} */ ({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
});

/**
 * @param {string} root
 * @param {number} port
 */
export function serveStatic(root, port) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let pathname = "/";
    try {
      pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    } catch {}
    const target = path.resolve(base, "." + pathname);
    if (target !== base && !target.startsWith(base + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    for (const candidate of [target, path.join(target, "index.html"), target + ".html"]) {
      try {
        const stat = statSync(candidate);
        if (!stat.isFile()) continue;
        res.writeHead(200, {
          "content-type": TYPES[path.extname(candidate).toLowerCase()] ?? "application/octet-stream",
          "content-length": stat.size,
          "cache-control": "no-store",
        });
        createReadStream(candidate).on("error", () => res.destroy()).pipe(res);
        return;
      } catch {}
    }
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  });
  server.listen(port, "127.0.0.1");
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
  serveStatic(process.cwd(), port);
  console.log(`static server on http://127.0.0.1:${port}`);
}
