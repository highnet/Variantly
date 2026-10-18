'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import Swatch from './Swatch';

// Swatch sits on the hero's side card, which lives outside the backdrop: a
// client island portals it there after hydration (null on the server).
const noop = () => () => {};
const hero = () => document.querySelector('[data-hero-side]');
const none = () => null;

const SwatchPortal = () => {
  const side = useSyncExternalStore(noop, hero, none);
  return side ? createPortal(<Swatch />, side) : null;
};

export default SwatchPortal;
