'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

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

  // A hash link from the agent view (e.g. #docs) lands once the human view renders.
  useEffect(() => {
    const { hash } = window.location;
    if (audience === 'human' && hash.length > 1) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [audience]);

  const choose = useCallback((next: Audience) => {
    setAudience(next);
    const url = next === 'agent' ? '#agent' : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  return (
    <>
      <a
        href="#audience-panel"
        className="bg-ink text-surface fixed top-3 left-3 z-50 -translate-y-24 rounded-[4px] px-3.5 py-2.5 font-mono text-[13px] font-semibold no-underline focus:translate-y-0"
      >
        Skip to content
      </a>
      <header
        data-audience={audience}
        className="border-rule bg-panel/95 sticky top-0 z-20 border-b backdrop-blur-sm"
      >
        {/* Phones: brand and controls on one row, the audience tabs below.
            From sm up: brand, tabs centred, controls, in one 56px row. */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 pt-2 sm:h-14 sm:grid-cols-[1fr_auto_1fr] sm:px-6 sm:pt-0">
          {brand}
          <div
            role="tablist"
            aria-label="Who is reading"
            className="col-span-2 row-start-2 flex justify-center gap-6 sm:col-span-1 sm:col-start-2 sm:row-start-1"
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
                onClick={() => choose(o.id)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <div className="flex justify-end sm:col-start-3 sm:row-start-1">{aside}</div>
        </div>
      </header>
      <div
        id="audience-panel"
        role="tabpanel"
        tabIndex={-1}
        aria-labelledby={`fork-${audience}`}
        className="flex flex-1 flex-col outline-none"
      >
        {audience === 'human' ? human : agent}
      </div>
    </>
  );
};

export { AudienceFork };
