// The pronunciation layer: written narration (captions, SRT) → spoken text
// (what ElevenLabs reads), word for word, so word timings map back onto the
// written words. Rules live in pronunciations.json.
import { at, readJson } from './common.mjs';

const dict = readJson(at('pronunciations.json'));
const exact = new Map();
const loose = new Map();
for (const r of dict.rules) (r.case ? exact : loose).set(r.case ? r.word : r.word.toLowerCase(), r.say);
const patterns = dict.patterns.map((p) => ({ ...p, re: new RegExp(p.match, 'u') }));

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
/** Integers under a billion, in words: 3490 → "three thousand four hundred ninety". */
export function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ''}`;
  for (const [size, name] of [[1e6, 'million'], [1e3, 'thousand']]) {
    if (n >= size) return `${numberWords(Math.floor(n / size))} ${name}${n % size ? ` ${numberWords(n % size)}` : ''}`;
  }
  return String(n);
}
const decimalWords = (s) => {
  const [whole, frac] = s.replace(/,/g, '').split('.');
  return numberWords(Number(whole)) + (frac ? ` point ${[...frac].map((d) => ONES[Number(d)]).join(' ')}` : '');
};
const UNITS = { MB: 'megabytes', KB: 'kilobytes' };

/** One written word (no surrounding punctuation) → its spoken form, or null. */
function ruleFor(core) {
  if (exact.has(core)) return exact.get(core);
  if (loose.has(core.toLowerCase())) return loose.get(core.toLowerCase());
  for (const p of patterns) {
    const m = core.match(p.re);
    if (!m) continue;
    return p.say
      .replace('{n1}', () => decimalWords(m[1]))
      .replace('{n2}', () => numberWords(Number(m[2])))
      .replace('{unit}', () => UNITS[m[2]] ?? m[2]);
  }
  return null;
}

const split = (token) => {
  const m = token.match(/^([("“'‘]*)(.*?)([)"”'’.,;:!?…]*)$/u);
  return { pre: m[1], core: m[2], post: m[3] };
};

/**
 * Written line → { spoken, counts }: counts[i] is how many spoken words the
 * i-th written word became. A scene's `say` overrides the whole line.
 */
export function toSpoken(text, say) {
  const written = text.split(/\s+/).filter(Boolean);
  if (say) return { spoken: say, counts: null, written };
  const out = [];
  const counts = [];
  for (const token of written) {
    const { pre, core, post } = split(token);
    const alias = core ? ruleFor(core) : null;
    const spoken = alias ? `${pre}${alias}${post}` : token;
    const words = spoken.split(/\s+/).filter(Boolean);
    out.push(...words);
    counts.push(words.length);
  }
  return { spoken: out.join(' '), counts, written };
}

/**
 * Spoken word timings → written word timings. With counts, each written word
 * spans its spoken words; without (a `say` override), the line is spread
 * proportionally by length.
 */
export function toWritten(spokenWords, { counts, written }) {
  if (counts && counts.reduce((a, b) => a + b, 0) === spokenWords.length) {
    let i = 0;
    return written.map((word, w) => {
      const group = spokenWords.slice(i, i + counts[w]);
      i += counts[w];
      return { word, start: group[0].start, end: group.at(-1).end };
    });
  }
  if (!spokenWords.length) return [];
  const t0 = spokenWords[0].start, t1 = spokenWords.at(-1).end;
  const weight = written.map((w) => w.length + 1);
  const total = weight.reduce((a, b) => a + b, 0);
  let acc = 0;
  return written.map((word, i) => {
    const start = t0 + ((t1 - t0) * acc) / total;
    acc += weight[i];
    return { word, start: Number(start.toFixed(3)), end: Number((t0 + ((t1 - t0) * acc) / total).toFixed(3)) };
  });
}

/**
 * Words a TTS voice may misread and no rule covers: capitals inside or
 * throughout a word, digits, symbols, file names and URLs.
 */
export function risky(text) {
  const found = new Set();
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const { core } = split(token);
    if (!core || ruleFor(core)) continue;
    const parts = core.split(/[—–]/).filter(Boolean);
    for (const part of parts) {
      if (ruleFor(part)) continue;
      const bare = part.replace(/'s$|’s$/u, '');
      if (ruleFor(bare)) continue;
      if (/[A-Z]{2,}/.test(bare) || /[a-z][A-Z]/.test(bare) || /\d/.test(bare) || /[&/#:~@_=+<>|\\]/.test(bare) || /\.[a-z]/i.test(bare) || /^https?:/i.test(bare)) found.add(bare);
    }
  }
  return [...found];
}

/** The rules as a W3C PLS lexicon with alias entries, for ElevenLabs. */
export function toPls() {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lexemes = dict.rules
    .filter((r) => r.say !== r.word)
    .map((r) => `  <lexeme>\n    <grapheme>${esc(r.word)}</grapheme>\n    <alias>${esc(r.say)}</alias>\n  </lexeme>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated from pronunciations.json by voice.mjs --dict. Edit the JSON, not this file. -->\n<lexicon version="1.0" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon" alphabet="ipa" xml:lang="en-US">\n${lexemes}\n</lexicon>\n`;
}
