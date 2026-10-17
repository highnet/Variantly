'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { VariantKey } from '@/components/backdrop/variants';

export type RunnerId = 'npm' | 'pnpm' | 'yarn' | 'bun';

type SiteState = {
  // Package manager every command on the page is written for.
  runner: RunnerId;
  // Homepage concept (a–f).
  variant: VariantKey;
  // False until localStorage has been read, so the server render and the
  // first client render agree.
  hydrated: boolean;
  setRunner: (runner: RunnerId) => void;
  setVariant: (variant: VariantKey) => void;
};

export const useSiteStore = create<SiteState>()(
  persist(
    (set) => ({
      runner: 'npm',
      variant: 'a',
      hydrated: false,
      setRunner: (runner) => set({ runner }),
      setVariant: (variant) => set({ variant }),
    }),
    {
      name: 'variantly:site',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ runner, variant }) => ({ runner, variant }),
      // Rehydrated by <StoreHydrator /> after mount.
      skipHydration: true,
    },
  ),
);
