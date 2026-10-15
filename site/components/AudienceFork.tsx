'use client';

import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

type Audience = 'human' | 'agent';

const OPTIONS: { id: Audience; label: string }[] = [
  { id: 'human', label: 'I’m a human' },
  { id: 'agent', label: 'I’m an agent' },
];

const fromHash = (): Audience =>
  typeof window !== 'undefined' && window.location.hash === '#agent' ? 'agent' : 'human';

type AudienceForkProps = {
  human: ReactNode;
  agent: ReactNode;
  brand: ReactNode;
  aside: ReactNode;
};

/*
 * The fork lives in the header strip. `#agent` in the URL opens the agent
 * view directly, so a link handed to an agent lands on the quickstart.
 */
const AudienceFork = ({ human, agent, brand, aside }: AudienceForkProps) => {
  const [audience, setAudience] = useState<Audience>('human');

  useEffect(() => {
    const sync = () => setAudience(fromHash());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const choose = useCallback((next: Audience) => {
    setAudience(next);
    const url = next === 'agent' ? '#agent' : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = audience === 'human' ? 'agent' : 'human';
    choose(next);
    document.getElementById(`fork-${next}`)?.focus();
  };

  return (
    <>
      <header className="border-rule bg-panel/95 sticky top-0 z-20 border-b backdrop-blur-sm">
        <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          {brand}
          <div
            role="tablist"
            aria-label="Who is reading"
            className="flex gap-6"
            onKeyDown={onKeyDown}
          >
            {OPTIONS.map((o) => (
              <Button
                key={o.id}
                id={`fork-${o.id}`}
                role="tab"
                variant="tab"
                size="tab"
                aria-selected={audience === o.id}
                aria-controls="audience-panel"
                tabIndex={audience === o.id ? 0 : -1}
                onClick={() => choose(o.id)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <div className="flex justify-end">{aside}</div>
        </div>
      </header>
      <div id="audience-panel" role="tabpanel" aria-labelledby={`fork-${audience}`}>
        {audience === 'human' ? human : agent}
      </div>
    </>
  );
};

export { AudienceFork };
