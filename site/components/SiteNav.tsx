'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export const NAV = [
  { href: '/', label: 'Demo' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/start', label: 'Get started' },
  { href: '/safety', label: 'Safety' },
  { href: '/docs', label: 'Docs' },
  { href: '/agents', label: 'For agents' },
] as const;

type SiteNavProps = {
  brand: ReactNode;
  /** Preferences and the GitHub link, right of the nav. */
  aside: ReactNode;
};

/*
 * The header on every page: brand, the section links, then the controls.
 * Below md the links fold into a menu button that opens a panel under the
 * header; Escape, a link press or a route change closes it.
 */
const SiteNav = ({ brand, aside }: SiteNavProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openAt, setOpenAt] = useState(pathname);
  const toggle = useRef<HTMLButtonElement>(null);

  // A new page closes the menu.
  if (openAt !== pathname) {
    setOpenAt(pathname);
    setOpen(false);
  }

  // The brand mark morphs into an agent node on the agent page.
  useEffect(() => {
    document.documentElement.dataset.audience = pathname === '/agents' ? 'agent' : 'human';
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const links = (className: string) =>
    NAV.map((n, i) => {
      const current = pathname === n.href;
      return (
        <li key={n.href} style={{ '--i': i } as CSSProperties}>
          <Link
            href={n.href}
            aria-current={current ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              'font-mono text-[13px] font-semibold tracking-wide uppercase [font-stretch:87.5%] no-underline',
              current ? 'text-ink' : 'text-steel hover:text-ink',
              className,
            )}
          >
            {n.href === '/agents' && (
              <Clock aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-0.15em]" />
            )}
            {n.label}
          </Link>
        </li>
      );
    });

  return (
    <header className="border-rule bg-panel/95 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        {brand}
        <nav aria-label="Main" className="hidden md:block">
          <ul className="m-0 flex list-none items-center gap-6 p-0 lg:gap-8">
            {links('border-b-2 border-transparent py-1 aria-[current=page]:border-current')}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          {aside}
          <Button
            ref={toggle}
            variant="header-icon"
            size="icon"
            className="vy-burger md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {/* Three bars that fold into an X (styled in globals.css). */}
            <span aria-hidden="true" className="vy-burger-box">
              <span />
              <span />
              <span />
            </span>
          </Button>
        </div>
      </div>
      <nav
        id="site-menu"
        aria-label="Main"
        inert={!open}
        data-open={open}
        className="vy-menu md:hidden"
      >
        <div>
          <ul className="border-rule bg-panel m-0 grid list-none border-t px-4 pb-4">
            {links('border-rule block border-b py-3.5 text-[15px]')}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export { SiteNav };
