/**
 * market.test.ts — unit tests for the market simulation.
 * ------------------------------------------------------------------
 * The market engine is pure logic, so these tests run headless
 * through ts-jest — no React Native, no device.
 *
 * Note on `nowMs`: catalog tokens are deterministic functions of
 * world tick (Bible §2). To get reproducible, fast tests, every
 * tickMarket / createMarket / advanceMarket call passes an explicit
 * `nowMs` derived from `WORLD_BIRTHDAY_UTC_MS`. This also keeps the
 * cold-start walk to ~0 ticks instead of 4M+.
 */
import { describe, expect, it } from '@jest/globals';
import {
  MARKET_TICK_MS,
  advanceMarket,
  createMarket,
  createRandom,
  dayChangePercent,
  gaussian,
  tickMarket,
  toCandles,
} from '../src/engine/market';
import { WORLD_BIRTHDAY_UTC_MS } from '../src/engine/market/deterministicMarket';
import { TOKEN_BY_ID, TOKENS } from '../src/data/tokens';

/** World tick 0 — the cheapest possible cold start. */
const BASE_NOW = WORLD_BIRTHDAY_UTC_MS;
/** Wall-clock time of world tick `i` (i counted from BASE_NOW). */
const tickNow = (i: number): number => BASE_NOW + i * MARKET_TICK_MS;

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values in the range [0, 1)', () => {
    const rand = createRandom(7);
    for (let i = 0; i < 300; i++) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('gaussian', () => {
  it('produces finite numbers that average near zero', () => {
    const rand = createRandom(123);
    const n = 4000;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const g = gaussian(rand);
      expect(Number.isFinite(g)).toBe(true);
      sum += g;
    }
    expect(Math.abs(sum / n)).toBeLessThan(0.15);
  });
});

describe('createMarket', () => {
  it('gives every token a positive price and a seeded history', () => {
    const market = createMarket(createRandom(1), BASE_NOW);
    for (const def of TOKENS) {
      const token = market.tokens[def.id];
      expect(token).toBeDefined();
      expect(token.price).toBeGreaterThan(0);
      expect(token.history.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the stablecoin pinned near $1', () => {
    const usdx = createMarket(createRandom(5), BASE_NOW).tokens.USDX;
    expect(usdx.price).toBeGreaterThan(0.97);
    expect(usdx.price).toBeLessThan(1.03);
  });

  it('is deterministic across calls at the same world tick', () => {
    // Catalog tokens depend on world tick, not the `rand` parameter.
    expect(createMarket(createRandom(99), BASE_NOW)).toEqual(
      createMarket(createRandom(99), BASE_NOW),
    );
    expect(createMarket(createRandom(7), BASE_NOW)).toEqual(
      createMarket(createRandom(99), BASE_NOW),
    );
  });
});

describe('tickMarket', () => {
  it('keeps every price positive over many ticks', () => {
    let market = createMarket(createRandom(3), BASE_NOW);
    const rand = createRandom(77);
    for (let i = 1; i <= 400; i++) {
      market = tickMarket(market, rand, undefined, tickNow(i));
    }
    for (const def of TOKENS) {
      expect(market.tokens[def.id].price).toBeGreaterThan(0);
    }
  });

  it('caps each token history length', () => {
    let market = createMarket(createRandom(3), BASE_NOW);
    const rand = createRandom(8);
    for (let i = 1; i <= 500; i++) {
      market = tickMarket(market, rand, undefined, tickNow(i));
    }
    for (const def of TOKENS) {
      expect(market.tokens[def.id].history.length).toBeLessThanOrEqual(150);
    }
  });

  it('does not mutate the input market', () => {
    const market = createMarket(createRandom(3), BASE_NOW);
    const before = market.tokens.NEURA.price;
    tickMarket(market, createRandom(8), undefined, tickNow(1));
    expect(market.tokens.NEURA.price).toBe(before);
  });

  it('keeps the stablecoin near its peg as it ticks', () => {
    let market = createMarket(createRandom(3), BASE_NOW);
    const rand = createRandom(8);
    for (let i = 1; i <= 250; i++) {
      market = tickMarket(market, rand, undefined, tickNow(i));
    }
    expect(market.tokens.USDX.price).toBeGreaterThan(0.97);
    expect(market.tokens.USDX.price).toBeLessThan(1.03);
  });

  it('actually moves a volatile token across ticks', () => {
    let market = createMarket(createRandom(3), BASE_NOW);
    const start = market.tokens.MOONP.price;
    const rand = createRandom(8);
    for (let i = 1; i <= 50; i++) {
      market = tickMarket(market, rand, undefined, tickNow(i));
    }
    expect(market.tokens.MOONP.price).not.toBe(start);
  });
});

describe('advanceMarket', () => {
  it('matches applying tickMarket the same number of times', () => {
    const ticks = 10;
    const endNow = tickNow(ticks);
    const market = createMarket(createRandom(2), BASE_NOW);
    const viaAdvance = advanceMarket(
      market,
      ticks,
      createRandom(50),
      undefined,
      endNow,
    );
    let viaLoop = market;
    const loopRand = createRandom(50);
    // advanceMarket walks stepNowMs from endNow back by (ticks-1-i)*MARKET_TICK_MS,
    // so step i = endNow − (ticks − 1 − i) · MARKET_TICK_MS. Reproduce that.
    for (let i = 0; i < ticks; i++) {
      const stepNow = endNow - (ticks - 1 - i) * MARKET_TICK_MS;
      viaLoop = tickMarket(viaLoop, loopRand, undefined, stepNow);
    }
    expect(viaAdvance).toEqual(viaLoop);
  });
});

describe('dayChangePercent', () => {
  it('is zero when the price equals the day open', () => {
    expect(
      dayChangePercent({ id: 'X', price: 100, history: [100], dayOpen: 100 }),
    ).toBe(0);
  });

  it('computes a positive change', () => {
    expect(
      dayChangePercent({ id: 'X', price: 110, history: [], dayOpen: 100 }),
    ).toBeCloseTo(10);
  });

  it('computes a negative change', () => {
    expect(
      dayChangePercent({ id: 'X', price: 80, history: [], dayOpen: 100 }),
    ).toBeCloseTo(-20);
  });
});

describe('toCandles', () => {
  it('returns an empty array for empty input', () => {
    expect(toCandles([], 10)).toEqual([]);
  });

  it('returns an empty array when count is below 1', () => {
    expect(toCandles([1, 2, 3], 0)).toEqual([]);
  });

  it('produces at most `count` candles', () => {
    const prices = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(toCandles(prices, 10).length).toBeLessThanOrEqual(10);
  });

  it('builds correct OHLC values for a single bucket', () => {
    const [candle] = toCandles([10, 25, 5, 18], 1);
    expect(candle.open).toBe(10);
    expect(candle.close).toBe(18);
    expect(candle.high).toBe(25);
    expect(candle.low).toBe(5);
  });

  it('keeps each high the bucket max and each low the bucket min', () => {
    const prices = createMarket(createRandom(4), BASE_NOW).tokens.MOONP.history;
    for (const candle of toCandles(prices, 20)) {
      expect(candle.high).toBeGreaterThanOrEqual(
        Math.max(candle.open, candle.close),
      );
      expect(candle.low).toBeLessThanOrEqual(
        Math.min(candle.open, candle.close),
      );
    }
  });
});

describe('tickMarket with a custom getParams', () => {
  it('ticks a runtime-added token alongside the catalogue tokens', () => {
    let market = createMarket(createRandom(1), BASE_NOW);
    market = {
      tokens: {
        ...market.tokens,
        MYTKN: { id: 'MYTKN', price: 0.001, history: [0.001], dayOpen: 0.001 },
      },
    };
    const getParams = (id: string) =>
      id === 'MYTKN'
        ? { drift: 0.01, volatility: 0.05, isStable: false }
        : TOKEN_BY_ID[id];

    market = tickMarket(market, createRandom(9), getParams, tickNow(1));

    expect(market.tokens.MYTKN.history.length).toBe(2);
    expect(market.tokens.MYTKN.price).toBeGreaterThan(0);
    expect(market.tokens.NEURA).toBeDefined();
  });
});
