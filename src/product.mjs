// @ts-check
/*
 * PRODUCT.md from the code, for when the owner gave no answers: what the
 * project says about itself (package description, README intro, the page's
 * title and meta description). Written once and shared by every variant,
 * so no agent spends its session guessing, and all of them design for the
 * same product.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const read = (/** @type {string} */ file) => {
  try {
    return readFileSync(file, 'utf8').replace(/^﻿/, '');
  } catch {
    return '';
  }
};

/** The first prose paragraph of a README: no headings, badges, HTML or code. */
export const readmeIntro = (/** @type {string} */ md) => {
  const blocks = md.replace(/```[\s\S]*?```/g, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const t = b.trim();
    if (!t || /^(#|<|!\[|\[!\[|>|\||-{3,}|\* |- |\d+\. )/.test(t)) continue;
    const text = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
    if (text.length >= 30) return text.slice(0, 600);
  }
  return '';
};

const decode = (/** @type {string} */ t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Title and description from the files a page's head usually comes from. */
const pageMeta = (/** @type {string} */ appDir) => {
  const candidates = [
    'src/app/layout.tsx', 'app/layout.tsx', 'src/app/layout.jsx', 'app/layout.jsx', 'index.html', 'public/index.html', 'src/app.html',
    'nuxt.config.ts', 'app.vue', 'src/layouts/Layout.astro', 'src/layouts/BaseLayout.astro', 'resources/views/welcome.blade.php', 'app/views/layouts/application.html.erb', 'templates/base.html',
  ];
  let title = '';
  let description = '';
  for (const rel of candidates) {
    const src = read(path.join(appDir, rel));
    if (!src) continue;
    title ||= (src.match(/<title>([^<{]{3,120})<\/title>/i)?.[1] ?? src.match(/\btitle:\s*['"`]([^'"`]{3,120})['"`]/)?.[1] ?? '').trim();
    description ||= (src.match(/<meta\s+name=["']description["']\s+content=["']([^"']{10,300})/i)?.[1] ?? src.match(/\bdescription:\s*['"`]([^'"`]{10,300})['"`]/)?.[1] ?? '').trim();
    if (title && description) break;
  }
  return { title: decode(title), description: decode(description) };
};

/** Logo-like files in public folders: brand assets to keep. */
const brandAssets = (/** @type {string} */ appDir) => {
  const found = [];
  for (const dir of ['public', 'static', 'src/assets', 'assets']) {
    try {
      for (const f of readdirSync(path.join(appDir, dir))) if (/logo|brand|wordmark/i.test(f)) found.push(`${dir}/${f}`);
    } catch {}
  }
  return found.slice(0, 6);
};

/**
 * @param {string} repo
 * @param {string} appRel
 * @returns {import('./brief.mjs').ProductAnswers}
 */
export const productFromCode = (repo, appRel) => {
  const appDir = path.join(repo, appRel);
  const pkg = (() => {
    for (const dir of [appDir, repo]) {
      const p = path.join(dir, 'package.json');
      if (existsSync(p)) {
        try {
          return /** @type {{ name?: string, description?: string }} */ (JSON.parse(read(p)));
        } catch {}
      }
    }
    return {};
  })();
  const readme = readmeIntro(read(path.join(appDir, 'README.md')) || read(path.join(repo, 'README.md')));
  const meta = pageMeta(appDir);
  const said = [meta.title && `The page calls itself “${meta.title}”.`, meta.description, pkg.description, readme].filter(Boolean);
  const purpose = [...new Set(said)].join('\n\n');
  const assets = brandAssets(appDir);
  return {
    users: purpose ? 'Not stated by the owner. Infer the audience from what the product says about itself below and from the site’s content.' : '',
    purpose,
    keep: [
      meta.title || pkg.name ? `The product's name (${meta.title || pkg.name}).` : 'The product’s name.',
      'Every fact in the copy: names, numbers, prices, data sources, claims.',
      assets.length ? `Brand assets: ${assets.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
};
