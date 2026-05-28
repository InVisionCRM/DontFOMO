/**
 * settingsSaveHint.test.ts — covers the Settings "last saved" hint.
 *
 * Two surfaces:
 *  1. `formatLastSaved` — pure formatter; the buckets must read
 *     coarsely and never assert "X seconds ago" for a fresh write.
 *  2. The store's `markSaved` action — the ephemeral `lastSavedAt`
 *     field that the formatter consumes is set correctly and survives
 *     unrelated reducers without being clobbered.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../src/save', () => ({
  saveAdapter: {
    clear: () => Promise.resolve(),
    save: () => Promise.resolve(),
    load: jest.fn(),
  },
  SAVE_VERSION: 19,
}));

import { useGameStore } from '../src/state/store';
import { formatLastSaved } from '../src/ui/settings/formatLastSaved';

describe('formatLastSaved', () => {
  const NOW = new Date('2026-05-27T14:00:00Z').getTime();

  it('reads "Not yet saved" when the value is null', () => {
    expect(formatLastSaved(null, NOW)).toBe('Not yet saved');
  });

  it('reads "Just now" for a write inside the 5-second floor', () => {
    expect(formatLastSaved(NOW - 1_000, NOW)).toBe('Just now');
    expect(formatLastSaved(NOW - 4_999, NOW)).toBe('Just now');
  });

  it('reads "Just now" for future-dated timestamps (clock skew)', () => {
    expect(formatLastSaved(NOW + 30_000, NOW)).toBe('Just now');
  });

  it('reads seconds inside the first minute', () => {
    expect(formatLastSaved(NOW - 12_000, NOW)).toBe('12 seconds ago');
  });

  it('singularises the minutes bucket at 1 minute', () => {
    expect(formatLastSaved(NOW - 60_000, NOW)).toBe('1 minute ago');
  });

  it('pluralises the minutes bucket above 1', () => {
    expect(formatLastSaved(NOW - 7 * 60_000, NOW)).toBe('7 minutes ago');
  });

  it('uses hours after an hour', () => {
    expect(formatLastSaved(NOW - 60 * 60_000, NOW)).toBe('1 hour ago');
    expect(formatLastSaved(NOW - 3 * 60 * 60_000, NOW)).toBe('3 hours ago');
  });

  it('uses a "Yesterday at h:mm" stamp for the day before', () => {
    const yesterdayMorning = new Date('2026-05-26T13:30:00Z').getTime();
    // h:mm depends on the host's local timezone — assert only the prefix.
    expect(formatLastSaved(yesterdayMorning, NOW)).toMatch(/^Yesterday at /);
  });

  it('uses a "Mon D at h:mm" stamp for older saves', () => {
    const older = new Date('2026-05-20T13:30:00Z').getTime();
    expect(formatLastSaved(older, NOW)).toMatch(/^May 20 at /);
  });
});

describe('store.markSaved', () => {
  beforeEach(() => {
    useGameStore.getState().newGame(1_000_000);
  });

  it('starts with lastSavedAt null on a fresh game', () => {
    expect(useGameStore.getState().lastSavedAt).toBeNull();
  });

  it('records the supplied timestamp', () => {
    useGameStore.getState().markSaved(1_500_000);
    expect(useGameStore.getState().lastSavedAt).toBe(1_500_000);
  });

  it('overwrites prior values with the latest write', () => {
    useGameStore.getState().markSaved(1_500_000);
    useGameStore.getState().markSaved(1_600_000);
    expect(useGameStore.getState().lastSavedAt).toBe(1_600_000);
  });

  it('is not cleared by unrelated reducers (banners, app switches, ticks)', () => {
    useGameStore.getState().markSaved(1_700_000);
    useGameStore.getState().postBanner('Test', 'body');
    useGameStore.getState().openApp('settings');
    useGameStore.getState().closeApp();
    useGameStore.getState().tick(1_700_001);
    expect(useGameStore.getState().lastSavedAt).toBe(1_700_000);
  });

  it('is reset to null when a new game starts', () => {
    useGameStore.getState().markSaved(1_700_000);
    useGameStore.getState().newGame(2_000_000);
    expect(useGameStore.getState().lastSavedAt).toBeNull();
  });
});
