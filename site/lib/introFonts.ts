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

// The intro's wardrobe: runes-ish, blackletter, scripts, typewriter, retro block.
const fraktur = UnifrakturMaguntia({ weight: '400', subsets: ['latin'] });
const abril = Abril_Fatface({ weight: '400', subsets: ['latin'], variable: '--font-poster' });
const cinzel = Cinzel({ weight: '900', subsets: ['latin'] });
const vibes = Great_Vibes({ weight: '400', subsets: ['latin'] });
const pacifico = Pacifico({ weight: '400', subsets: ['latin'] });
const elite = Special_Elite({ weight: '400', subsets: ['latin'], variable: '--font-typewriter' });
const orbitron = Orbitron({ weight: '900', subsets: ['latin'], variable: '--font-arcade' });
const monoton = Monoton({ weight: '400', subsets: ['latin'] });
const bungee = Bungee({ weight: '400', subsets: ['latin'] });
const rubik = Rubik_Mono_One({ weight: '400', subsets: ['latin'], variable: '--font-ransom' });
const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'] });
const righteous = Righteous({ weight: '400', subsets: ['latin'] });
// Hero display faces, one per variant concept.
const fredoka = Fredoka({ weight: '700', subsets: ['latin'], variable: '--font-clay' });
const jost = Jost({ weight: '800', subsets: ['latin'], variable: '--font-geo' });
const archivo = Archivo_Black({ weight: '400', subsets: ['latin'], variable: '--font-brutal' });

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
