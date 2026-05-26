/**
 * scamDirector.test.ts — Stage 6 Scam Director unit tests.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../src/engine/time/clock';
import type { ClipboardEntry } from '../src/engine/clipboard';
import {
  armScam,
  createScamDirector,
  detonationDelayMs,
  getScamPhase,
  tickScamDirector,
} from '../src/engine/scam-director';
import { SCAM_CATALOG } from '../src/data/scams';

describe('scam catalog', () => {
  it('ships four catalogue entries', () => {
    expect(SCAM_CATALOG).toHaveLength(4);
    const ids = SCAM_CATALOG.map((e) => e.id).sort();
    expect(ids).toEqual([
      'clipboard_seed',
      'fake_support',
      'frozen_withdrawal',
      'hijacked_friend',
    ]);
  });
});

describe('tickScamDirector — clipboard scam', () => {
  const sensitive: ClipboardEntry = {
    id: 'c1',
    content: 'word '.repeat(12).trim(),
    copiedAt: 1_000,
    isSensitive: true,
    source: 'Recovery phrase',
  };

  it('schedules detonation when a sensitive entry is present', () => {
    const state = createScamDirector();
    const result = tickScamDirector(state, {
      now: 5_000,
      cash: 10_000,
      followers: 100,
      clipboard: [sensitive],
      hasOnboarded: true,
    });
    expect(getScamPhase(result.state, 'clipboard_seed')).toBe('scheduled');
    expect(result.state.scams.clipboard_seed.detonateAt).toBe(
      5_000 + detonationDelayMs(5_000),
    );
  });

  it('defuses with a follower reward when the entry is cleared before detonation', () => {
    let state = createScamDirector();
    state = tickScamDirector(state, {
      now: 1_000,
      cash: 5_000,
      followers: 10,
      clipboard: [sensitive],
      hasOnboarded: true,
    }).state;
    expect(getScamPhase(state, 'clipboard_seed')).toBe('scheduled');
    const result = tickScamDirector(state, {
      now: 2_000,
      cash: 5_000,
      followers: 10,
      clipboard: [],
      hasOnboarded: true,
    });
    expect(getScamPhase(result.state, 'clipboard_seed')).toBe('defused');
    expect(result.followersDelta).toBe(5);
    expect(result.banner?.title).toBe('Scam avoided');
  });

  it('drains cash after the detonation window', () => {
    const armedAt = 1_000;
    const detonateAt = armedAt + detonationDelayMs(armedAt);
    let state = createScamDirector();
    state = {
      ...state,
      scams: {
        ...state.scams,
        clipboard_seed: {
          phase: 'scheduled',
          armedAt,
          detonateAt,
        },
      },
    };
    const result = tickScamDirector(state, {
      now: detonateAt,
      cash: 10_000,
      followers: 0,
      clipboard: [sensitive],
      hasOnboarded: true,
    });
    expect(getScamPhase(result.state, 'clipboard_seed')).toBe('detonated');
    expect(result.cashDelta).toBe(-3_500);
    expect(result.banner?.title).toBe('Wallet drained');
  });
});

describe('armScam', () => {
  it('arms hijacked_friend without scheduling', () => {
    const state = armScam(createScamDirector(), 'hijacked_friend', 9_000);
    expect(getScamPhase(state, 'hijacked_friend')).toBe('armed');
    expect(state.scams.hijacked_friend.detonateAt).toBeUndefined();
  });
});
