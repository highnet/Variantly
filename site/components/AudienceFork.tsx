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
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          {brand}
          <div role="tablist" aria-label="Who is reading" className="flex gap-6">
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
          <div className="flex justify-end">{aside}</div>
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
