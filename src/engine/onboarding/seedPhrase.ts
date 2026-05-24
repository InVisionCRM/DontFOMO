/**
 * seedPhrase.ts — the onboarding wallet's cosmetic seed phrase.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Generates the 12-word "recovery phrase" shown during onboarding
 * (Bible §13). These are NOT real BIP-39 words and NOT a real
 * wallet — DON'T FOMO is a simulation, not a custodial product
 * (CLAUDE.md §7's "practice what the game preaches"). The words are
 * theatrical: they exist to make the Clipboard Scam land (Scam
 * Library v1.1 Event #5), not to sign any real transaction.
 *
 * The generator is seeded so unit tests are deterministic.
 */

import { createRandom } from '../market/random';

/** Required phrase length per the mockup and Bible §13. */
export const SEED_PHRASE_LENGTH = 12;

/**
 * In-game wordlist. Short, natural words that read like a real
 * wallet phrase but carry no real cryptographic meaning.
 */
export const SEED_WORDLIST: readonly string[] = [
  'ocean', 'forest', 'velvet', 'ranch', 'puzzle', 'copper',
  'drift', 'maple', 'signal', 'harbor', 'zebra', 'orbit',
  'meadow', 'canyon', 'planet', 'plasma', 'crystal', 'thunder',
  'amber', 'silver', 'cobalt', 'marble', 'pebble', 'breeze',
  'glacier', 'mirage', 'comet', 'nebula', 'horizon', 'lantern',
  'spruce', 'beacon', 'falcon', 'jasper', 'ivory', 'sable',
  'spark', 'echo', 'haven', 'pillar', 'tundra', 'voyage',
  'velour', 'verbena', 'ridge', 'cinder', 'sapphire', 'cobra',
  'lagoon', 'porcelain', 'crater', 'magma', 'aurora', 'gravel',
  'wisp', 'cypher', 'glyph', 'rune', 'sphinx', 'volt',
  'cascade', 'fjord', 'savanna', 'trident', 'arrow', 'hatchet',
  'lattice', 'mosaic', 'parable', 'quasar', 'satchel', 'tessera',
  'umber', 'visage', 'whisker', 'xeric', 'yonder', 'zephyr',
  'almond', 'birch', 'cedar', 'dune', 'ember', 'finch',
  'granite', 'hollow', 'iris', 'juniper', 'kelp', 'lichen',
  'mango', 'nectar', 'opal', 'pollen', 'quartz', 'reef',
];

/**
 * Pick `count` distinct words from `wordlist` using the seeded
 * generator. Deterministic for a given seed. Fisher-Yates partial
 * shuffle — picks `count` items in O(count) without copying the
 * whole tail.
 */
export function pickPhrase(
  seed: number,
  count: number = SEED_PHRASE_LENGTH,
  wordlist: readonly string[] = SEED_WORDLIST,
): string[] {
  if (count > wordlist.length) {
    throw new Error(
      `pickPhrase: cannot pick ${count} distinct from ${wordlist.length}`,
    );
  }
  const rand = createRandom(seed);
  const pool = [...wordlist];
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rand() * (pool.length - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
    out.push(pool[i]);
  }
  return out;
}

/**
 * Canonical text form of a phrase — single-spaced, lowercase. The
 * representation used by the Clipboard app and the scan tick.
 */
export function phraseToText(phrase: readonly string[]): string {
  return phrase.map((w) => w.toLowerCase()).join(' ');
}

/**
 * True if the supplied text *looks* like a stored seed phrase — i.e.
 * exactly `length` tokens, each from the in-game wordlist. The
 * Scam Director's clipboard-scan tick uses this as a defensive
 * second path next to the explicit `isSensitive` flag.
 */
export function looksLikePhrase(
  text: string,
  length: number = SEED_PHRASE_LENGTH,
  wordlist: readonly string[] = SEED_WORDLIST,
): boolean {
  const tokens = text.trim().toLowerCase().split(/\s+/);
  if (tokens.length !== length) return false;
  const set = new Set(wordlist);
  return tokens.every((t) => set.has(t));
}
