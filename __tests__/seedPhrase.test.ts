/**
 * seedPhrase.test.ts — unit tests for the onboarding seed-phrase generator.
 * ------------------------------------------------------------------
 * Pure logic, no React Native — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import {
  SEED_PHRASE_LENGTH,
  SEED_WORDLIST,
  looksLikePhrase,
  phraseToText,
  pickPhrase,
} from '../src/engine/onboarding/seedPhrase';

describe('SEED_WORDLIST', () => {
  it('is large enough to pick a phrase from', () => {
    expect(SEED_WORDLIST.length).toBeGreaterThanOrEqual(SEED_PHRASE_LENGTH);
  });
  it('has no duplicates', () => {
    expect(new Set(SEED_WORDLIST).size).toBe(SEED_WORDLIST.length);
  });
});

describe('pickPhrase', () => {
  it('returns SEED_PHRASE_LENGTH words by default', () => {
    expect(pickPhrase(1)).toHaveLength(SEED_PHRASE_LENGTH);
  });
  it('returns distinct words', () => {
    const phrase = pickPhrase(42);
    expect(new Set(phrase).size).toBe(phrase.length);
  });
  it('is deterministic for a given seed', () => {
    expect(pickPhrase(7)).toEqual(pickPhrase(7));
  });
  it('differs across seeds', () => {
    expect(pickPhrase(1)).not.toEqual(pickPhrase(2));
  });
  it('throws when count exceeds the wordlist size', () => {
    expect(() => pickPhrase(1, SEED_WORDLIST.length + 1)).toThrow();
  });
  it('every picked word lives in the wordlist', () => {
    const list = new Set(SEED_WORDLIST);
    for (const w of pickPhrase(99)) {
      expect(list.has(w)).toBe(true);
    }
  });
});

describe('phraseToText', () => {
  it('joins with single spaces and lowercases', () => {
    expect(phraseToText(['Ocean', 'forest'])).toBe('ocean forest');
  });
});

describe('looksLikePhrase', () => {
  it('accepts a real generated phrase', () => {
    expect(looksLikePhrase(phraseToText(pickPhrase(5)))).toBe(true);
  });
  it('accepts a phrase with extra whitespace', () => {
    const padded = `  ${phraseToText(pickPhrase(5)).replace(/ /g, '   ')}  `;
    expect(looksLikePhrase(padded)).toBe(true);
  });
  it('rejects the wrong length', () => {
    expect(looksLikePhrase('ocean forest')).toBe(false);
  });
  it('rejects out-of-wordlist tokens', () => {
    const phrase = pickPhrase(11);
    phrase[0] = 'definitelynotaword';
    expect(looksLikePhrase(phrase.join(' '))).toBe(false);
  });
});
