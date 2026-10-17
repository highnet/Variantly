import {
  Abril_Fatface,
  Archivo_Black,
  Fredoka,
  Grandstander,
  Jost,
  Bodoni_Moda,
  Bungee,
  Caveat_Brush,
  Cinzel,
  Great_Vibes,
  Monoton,
  Orbitron,
  Pacifico,
  Press_Start_2P,
  Righteous,
  Rubik_Mono_One,
  Special_Elite,
  UnifrakturMaguntia,
} from 'next/font/google';
import localFont from 'next/font/local';

// None of these is needed for first paint (the title stays hidden until its
// reveal starts), so none is preloaded.
// The intro's wardrobe: runes-ish, blackletter, scripts, typewriter, retro block.
const fraktur = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], preload: false });
const abril = Abril_Fatface({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-poster',
});
const cinzel = Cinzel({ weight: '900', subsets: ['latin'], preload: false });
const vibes = Great_Vibes({ weight: '400', subsets: ['latin'], preload: false });
const pacifico = Pacifico({ weight: '400', subsets: ['latin'], preload: false });
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
const bungee = Bungee({ weight: '400', subsets: ['latin'], preload: false });
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
const bagel = localFont({ src: '../app/fonts/wild/bagel.woff2', preload: false });
const shrikhand = localFont({ src: '../app/fonts/wild/shrikhand.woff2', preload: false });
const tiltWarp = localFont({ src: '../app/fonts/wild/tilt-warp.woff2', preload: false });
const climate = localFont({ src: '../app/fonts/wild/climate-crisis.woff2', preload: false });
const silkscreen = localFont({ src: '../app/fonts/wild/silkscreen.woff2', preload: false });
const rye = localFont({ src: '../app/fonts/wild/rye.woff2', preload: false });
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
// Concepts k, p, n: brushed hand, stitched outline, Didone.
const brush = Caveat_Brush({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  variable: '--font-brush',
});
const stitch = Grandstander({ subsets: ['latin'], preload: false, variable: '--font-stitch' });
const didone = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  preload: false,
  variable: '--font-didone',
});

export const HERO_FONT_VARS = [
  abril,
  elite,
  orbitron,
  fredoka,
  jost,
  archivo,
  rubik,
  brush,
  stitch,
  didone,
]
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
