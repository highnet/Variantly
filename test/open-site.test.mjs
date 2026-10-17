import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiteRunner, folderOpener } from '../src/open-site.mjs';

test('folderOpener passes only the path, per platform', () => {
  assert.deepEqual(folderOpener('C:\a b', 'win32'), { cmd: 'explorer.exe', args: ['C:\a b'] });
  assert.deepEqual(folderOpener('/x', 'darwin'), { cmd: 'open', args: ['/x'] });
  assert.deepEqual(folderOpener('/x', 'linux'), { cmd: 'xdg-open', args: ['/x'] });
});

test('open-site starts the configured command on the working tree, reuses it, and stops it', async () => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'vly-site-'));
  writeFileSync(
    path.join(repo, 'srv.mjs'),
    "import http from 'node:http'; http.createServer((q, s) => s.end('kept')).listen(Number(process.argv[2]), '127.0.0.1');",
  );
  const config = /** @type {any} */ ({ appRel: '.', stackId: 'custom', command: '{node} srv.mjs {port}', originalUrl: '' });
  const site = createSiteRunner(repo, () => config);
  try {
    const { url } = await site.open();
    assert.match(url, /^http:\/\/localhost:\d+$/);
    assert.equal(await (await fetch(url.replace('localhost', '127.0.0.1'))).text(), 'kept');
    assert.equal((await site.open()).url, url);
  } finally {
    await site.close();
    rmSync(repo, { recursive: true, force: true });
  }
});

test('open-site returns an already-running original URL as is', async () => {
  const site = createSiteRunner('.', () => /** @type {any} */ ({ originalUrl: 'http://localhost:4000', command: '' }));
  assert.deepEqual(await site.open(), { url: 'http://localhost:4000' });
});
