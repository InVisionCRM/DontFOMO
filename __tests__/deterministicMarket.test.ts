/**
 * deterministicMarket.test.ts — proves the shared-world price model
 * is deterministic (Bible §2, "The Shared Market").
 * ------------------------------------------------------------------
 * If any of these fail, two players on different devices will see
 * different prices — that is the whole property the file exists to
 * protect. Treat regressions as load-bearing.
 */
import { describe, expect, it } from '@jest/globals';
import {
  WORLD_BIRTHDAY_UTC_MS,
  fnv1a32,
  gaussianNoise,
  noise,
  priceAtTick,
  priceAtTickFromOrigin,
  tickAtTime,
  tokenSeed,
} from '../src/engine/market/deterministicMarket';
import type { SimParams } from '../src/engine/market';

const VOLATILE: SimParams = { drift: 0.0012, volatility: 0.085, isStable: false };
const STABLE: SimParams = { drift: 0, volatility: 0.0008, isStable: true };

describe('fnv1a32 / tokenSeed', () => {
  it('is deterministic for the same input', () => {
    expect(fnv1a32('MOONP')).toBe(fnv1a32('MOONP'));
    expect(tokenSeed('MOONP')).toBe(tokenSeed('MOONP'));
  });

  it('returns different seeds for different ids', () => {
    expect(tokenSeed('MOONP')).not.toBe(tokenSeed('PEPE2'));
    expect(tokenSeed('MOONP')).not.toBe(tokenSeed('moonp'));
  });

  it('handles the empty string without throwing', () => {
    expect(typeof fnv1a32('')).toBe('number');
  });

  it('always returns an unsigned 32-bit integer', () => {
    for (const id of ['USDX', 'MOONP', 'PEPE2', 'NEURA', 'VOLT', 'YIELDX', 'GIGA']) {
      const seed = tokenSeed(id);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(0x100000000);
      expect(Number.isInteger(seed)).toBe(true);
    }
  });
});

describe('noise', () => {
  it('is deterministic for the same (seed, tick)', () => {
    const seed = tokenSeed('MOONP');
    for (const tick of [0, 1, 7, 99, 12345, 1_000_000]) {
      expect(noise(seed, tick)).toBe(noise(seed, tick));
    }
  });

  it('varies with the tick', () => {
    const seed = tokenSeed('MOONP');
    const values = new Set<number>();
    for (let tick = 0; tick < 50; tick++) {
      values.add(noise(seed, tick));
    }
    expect(values.size).toBeGreaterThan(45);
  });

  it('varies with the seed', () => {
    const tick = 100;
    const values = new Set<number>();
    for (const id of ['USDX', 'MOONP', 'PEPE2', 'NEURA', 'VOLT', 'YIELDX', 'GIGA']) {
      values.add(noise(tokenSeed(id), tick));
    }
    expect(values.size).toBe(7);
  });

  it('returns values in [0, 1)', () => {
    const seed = tokenSeed('MOONP');
    for (let tick = 0; tick < 1000; tick++) {
      const value = noise(seed, tick);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is roughly uniformly distributed over many samples', () => {
    const seed = tokenSeed('MOONP');
    const buckets = [0, 0, 0, 0]; // quarters
    const samples = 10_000;
    for (let tick = 0; tick < samples; tick++) {
      buckets[Math.floor(noise(seed, tick) * 4)]++;
    }
    const expected = samples / 4;
    for (const count of buckets) {
      // Allow ±10% per quarter — generous but catches gross skew.
      expect(count).toBeGreaterThan(expected * 0.9);
      expect(count).toBeLessThan(expected * 1.1);
    }
  });
});

describe('gaussianNoise', () => {
  it('is deterministic for the same (seed, tick)', () => {
    const seed = tokenSeed('NEURA');
    for (const tick of [0, 1, 42, 999, 100_000]) {
      expect(gaussianNoise(seed, tick)).toBe(gaussianNoise(seed, tick));
    }
  });

  it('has roughly mean 0 and std dev 1 over many samples', () => {
    const seed = tokenSeed('NEURA');
    const samples = 10_000;
    let sum = 0;
    let sumSq = 0;
    for (let tick = 0; tick < samples; tick++) {
      const value = gaussianNoise(seed, tick);
      sum += value;
      sumSq += value * value;
    }
    const mean = sum / samples;
    const variance = sumSq / samples - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.05);
  });
});

describe('priceAtTick — volatile tokens', () => {
  const seed = tokenSeed('MOONP');
  const basePrice = 0.00071;

  it('returns the from-price when toTick === fromTick', () => {
    expect(priceAtTick(VOLATILE, seed, basePrice, 50, 0.001, 50)).toBe(0.001);
  });

  it('is deterministic across independent calls', () => {
    const a = priceAtTick(VOLATILE, seed, basePrice, 0, basePrice, 500);
    const b = priceAtTick(VOLATILE, seed, basePrice, 0, basePrice, 500);
    expect(a).toBe(b);
  });

  it('chains correctly — origin→N then N→M equals origin→M', () => {
    const oneShot = priceAtTick(VOLATILE, seed, basePrice, 0, basePrice, 250);
    const stepN = priceAtTick(VOLATILE, seed, basePrice, 0, basePrice, 100);
    const stepM = priceAtTick(VOLATILE, seed, basePrice, 100, stepN, 250);
    expect(stepM).toBeCloseTo(oneShot, 12);
  });

  it('throws when toTick < fromTick (forward-only model)', () => {
    expect(() =>
      priceAtTick(VOLATILE, seed, basePrice, 100, 0.001, 50),
    ).toThrow(/forward-only/);
  });

  it('respects MIN_PRICE — never crashes to a non-positive number', () => {
    const wildlyNegative: SimParams = { drift: -10, volatility: 0, isStable: false };
    const price = priceAtTick(wildlyNegative, seed, basePrice, 0, basePrice, 1000);
    expect(price).toBeGreaterThan(0);
  });

  it('produces visibly different prices for different seeds at the same tick', () => {
    const a = priceAtTick(VOLATILE, tokenSeed('MOONP'), basePrice, 0, basePrice, 500);
    const b = priceAtTick(VOLATILE, tokenSeed('PEPE2'), basePrice, 0, basePrice, 500);
    expect(a).not.toBe(b);
  });
});

describe('priceAtTick — stable tokens', () => {
  const seed = tokenSeed('USDX');

  it('returns 1.0 at tick 0', () => {
    expect(priceAtTick(STABLE, seed, 1.0, 0, 1.0, 0)).toBe(1.0);
  });

  it('stays inside the [0.97, 1.03] band at any tick', () => {
    for (const tick of [1, 10, 100, 1000, 100_000, 10_000_000]) {
      const price = priceAtTick(STABLE, seed, 1.0, 0, 1.0, tick);
      expect(price).toBeGreaterThanOrEqual(0.97);
      expect(price).toBeLessThanOrEqual(1.03);
    }
  });

  it('is O(1) — fromTick is ignored, only toTick matters', () => {
    const a = priceAtTick(STABLE, seed, 1.0, 0, 1.0, 5000);
    const b = priceAtTick(STABLE, seed, 1.0, 4999, 0.99, 5000);
    expect(a).toBe(b);
  });
});

describe('priceAtTickFromOrigin', () => {
  it('equals priceAtTick(0, basePrice, N)', () => {
    const seed = tokenSeed('GIGA');
    const a = priceAtTickFromOrigin(VOLATILE, seed, 0.0231, 200);
    const b = priceAtTick(VOLATILE, seed, 0.0231, 0, 0.0231, 200);
    expect(a).toBe(b);
  });
});

describe('tickAtTime', () => {
  it('returns 0 at the world birthday exactly', () => {
    expect(tickAtTime(WORLD_BIRTHDAY_UTC_MS, 3000)).toBe(0);
  });

  it('returns 0 before the world birthday', () => {
    expect(tickAtTime(WORLD_BIRTHDAY_UTC_MS - 1, 3000)).toBe(0);
    expect(tickAtTime(0, 3000)).toBe(0);
  });

  it('returns N after N tick-intervals have elapsed', () => {
    const tickMs = 3000;
    for (const n of [1, 7, 100, 28800, 1_000_000]) {
      expect(tickAtTime(WORLD_BIRTHDAY_UTC_MS + n * tickMs, tickMs)).toBe(n);
    }
  });

  it('floors partial intervals — half a tick still reads as the prior tick', () => {
    const tickMs = 3000;
    expect(tickAtTime(WORLD_BIRTHDAY_UTC_MS + tickMs + 1500, tickMs)).toBe(1);
    expect(tickAtTime(WORLD_BIRTHDAY_UTC_MS + tickMs - 1, tickMs)).toBe(0);
  });
});

describe('cross-device determinism (the property this file exists to protect)', () => {
  it('two independent imports / calls produce identical price sequences', () => {
    // Simulating "two devices" — same code, same inputs, must agree.
    const seed = tokenSeed('NEURA');
    const series = (basePrice: number, toTick: number): number[] => {
      const out: number[] = [];
      let price = basePrice;
      for (let tick = 1; tick <= toTick; tick++) {
        price = priceAtTick(VOLATILE, seed, basePrice, tick - 1, price, tick);
        out.push(price);
      }
      return out;
    };
    const deviceA = series(1.84, 200);
    const deviceB = series(1.84, 200);
    expect(deviceA).toEqual(deviceB);
    expect(deviceA[199]).toBeGreaterThan(0);
  });
});
