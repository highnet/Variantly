import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { productFromCode, readmeIntro } from '../src/product.mjs';

test('the README intro skips headings, badges and code', () => {
  const md = '# Shop\n\n[![ci](x)](y)\n\n```sh\nnpm i\n```\n\nHandmade **oak** furniture, delivered by the [maker](https://x).\n\nMore.';
  assert.equal(readmeIntro(md), 'Handmade oak furniture, delivered by the maker.');
});

test('PRODUCT.md answers come from what the code says about itself', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'variantly-product-'));
  try {
    mkdirSync(path.join(dir, 'public'));
    writeFileSync(path.join(dir, 'public', 'logo.svg'), '<svg/>');
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'shop', description: 'A furniture shop.' }));
    writeFileSync(path.join(dir, 'index.html'), '<title>Oak &amp; Iron</title><meta name="description" content="Handmade furniture since 2019.">');
    const p = productFromCode(dir, '');
    assert.match(p.purpose, /“Oak & Iron”/);
    assert.match(p.purpose, /Handmade furniture since 2019\./);
    assert.match(p.purpose, /A furniture shop\./);
    assert.match(p.keep, /public\/logo\.svg/);
    assert.ok(p.users);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a project that says nothing about itself gets no PRODUCT.md', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'variantly-product-'));
  try {
    assert.equal(productFromCode(dir, '').purpose, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
