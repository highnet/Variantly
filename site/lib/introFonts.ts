import {
  Abril_Fatface,
  Anybody,
  Cormorant,
  Fraunces,
  Archivo_Black,
  Bricolage_Grotesque,
  Fredoka,
  Jost,
  Monoton,
  Orbitron,
  Press_Start_2P,
  Righteous,
  Rubik_Mono_One,
  Special_Elite,
} from 'next/font/google';
import localFont from 'next/font/local';

// The title's first paint is its final lockup (the still poster the reveal
// starts from), so those nine faces are preloaded and block rather than swap:
// a fallback word that then jumps into nine faces would be a flash of its own.
// All nine are self-hosted and subset to the letters of "variantly"
// (scripts/build-3d-fonts.mjs), about 25 KB together instead of ~115 KB.
// The rest of the wardrobe only shows once the reveal runs: not preloaded.
// The intro's wardrobe: runes-ish, blackletter, scripts, typewriter, retro block.
const fraktur = localFont({
  src: '../app/fonts/wild/fraktur.woff2',
  preload: true,
  display: 'block',
});
const abril = Abril_Fatface({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-poster',
});
const cinzel = localFont({
  src: '../app/fonts/wild/cinzel.woff2',
  preload: true,
  display: 'block',
});
const vibes = localFont({
  src: '../app/fonts/wild/great-vibes.woff2',
  preload: true,
  display: 'block',
});
const pacifico = localFont({
  src: '../app/fonts/wild/pacifico.woff2',
  preload: true,
  display: 'block',
});
const elite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-typewriter',
});
const orbitron = Orbitron({
  weight: '900',
  subsets: ['latin'],
  preload: false,
  variable: '--font-arcade',
});
const monoton = Monoton({ weight: '400', subsets: ['latin'], preload: false });
const bungee = localFont({
  src: '../app/fonts/wild/bungee.woff2',
  preload: true,
  display: 'block',
});
const rubik = Rubik_Mono_One({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-ransom',
});
const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'], preload: false });
const righteous = Righteous({ weight: '400', subsets: ['latin'], preload: false });
// Wild display faces (SIL OFL 1.1), self-hosted and subset to the letters of
// "variantly" by scripts/build-3d-fonts.mjs (1-4 KB each), from the same files
// as their 3D outlines. Display-only: nothing else on the page uses them.
const bagel = localFont({ src: '../app/fonts/wild/bagel.woff2', preload: true, display: 'block' });
const shrikhand = localFont({
  src: '../app/fonts/wild/shrikhand.woff2',
  preload: true,
  display: 'block',
});
const tiltWarp = localFont({
  src: '../app/fonts/wild/tilt-warp.woff2',
  preload: true,
  display: 'block',
});
const climate = localFont({ src: '../app/fonts/wild/climate-crisis.woff2', preload: false });
const silkscreen = localFont({ src: '../app/fonts/wild/silkscreen.woff2', preload: false });
const rye = localFont({ src: '../app/fonts/wild/rye.woff2', preload: true, display: 'block' });
const fascinate = localFont({ src: '../app/fonts/wild/fascinate.woff2', preload: false });
const wetPaint = localFont({ src: '../app/fonts/wild/wet-paint.woff2', preload: false });
// Hero display faces, one per variant concept.
const fredoka = Fredoka({
  weight: '700',
  subsets: ['latin'],
  preload: false,
  variable: '--font-clay',
});
const jost = Jost({ weight: '800', subsets: ['latin'], preload: false, variable: '--font-geo' });
const archivo = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-brutal',
});

// Concepts q, r, s, t: Sticker Bomb, Kinetic Type (width and weight axes),
// Lived-in Den (soft, wonky), Stone & Linen.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['wdth', 'opsz'],
  preload: false,
  variable: '--font-bricolage',
});
const anybody = Anybody({
  subsets: ['latin'],
  axes: ['wdth'],
  preload: false,
  variable: '--font-anybody',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  preload: false,
  variable: '--font-fraunces',
});
const cormorant = Cormorant({ subsets: ['latin'], preload: false, variable: '--font-cormorant' });
const qrst = [bricolage, anybody, fraunces, cormorant];

export const HERO_FONT_VARS = [abril, elite, orbitron, fredoka, jost, archivo, rubik, ...qrst]
  .map((f) => f.variable)
  .join(' ');

export const INTRO_FONTS = [
  fraktur,
  abril,
  cinzel,
  vibes,
  pacifico,
  elite,
  orbitron,
  monoton,
  bungee,
  rubik,
  pixel,
  righteous,
  // Order must match FACES in scripts/build-3d-fonts.mjs.
  bagel,
  shrikhand,
  tiltWarp,
  climate,
  silkscreen,
  rye,
  fascinate,
  wetPaint,
].map((f) => f.className);

// Final lockup per letter of "variantly": deliberately mismatched, wild faces
// between classic ones, every letter still legible.
export const INTRO_FINAL = [
  cinzel,
  bagel,
  vibes,
  fraktur,
  shrikhand,
  bungee,
  rye,
  pacifico,
  tiltWarp,
].map((f) => f.className);
