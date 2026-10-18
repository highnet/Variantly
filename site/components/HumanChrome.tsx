'use client';

import dynamic from 'next/dynamic';

import { LoadBar } from '@/components/LoadBar';

/*
 * The human view's decoration: the three.js backdrop, the concept switcher
 * dock, scroll reveals, the liquid step numerals and the small delights. Loaded on demand, so the agent
 * view never downloads or mounts any of it.
 */
const Backdrop = dynamic(() => import('@/components/backdrop/Backdrop').then((m) => m.Backdrop), {
  ssr: false,
});
const VariantSwitcher = dynamic(
  () => import('@/components/VariantSwitcher').then((m) => m.VariantSwitcher),
  { ssr: false },
);
const ScrollReveal = dynamic(
  () => import('@/components/ScrollReveal').then((m) => m.ScrollReveal),
  { ssr: false },
);
const LiquidPour = dynamic(() => import('@/components/LiquidPour').then((m) => m.LiquidPour), {
  ssr: false,
});
const Delight = dynamic(() => import('@/components/Delight').then((m) => m.Delight), {
  ssr: false,
});

const HumanChrome = () => (
  <>
    <LoadBar />
    <Backdrop />
    <VariantSwitcher />
    <ScrollReveal />
    <Delight />
    <LiquidPour />
  </>
);

export { HumanChrome };
