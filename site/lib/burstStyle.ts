/*
 * What the press burst throws, per concept: each one celebrates in its own
 * material (clay pebbles, riso dots, terminal blocks, stitches, flowers...).
 * TIMELINE is the hidden branch log's: clock faces and hourglasses in amber,
 * out of a tall door-shaped ring. Never on the /agents page, which stays
 * plain. Glyphs stay to plain text symbols that never turn into colour
 * emoji, so they take the concept's colours.
 */

export type BurstStyle = {
  glyphs: string[];
  // The ring's shape: a circle, a square, or a tall rounded door.
  ring: 'round' | 'square' | 'door';
  // A font stack for the glyphs (default: system-ui, heavy).
  font?: string;
  // Fixed colours instead of the concept's.
  colours?: string[];
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const BY_CONCEPT: Record<string, BurstStyle> = {
  a: { glyphs: ['●', '⬮', '⬬', '●'], ring: 'round' },
  b: { glyphs: ['●', '◐', '◑', '▪', '•'], ring: 'round' },
  c: { glyphs: ['█', '▓', '▒', '░', '>', '_'], ring: 'square', font: MONO },
  d: { glyphs: ['✕', '★', '!', '■', '✱'], ring: 'square' },
  e: { glyphs: ['●', '■', '▲', '◗', '▬'], ring: 'round' },
  f: { glyphs: ['▰', '◆', '▲', '✄', '▱'], ring: 'square' },
  g: { glyphs: ['●', '◉', '✦', '★', '♥'], ring: 'round' },
  h: { glyphs: ['▚', '▞', '▖', '▗', '▘', '▝'], ring: 'square', font: MONO },
  i: { glyphs: ['◯', '○', '◦', '⬭'], ring: 'round' },
  j: { glyphs: ['+', '−', '◆', '⌁', '▮'], ring: 'square', font: MONO },
  k: { glyphs: ['✕', '⁄', '•', '~', '✗'], ring: 'round' },
  n: { glyphs: ['◉', '▮', '✦', '●', '◌'], ring: 'round' },
  o: { glyphs: ['+', '■', '▬', '0', '6'], ring: 'square' },
  p: { glyphs: ['✿', '❀', '✾', '❁', '•'], ring: 'round' },
  q: { glyphs: ['★', '♥', '✦', '●', '✱'], ring: 'round' },
  r: { glyphs: ['A', 'a', '&', '?', '!', 'g'], ring: 'square', font: 'Georgia, serif' },
  s: { glyphs: ['♪', '♫', '●', '✦', '◖'], ring: 'round' },
  t: { glyphs: ['·', '◦', '❘', '⁘', '❦'], ring: 'round' },
};

export const TIMELINE: BurstStyle = {
  glyphs: ['◷', '◶', '◵', '◴', '⧗', '⧖'],
  ring: 'door',
  colours: ['#ff8a1f', '#f4b860', '#c9661a', '#ffd9a0'],
};

const DEFAULT: BurstStyle = { glyphs: ['✦', '✶', '●', '■', '▲'], ring: 'round' };

export const burstStyle = (): BurstStyle => {
  const html = document.documentElement;
  return BY_CONCEPT[html.dataset.variant ?? ''] ?? DEFAULT;
};
