/**
 * trade.test.ts — unit tests for the Exchange trading math.
 * ------------------------------------------------------------------
 * Pure logic — runs headless through ts-jest.
 */
import { describe, expect, it } from '@jest/globals';
import {
  EXCHANGE_FEE_RATE,
  holdingsValue,
  quoteBuy,
  quoteSell,
} from '../src/engine/economy';
import type { MarketState } from '../src/engine/market';

/** Build a minimal market with the given token prices. */
function fakeMarket(prices: Record<string, number>): MarketState {
  const tokens: MarketState['tokens'] = {};
  for (const id of Object.keys(prices)) {
    tokens[id] = { id, price: prices[id], history: [], dayOpen: prices[id] };
  }
  return { tokens };
}

describe('quoteBuy', () => {
  it('takes the fee from the spend and converts the rest to tokens', () => {
    const quote = quoteBuy(1000, 2);
    expect(quote.usd).toBe(1000);
    expect(quote.fee).toBeCloseTo(3); // 0.3% of 1000
    expect(quote.tokenAmount).toBeCloseTo((1000 - 3) / 2);
  });

  it('returns zero tokens at a zero price rather than dividing by zero', () => {
    expect(quoteBuy(100, 0).tokenAmount).toBe(0);
  });

  it('uses the 0.3% exchange fee rate', () => {
    expect(EXCHANGE_FEE_RATE).toBe(0.003);
    expect(quoteBuy(500, 1).fee).toBeCloseTo(1.5);
  });
});

describe('quoteSell', () => {
  it('values the tokens, then takes the fee from the proceeds', () => {
    const quote = quoteSell(100, 2);
    expect(quote.tokenAmount).toBe(100);
    expect(quote.fee).toBeCloseTo(0.6); // 0.3% of 200
    expect(quote.usd).toBeCloseTo(200 - 0.6);
  });
});

describe('holdingsValue', () => {
  it('sums each holding at its current price', () => {
    const market = fakeMarket({ A: 2, B: 4 });
    expect(holdingsValue({ A: 10, B: 5 }, market)).toBeCloseTo(40);
  });

  it('is zero when there are no holdings', () => {
    expect(holdingsValue({}, fakeMarket({ A: 9 }))).toBe(0);
  });

  it('ignores a holding for a token not in the market', () => {
    expect(holdingsValue({ GHOST: 100 }, fakeMarket({ A: 2 }))).toBe(0);
  });
});
