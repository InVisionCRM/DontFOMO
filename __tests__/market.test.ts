/**
 * market.test.ts — unit tests for the market simulation.
 * ------------------------------------------------------------------
 * The market engine is pure logic, so these tests run headless
 * through ts-jest — no React Native, no device.
 */
import { describe, expect, it } from '@jest/globals';
import {
  advanceMarket,
  createMarket,
  createRandom,
  dayChangePercent,
  gaussian,
  tickMarket,
} from '../src/engine/market';
import { TOKENS } from '../src/data/tokens';

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
    const market = createMarket(createRandom(1));
    for (const def of TOKENS) {
      const token = market.tokens[def.id];
      expect(token).toBeDefined();
      expect(token.price).toBeGreaterThan(0);
      expect(token.history.length).toBeGreaterThan(1);
    }
  });

  it('keeps the stablecoin pinned near $1', () => {
    const usdx = createMarket(createRandom(5)).tokens.USDX;
    expect(usdx.price).toBeGreaterThan(0.97);
    expect(usdx.price).toBeLessThan(1.03);
  });

  it('is deterministic for a given seed', () => {
    expect(createMarket(createRandom(99))).toEqual(createMarket(createRandom(99)));
  });
});

describe('tickMarket', () => {
  it('keeps every price positive over many ticks', () => {
    let market = createMarket(createRandom(3));
    const rand = createRandom(77);
    for (let i = 0; i < 400; i++) {
      market = tickMarket(market, rand);
    }
    for (const def of TOKENS) {
      expect(market.tokens[def.id].price).toBeGreaterThan(0);
    }
  });

  it('caps each token history length', () => {
    let market = createMarket(createRandom(3));
    const rand = createRandom(8);
    for (let i = 0; i < 500; i++) {
      market = tickMarket(market, rand);
    }
    for (const def of TOKENS) {
      expect(market.tokens[def.id].history.length).toBeLessThanOrEqual(150);
    }
  });

  it('does not mutate the input market', () => {
    const market = createMarket(createRandom(3));
    const before = market.tokens.NEURA.price;
    tickMarket(market, createRandom(8));
    expect(market.tokens.NEURA.price).toBe(before);
  });

  it('keeps the stablecoin near its peg as it ticks', () => {
    let market = createMarket(createRandom(3));
    const rand = createRandom(8);
    for (let i = 0; i < 250; i++) {
      market = tickMarket(market, rand);
    }
    expect(market.tokens.USDX.price).toBeGreaterThan(0.97);
    expect(market.tokens.USDX.price).toBeLessThan(1.03);
  });

  it('actually moves a volatile token', () => {
    let market = createMarket(createRandom(3));
    const start = market.tokens.MOONP.price;
    const rand = createRandom(8);
    for (let i = 0; i < 50; i++) {
      market = tickMarket(market, rand);
    }
    expect(market.tokens.MOONP.price).not.toBe(start);
  });
});

describe('advanceMarket', () => {
  it('matches applying tickMarket the same number of times', () => {
    const market = createMarket(createRandom(2));
    const viaAdvance = advanceMarket(market, 10, createRandom(50));
    let viaLoop = market;
    const loopRand = createRandom(50);
    for (let i = 0; i < 10; i++) {
      viaLoop = tickMarket(viaLoop, loopRand);
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
