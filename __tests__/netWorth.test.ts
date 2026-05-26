/**
 * netWorth.test.ts — portfolio valuation + history buffer.
 */
import { describe, expect, it } from '@jest/globals';
import type { MarketState } from '../src/engine/market';
import {
  appendPortfolioSample,
  computeNetWorth,
} from '../src/engine/economy/netWorth';

function fakeMarket(prices: Record<string, number>): MarketState {
  const tokens: MarketState['tokens'] = {};
  for (const id of Object.keys(prices)) {
    tokens[id] = { id, price: prices[id], history: [], dayOpen: prices[id] };
  }
  return { tokens };
}

describe('computeNetWorth', () => {
  it('sums cash and marked holdings', () => {
    const market = fakeMarket({ A: 2 });
    expect(computeNetWorth(100, { A: 10 }, market, [])).toBeCloseTo(120);
  });
});

describe('appendPortfolioSample', () => {
  it('caps history length', () => {
    let history: number[] = [];
    for (let i = 0; i < 20; i++) {
      history = appendPortfolioSample(history, i, 12);
    }
    expect(history).toHaveLength(12);
    expect(history[0]).toBe(8);
    expect(history[11]).toBe(19);
  });
});
