import Link from 'next/link';

import { RecordStamp } from '@/components/RecordStamp';
import { REPO_URL, SITE_URL } from '@/lib/site';

const LEGAL = [
  { href: '/imprint', label: 'Imprint' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/accessibility', label: 'Accessibility' },
];

const VERSION = process.env.NEXT_PUBLIC_VERSION ?? '0.0.0';
const BUILD = process.env.NEXT_PUBLIC_BUILD ?? 'dev';
const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? '';
const HOST = new URL(SITE_URL).host;

const items = [
  { label: '© variantly' },
  { label: `Release notes v${VERSION}`, href: `${REPO_URL}/releases` },
  // The build as a small case-number stamp: this exact version of the site, and when.
  { label: `Variant record VY-${BUILD}${BUILD_DATE && ` · logged ${BUILD_DATE}`}`, stamp: true },
  { label: 'Designed by highnet', href: 'https://highnet.at/', strong: true },
  { label: HOST, href: SITE_URL, strong: true },
];

/* The colophon strip under every page: what this is, which build, who made it. */
const SiteFooter = () => (
  <footer className="site-footer vy-grain bg-slate on-slate text-steel-on-slate grid gap-4 px-4 py-6 font-mono text-[11px] tracking-[0.08em] uppercase [font-stretch:87.5%]">
    <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-3 gap-y-1.5 p-0">
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden="true">·</span>}
          {'stamp' in it ? (
            <RecordStamp label={it.label} build={BUILD} />
          ) : it.href ? (
            <a
              href={it.href}
              className={
                it.strong ? 'text-surface hover:underline' : 'hover:text-surface hover:underline'
              }
            >
              {it.label}
            </a>
          ) : (
            <span>{it.label}</span>
          )}
        </li>
      ))}
    </ul>
    <nav aria-label="Legal" className="justify-self-center">
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1.5 p-0 normal-case">
        {LEGAL.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="hover:text-surface text-[12px] tracking-normal hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </footer>
);

export { SiteFooter };
