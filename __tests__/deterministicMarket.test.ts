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
  OU_MU_TARGET,
  OU_THETA,
  WORLD_BIRTHDAY_UTC_MS,
  fnv1a32,
  gaussianNoise,
  noise,
  priceAtTick,
  priceAtTickFromOrigin,
  priceSequence,
  tickAtTime,
  tokenSeed,
} from '../src/engine/market/deterministicMarket';
import { snapshotsInRange } from '../src/engine/market/snapshots';
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

  it('chains approximately — origin→N then N→M equals origin→M (within ~8 decimals)', () => {
    // The OU walk is exact in log-space; the public API converts to
    // and from price at each call. The round-trip introduces sub-ULP
    // float error per step (negligible for any visual or in-game use).
    const oneShot = priceAtTick(VOLATILE, seed, basePrice, 0, basePrice, 250);
    const stepN = priceAtTick(VOLATILE, seed, basePrice, 0, basePrice, 100);
    const stepM = priceAtTick(VOLATILE, seed, basePrice, 100, stepN, 250);
    expect(stepM).toBeCloseTo(oneShot, 8);
  });

  it('throws when toTick < fromTick (forward-only model)', () => {
    expect(() =>
      priceAtTick(VOLATILE, seed, basePrice, 100, 0.001, 50),
    ).toThrow(/forward-only/);
  });

  it('produces visibly different prices for different seeds at the same tick', () => {
    const a = priceAtTick(VOLATILE, tokenSeed('MOONP'), basePrice, 0, basePrice, 500);
    const b = priceAtTick(VOLATILE, tokenSeed('PEPE2'), basePrice, 0, basePrice, 500);
    expect(a).not.toBe(b);
  });
});

describe('OU model — bounded over long timescales (Bible §2)', () => {
  // These tests are the load-bearing property of the OU price model:
  // prices stay in a defensible band over millions of ticks rather
  // than compounding to astronomical values like the old GBM did.

  it('keeps catalog tokens in a defensible band over 3 in-game months', () => {
    // 3 months × ~30 d × 28800 ticks/day ≈ 2.6M ticks per token.
    // The OU stationary distribution is reached after ~10 half-lives
    // = ~7000 ticks; everything past that is sampling the bounded
    // stationary distribution. 3 months is plenty to prove no
    // 1e+128-style escape. (The previous random-walk model would
    // have escaped within hours; if 3 months is bounded, so is 5
    // years.)
    const THREE_MONTHS_TICKS = 3 * 30 * 28800;
    for (const [id, basePrice, vol] of [
      ['MOONP', 0.00071, 0.085],
      ['NEURA', 1.84, 0.04],
      ['VOLT', 0.62, 0.022],
      ['GIGA', 0.0231, 0.08],
    ] as const) {
      const params: SimParams = { drift: 0, volatility: vol, isStable: false };
      const price = priceAtTickFromOrigin(
        params,
        tokenSeed(id),
        basePrice,
        THREE_MONTHS_TICKS,
      );
      // The load-bearing assertion is just "not astronomical" — no 1e+128.
      expect(price).toBeGreaterThan(basePrice * 1e-6);
      expect(price).toBeLessThan(basePrice * 1e6);
      expect(Number.isFinite(price)).toBe(true);
    }
  });

  it('mean-reverts — a price starting far above basePrice drifts back down', () => {
    // Use a low-volatility synthetic token so the deterministic mean
    // reversion is visible without being drowned by the noise term.
    // Stationary 95% range for σ=0.01 is equilibrium × [exp(−0.45),
    // exp(0.45)] = equilibrium × [0.64, 1.57] — tight enough to see
    // the reversion. Half-life is ln(2)/θ ≈ 693 ticks; after 5000
    // ticks the deterministic start-position contribution is <1%.
    const lowVol: SimParams = { drift: 0, volatility: 0.01, isStable: false };
    const basePrice = 0.00071;
    const startPrice = basePrice * 10;
    const seed = tokenSeed('MOONP');
    const price = priceAtTick(lowVol, seed, basePrice, 0, startPrice, 5000);
    const equilibrium = basePrice * Math.exp(OU_MU_TARGET);
    // Within a generous 95% stationary band for σ=0.01.
    expect(price).toBeGreaterThan(equilibrium * 0.4);
    expect(price).toBeLessThan(equilibrium * 2.5);
    // And meaningfully closer to equilibrium than to the wild start.
    expect(Math.abs(Math.log(price / equilibrium))).toBeLessThan(
      Math.abs(Math.log(startPrice / equilibrium)),
    );
  });

  it('stationary mean is ≈ basePrice × exp(OU_MU_TARGET) over many samples', () => {
    // Sample the model at well-separated late-time ticks (after burn-in
    // so initial conditions are washed out). Geometric mean should be
    // near the OU equilibrium.
    const seed = tokenSeed('NEURA');
    const params: SimParams = { drift: 0, volatility: 0.04, isStable: false };
    const basePrice = 1.84;
    const expectedMean = basePrice * Math.exp(OU_MU_TARGET);
    let logSum = 0;
    const samples = 50;
    const burnIn = 10000;
    const spacing = 5000; // wide enough that samples are quasi-independent
    let walkPrice = basePrice;
    let walkTick = 0;
    for (let i = 0; i < burnIn; i++) {
      walkTick++;
      walkPrice = priceAtTick(params, seed, basePrice, walkTick - 1, walkPrice, walkTick);
    }
    for (let s = 0; s < samples; s++) {
      for (let i = 0; i < spacing; i++) {
        walkTick++;
        walkPrice = priceAtTick(params, seed, basePrice, walkTick - 1, walkPrice, walkTick);
      }
      logSum += Math.log(walkPrice);
    }
    const geomMean = Math.exp(logSum / samples);
    // ±50% of expected — generous (50 samples isn't a huge population).
    expect(geomMean).toBeGreaterThan(expectedMean * 0.5);
    expect(geomMean).toBeLessThan(expectedMean * 1.5);
  });

  it('OU_THETA and OU_MU_TARGET are the canonical Bible §2 values', () => {
    // Guard against accidental retuning — the Bible amendment pins these.
    expect(OU_THETA).toBe(0.001);
    expect(OU_MU_TARGET).toBe(0.2);
  });

  it('priceSequence returns one entry per tick in [fromTick+1, toTick]', () => {
    const params: SimParams = { drift: 0, volatility: 0.04, isStable: false };
    const seq = priceSequence(params, tokenSeed('NEURA'), 1.84, 100, 1.84, 110);
    expect(seq).toHaveLength(10);
    for (const p of seq) expect(p).toBeGreaterThan(0);
  });

  it('priceSequence final entry equals priceAtTick at the same toTick', () => {
    const params: SimParams = { drift: 0, volatility: 0.04, isStable: false };
    const seed = tokenSeed('NEURA');
    const seq = priceSequence(params, seed, 1.84, 0, 1.84, 200);
    const direct = priceAtTick(params, seed, 1.84, 0, 1.84, 200);
    expect(seq[seq.length - 1]).toBe(direct);
  });

  it('priceSequence returns [] when fromTick === toTick', () => {
    const params: SimParams = { drift: 0, volatility: 0.04, isStable: false };
    expect(priceSequence(params, tokenSeed('NEURA'), 1.84, 50, 1.0, 50)).toEqual([]);
  });

  it('priceSequence throws when toTick < fromTick (forward-only)', () => {
    const params: SimParams = { drift: 0, volatility: 0.04, isStable: false };
    expect(() =>
      priceSequence(params, tokenSeed('NEURA'), 1.84, 100, 1.0, 50),
    ).toThrow(/forward-only/);
  });

  it('snapshotsInRange returns snapshots whose tick is in [from, to]', () => {
    // The baked snapshot table is from MOONP (tick 0 → tick GENERATED_THROUGH_TICK
    // in steps of SNAPSHOT_INTERVAL_TICKS = 28800).
    const inRange = snapshotsInRange('MOONP', 0, 28800 * 3);
    // Snapshots at ticks 0, 28800, 57600, 86400 = 4 entries.
    expect(inRange.map((s) => s.tick)).toEqual([0, 28800, 57600, 86400]);
  });

  it('snapshotsInRange returns [] when no token has snapshots', () => {
    expect(snapshotsInRange('NOT_A_REAL_TOKEN', 0, 1_000_000)).toEqual([]);
  });

  it('snapshot-accelerated walk agrees with un-accelerated walk', () => {
    // The load-bearing correctness check for snapshots: cold-start
    // with snapshot acceleration must return the same price as a
    // full walk from tick 0. Test just past a snapshot boundary so
    // both paths exercise some replay.
    const params: SimParams = { drift: 0, volatility: 0.04, isStable: false };
    const basePrice = 1.84;
    const targetTick = 28800 + 137; // just past first snapshot boundary
    const accelerated = priceAtTickFromOrigin(
      params,
      tokenSeed('NEURA'),
      basePrice,
      targetTick,
      'NEURA', // enables snapshot acceleration
    );
    const fullWalk = priceAtTickFromOrigin(
      params,
      tokenSeed('NEURA'),
      basePrice,
      targetTick,
      // no tokenId — forces full walk from tick 0
    );
    expect(accelerated).toBeCloseTo(fullWalk, 10);
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
