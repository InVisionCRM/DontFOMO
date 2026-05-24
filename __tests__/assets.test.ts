/**
 * assets.test.ts — unit tests for the Market engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_RESALE_RATE,
  addOwned,
  findAsset,
  isOwned,
  ownedFollowerBoost,
  ownedValue,
  removeOwned,
  resaleValue,
  type AssetDefinition,
  type OwnedAsset,
} from '../src/engine/assets/assets';

const CATALOG: readonly AssetDefinition[] = [
  {
    id: 'a',
    name: 'Asset A',
    category: 'Cars',
    price: 10_000,
    followersBoost: 10,
    thumbGradient: ['#000', '#fff'],
    description: 'a',
  },
  {
    id: 'b',
    name: 'Asset B',
    category: 'Watches',
    price: 50_000,
    followersBoost: 100,
    thumbGradient: ['#000', '#fff'],
    description: 'b',
  },
  {
    id: 'c',
    name: 'Asset C',
    category: 'Houses',
    price: 1_000_000,
    followersBoost: 800,
    thumbGradient: ['#000', '#fff'],
    description: 'c',
    resaleRate: 0.9,
  },
];

const ownedA = (now = 1): OwnedAsset => ({ id: 'a', acquiredAt: now });
const ownedB = (now = 1): OwnedAsset => ({ id: 'b', acquiredAt: now });

describe('findAsset', () => {
  it('finds by id', () => {
    expect(findAsset(CATALOG, 'b')?.name).toBe('Asset B');
  });
  it('returns undefined for unknown ids', () => {
    expect(findAsset(CATALOG, 'nope')).toBeUndefined();
  });
});

describe('isOwned', () => {
  it('matches by id', () => {
    expect(isOwned([ownedA(), ownedB()], 'b')).toBe(true);
    expect(isOwned([ownedA()], 'b')).toBe(false);
  });
});

describe('ownedValue / ownedFollowerBoost', () => {
  it('sum across owned items', () => {
    const owned = [ownedA(), ownedB()];
    expect(ownedValue(CATALOG, owned)).toBe(60_000);
    expect(ownedFollowerBoost(CATALOG, owned)).toBe(110);
  });
  it('ignores owned ids with no catalogue match', () => {
    const owned = [ownedA(), { id: 'ghost', acquiredAt: 1 }];
    expect(ownedValue(CATALOG, owned)).toBe(10_000);
    expect(ownedFollowerBoost(CATALOG, owned)).toBe(10);
  });
  it('is zero for an empty owned list', () => {
    expect(ownedValue(CATALOG, [])).toBe(0);
    expect(ownedFollowerBoost(CATALOG, [])).toBe(0);
  });
});

describe('resaleValue', () => {
  it('applies the default resale rate when none is set', () => {
    expect(resaleValue(CATALOG[0])).toBe(
      Math.round(10_000 * DEFAULT_RESALE_RATE),
    );
  });
  it('honours a per-asset rate override', () => {
    expect(resaleValue(CATALOG[2])).toBe(900_000);
  });
});

describe('addOwned', () => {
  it('appends a new asset with a timestamp', () => {
    const after = addOwned([], 'a', 5);
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual({ id: 'a', acquiredAt: 5 });
  });
  it('is a no-op when the asset is already owned', () => {
    const before = [ownedA(10)];
    const after = addOwned(before, 'a', 20);
    expect(after).toHaveLength(1);
    expect(after[0].acquiredAt).toBe(10); // unchanged
  });
  it('is pure — original array unchanged', () => {
    const before = [ownedA()];
    addOwned(before, 'b', 5);
    expect(before).toHaveLength(1);
  });
});

describe('removeOwned', () => {
  it('removes by id', () => {
    const after = removeOwned([ownedA(), ownedB()], 'a');
    expect(after.map((o) => o.id)).toEqual(['b']);
  });
  it('is a no-op for an unknown id', () => {
    const before = [ownedA()];
    expect(removeOwned(before, 'nope')).toEqual(before);
  });
});
