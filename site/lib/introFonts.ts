import {
  Abril_Fatface,
  Archivo_Black,
  Fredoka,
  Jost,
  Bungee,
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

export const HERO_FONT_VARS = [abril, elite, orbitron, fredoka, jost, archivo, rubik]
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
].map((f) => f.className);

// Final lockup per letter of "variantly": deliberately mismatched.
export const INTRO_FINAL = [
  cinzel,
  rubik,
  vibes,
  fraktur,
  abril,
  bungee,
  elite,
  pacifico,
  orbitron,
].map((f) => f.className);
