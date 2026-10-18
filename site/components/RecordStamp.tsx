'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

const BranchLog = lazy(() => import('@/components/BranchLog'));

// Three presses this close together open the log.
const WINDOW_MS = 650;

let greeted = false;

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
