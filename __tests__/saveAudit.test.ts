/**
 * saveAudit.test.ts — proves validateSaveData + the serialize round-trip.
 * ------------------------------------------------------------------
 * `validateSaveData` is the second line of defence on the load path:
 *
 *   adapter.load → migrateSave → validateSaveData → store.loadSaved
 *
 * It catches structurally broken blobs that survived JSON parsing but
 * are missing the player's identity fields, before they reach the
 * store and silently restart the player at $1000 / @newhandle.
 *
 * These tests cover:
 *   - the happy path (a freshly serialized game validates clean)
 *   - one rejection per core field (with a useful `reason`)
 *   - the round-trip invariant: `serializeGame(s)` is always valid
 */
import { describe, expect, it, jest } from '@jest/globals';

const mockClear = jest.fn<() => Promise<void>>(() => Promise.resolve());
const mockSave = jest.fn<(data: unknown) => Promise<void>>(() =>
  Promise.resolve(),
);

jest.mock('../src/save', () => ({
  ...jest.requireActual<object>('../src/save'),
  saveAdapter: {
    clear: () => mockClear(),
    save: (data: unknown) => mockSave(data),
    load: jest.fn(),
  },
}));

import {
  CorruptSaveError,
  validateSaveData,
} from '../src/save';
import { serializeGame, useGameStore } from '../src/state/store';

/** A minimal, well-formed save data blob. */
function goodSave(): Record<string, unknown> {
  return {
    clock: { startedAt: 1_000, lastSeenAt: 1_100, now: 1_200 },
    cash: 1000,
    followers: 0,
    handle: '@somebody',
    market: { tokens: {} },
    bank: { someField: true },
    cashSwipe: { someField: true },
  };
}

describe('validateSaveData — happy path', () => {
  it('returns the blob unchanged when every core field is present', () => {
    const blob = goodSave();
    const out = validateSaveData(blob);
    expect(out).toBe(blob);
  });
});

describe('validateSaveData — core-field rejections', () => {
  it('throws when the input is null', () => {
    expect(() => validateSaveData(null)).toThrow(CorruptSaveError);
    expect(() => validateSaveData(null)).toThrow(/expected an object/);
  });

  it('throws when the input is an array (not a plain object)', () => {
    expect(() => validateSaveData([])).toThrow(CorruptSaveError);
  });

  it('throws when clock is missing', () => {
    const blob = goodSave();
    delete blob.clock;
    expect(() => validateSaveData(blob)).toThrow(/clock is missing/);
  });

  it('throws when clock.now is not a number', () => {
    const blob = goodSave();
    blob.clock = { startedAt: 1, lastSeenAt: 1, now: 'soon' };
    expect(() => validateSaveData(blob)).toThrow(/clock\.now/);
  });

  it('throws when clock.now is NaN', () => {
    const blob = goodSave();
    blob.clock = { startedAt: 1, lastSeenAt: 1, now: Number.NaN };
    expect(() => validateSaveData(blob)).toThrow(/clock\.now/);
  });

  it('throws when cash is missing', () => {
    const blob = goodSave();
    delete blob.cash;
    expect(() => validateSaveData(blob)).toThrow(/cash/);
  });

  it('throws when followers is the wrong type', () => {
    const blob = goodSave();
    blob.followers = '0';
    expect(() => validateSaveData(blob)).toThrow(/followers/);
  });

  it('throws when handle is not a string', () => {
    const blob = goodSave();
    blob.handle = 0;
    expect(() => validateSaveData(blob)).toThrow(/handle/);
  });

  it('throws when market is missing', () => {
    const blob = goodSave();
    delete blob.market;
    expect(() => validateSaveData(blob)).toThrow(/market is missing/);
  });

  it('throws when market.tokens is missing', () => {
    const blob = goodSave();
    blob.market = {};
    expect(() => validateSaveData(blob)).toThrow(/market\.tokens/);
  });

  it('throws when bank is null', () => {
    const blob = goodSave();
    blob.bank = null;
    expect(() => validateSaveData(blob)).toThrow(/bank is missing/);
  });

  it('throws when cashSwipe is missing', () => {
    const blob = goodSave();
    delete blob.cashSwipe;
    expect(() => validateSaveData(blob)).toThrow(/cashSwipe/);
  });
});

describe('validateSaveData — round-trip invariant', () => {
  it('accepts the output of serializeGame on a fresh store', () => {
    // The store starts with `resume(Date.now())` to populate the
    // clock and market; otherwise the fresh-game shape has clock.now
    // == 0 which is still valid but unrealistic.
    useGameStore.getState().resume(Date.now());
    const blob = serializeGame(useGameStore.getState());
    expect(() => validateSaveData(blob)).not.toThrow();
  });
});
