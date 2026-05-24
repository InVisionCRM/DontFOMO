/**
 * clipboardScan.test.ts — Scam Director clipboard-scan primitive.
 * ------------------------------------------------------------------
 * Pure logic, no React Native — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import { scanClipboard } from '../src/engine/scam-director/clipboardScan';
import { phraseToText, pickPhrase } from '../src/engine/onboarding/seedPhrase';
import type { ClipboardEntry } from '../src/engine/clipboard/clipboard';

const entry = (
  id: string,
  content: string,
  isSensitive: boolean = false,
): ClipboardEntry => ({ id, content, copiedAt: 1, isSensitive });

describe('scanClipboard', () => {
  it('returns none on an empty clipboard', () => {
    expect(scanClipboard([])).toEqual({ found: null, reason: 'none' });
  });

  it('reports the sensitive flag first', () => {
    const seed = phraseToText(pickPhrase(1));
    const result = scanClipboard([
      entry('plain', 'hello world'),
      entry('seed', seed, true),
    ]);
    expect(result.found?.id).toBe('seed');
    expect(result.reason).toBe('isSensitive');
  });

  it('also catches a phrase-shaped entry by content alone', () => {
    const seed = phraseToText(pickPhrase(2));
    const result = scanClipboard([
      entry('plain', 'just a note'),
      entry('seed', seed, false),
    ]);
    expect(result.found?.id).toBe('seed');
    expect(result.reason).toBe('looksLikePhrase');
  });

  it('returns none when nothing looks like a phrase', () => {
    expect(
      scanClipboard([entry('plain', 'just a note'), entry('addr', '0xABC')]),
    ).toEqual({ found: null, reason: 'none' });
  });
});
