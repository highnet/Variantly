'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { burst } from '@/components/FreshLook';
import { Button } from '@/components/ui/Button';
import { TIMELINE } from '@/lib/burstStyle';
import { calmMotion } from '@/lib/prefs';

const BranchLog = lazy(() => import('@/components/BranchLog'));

// Three presses this close together open the log.
const WINDOW_MS = 650;

let greeted = false;

/*
 * The log opens with a small time-door burst from the stamp. It waits for the
 * log (lazy-loaded) and lifts itself into the top layer after
 * it, or the log's panel would cover it.
 */
const doorBurst = (from: HTMLElement | null, tries = 60) => {
  if (!from) return;
  if (!document.querySelector('[role="dialog"][aria-modal]') && tries > 0) {
    requestAnimationFrame(() => doorBurst(from, tries - 1));
    return;
  }
  const r = from.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 18, TIMELINE);
  const layer = document.body.lastElementChild;
  if (layer instanceof HTMLElement && layer.classList.contains('vy-burst') && layer.showPopover) {
    layer.popover = 'manual';
    layer.showPopover();
  }
};

type RecordStampProps = {
  label: string;
  build: string;
};

/* The footer's build stamp. It reads as plain text; it isn't only text. */
const RecordStamp = ({ label, build }: RecordStampProps) => {
  const [open, setOpen] = useState(false);
  const presses = useRef<number[]>([]);
  const self = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.log(
      '%c  ┌─────┐\n  │     │\n  │    ·│\n  │     │\n──┴─────┴──\n\nLooking for the branch you came from? Try the stamp at the bottom.',
      'font-family: monospace',
    );
  }, []);

  const press = () => {
    const now = Date.now();
    presses.current = [...presses.current.filter((t) => now - t < WINDOW_MS), now];
    if (presses.current.length >= 3) {
      presses.current = [];
      setOpen(true);
      if (!calmMotion() && document.documentElement.dataset.audience !== 'agent') {
        doorBurst(self.current);
      }
    }
  };

  return (
    <>
      <Button
        ref={self}
        variant="text"
        size="none"
        onClick={press}
        className="hover:text-surface cursor-default uppercase hover:no-underline"
      >
        {label}
      </Button>
      {open && (
        <Suspense fallback={null}>
          <BranchLog
            build={build}
            onClose={() => {
              setOpen(false);
              self.current?.focus();
            }}
          />
        </Suspense>
      )}
    </>
  );
};

export { RecordStamp };
