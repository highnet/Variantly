import {
  Abril_Fatface,
  Archivo,
  Archivo_Black,
  Fredoka,
  Jost,
  Bungee,
  Cinzel,
  Doto,
  Great_Vibes,
  IBM_Plex_Mono,
  Monoton,
  Orbitron,
  Pacifico,
  Press_Start_2P,
  Righteous,
  Rubik_Mono_One,
  Silkscreen,
  Space_Grotesk,
  Special_Elite,
  UnifrakturMaguntia,
} from 'next/font/google';
import localFont from 'next/font/local';

// The title's first paint is its final lockup (the still poster the reveal
// starts from), so those nine faces are preloaded and block rather than swap:
// a fallback word that then jumps into nine faces would be a flash of its own.
// The rest of the wardrobe only shows once the reveal runs: not preloaded.
// The intro's wardrobe: runes-ish, blackletter, scripts, typewriter, retro block.
const fraktur = UnifrakturMaguntia({
  weight: '400',
  subsets: ['latin'],
  preload: true,
  display: 'block',
});
const abril = Abril_Fatface({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-poster',
});
const cinzel = Cinzel({ weight: '900', subsets: ['latin'], preload: true, display: 'block' });
const vibes = Great_Vibes({ weight: '400', subsets: ['latin'], preload: true, display: 'block' });
const pacifico = Pacifico({ weight: '400', subsets: ['latin'], preload: true, display: 'block' });
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
const bungee = Bungee({ weight: '400', subsets: ['latin'], preload: true, display: 'block' });
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
// Concepts h, j, o: Dither Machine, Instrument OS, Swiss Punk.
const silk = Silkscreen({
  weight: ['400', '700'],
  subsets: ['latin'],
  preload: false,
  variable: '--font-silk',
});
const doto = Doto({ subsets: ['latin'], preload: false, variable: '--font-doto' });
const archivoVar = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  preload: false,
  variable: '--font-archivo',
});
const grotesk = Space_Grotesk({ subsets: ['latin'], preload: false, variable: '--font-grotesk' });
const plex = IBM_Plex_Mono({
  weight: ['400', '600'],
  subsets: ['latin'],
  preload: false,
  variable: '--font-plex',
});
const hjo = [silk, doto, archivoVar, grotesk, plex];

export const HERO_FONT_VARS = [abril, elite, orbitron, fredoka, jost, archivo, rubik, ...hjo]
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
